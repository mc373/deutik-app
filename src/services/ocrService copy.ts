import { createWorker } from "tesseract.js";

export interface OCRRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sequence: number;
}

export interface OCRResult {
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

export interface OCRResponse {
  success: boolean;
  results: OCRResult[];
  metadata: {
    totalRegions: number;
    totalProcessingTime: number;
    averageConfidence: number;
    successfulRegions: number;
  };
}

class OCRService {
  private worker: any = null;
  private isInitialized = false;

  // 初始化OCR worker
  async initializeWorker() {
    if (this.isInitialized) return;

    console.log("Initializing Tesseract.js worker...");

    this.worker = await createWorker("chi_sim+eng", 1, {
      logger: (progress) => {
        if (progress.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(progress.progress * 100)}%`);
        }
      },
    });

    // 设置优化参数
    await this.worker.setParameters({
      tessedit_pageseg_mode: "6", // 统一文本区块
      tessedit_ocr_engine_mode: "1", // LSTM only
      preserve_interword_spaces: "1", // 保留单词间距
    });

    this.isInitialized = true;
    console.log("Tesseract.js worker initialized");
  }

  // 终止worker释放资源
  async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log("Tesseract.js worker terminated");
    }
  }

  // 裁剪图像区域
  private async cropImage(
    imageSrc: string,
    region: OCRRegion
  ): Promise<string> {
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

        // 绘制裁剪区域
        ctx.drawImage(
          img,
          region.x,
          region.y,
          region.width,
          region.height, // 源图像区域
          0,
          0,
          region.width,
          region.height // 目标canvas区域
        );

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = reject;
      img.src = imageSrc;
    });
  }

  // 识别区域文字
  async recognizeRegions(
    imageSrc: string,
    regions: OCRRegion[]
  ): Promise<OCRResponse> {
    if (!this.isInitialized) {
      await this.initializeWorker();
    }

    const results: OCRResult[] = [];
    const startTime = Date.now();

    // 按顺序处理每个区域
    for (const [index, region] of regions.entries()) {
      try {
        const regionStartTime = Date.now();

        // 裁剪图像区域
        const croppedImage = await this.cropImage(imageSrc, region);

        // OCR识别
        const { data } = await this.worker.recognize(croppedImage);
        const processingTime = Date.now() - regionStartTime;

        results.push({
          regionId: region.id,
          sequence: region.sequence,
          text: data.text.trim(),
          confidence: data.confidence,
          coordinates: { ...region },
          processingTime,
        });

        console.log(`Region ${index + 1} processed in ${processingTime}ms`);
      } catch (error) {
        console.error(`Error processing region ${index}:`, error);
        results.push({
          regionId: region.id,
          sequence: region.sequence,
          text: "",
          confidence: 0,
          coordinates: { ...region },
          processingTime: 0,
        });
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      success: true,
      results: results.sort((a, b) => a.sequence - b.sequence),
      metadata: {
        totalRegions: results.length,
        totalProcessingTime: totalTime,
        averageConfidence:
          results.reduce((sum, r) => sum + (r.confidence || 0), 0) /
          results.length,
        successfulRegions: results.filter((r) => r.text && r.confidence > 0)
          .length,
      },
    };
  }

  // 批量识别优化（可选）
  async recognizeBatch(imageSrc: string, regions: OCRRegion[], batchSize = 3) {
    const results: OCRResult[] = [];

    for (let i = 0; i < regions.length; i += batchSize) {
      const batch = regions.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((region) => this.recognizeSingleRegion(imageSrc, region))
      );
      results.push(...batchResults);
    }

    return results.sort((a, b) => a.sequence - b.sequence);
  }

  // 单个区域识别
  private async recognizeSingleRegion(
    imageSrc: string,
    region: OCRRegion
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const croppedImage = await this.cropImage(imageSrc, region);
    const { data } = await this.worker.recognize(croppedImage);

    return {
      regionId: region.id,
      sequence: region.sequence,
      text: data.text.trim(),
      confidence: data.confidence,
      coordinates: { ...region },
      processingTime: Date.now() - startTime,
    };
  }
}

export const ocrService = new OCRService();
