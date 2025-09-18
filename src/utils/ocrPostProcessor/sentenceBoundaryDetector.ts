/**
 * 智能地插入句子边界（句号）
 * 这是初步版本，后续需大量优化规则。
 * @param text 经过错误校正的文本
 * @returns 插入了句子边界的文本
 */
export function insertSentenceBoundaries(text: string): string {
  let processedText = text;

  // 规则 1: 如果句尾动词后紧跟大写开头的新主语，很可能需要句号。
  // 示例: "...setzen Beteiligt sei..." -> "...setzen. Beteiligt sei..."
  const sentenceBoundaryRules = [
    /(setzen|setzte|haben|sein|können|sagen|berichten|ergänzen|gestalten|sein|werden)\s+([A-ZÄÖÜ][a-zäöüß]+)/g,
  ];

  sentenceBoundaryRules.forEach((rule) => {
    processedText = processedText.replace(rule, "$1. $2");
  });

  return processedText;
}
