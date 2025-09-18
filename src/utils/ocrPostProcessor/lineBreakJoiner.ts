/**
 * 核心函数：处理断行和连字符，重新连接被OCR错误折断的单词
 * @param text 原始OCR文本
 * @returns 连接后的文本
 */
export function joinBrokenWords(text: string): string {
  let processedText = text;
  console.log("Original text:", processedText);

  // 规则 1: 最高优先级 处理连字符，连字符+换行的情况直接去除连字符和回车
  //  - 处理【任何字母】+【连字符】+【换行】+【任何字母】
  processedText = processedText.replace(
    /([a-zA-ZäöüÄÖÜß])-\s*\n\s*([a-zA-ZäöüÄÖÜß])/gi,
    "$1$2"
  );

  const regex2 = /\r?\n\s?/g;
  // 使用正则表达式2替换换行符后跟零个或一个空格的情况
  processedText = processedText.replace(regex2, " ");

  // 使用正则表达式将多个连续空格替换为一个空格
  processedText = processedText.replace(/\s+/g, " ");

  // 规则4标点去重：替换函数：保留省略号和特定的标点符号组合，去重其他连续标点符号
  const regex = /([.,!?;:])\s?([.,!?;:])/g;
  processedText = processedText.replace(regex, (match) => {
    // 保留省略号
    if (match === "...") {
      return match;
    }
    // 保留特定的标点符号组合，例如 http://
    if (match.includes("http://")) {
      return match;
    }
    // 保留第一个标点符号，去重其他
    return match[0];
  });

  const regex1 = /([a-zA-ZäöüÄÖÜß])(\s*\n)/g;

  // 替换函数：在句尾补上句点
  processedText = processedText.replace(regex1, (match, p1, p2) => {
    // 检查句尾是否没有标点符号
    if (!/[.,!?;:)]$/.test(p1)) {
      // 检查后面是否只有空白字符
      const nextChar = match.slice(p1.length + p2.length);
      if (/^\s*$/.test(nextChar)) {
        return p1 + "." + p2;
      }
    }
    return match;
  });

  return processedText;
}
