// 修改后的图标导入方式

import { useState, useEffect } from "react";

import { parseSimpleWordList } from "../utils/tools";
import MultiSourceCombobox from "../components/MultiSourceCombobox";
// import MainCard from "../components/MainCard";
import type { WordData } from "../components/MainCard";
import { getWordByKey, initializeDB } from "../utils/db"; // 假设你有一个WordRecord类型定义

import GermanWordDisplay from "../components/GermanWordDisplay";
import { useApp } from "../contexts/AppContext";

const Searching = () => {
  const { state } = useApp();
  const [wordLists, seWordLists] = useState<any[]>([]); // 使用any[]类型来存储解析后的数据
  const parseCSV = async () => {
    const response = await fetch("/data/json10000.csv");
    const text = await response.text();

    return new Promise((resolve) => {
      resolve(parseSimpleWordList(text)); // 得到对象数组
    });
  };
  const [curWordData, setCurWordData] = useState<WordData>({} as WordData);

  useEffect(() => {
    const fetchData = async () => {
      const result = await parseCSV();

      if ((result as any[]).length > 0) {
        seWordLists([result] as any[]); // 将解析后的数据存储到状态中
      }
    };
    fetchData();
    initializeDB();
  }, []);

  return (
    <div>
      <div style={{ maxWidth: 400, margin: "0 auto", padding: 20 }}>
        <MultiSourceCombobox
          wordLists={wordLists}
          onSelect={async (word) => {
            try {
              const record = await getWordByKey(word); // 返回 WordRecord | undefined
              if (record) {
                setCurWordData(record.jsonData); // 假设 setCurWordData 需要的是 WordData
                // 更新 Context 中的 curWord
                console.log("Selected word data:", record.jsonData);
              } else {
                console.warn(`Word "${word}" not found in database`);
              }
            } catch (err) {
              console.error("Failed to fetch word data:", err);
            }
          }}
        />
      </div>
      <GermanWordDisplay
        word={curWordData.word || state.curWord}
        onError={(msg) => console.error(msg)}
      />
    </div>
  );
};

export default Searching;
