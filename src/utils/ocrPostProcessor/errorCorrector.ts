import { commonOCRErrors } from "./germanRules";

/**
 * 修复常见的、固定的OCR字符识别错误
 * @param text 经过断行连接的文本
 * @returns 校正错误后的文本
 */
export function fixCommonErrors(text: string): string {
  let processedText = text;
  // 应用全局错误替换规则
  commonOCRErrors.forEach(({ pattern, replacement }) => {
    processedText = processedText.replace(pattern, replacement);
  });
  return processedText;
}
