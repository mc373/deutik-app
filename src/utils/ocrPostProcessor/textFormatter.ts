/**
 * 最终格式化清理
 * @param text 处理完所有逻辑的文本
 * @returns 格式化后的干净文本
 */
export function formatFinalText(text: string): string {
  return (
    text

      // 在句号、问号、感叹号后确保有一个空格
      .replace(/([.!?])([A-ZÄÖÜa-zäöüß])/g, "$1 $2")
      // 清理逗号、冒号后的空格
      .replace(/([:,])\s+/g, "$1 ")

      .trim()
  );
}
