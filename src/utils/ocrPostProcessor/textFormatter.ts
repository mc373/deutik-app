/**
 * 最终格式化清理
 * @param text 处理完所有逻辑的文本
 * @returns 格式化后的干净文本
 */
export function formatFinalText(text: string): string {
  return (
    text
      // 合并多个空格为一个
      .replace(/\s+/g, " ")
      // 在句号、问号、感叹号后确保有一个空格
      .replace(/([.!?])([A-ZÄÖÜa-zäöüß])/g, "$1 $2")
      // 清理逗号、冒号后的空格
      .replace(/([:,])\s+/g, "$1 ")
      // 可选：在句子结束后添加换行，便于预览
      // .replace(/([.!?])\s+([A-ZÄÖÜ])/g, "$1\n\n$2")
      .trim()
  );
}
