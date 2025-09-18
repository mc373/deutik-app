import React, { useState, useRef, useEffect, useCallback } from "react";
import { createWorker } from "tesseract.js";

interface OCRRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SimpleOCRTester: React.FC = () => {
  const [image, setImage] = useState<string>("");
  const [regions, setRegions] = useState<OCRRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [results, setResults] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<any>(null);

  // 初始化Tesseract worker
  useEffect(() => {
    const initWorker = async () => {
      workerRef.current = await createWorker("eng");
    };
    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setRegions([]);
      setResults("");
      setScale(1.0);
    };
    reader.readAsDataURL(file);
  };

  // 添加选择区域
  const addRegion = useCallback(() => {
    if (!imageRef.current) return;

    const newRegion: OCRRegion = {
      id: `region_${Date.now()}`,
      x: 50,
      y: 50,
      width: 200,
      height: 100,
    };

    setRegions((prev) => [...prev, newRegion]);
    setSelectedRegion(newRegion.id);
  }, []);

  // 处理鼠标按下（开始拖动区域）
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, regionId: string) => {
      e.stopPropagation();
      setSelectedRegion(regionId);
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    []
  );

  // 处理鼠标移动（拖动区域）
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !selectedRegion) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      setRegions((prev) =>
        prev.map((region) =>
          region.id === selectedRegion
            ? { ...region, x: region.x + dx, y: region.y + dy }
            : region
        )
      );

      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, selectedRegion, dragStart]
  );

  // 处理鼠标松开（停止拖动）
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 缩放图片
  const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScale(parseFloat(event.target.value));
  };

  // 裁剪并识别区域
  const recognizeRegion = useCallback(
    async (region: OCRRegion) => {
      if (!imageRef.current || !workerRef.current) return "";

      const img = imageRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return "";

      // 设置画布大小（考虑缩放）
      canvas.width = region.width * scale;
      canvas.height = region.height * scale;

      // 高质量缩放绘制
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      try {
        const { data } = await workerRef.current.recognize(canvas);
        return data.text;
      } catch (error) {
        console.error("OCR识别失败:", error);
        return "";
      }
    },
    [scale]
  );

  // 识别所有区域
  const recognizeAllRegions = async () => {
    if (regions.length === 0 || !workerRef.current) return;

    setIsProcessing(true);
    setResults("识别中...");

    try {
      const results = await Promise.all(
        regions.map((region) => recognizeRegion(region))
      );

      setResults(results.filter((text) => text.trim()).join("\n\n"));
    } catch (error) {
      console.error("识别失败:", error);
      setResults("识别失败");
    } finally {
      setIsProcessing(false);
    }
  };

  // 删除选中区域
  const deleteSelectedRegion = () => {
    if (!selectedRegion) return;
    setRegions((prev) => prev.filter((region) => region.id !== selectedRegion));
    setSelectedRegion(null);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>OCR 图片识别测试</h2>

      {/* 控制栏 */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ marginRight: "10px" }}
        />

        {image && (
          <>
            <button onClick={addRegion} style={{ marginRight: "10px" }}>
              添加选择区域
            </button>

            <button
              onClick={recognizeAllRegions}
              disabled={isProcessing || regions.length === 0}
              style={{ marginRight: "10px" }}
            >
              {isProcessing ? "识别中..." : "开始识别"}
            </button>

            {selectedRegion && (
              <button
                onClick={deleteSelectedRegion}
                style={{ marginRight: "10px" }}
              >
                删除选中区域
              </button>
            )}

            <div style={{ marginTop: "10px" }}>
              <label>
                图片缩放: {scale.toFixed(1)}x
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={scale}
                  onChange={handleScaleChange}
                  style={{ width: "200px", marginLeft: "10px" }}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* 图片和选择区域 */}
      {image && (
        <div
          ref={containerRef}
          style={{
            border: "2px solid #ccc",
            overflow: "auto",
            maxHeight: "600px",
            position: "relative",
            marginBottom: "20px",
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={image}
            alt="OCR测试"
            style={{
              display: "block",
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
            }}
            onLoad={() => {
              // 图片加载完成后重置区域
              setRegions([]);
              setSelectedRegion(null);
            }}
          />

          {/* 绘制选择区域 */}
          {regions.map((region) => (
            <div
              key={region.id}
              style={{
                position: "absolute",
                left: region.x,
                top: region.y,
                width: region.width,
                height: region.height,
                border:
                  region.id === selectedRegion
                    ? "3px solid #ff0000"
                    : "2px dashed #007bff",
                backgroundColor:
                  region.id === selectedRegion
                    ? "rgba(255, 0, 0, 0.2)"
                    : "rgba(0, 123, 255, 0.1)",
                cursor: "move",
                boxSizing: "border-box",
              }}
              onMouseDown={(e) => handleMouseDown(e, region.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRegion(region.id);
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-25px",
                  left: "0",
                  background: "#007bff",
                  color: "white",
                  padding: "2px 8px",
                  fontSize: "12px",
                  borderRadius: "3px",
                }}
              >
                区域 {regions.findIndex((r) => r.id === region.id) + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 识别结果 */}
      {results && (
        <div>
          <h3>识别结果:</h3>
          <textarea
            value={results}
            readOnly
            style={{
              width: "100%",
              height: "200px",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />
        </div>
      )}

      {/* 使用说明 */}
      {image && (
        <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
          <p>💡 使用说明:</p>
          <ul>
            <li>拖动滑块调节图片大小</li>
            <li>点击"添加选择区域"创建识别区域</li>
            <li>拖动区域可以移动位置</li>
            <li>点击区域可以选中（红色边框）</li>
            <li>点击"开始识别"进行OCR识别</li>
            <li>选中区域后可以点击"删除选中区域"</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SimpleOCRTester;
