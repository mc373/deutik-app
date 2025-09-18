import React, { useState } from "react";

interface NativeCameraProps {
  onImageCapture: (file: File, imageUrl: string) => void;
  onError?: (error: Error) => void;
}

const NativeCamera: React.FC<NativeCameraProps> = ({
  onImageCapture,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const capturePhoto = async () => {
    setIsLoading(true);

    return new Promise<void>((resolve) => {
      // 创建隐藏的文件输入元素
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment"; // 使用后置相机

      input.onchange = (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          const imageUrl = URL.createObjectURL(file);
          onImageCapture(file, imageUrl);
        }
        setIsLoading(false);
        resolve();
      };

      input.onerror = () => {
        setIsLoading(false);
        onError?.(new Error("相机调用失败"));
        resolve();
      };

      // 添加点击事件处理，处理用户取消的情况
      const handleCancel = () => {
        setTimeout(() => {
          setIsLoading(false);
          resolve();
        }, 1000);
      };

      window.addEventListener("focus", handleCancel, { once: true });

      // 触发相机应用
      input.click();
    });
  };

  return (
    <div>
      <button onClick={capturePhoto} disabled={isLoading}>
        {isLoading ? "正在调用相机..." : "📷 拍摄照片"}
      </button>
    </div>
  );
};

export default NativeCamera;
