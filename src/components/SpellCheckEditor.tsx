import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Alert, Menu } from "@mantine/core";
import {
  Editor,
  EditorState,
  ContentState,
  CompositeDecorator,
  Modifier,
  SelectionState,
  ContentBlock,
} from "draft-js";
import "draft-js/dist/Draft.css";

/* ---------------- 类型定义 ---------------- */
interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  context: { text: string; offset: number; length: number };
  sentence: string;
  type: { typeName: string };
  rule: {
    id: string;
    description: string;
    category: { id: string; name: string };
  };
}

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
  language: { code: string; name: string };
}

interface SpellError {
  word: string;
  start: number;
  end: number;
  suggestions: string[];
  message: string;
  type: string;
  blockKey: string;
}

interface SpellErrorComponentProps {
  decoratedText: string;
  children: React.ReactNode;
  error: SpellError;
  onRightClick: (
    word: string,
    suggestions: string[],
    event: React.MouseEvent
  ) => void;
}

/* ---------------- 错误组件 ---------------- */
const SpellErrorComponent: React.FC<SpellErrorComponentProps> = ({
  decoratedText,
  children,
  error,
  onRightClick,
}) => {
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    onRightClick(decoratedText, error.suggestions, event);
  };
  return (
    <span
      style={{
        textDecoration: "wavy underline red",
        textDecorationSkipInk: "none",
        cursor: "pointer",
        backgroundColor: "rgba(255, 0, 0, 0.1)",
      }}
      onContextMenu={handleContextMenu}
      title={`${error.type}: ${error.message}\n建议: ${
        error.suggestions.join(", ") || "无"
      }`}
    >
      {children}
    </span>
  );
};

/* ---------------- 主组件 ---------------- */
interface SpellCheckEditorProps {
  initialText: string;
  onChange?: (value: string) => void;
}

interface SpellCheckEditorRef {
  handleSpellCheck: () => Promise<void>;
}

