// 图像预处理工具函数
export const grayscale = (data: Uint8ClampedArray) => {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = data[i + 1] = data[i + 2] = avg;
  }
};

export const enhanceContrast = (data: Uint8ClampedArray, factor: number) => {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
    data[i + 1] = Math.min(
      255,
      Math.max(0, (data[i + 1] - 128) * factor + 128)
    );
    data[i + 2] = Math.min(
      255,
      Math.max(0, (data[i + 2] - 128) * factor + 128)
    );
  }
};

export const denoise = (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => {
  const tempData = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;

      // 中值滤波降噪
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIndex = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(tempData[nIndex]);
        }
      }

      // 取中值
      neighbors.sort((a, b) => a - b);
      data[index] = data[index + 1] = data[index + 2] = neighbors[4];
    }
  }
};

export const sharpen = (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => {
  const tempData = new Uint8ClampedArray(data);
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ]; // 锐化卷积核

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;

      let r = 0,
        g = 0,
        b = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIndex = ((y + dy) * width + (x + dx)) * 4;
          const weight = kernel[dy + 1][dx + 1];
          r += tempData[nIndex] * weight;
          g += tempData[nIndex + 1] * weight;
          b += tempData[nIndex + 2] * weight;
        }
      }

      data[index] = Math.min(255, Math.max(0, r));
      data[index + 1] = Math.min(255, Math.max(0, g));
      data[index + 2] = Math.min(255, Math.max(0, b));
    }
  }
};

export const adaptiveThreshold = (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => {
  const blockSize = 15;
  const c = 5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      let sum = 0;
      let count = 0;

      for (let dy = -blockSize; dy <= blockSize; dy++) {
        for (let dx = -blockSize; dx <= blockSize; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIndex = (ny * width + nx) * 4;
            sum += data[nIndex];
            count++;
          }
        }
      }

      const threshold = sum / count - c;
      const value = data[index] > threshold ? 255 : 0;
      data[index] = data[index + 1] = data[index + 2] = value;
    }
  }
};

// 完整的预处理流程
export const applyPreprocessing = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  grayscale(data);
  enhanceContrast(data, 1.3);
  adaptiveThreshold(data, width, height);
  denoise(data, width, height);
  sharpen(data, width, height);

  ctx.putImageData(imageData, 0, 0);
};
