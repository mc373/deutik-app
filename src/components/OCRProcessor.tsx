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
              resizeImageIfNeeded(e.target?.result as string)
                .then((resizedImage) => {
                  setImage(resizedImage);
                  setRegions([]);
                  // setResults([]);
                  setProcessedText("");
                  setProgressText("");
                  resolve();
                })
                .catch(reject);
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

  // 图像预处理函数：如果长边 >1024，等比缩小到长边=1024
  const resizeImageIfNeeded = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageDataUrl;
      img.onload = () => {
        let { width, height } = img;
        const maxSize = 1024;
        if (Math.max(width, height) <= maxSize) {
          resolve(imageDataUrl); // 小于1024，不处理
          return;
        }

        // 计算缩放比例
        const ratio = maxSize / Math.max(width, height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        // 使用 canvas 调整大小
        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        resolve(canvas.toDataURL("image/jpeg", 0.9)); // 以 JPEG 格式输出，质量 90%
      };
      img.onerror = reject;
    });
  };

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
        resizeImageIfNeeded(e.target?.result as string).then((resizedImage) => {
          setImage(resizedImage);
          setRegions([]);
          // setResults([]);
          setProcessedText("");
        });
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

  // 旋转图片数据（使用 Canvas 生成新 Base64）
  const rotateImageData = async (
    src: string,
    degrees: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // 根据旋转角度调整画布尺寸
        const absDegrees = degrees % 360;
        if (absDegrees === 90 || absDegrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // 应用旋转
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(
          img,
          -img.width / 2,
          -img.height / 2,
          img.width,
          img.height
        );

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = reject;
    });
  };

  // 旋转图片（更新图片源，清空区域）
  const rotateImage = async () => {
    if (!image) return;
    try {
      setProgressText("正在旋转图片...");
      const rotated = await rotateImageData(image, 90);
      setImage(rotated);
      setRegions([]); // 清空区域，因为坐标变化
      setProgressText("");
    } catch (err) {
      setError("旋转失败");
    }
  };

  // 裁剪图片（简化版，无旋转处理）
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

        // 应用简单滤镜（可选，与原代码一致，仅在需要时添加）
        ctx.filter = "contrast(1.5) brightness(1.2)";

        // 直接裁剪
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

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = reject;
      img.src = image;
    });
  };

  // 合并相邻区域的文本
  const mergeRegionTexts = (results: OCRResult[]): string => {
    const sortedResults = [...results].sort((a, b) => a.sequence - b.sequence);

    // 简单的合并逻辑：直接按顺序用空格连接
    return sortedResults.map((result) => result.text).join("\n");

    // 或者更智能一点的逻辑：如果区域在原文中相距较远，可以用两个换行符连接
    // ... (这部分可以后续优化)
  };

  // 执行OCR识别（改为调用 PaddleOCR API）
  const performOCR = async () => {
    if (!image || regions.length === 0) return;

    setIsProcessing(true);
    setError("");
    setProgress(0);
    setProgressText("开始处理...");

    try {
      const formData = new FormData();
      const correctedRegions: OCRRegion[] = [];

      // 准备所有文件
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        setProgressText(`准备区域 ${i + 1}/${regions.length}...`);
        setProgress(Math.round((i / regions.length) * 50));

        const correctedRegion = correctRegionCoordinates(region);
        correctedRegions.push(correctedRegion);

        const croppedBase64 = await cropImage(correctedRegion);
        const byteString = atob(croppedBase64.split(",")[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) {
          ia[j] = byteString.charCodeAt(j);
        }
        const blob = new Blob([ab], { type: "image/png" });

        formData.append("files", blob, `region_${i}.png`);
      }

      setProgressText("正在识别文本...");
      setProgress(75);

      // 批量发送请求
      const response = await fetch("https://paddle.deutik.com/ocr/rec/batch", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.statusText}`);
      }

      const apiData = await response.json();
      // console.log("OCR API 返回数据:", apiData);

      if (apiData.status === "success") {
        const ocrResults: OCRResult[] = [];

        apiData.results.forEach((batchResult: any, index: number) => {
          if (batchResult.status === "success") {
            const region = regions[index];
            const regionText = batchResult.results
              .map((line: any) => line.text)
              .join("\n");

            ocrResults.push({
              regionId: region.id,
              sequence: region.sequence,
              text: regionText,
              confidence:
                batchResult.results.length > 0
                  ? batchResult.results[0].score
                  : 0,
              coordinates: correctedRegions[index],
              processingTime: batchResult.processing_time,
            });
          }
        });

        // 合并文本
        const mergedRawText = mergeRegionTexts(ocrResults);
        // console.log("合并后的原始文本:", mergedRawText);
        const finalText = processOCRText(mergedRawText, processingOptions);

        setProcessedText(finalText);
        setProgress(100);
        setProgressText(`处理完成，共识别 ${apiData.total_files} 个区域`);
      }
    } catch (err: any) {
      setError(err.message || "识别失败");
    } finally {
      setIsProcessing(false);
    }
  };

  // // 复制文本到剪贴板
  // const copyToClipboard = () => {
  //   navigator.clipboard.writeText(processedText);
  // };
  // 编辑文本变化处理
  // 处理编辑器文本变化
  const [showSpellCheck, setShowSpellCheck] = useState(false); // 修正为完整 useState

  const [showTTSPlayer, setShowTTSPlayer] = useState(false);
  const [editorText, setEditorText] = useState(""); // 初始化为空
  const [isCheckingSpell, setIsCheckingSpell] = useState(false);
  const spellCheckEditorRef = useRef<{ handleSpellCheck: () => Promise<void> }>(
    null
  );

  // 当 processedText 更新时，同步到 editorText（如果 editorText 未被用户修改）
  useEffect(() => {
    setEditorText(processedText); // 每次 OCR 后立即同步
  }, [processedText]);

  // 添加拼写检查函数
  const handleSpellCheck = useCallback(async () => {
    if (!editorText) return;

    setIsCheckingSpell(true);
    try {
      if (spellCheckEditorRef.current) {
        await spellCheckEditorRef.current.handleSpellCheck();
      }
      setShowSpellCheck(!showSpellCheck); // toggle 显示
    } catch (error) {
      console.error("拼写检查失败:", error);
      setError("拼写检查失败");
    } finally {
      setIsCheckingSpell(false);
    }
  }, [editorText, showSpellCheck]);

  const handleEditorChange = (value: string) => {
    setEditorText(value); // 只更新 editorText，不再更新 processedText
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
                // console.log("editorText:", editorText);
                // console.log("processedText:", processedText);
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
          text={editorText || processedText} // 优先用 editorText
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
                        touchAction: "none", // 添加这一行
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
          {/*文本编辑区*/}
          {(processedText || processedText != "") && (
            <SpellCheckEditor
              ref={spellCheckEditorRef}
              initialText={processedText}
              onChange={handleEditorChange} // 使用 handleEditorChange 更新 editorText
            />
          )}
        </>
      )}
    </Paper>
  );
}