const SpellCheckEditor = forwardRef<SpellCheckEditorRef, SpellCheckEditorProps>(
  ({ initialText, onChange }, ref) => {
    const [error, setError] = useState("");
    const [editorState, setEditorState] = useState<EditorState>(() =>
      EditorState.createWithContent(ContentState.createFromText(initialText))
    );
    const [contextMenu, setContextMenu] = useState<null | {
      x: number;
      y: number;
      word: string;
      suggestions: string[];
    }>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [spellErrors, setSpellErrors] = useState<SpellError[]>([]);

    const editorRef = useRef<Editor>(null);
    const spellErrorsRef = useRef<Map<string, SpellError>>(new Map());
    const lastContentRef = useRef(initialText);

    /* -------------- LanguageTool 检查 -------------- */
    const checkWithLanguageTool = async (
      text: string
    ): Promise<LanguageToolResponse> => {
      if (!text.trim())
        return { matches: [], language: { code: "de-DE", name: "German" } };
      const encoded = encodeURIComponent(text);
      const res = await fetch(
        `https://app.deutik.com/languagetool/v2/check?text=${encoded}&language=de-DE`
      );
      if (!res.ok) throw new Error(`LanguageTool API 错误: ${res.status}`);
      return res.json();
    };

    /* -------------- 把绝对偏移转成块内偏移，并处理大小写错误 -------------- */
    const buildErrorsWithBlockKey = (
      matches: LanguageToolMatch[],
      contentState: ContentState,
      isInitialCheck: boolean = false
    ): { errors: SpellError[]; autoFixedContent?: ContentState } => {
      let currentContent = contentState;
      const fullText = contentState.getPlainText();
      const autoFixes: { selection: SelectionState; suggestion: string }[] = [];

      const errors = matches
        .map((m) => {
          const absStart = m.offset;
          const absEnd = m.offset + m.length;
          const word = fullText.slice(absStart, absEnd);

          // Detect case-only errors (e.g., "ICh" → "Ich" or "ich" → "Ich")
          const isCaseError =
            isInitialCheck &&
            m.replacements.length > 0 &&
            word.toLowerCase() === m.replacements[0].value.toLowerCase() &&
            word !== m.replacements[0].value;

          if (isCaseError) {
            // Prepare auto-fix for case-only errors
            let blockKey = "";
            let blockGlobalStart = 0;
            contentState.getBlockMap().forEach((blk) => {
              if (!blk) return;
              const blkEnd = blockGlobalStart + blk.getLength();
              if (absStart >= blockGlobalStart && absStart <= blkEnd) {
                blockKey = blk.getKey();
                return false;
              }
              blockGlobalStart = blkEnd + 1;
            });

            const localStart = absStart - blockGlobalStart;
            const selection = SelectionState.createEmpty(blockKey).merge({
              anchorOffset: localStart,
              focusOffset: localStart + m.length,
            });
            autoFixes.push({ selection, suggestion: m.replacements[0].value });
            return null; // Skip marking as error
          }

          // Normal error processing
          let blockKey = "";
          let blockGlobalStart = 0;
          contentState.getBlockMap().forEach((blk) => {
            if (!blk) return;
            const blkEnd = blockGlobalStart + blk.getLength();
            if (absStart >= blockGlobalStart && absStart <= blkEnd) {
              blockKey = blk.getKey();
              return false;
            }
            blockGlobalStart = blkEnd + 1;
          });

          const localStart = absStart - blockGlobalStart;
          const localEnd = localStart + m.length;

          return {
            word,
            start: localStart,
            end: localEnd,
            suggestions: m.replacements.map((r) => r.value),
            message: m.message,
            type: m.rule.category.name,
            blockKey,
          };
        })
        .filter(Boolean) as SpellError[];

      // Apply auto-fixes for case-only errors
      if (autoFixes.length > 0) {
        let newContent = currentContent;
        autoFixes.forEach(({ selection, suggestion }) => {
          newContent = Modifier.replaceText(newContent, selection, suggestion);
        });
        return { errors, autoFixedContent: newContent };
      }
      console.log("Detected errors:", errors);

      return { errors };
    };

    /* -------------- 创建装饰器策略 -------------- */
    const createSpellCheckStrategy = useCallback((errors: SpellError[]) => {
      spellErrorsRef.current.clear();
      return {
        strategy: (
          block: ContentBlock,
          callback: (s: number, e: number) => void
        ) => {
          const blockKey = block.getKey();
          errors
            .filter((e) => e.blockKey === blockKey)
            .forEach((e) => {
              callback(e.start, e.end);
              spellErrorsRef.current.set(`${blockKey}-${e.start}-${e.end}`, e);
            });
        },
        component: (props: any) => {
          const key = `${props.blockKey}-${props.start}-${props.end}`;
          const err = spellErrorsRef.current.get(key);
          return err ? (
            <SpellErrorComponent
              {...props}
              error={err}
              onRightClick={handleWordRightClick}
            />
          ) : (
            <span>{props.children}</span>
          );
        },
      };
    }, []);

    /* -------------- 手动检查 -------------- */
    const handleSpellCheckInternal = useCallback(
      async (isInitial: boolean = false) => {
        if (isChecking) return;
        setIsChecking(true);
        setError("");
        try {
          console.log("0");
          const contentState = editorState.getCurrentContent();
          const text = contentState.getPlainText();
          const result = await checkWithLanguageTool(text);
          const { errors, autoFixedContent } = buildErrorsWithBlockKey(
            result.matches,
            contentState,
            isInitial
          );
          setSpellErrors(errors);

          let newState = editorState;
          if (autoFixedContent) {
            newState = EditorState.push(
              editorState,
              autoFixedContent,
              "insert-characters"
            );
            // 保持 selection
            newState = EditorState.forceSelection(
              newState,
              newState.getSelection()
            );
            onChange?.(autoFixedContent.getPlainText());
          }

          if (errors.length) {
            const decorator = new CompositeDecorator([
              createSpellCheckStrategy(errors),
            ]);
            newState = EditorState.set(newState, { decorator });
          } else {
            newState = EditorState.set(newState, { decorator: undefined });
          }
          // 保持 selection
          setEditorState(
            EditorState.forceSelection(newState, newState.getSelection())
          );
        } catch (err: any) {
          setError(`拼写检查失败: ${err.message}`);
        } finally {
          setIsChecking(false);
        }
      },
      [editorState, isChecking, createSpellCheckStrategy, onChange]
    );

    // 暴露给父组件的 handleSpellCheck
    useImperativeHandle(ref, () => ({
      handleSpellCheck: () => handleSpellCheckInternal(false),
    }));

    /* -------------- 右键菜单 -------------- */
    const handleWordRightClick = (
      word: string,
      suggestions: string[],
      event: React.MouseEvent
    ) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, word, suggestions });
    };

    /* -------------- 根据建议替换并移除红线 -------------- */
    const handleSuggestionSelect = async (suggestion: string) => {
      if (!contextMenu) return;

      const { word } = contextMenu;
      const contentState = editorState.getCurrentContent();
      const block = contentState.getFirstBlock();
      // const text = block.getText();

      const targetErr = spellErrors.find(
        (e) => e.word === word && e.blockKey === block.getKey()
      );
      if (!targetErr) return;

      const selection = SelectionState.createEmpty(targetErr.blockKey).merge({
        anchorOffset: targetErr.start,
        focusOffset: targetErr.end,
      });

      const newContent = Modifier.replaceText(
        contentState,
        selection,
        suggestion
      );
      let newState = EditorState.push(
        editorState,
        newContent,
        "insert-characters"
      );
      const newText = newContent.getPlainText();

      setContextMenu(null);
      onChange?.(newText);
      // 保持 selection
      newState = EditorState.forceSelection(newState, newState.getSelection());
      setEditorState(newState);

      setIsChecking(true);
      try {
        const result = await checkWithLanguageTool(newText);
        const freshErrors = buildErrorsWithBlockKey(
          result.matches,
          newState.getCurrentContent()
        ).errors;
        setSpellErrors(freshErrors);
        if (freshErrors.length) {
          const decorator = new CompositeDecorator([
            createSpellCheckStrategy(freshErrors),
          ]);
          newState = EditorState.set(newState, { decorator });
        } else {
          newState = EditorState.set(newState, { decorator: undefined });
        }
        // 保持 selection
        setEditorState(
          EditorState.forceSelection(newState, newState.getSelection())
        );
      } catch (e) {
        console.error("重新检查失败", e);
      } finally {
        setIsChecking(false);
      }
    };

    /* -------------- 编辑内容变化 -------------- */
    const handleEditorChange = (newEditorState: EditorState) => {
      const newText = newEditorState.getCurrentContent().getPlainText();

      if (newText !== lastContentRef.current) {
        lastContentRef.current = newText;
        onChange?.(newText);
      }

      // 清空旧 errors 和 decorator，避免错位
      setSpellErrors([]);
      const noDecoratorState = EditorState.set(newEditorState, {
        decorator: undefined,
      });
      // 保持 selection
      setEditorState(
        EditorState.forceSelection(
          noDecoratorState,
          noDecoratorState.getSelection()
        )
      );
    };

    /* -------------- 初始检查 -------------- */
    useEffect(() => {
      handleSpellCheckInternal(true);
    }, []);

    /* -------------- 当 initialText 变化时更新编辑器 -------------- */
    useEffect(() => {
      const newState = EditorState.createWithContent(
        ContentState.createFromText(initialText)
      );
      setEditorState(newState);
      lastContentRef.current = initialText;
      // 初始时清空 errors，直到 check
      setSpellErrors([]);
    }, [initialText]);

    /* -------------- 渲染 -------------- */
    return (
      <div style={{ position: "relative" }}>
        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}
        <div
          style={{
            border: "1px solid #ccc",
            minHeight: "200px",
            padding: "10px",
            borderRadius: "4px",
            cursor: "text",
          }}
          onClick={() => {
            if (contextMenu) setContextMenu(null);
            if (editorRef.current) editorRef.current.focus();
          }}
        >
          <Editor
            ref={editorRef}
            editorState={editorState}
            onChange={handleEditorChange}
            placeholder="输入德语文本..."
          />
        </div>

        {contextMenu && (
          <Menu
            opened
            onClose={() => setContextMenu(null)}
            position="bottom-start"
            withinPortal
            zIndex={1000}
            styles={{
              dropdown: {
                position: "fixed",
                left: contextMenu.x,
                top: contextMenu.y,
              },
            }}
          >
            <Menu.Label>替换 "{contextMenu.word}"</Menu.Label>
            {contextMenu.suggestions.length ? (
              contextMenu.suggestions.slice(0, 5).map((s) => (
                <Menu.Item key={s} onClick={() => handleSuggestionSelect(s)}>
                  {s}
                </Menu.Item>
              ))
            ) : (
              <Menu.Item disabled>无建议替换</Menu.Item>
            )}
          </Menu>
        )}
      </div>
    );
  }
);

SpellCheckEditor.displayName = "SpellCheckEditor";

export default SpellCheckEditor;
