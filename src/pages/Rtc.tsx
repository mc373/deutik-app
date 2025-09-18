import { useState } from "react";
import NativeCamera from "../components/WebRtctest";
const Rtc = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{
    name: string;
    size: number;
  } | null>(null);

  const handleImageCapture = (file: File, imageUrl: string) => {
    setCapturedImage(imageUrl);
    setImageInfo({
      name: file.name,
      size: file.size,
    });

    // 这里你可以直接处理文件或上传到你的OCR服务
    console.log("捕获到图片:", file.name, "大小:", file.size, "bytes");
  };

  const handleError = (error: Error) => {
    console.error("相机错误:", error.message);
    alert("调用相机失败: " + error.message);
  };

  return (
    <div>
      <h1>文档拍摄</h1>

      <NativeCamera onImageCapture={handleImageCapture} onError={handleError} />

      {capturedImage && imageInfo && (
        <div>
          <h2>拍摄结果</h2>
          <p>文件名: {imageInfo.name}</p>
          <p>文件大小: {Math.round(imageInfo.size / 1024)} KB</p>
          <img
            src={capturedImage}
            alt="拍摄的文档"
            style={{ maxWidth: "100%", marginTop: "20px" }}
          />

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={() => {
                // 这里可以调用你现有的OCR处理代码
                console.log("开始处理图像...");
              }}
            >
              处理图像
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rtc;
