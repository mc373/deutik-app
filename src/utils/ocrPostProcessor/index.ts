import { insertSentenceBoundaries } from "./sentenceBoundaryDetector";
import { formatFinalText } from "./textFormatter";
import { ProcessingOptions } from "./types";

/**
 * 后处理主管道
 * @param rawText 原始OCR识别出的文本
 * @param options 处理选项
 * @returns 处理后的干净文本
 */
export function processOCRText(
  mergedText: string,
  options: ProcessingOptions
): string {
  // 管道现在更短了
  const pipeline = [];

  if (options.smartParagraphDetection) {
    pipeline.push(insertSentenceBoundaries); // 划分句子边界
  }
  pipeline.push(formatFinalText); // 最终格式化

  let result = mergedText;
  for (const processor of pipeline) {
    result = processor(result);
  }
  return result;
}
