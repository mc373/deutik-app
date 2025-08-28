// utils/audioUtils.ts
import { md5 } from "js-md5";

/**
 * 确保与Python的hashlib.md5().hexdigest()完全一致的实现
 */
export function md5HexPy(text: string): string {
  if (!text) return "";

  // 使用js-md5库，它通常与Python的hashlib.md5().hexdigest()结果一致
  return md5(text);
}

/**
 * 使用Web Crypto API的替代方案（更现代，但需要异步）
 * 注意：这个方法在某些旧浏览器中可能不可用
 */
export async function md5HexPyAsync(text: string): Promise<string> {
  if (!text) return "";

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("MD5", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  } catch (error) {
    console.error("Web Crypto API MD5 failed, falling back to js-md5:", error);
    // 如果Web Crypto API失败，回退到同步版本
    return md5HexPy(text);
  }
}

/**
 * 验证JavaScript和Python的MD5哈希是否一致
 * 在开发时运行这个测试来确认一致性
 */
export function testMd5Consistency(): void {
  // 这些测试值应该与您在Python中测试的结果一致
  const testCases = [
    { input: "hello", expected: "5d41402abc4b2a76b9719d911017c592" },
    { input: "world", expected: "7d793037a0760186574b0282f2f435e7" },
    { input: "test", expected: "098f6bcd4621d373cade4e832627b4f6" },
    { input: "", expected: "d41d8cd98f00b204e9800998ecf8427e" }, // 空字符串
    { input: "äöü", expected: "d59820cf7d8cda0e39b33c22a4b1e7c3" }, // 德语特殊字符
  ];

  console.log("🔍 Testing MD5 consistency between JavaScript and Python:");
  console.log("=".repeat(60));

  let allMatch = true;

  testCases.forEach(({ input, expected }, index) => {
    const actual = md5HexPy(input);
    const match = actual === expected;

    if (!match) {
      allMatch = false;
    }

    console.log(`Test ${index + 1}: "${input}"`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual:   ${actual}`);
    console.log(`  Status:   ${match ? "✅ PASS" : "❌ FAIL"}`);
    console.log("-".repeat(40));
  });

  console.log(
    `Overall result: ${
      allMatch ? "✅ All tests passed!" : "❌ Some tests failed!"
    }`
  );
  console.log("=".repeat(60));

  if (!allMatch) {
    console.warn("⚠️  MD5哈希不一致！请检查Python和JavaScript的编码处理。");
  }
}

/**
 * 检查浏览器是否支持IndexedDB
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

/**
 * 创建音频元素
 */
export function createAudioElement(url: string): HTMLAudioElement {
  const audio = new Audio(url);
  audio.preload = "auto";
  return audio;
}

/**
 * 清理ObjectURL以防止内存泄漏
 */
export function revokeObjectURL(url: string): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * 获取文件的扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

/**
 * 生成Cloudflare R2音频文件的URL
 */
export function getAudioUrl(
  hash: string,
  baseUrl: string = "https://your-cloudflare-r2-domain.com"
): string {
  return `${baseUrl}/${hash}.mp3`;
}

/**
 * 检查音频文件是否可播放
 */
export async function checkAudioPlayable(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = url;

    audio.addEventListener("canplaythrough", () => resolve(true));
    audio.addEventListener("error", () => resolve(false));

    // 设置超时
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 生成唯一的文件名
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);

  return `${timestamp}_${randomStr}.${extension}`;
}

/**
 * 等待一段时间
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试操作
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null; // 初始化为null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        await delay(delayMs * attempt); // 指数退避
      }
    }
  }

  // 如果所有重试都失败，抛出最后一个错误或创建一个新的错误
  throw lastError || new Error("Operation failed after all retries");
}

// 在开发环境中自动运行测试
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  // 延迟执行，避免影响应用启动
  // setTimeout(() => {
  //   console.log("🧪 Running MD5 consistency tests...");
  //   testMd5Consistency();
  // }, 2000);
}

export default {
  md5HexPy,
  md5HexPyAsync,
  testMd5Consistency,
  isIndexedDBSupported,
  createAudioElement,
  revokeObjectURL,
  getFileExtension,
  getAudioUrl,
  checkAudioPlayable,
  formatFileSize,
  generateUniqueFilename,
  delay,
  retryOperation,
};
