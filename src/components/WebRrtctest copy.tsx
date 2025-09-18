import React, { useRef, useState, useEffect } from "react";

// OpenCV.js 类型声明
interface OpenCv {
  Mat: new () => OpenCvMat;
  MatVector: new () => OpenCvMatVector;
  imread: (canvas: HTMLCanvasElement) => OpenCvMat;
  imshow: (canvas: HTMLCanvasElement, mat: OpenCvMat) => void;
  cvtColor: (src: OpenCvMat, dst: OpenCvMat, code: number) => void;
  Canny: (src: OpenCvMat, dst: OpenCvMat, low: number, high: number) => void;
  findContours: (
    src: OpenCvMat,
    contours: OpenCvMatVector,
    hierarchy: OpenCvMat,
    mode: number,
    method: number
  ) => void;
  contourArea: (contour: OpenCvMat) => number;
  arcLength: (contour: OpenCvMat, closed: boolean) => number;
  approxPolyDP: (
    curve: OpenCvMat,
    approxCurve: OpenCvMat,
    epsilon: number,
    closed: boolean
  ) => void;
  matFromArray: (
    rows: number,
    cols: number,
    type: number,
    array: number[]
  ) => OpenCvMat;
  getPerspectiveTransform: (src: OpenCvMat, dst: OpenCvMat) => OpenCvMat;
  warpPerspective: (
    src: OpenCvMat,
    dst: OpenCvMat,
    M: OpenCvMat,
    size: OpenCvSize
  ) => void;
  threshold: (
    src: OpenCvMat,
    dst: OpenCvMat,
    thresh: number,
    maxval: number,
    type: number
  ) => void;
  getBuildInformation?: () => string; // 可选属性，避免 TS2774
  clone: (mat: OpenCvMat) => OpenCvMat;
  Size: new (width: number, height: number) => OpenCvSize;
  onRuntimeInitialized?: () => void;
  COLOR_RGBA2GRAY: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  CV_32FC2: number;
  THRESH_BINARY: number;
  THRESH_OTSU: number;
}

interface OpenCvMat {
  delete: () => void;
  rows: number;
  data32F: Float32Array;
  clone: () => OpenCvMat;
}

interface OpenCvMatVector {
  size: () => number;
  get: (index: number) => OpenCvMat;
  delete: () => void;
}

interface OpenCvSize {
  width: number;
  height: number;
}

declare const cv: OpenCv | undefined; // 允许 cv 未定义

const CameraComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [isOpenCvLoaded, setIsOpenCvLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 异步加载 OpenCV.js
  const loadOpenCv = () => {
    return new Promise<void>((resolve, reject) => {
      if (typeof cv !== "undefined" && "getBuildInformation" in cv) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://docs.opencv.org/4.x/opencv.js";
      script.async = true;
      script.onload = () => {
        if (typeof cv !== "undefined" && "getBuildInformation" in cv) {
          cv.onRuntimeInitialized = () => {
            resolve();
          };
        } else {
          reject(new Error("OpenCV.js 加载失败"));
        }
      };
      script.onerror = () => reject(new Error("无法加载 OpenCV.js"));
      document.body.appendChild(script);
    });
  };

  // 启动相机并加载 OpenCV.js
  const startCamera = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraStarted(true);
      }
      await loadOpenCv();
      setIsOpenCvLoaded(true);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("无法访问相机或加载 OpenCV.js:", error.message);
      alert("错误: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 拍摄并处理图像
  const captureAndProcess = () => {
    if (
      !isOpenCvLoaded ||
      !videoRef.current ||
      !canvasRef.current ||
      !outputCanvasRef.current
    ) {
      alert("OpenCV.js 未加载或相机未准备好");
      return;
    }
    if (typeof cv === "undefined") {
      alert("OpenCV.js 未加载");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const outputCanvas = outputCanvasRef.current;

    // 1. 拍照（原始分辨率）
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    // 2. OpenCV 管道
    let src: OpenCvMat | null = null;
    let gray: OpenCvMat | null = null;
    let edges: OpenCvMat | null = null;
    let contours: OpenCvMatVector | null = null;
    let hierarchy: OpenCvMat | null = null;
    let approx: OpenCvMat | null = null;
    let srcPts: OpenCvMat | null = null;
    let dstPts: OpenCvMat | null = null;
    let M: OpenCvMat | null = null;
    let warped: OpenCvMat | null = null;
    let sharpened: OpenCvMat | null = null;
    let labels: OpenCvMat | null = null;
    let stats: OpenCvMat | null = null;
    let centroids: OpenCvMat | null = null;

    try {
      src = cv.imread(canvas);
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // 边缘检测
      edges = new cv.Mat();
      cv.Canny(gray, edges, 50, 150);

      // 找最大轮廓
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(
        edges,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      let maxArea = 0;
      let maxIdx = -1;
      for (let i = 0; i < contours.size(); i++) {
        const a = cv.contourArea(contours.get(i));
        if (a > maxArea) {
          maxArea = a;
          maxIdx = i;
        }
      }

      if (maxIdx === -1) throw new Error("未检测到页面边界");

      // 近似四边形
      const maxContour = contours.get(maxIdx);
      const peri = cv.arcLength(maxContour, true);
      approx = new cv.Mat();
      cv.approxPolyDP(maxContour, approx, 0.02 * peri, true);
      if (approx.rows !== 4) throw new Error("未检测到四边形");

      // 4 个角点
      const pts: number[] = [];
      for (let i = 0; i < 4; i++) {
        pts.push(approx.data32F[i * 2], approx.data32F[i * 2 + 1]);
      }

      // 动态目标尺寸（最长边不超过 2048）
      const w = Math.max(
        Math.hypot(pts[2] - pts[0], pts[3] - pts[1]),
        Math.hypot(pts[6] - pts[4], pts[7] - pts[5])
      );
      const h = Math.max(
        Math.hypot(pts[4] - pts[0], pts[5] - pts[1]),
        Math.hypot(pts[6] - pts[2], pts[7] - pts[3])
      );
      const scale = Math.min(2048 / Math.max(w, h), 1);
      const outW = Math.round(w * scale);
      const outH = Math.round(h * scale);

      srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, pts);
      dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0,
        0,
        outW,
        0,
        outW,
        outH,
        0,
        outH,
      ]);
      M = cv.getPerspectiveTransform(srcPts, dstPts);
      warped = new cv.Mat();
      cv.warpPerspective(gray, warped, M, new cv.Size(outW, outH));

      // 锐化
      const kernel = cv.matFromArray(
        3,
        3,
        (cv as any).CV_32FC1,
        [0, -1, 0, -1, 5, -1, 0, -1, 0]
      );
      sharpened = new cv.Mat();
      (cv as any).filter2D(warped, sharpened, -1, kernel);

      // 自适应二值化（黑字白底）
      cv.threshold(
        sharpened,
        sharpened,
        0,
        255,
        cv.THRESH_BINARY + cv.THRESH_OTSU
      );
      (cv as any).bitwise_not(sharpened, sharpened); // 黑字白底

      // 孤立黑点降噪
      labels = new cv.Mat();
      stats = new cv.Mat();
      centroids = new cv.Mat();
      const num = (cv as any).connectedComponentsWithStats(
        sharpened,
        labels,
        stats,
        centroids
      );
      for (let i = 1; i < num; i++) {
        const area = (stats as any).intAt(i, (cv as any).CC_STAT_AREA);
        const ww = (stats as any).intAt(i, (cv as any).CC_STAT_WIDTH);
        const hh = (stats as any).intAt(i, (cv as any).CC_STAT_HEIGHT);
        if (area < 20 && ww < 7 && hh < 7) {
          const mask = new cv.Mat();
          (cv as any).inRange(
            labels,
            new (cv as any).Scalar(i),
            new (cv as any).Scalar(i),
            mask
          );
          (sharpened as any).setTo(new (cv as any).Scalar(255), mask);
          mask.delete();
        }
      }

      // 输出
      cv.imshow(outputCanvas, sharpened);
      const pngUrl = outputCanvas.toDataURL("image/png");
      setPhotoSrc(pngUrl);
    } catch (err: any) {
      console.error(err);
      alert("处理失败: " + err.message);
    } finally {
      src?.delete();
      gray?.delete();
      edges?.delete();
      contours?.delete();
      hierarchy?.delete();
      approx?.delete();
      srcPts?.delete();
      dstPts?.delete();
      M?.delete();
      warped?.delete();
      sharpened?.delete();
      labels?.delete();
      stats?.delete();
      centroids?.delete();
    }
  };

  // 清理相机流
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas ref={outputCanvasRef} style={{ display: "none" }} />
      {!isCameraStarted && (
        <button onClick={startCamera} disabled={isLoading}>
          {isLoading ? "正在加载..." : "启动相机"}
        </button>
      )}
      {isCameraStarted && (
        <button onClick={captureAndProcess} disabled={!isOpenCvLoaded}>
          {isOpenCvLoaded ? "拍照并处理" : "等待 OpenCV.js 加载..."}
        </button>
      )}
      {photoSrc && <img src={photoSrc} alt="处理后的黑白照片" />}
    </div>
  );
};

export default CameraComponent;
