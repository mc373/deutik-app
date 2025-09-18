import { PSM } from "tesseract.js";

export const getGermanConfig = () => ({
  tessedit_pageseg_mode: PSM.AUTO, // 自动分割，适应复杂布局
  preserve_interword_spaces: "1", // 保留词间空格
  textord_noise_rej: "0", // 禁用噪声过滤，保留小标点
  textord_heavy_nr: "0", // 禁用强噪声过滤
  tessedit_char_whitelist:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789 .,!?-:;()[]'\"@#$%&*+/=<>„“", // 包含德语引号
  tessedit_ocr_engine_mode: "1", // LSTM 模式
  load_punct_dawg: "1", // 加载标点字典
  tessedit_minimal_confidence: "0.6", // 设置最低置信度，避免低质量输出
});

// export const getGermanConfig = () => ({
//   tessedit_pageseg_mode: PSM.AUTO, // 自动分割，适应复杂布局
//   preserve_interword_spaces: "1", // 保留词间空格
//   textord_noise_rej: "0", // 禁用噪声过滤，保留小标点
//   textord_heavy_nr: "0", // 禁用强噪声过滤
//   tessedit_char_whitelist:
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789 .,!?-:;()[]'\"@#$%&*+/=<>„“", // 添加德语引号
//   tessedit_ocr_engine_mode: "1", // LSTM 模式
//   load_punct_dawg: "1", // 加载标点字典
//   textord_noise_sizefraction: "0.05", // 放宽噪声阈值（备用）
// });

// 德语专用配置
// export const getGermanConfig = () => ({
//   tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // 使用枚举值而不是字符串
//   // tessedit_ocr_engine_mode: 1,
//   preserve_interword_spaces: "1",
//   textord_noise_rej: "1",
//   textord_heavy_nr: "1",
//   tessedit_char_whitelist:
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789 .,!?-:;()[]'\"@#$%&*+/=<>",
//   tessedit_ocr_engine_mode: "1", // OEM 0：原生模式，支持白名单
//   load_punct_dawg: "1", // 加载标点字典
// });
