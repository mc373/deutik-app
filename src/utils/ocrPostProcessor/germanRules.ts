// 德语常见的OCR错误映射表 (可不断扩充)
export const commonOCRErrors: Array<{ pattern: RegExp; replacement: string }> =
  [
    { pattern: /Gmb#/g, replacement: "GmbH" },
    { pattern: /mO-C hef/g, replacement: "mO-Chef" },
    { pattern: /Graf: fiti/g, replacement: "Graffiti" },
    { pattern: /DenaDrück/g, replacement: "DenkDrück" }, // 假设的公司名
    { pattern: /sich be werben/g, replacement: "sich bewerben" },
    { pattern: /gibt=/g, replacement: "gibt." },
  ];

// 德语复合词连接后的大小写校正映射表 (可不断扩充)
export const compoundCaseCorrections: Record<string, string> = {
  WoChen: "Wochen",
  OsnabrüCker: "Osnabrücker",
  "Osnabrü-cker": "Osnabrücker",
  EingangsBereich: "Eingangsbereich",
  anFrage: "Anfrage",
  beKannt: "bekannt",
};
