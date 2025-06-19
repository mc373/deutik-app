// src/utils/tools.ts

/**
 * 工具函数集 - 用于处理CSV和文本数据
 */

/**
 * 基础版 - 解析PostgreSQL导出的CSV单词列表
 * @param csvString CSV字符串内容
 * @returns 单词数组
 */
export function parseSimpleWordList(csvString: string): string[] {
  return csvString
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .slice(1) // 跳过表头
    .map((line) => line.replace(/^"|"$/g, "")) // 去除引号
    .filter((word) => word.length > 0); // 过滤空值
}

/**
 * 增强版 - 带错误处理的CSV解析
 * @param csvString CSV字符串内容
 * @returns 包含结果和错误信息的对象
 */
export function parseWordListWithValidation(csvString: string): {
  words: string[];
  errors: string[];
  isValid: boolean;
} {
  const result = {
    words: [] as string[],
    errors: [] as string[],
    isValid: true,
  };

  try {
    const lines = csvString.split(/\r?\n/);

    // 验证表头
    if (lines[0]?.trim() !== '"lemma"') {
      result.errors.push('CSV格式不符合预期：缺少标准表头"lemma"');
      result.isValid = false;
    }

    // 处理数据行
    result.words = lines
      .slice(1)
      .map((line, i) => {
        try {
          return line.trim().replace(/^"|"$/g, "");
        } catch (err) {
          result.errors.push(`行 ${i + 2} 解析失败: ${line}`);
          return "";
        }
      })
      .filter((word) => word.length > 0);
  } catch (err) {
    result.errors.push(
      `解析失败: ${err instanceof Error ? err.message : String(err)}`
    );
    result.isValid = false;
  }

  return result;
}

/**
 * 流式处理大型CSV（适用于超大文件）
 * @param csvString CSV内容
 * @param processWord 处理每个单词的回调
 * @param batchSize 每批处理的数量（可选）
 */
export function processLargeWordList(
  csvString: string,
  processWord: (word: string) => void,
  batchSize?: number
): void {
  const lines = csvString.split(/\r?\n/);
  let currentBatch: string[] = [];

  const processBatch = () => {
    currentBatch.forEach(processWord);
    currentBatch = [];
  };

  for (let i = 1; i < lines.length; i++) {
    const word = lines[i].trim().replace(/^"|"$/g, "");
    if (word) {
      if (batchSize) {
        currentBatch.push(word);
        if (currentBatch.length >= batchSize) processBatch();
      } else {
        processWord(word);
      }
    }
  }

  if (currentBatch.length > 0) processBatch();
}

/**
 * 将单词数组按首字母分组
 * @param words 单词数组
 * @returns 按首字母分组的对象 { a: [...], b: [...], ... }
 */
export function groupByFirstLetter(words: string[]): Record<string, string[]> {
  return words.reduce((groups, word) => {
    if (word.length === 0) return groups;

    const firstChar = word[0].toUpperCase();
    if (!groups[firstChar]) {
      groups[firstChar] = [];
    }
    groups[firstChar].push(word);
    return groups;
  }, {} as Record<string, string[]>);
}

// 默认导出常用函数
export default {
  parseSimpleWordList,
  groupByFirstLetter,
};
