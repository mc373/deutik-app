import React, { useState, useRef, useCallback, useEffect } from "react";
import { processOCRText } from "../utils/ocrPostProcessor"; // 导入主处理器
import {
  Box,
  Button,
  Group,
  Paper,
  Text,
  Stack,
  ActionIcon,
  LoadingOverlay,
  Alert,
  ScrollArea,
  Progress,
} from "@mantine/core";
import {
  IconUpload,
  IconCrop,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconPlayerPlay,
  IconRotate,
  IconGripVertical,
  IconCamera,
  IconArrowBack,
  IconVolume,
  IconTextSpellcheck,
} from "@tabler/icons-react";
// import { useDisclosure } from "@mantine/hooks";
import { useDrag } from "@use-gesture/react";
import { createWorker } from "tesseract.js";
import { getGermanConfig } from "../utils/ocrConfig";
import { joinBrokenWords } from "../utils/ocrPostProcessor/lineBreakJoiner";
import { fixCommonErrors } from "../utils/ocrPostProcessor/errorCorrector";
import SpellCheckEditor from "./SpellCheckEditor";
import TTSPlayer from "./TTSPlayer";

interface OCRRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sequence: number;
}

interface OCRResult {
  regionId: string;
  sequence: number;
  text: string;
  confidence: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  processingTime: number;
}

interface SelectedRegion extends OCRRegion {
  isSelected?: boolean;
}

interface ProcessingOptions {
  removeHyphens: boolean;
  smartParagraphDetection: boolean;
  mergeAdjacentRegions: boolean;
}

