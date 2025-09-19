import { useState } from "react";
import {
  Editor,
  EditorState,
  ContentState,
  Modifier,
  SelectionState,
} from "draft-js";
import "draft-js/dist/Draft.css";

// 1. 样式映射：红色下划线
const customStyleMap = {
  RED_UNDERLINE: {
    textDecoration: "underline",
    textDecorationColor: "red",
  },
};

function RedUnderlineExample() {
  // 2. 初始句子
  const text = "this is a good book";

  // 3. 创建带内容的 EditorState
  const [editorState, setEditorState] = useState(() => {
    const content = ContentState.createFromText(text);

    // 4. 找到 “good” 的起止位置
    const start = text.indexOf("good");
    const end = start + 4; // "good" 长度 4

    // 5. 创建选中范围
    const selection = SelectionState.createEmpty(
      content.getFirstBlock().getKey()
    ).merge({
      anchorOffset: start,
      focusOffset: end,
    });

    // 6. 打上自定义 inline style
    const withStyle = Modifier.applyInlineStyle(
      content,
      selection,
      "RED_UNDERLINE"
    );

    return EditorState.createWithContent(withStyle);
  });

  return (
    <div style={{ border: "1px solid #ccc", padding: 12, minHeight: 100 }}>
      <Editor
        editorState={editorState}
        onChange={setEditorState}
        customStyleMap={customStyleMap}
      />
    </div>
  );
}

export default RedUnderlineExample;