export function OCRProcessor() {
  const [image, setImage] = useState<string>("");
  const [regions, setRegions] = useState<SelectedRegion[]>([]);
  // const [results, setResults] = useState<OCRResult[]>([]);
  const [processedText, setProcessedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [rotation, setRotation] = useState(0);
  // const [opened, { open, close }] = useDisclosure(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  // const [isEditing, setIsEditing] = useState(false);
  const [processingOptions] = useState<ProcessingOptions>({
    removeHyphens: true,
    smartParagraphDetection: true,
    mergeAdjacentRegions: true,
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<any>(null);

  const captureFromCamera = async () => {
    try {
      setError("");
      setProgressText("准备相机...");

      return new Promise<void>((resolve, reject) => {
        // 创建隐藏的文件输入元素
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment"; // 使用后置相机

        input.onchange = (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            const file = files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
              setImage(e.target?.result as string);
              setRegions([]);
              // setResults([]);
              setProcessedText("");
              setRotation(0);
              setProgressText("");
              resolve();
            };

            reader.onerror = () => {
              setError("读取照片失败");
              reject(new Error("读取照片失败"));
            };

            reader.readAsDataURL(file);
          } else {
            // 用户取消了拍照
            setProgressText("");
            resolve();
          }
        };

        input.onerror = (error) => {
          setError("调用相机失败");
          reject(error);
        };

        // 触发相机应用
        input.click();
      });
    } catch (error) {
      setError("相机功能不可用");
      console.error("Camera error:", error);
    }
  };

  // 获取图片的实际显示尺寸和原始尺寸的比例
  const getImageScale = useCallback(() => {
    if (!imageRef.current) return { scaleX: 1, scaleY: 1 };

    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const displayedWidth = img.offsetWidth;
    const displayedHeight = img.offsetHeight;

    return {
      scaleX: naturalWidth / displayedWidth,
      scaleY: naturalHeight / displayedHeight,
    };
  }, []);

  // 修正区域坐标到实际图片坐标
  const correctRegionCoordinates = useCallback(
    (region: SelectedRegion) => {
      if (!imageRef.current) return region;

      const scale = getImageScale();
      const img = imageRef.current;

      // 计算图片在容器中的偏移量（考虑边框、内边距等）
      const rect = img.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();

      let offsetX = 0;
      let offsetY = 0;

      if (containerRect) {
        offsetX = rect.left - containerRect.left;
        offsetY = rect.top - containerRect.top;
      }

      // 转换坐标：屏幕坐标 → 图片实际坐标
      return {
        ...region,
        x: Math.round((region.x - offsetX) * scale.scaleX),
        y: Math.round((region.y - offsetY) * scale.scaleY),
        width: Math.round(region.width * scale.scaleX),
        height: Math.round(region.height * scale.scaleY),
      };
    },
    [getImageScale]
  );

  // 获取当前选中的区域
  const selectedRegion = regions.find((r) => r.isSelected);
  const selectedRegionId = selectedRegion?.id || null;

  // 初始化Tesseract worker
  useEffect(() => {
    const initializeWorker = async () => {
      try {
        console.log("Initializing Tesseract.js worker...");
        workerRef.current = await createWorker("deu", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setProgress(Math.round(m.progress * 100));
              setProgressText(`识别中: ${Math.round(m.progress * 100)}%`);
            } else if (m.status === "loading tesseract core") {
              setProgressText("加载Tesseract核心...");
            } else if (m.status === "initializing tesseract") {
              setProgressText("初始化Tesseract...");
            } else if (m.status === "loading language traineddata") {
              setProgressText("加载语言模型...");
            }
          },
        });

        const config = getGermanConfig();
        await workerRef.current.setParameters(config);

        console.log("Tesseract.js worker initialized");
      } catch (err) {
        console.error("Failed to initialize Tesseract worker:", err);
        setError("OCR引擎初始化失败");
      }
    };

    initializeWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // 处理文件上传
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      setProgressText("");

      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setRegions([]);
        // setResults([]);
        setProcessedText("");
        setRotation(0);
      };
      reader.readAsDataURL(file);
      if (event.target) {
        event.target.value = "";
      }
    } catch (err) {
      setError("文件上传失败");
    }
  };

  // 添加新区域
  const addRegion = useCallback(() => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const newRegion: SelectedRegion = {
      id: `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: Math.round(img.offsetWidth * 0.2),
      y: Math.round(img.offsetHeight * 0.2),
      width: Math.round(img.offsetWidth * 0.3),
      height: Math.round(img.offsetHeight * 0.15),
      sequence: regions.length + 1,
      isSelected: true,
    };

    setRegions((prev) => [
      ...prev.map((r) => ({ ...r, isSelected: false })),
      newRegion,
    ]);
  }, [regions.length]);

  // 区域拖拽绑定
  const bindRegionDrag = useDrag(
    ({ movement: [mx, my], event, first, last, memo }) => {
      event?.stopPropagation();

      if (first) {
        setIsDragging(true);
        const region = regions.find((r) => r.id === selectedRegionId);
        if (region) {
          memo = { startX: region.x, startY: region.y };
          return memo;
        }
        return { startX: 0, startY: 0 };
      }

      if (last) {
        setIsDragging(false);
        return memo;
      }

      if (!selectedRegionId || !memo) return memo;

      setRegions((prev) =>
        prev.map((region) =>
          region.id === selectedRegionId
            ? {
                ...region,
                x: Math.max(0, memo.startX + mx),
                y: Math.max(0, memo.startY + my),
              }
            : region
        )
      );

      return memo;
    }
  );

  // 区域缩放绑定
  const bindRegionResize = useDrag(
    ({ movement: [mx, my], event, first, last, memo }) => {
      event?.stopPropagation();

      if (first) {
        setIsDragging(true);
        const region = regions.find((r) => r.id === selectedRegionId);
        if (region) {
          memo = { startWidth: region.width, startHeight: region.height };
          return memo;
        }
        return { startWidth: 0, startHeight: 0 };
      }

      if (last) {
        setIsDragging(false);
        return memo;
      }

      if (!selectedRegionId || !memo) return memo;

      setRegions((prev) =>
        prev.map((region) =>
          region.id === selectedRegionId
            ? {
                ...region,
                width: Math.max(50, memo.startWidth + mx),
                height: Math.max(30, memo.startHeight + my),
              }
            : region
        )
      );

      return memo;
    }
  );

  // 选择区域
  const selectRegion = (id: string) => {
    setRegions((prev) =>
      prev.map((region) => ({
        ...region,
        isSelected: region.id === id,
      }))
    );
  };

  // 删除区域
  const deleteRegion = (id: string) => {
    setRegions((prev) => {
      const newRegions = prev.filter((region) => region.id !== id);
      return newRegions.map((region, index) => ({
        ...region,
        sequence: index + 1,
        isSelected: false,
      }));
    });
  };

  // 调整区域顺序
  const moveRegionInList = (id: string, direction: "up" | "down") => {
    setRegions((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      if (index === -1) return prev;

      const newRegions = [...prev];
      if (direction === "up" && index > 0) {
        [newRegions[index], newRegions[index - 1]] = [
          newRegions[index - 1],
          newRegions[index],
        ];
      } else if (direction === "down" && index < newRegions.length - 1) {
        [newRegions[index], newRegions[index + 1]] = [
          newRegions[index + 1],
          newRegions[index],
        ];
      }

      return newRegions.map((region, idx) => ({
        ...region,
        sequence: idx + 1,
        isSelected: region.id === id,
      }));
    });
  };

  const cropImage = async (region: OCRRegion): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = region.width;
        canvas.height = region.height;

        // 根据旋转角度处理裁剪
        if (rotation !== 0) {
          // 创建临时canvas处理旋转
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");

          if (!tempCtx) {
            reject(new Error("Could not get temp canvas context"));
            return;
          }

          // 根据旋转角度调整尺寸
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;

          // 绘制原图
          tempCtx.drawImage(img, 0, 0);
          tempCtx.filter = "contrast(1.5) brightness(1.2)"; // 简单滤镜
          // 旋转处理
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((-rotation * Math.PI) / 180); // 反向旋转以校正

          // 绘制裁剪区域（考虑旋转后的坐标）
          ctx.drawImage(
            tempCanvas,
            region.x,
            region.y,
            region.width,
            region.height,
            -region.width / 2,
            -region.height / 2,
            region.width,
            region.height
          );

          ctx.restore();
        } else {
          // 无旋转的直接裁剪
          ctx.drawImage(
            img,
            region.x,
            region.y,
            region.width,
            region.height,
            0,
            0,
            region.width,
            region.height
          );
        }

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = reject;
      img.src = image;
    });
  };

  // 处理连字符和换行
  // 完整的文本处理函数

  // 合并相邻区域的文本
  const mergeRegionTexts = (results: OCRResult[]): string => {
    const sortedResults = [...results].sort((a, b) => a.sequence - b.sequence);

    // 简单的合并逻辑：直接按顺序用空格连接
    return sortedResults.map((result) => result.text).join(" ");

    // 或者更智能一点的逻辑：如果区域在原文中相距较远，可以用两个换行符连接
    // ... (这部分可以后续优化)
  };

  // 执行OCR识别
  const performOCR = async () => {
    if (!image || regions.length === 0 || !workerRef.current) return;

    setIsProcessing(true);
    setError("");
    setProgress(0);
    setProgressText("开始处理...");

    try {
      const ocrResults: OCRResult[] = [];
      const totalStartTime = Date.now();

      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        setProgressText(`处理区域 ${i + 1}/${regions.length}...`);
        setProgress(Math.round((i / regions.length) * 100));

        const regionStartTime = Date.now();

        try {
          // 修正坐标到实际图片坐标
          const correctedRegion = correctRegionCoordinates(region);

          // 裁剪图像区域
          const croppedImage = await cropImage(correctedRegion);

          // OCR识别
          const { data } = await workerRef.current.recognize(croppedImage);
          const processingTime = Date.now() - regionStartTime;

          // +++ 新增: 获取原始文本后，立即处理该区域的断行和错误 +++
          let regionText = data.text;
          console.log("原始数据" + region.sequence + ":", regionText);

          regionText = joinBrokenWords(regionText); // 先处理断行
          regionText = fixCommonErrors(regionText); // 再修正错误
          // +++ 新增结束 +++

          ocrResults.push({
            regionId: region.id,
            sequence: region.sequence,
            text: regionText,
            confidence: data.confidence,
            coordinates: correctedRegion,
            processingTime,
          });

          console.log("Region coordinates:", {
            screen: {
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height,
            },
            actual: correctedRegion,
          });
        } catch (error) {
          console.error(`Error processing region ${i + 1}:`, error);
          ocrResults.push({
            regionId: region.id,
            sequence: region.sequence,
            text: "",
            confidence: 0,
            coordinates: correctRegionCoordinates(region),
            processingTime: 0,
          });
        }
      }

      const totalTime = Date.now() - totalStartTime;

      // setResults(ocrResults.sort((a, b) => a.sequence - b.sequence));

      // 处理并合并文本
      // const finalText = cleanGermanText(mergeRegionTexts(ocrResults));

      const mergedRawText = mergeRegionTexts(ocrResults); // 假设这个函数返回拼接后的原始字符串
      const finalText = processOCRText(mergedRawText, processingOptions); // 使用新管道

      setProcessedText(finalText);

      setProgress(100);
      setProgressText(`处理完成，耗时 ${totalTime}ms`);

      // open();
    } catch (err: any) {
      setError(err.message || "识别失败");
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressText("");
    }
  };

  // 旋转图片
  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // // 复制文本到剪贴板
  // const copyToClipboard = () => {
  //   navigator.clipboard.writeText(processedText);
  // };
  // 编辑文本变化处理
  // 处理编辑器文本变化
  const [showSpellCheck] = useState(false);

  const [showTTSPlayer, setShowTTSPlayer] = useState(false);
  const [editorText, setEditorText] = useState(processedText);
  const [isCheckingSpell, setIsCheckingSpell] = useState(false);
  const spellCheckEditorRef = useRef<{ handleSpellCheck: () => Promise<void> }>(
    null
  );
  // 添加拼写检查函数
  const handleSpellCheck = useCallback(async () => {
    if (!editorText) return;

    setIsCheckingSpell(true);
    try {
      if (spellCheckEditorRef.current) {
        await spellCheckEditorRef.current.handleSpellCheck();
      }
    } catch (error) {
      console.error("拼写检查失败:", error);
      setError("拼写检查失败");
    } finally {
      setIsCheckingSpell(false);
    }
  }, [editorText]);
  const handleEditorChange = (value: string) => {
    setEditorText(value);
    setProcessedText(value); // 同步更新 processedText
  };

  return (
    <Paper p="md" withBorder style={{ position: "relative" }}>
      <LoadingOverlay
        visible={isProcessing}
        loaderProps={{
          children: (
            <div>
              <Text size="sm" mb="xs">
                {progressText}
              </Text>
              <Progress value={progress} size="xl" />
            </div>
          ),
        }}
      />

      {/* 操作工具栏 */}
      <Group mb="md">
        <Button
          leftSection={<IconUpload size={16} />}
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
        >
          上传图片
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </Button>
        <Button
          leftSection={<IconCamera size={16} />}
          onClick={captureFromCamera}
          variant="outline"
        >
          拍照上传
        </Button>

        {image && (!processedText || processedText == "") && (
          <>
            <Button leftSection={<IconCrop size={16} />} onClick={addRegion}>
              添加区域
            </Button>
            <Button
              leftSection={<IconRotate size={16} />}
              onClick={rotateImage}
              variant="outline"
            >
              旋转
            </Button>
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              onClick={performOCR}
              disabled={regions.length === 0}
              color="blue"
            >
              开始识别 ({regions.length})
            </Button>
          </>
        )}
        {/* 添加拼写检查和TTS按钮 - 在识别完成后显示 */}
        {processedText && processedText !== "" && !showTTSPlayer && (
          <>
            <Button
              leftSection={<IconTextSpellcheck size={16} />}
              onClick={handleSpellCheck} // 修改为调用 handleSpellCheck
              variant={showSpellCheck ? "filled" : "outline"}
              loading={isCheckingSpell}
            >
              {showSpellCheck ? "隐藏拼写检查" : "拼写检查"}
            </Button>

            <Button
              leftSection={<IconVolume size={16} />}
              onClick={() => {
                if (!editorText && !processedText) {
                  setError("没有可生成的文本");
                  return;
                }
                setShowTTSPlayer(true);
              }}
              variant="outline"
            >
              生成语音
            </Button>
          </>
        )}

        {showTTSPlayer && (
          <Button
            variant="subtle"
            leftSection={<IconArrowBack size={16} />}
            onClick={() => setShowTTSPlayer(false)}
          >
            返回OCR
          </Button>
        )}
      </Group>

      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}
      {showTTSPlayer ? (
        <TTSPlayer
          text={editorText || processedText}
          onBack={() => setShowTTSPlayer(false)}
        />
      ) : (
        <>
          {/* 图片显示区域 */}
          {image && (!processedText || processedText == "") && (
            <Box
              ref={containerRef}
              style={{
                position: "relative",
                overflow: "hidden",
                border: "1px solid #ddd",
                borderRadius: "8px",
                cursor: isDragging ? "grabbing" : "default",
                userSelect: "none",
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setRegions((prev) =>
                    prev.map((r) => ({ ...r, isSelected: false }))
                  );
                }
              }}
            >
              <img
                ref={imageRef}
                src={image}
                alt="待识别文档"
                style={{
                  maxWidth: "100%",
                  display: "block",
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.3s ease",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />

              {/* 识别区域框 */}
              {regions.map((region) => (
                <Box
                  key={region.id}
                  {...(region.isSelected ? bindRegionDrag() : {})}
                  style={{
                    position: "absolute",
                    left: region.x,
                    top: region.y,
                    width: region.width,
                    height: region.height,
                    border: region.isSelected
                      ? "2px solid #228be6"
                      : "2px dashed #666",
                    backgroundColor: region.isSelected
                      ? "rgba(34, 139, 230, 0.2)"
                      : "rgba(34, 139, 230, 0.1)",
                    cursor: region.isSelected ? "move" : "pointer",
                    zIndex: 10,
                    boxSizing: "border-box",
                    touchAction: "none",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectRegion(region.id);
                  }}
                >
                  {/* 区域编号 */}
                  <Text
                    size="xs"
                    style={{
                      position: "absolute",
                      top: -25,
                      left: 0,
                      background: "#228be6",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      pointerEvents: "none",
                    }}
                  >
                    {region.sequence}
                  </Text>

                  {/* 缩放手柄 */}
                  {region.isSelected && (
                    <Box
                      {...bindRegionResize()}
                      style={{
                        position: "absolute",
                        right: -6,
                        bottom: -6,
                        width: 12,
                        height: 12,
                        backgroundColor: "#228be6",
                        border: "2px solid white",
                        borderRadius: "50%",
                        cursor: "nwse-resize",
                        zIndex: 11,
                      }}
                    />
                  )}

                  {/* 拖动指示器 */}
                  {region.isSelected && (
                    <Box
                      style={{
                        position: "absolute",
                        top: 4,
                        left: 4,
                        cursor: "move",
                        pointerEvents: "none",
                      }}
                    >
                      <IconGripVertical size={14} color="#228be6" />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* 区域管理面板 */}
          {regions.length > 0 && (!processedText || processedText == "") && (
            <Paper mt="md" p="md" withBorder>
              <Text size="sm" fw={500} mb="xs">
                识别区域列表：
              </Text>
              <ScrollArea style={{ maxHeight: 200 }}>
                <Stack gap="xs">
                  {regions.map((region) => (
                    <Group
                      key={region.id}
                      justify="space-between"
                      bg={region.isSelected ? "blue.0" : "transparent"}
                      p="xs"
                      style={{ borderRadius: "4px" }}
                    >
                      <Text size="sm">
                        {region.sequence}. 区域 {region.id.slice(-6)}
                        {region.isSelected && " (选中)"}
                      </Text>
                      <Group gap="xs">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          disabled={region.sequence === 1}
                          onClick={() => moveRegionInList(region.id, "up")}
                        >
                          <IconArrowUp size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          disabled={region.sequence === regions.length}
                          onClick={() => moveRegionInList(region.id, "down")}
                        >
                          <IconArrowDown size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => deleteRegion(region.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Paper>
          )}

          {/* 操作提示 */}
          {regions.length > 0 && (!processedText || processedText == "") && (
            <Text size="xs" c="dimmed" mt="sm">
              💡 提示：拖动区域移动位置，拖动右下角调整大小，点击区域选中
            </Text>
          )}
          {/*文本编辑取*/}
          {(processedText || processedText != "") && (
            <SpellCheckEditor
              ref={spellCheckEditorRef}
              initialText={processedText}
              onChange={handleEditorChange} // 使用 handleEditorChange 更新 editorText
            />
          )}
        </>
      )}

      {/* 结果模态框 */}
    </Paper>
  );
}
