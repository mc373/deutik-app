import { useDisclosure } from "@mantine/hooks";
import { AppShell, Group, Burger, Skeleton, Button } from "@mantine/core";
import { UserButton, useClerk } from "@clerk/clerk-react";

import { useState, useEffect } from "react";

import { parseSimpleWordList } from "../utils/tools";
import MultiSourceCombobox from "../components/MultiSourceCombobox";
import MainCard from "../components/MainCard";
import type { WordData } from "../components/MainCard";
import { getWordByKey, initializeDB } from "../utils/db"; // 假设你有一个WordRecord类型定义
export default function Home() {
  const [opened, { toggle }] = useDisclosure();
  const { user } = useClerk();

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
    <AppShell
      header={{ height: 60 }}
      footer={{ height: 60 }}
      navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }}
      aside={{
        width: 300,
        breakpoint: "md",
        collapsed: { desktop: false, mobile: true },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          {user ? (
            <UserButton />
          ) : (
            <Button
              onClick={() => {
                /* 触发登录 */
              }}
            >
              登录
            </Button>
          )}
          <div style={{ maxWidth: 400, margin: "0 auto", padding: 20 }}>
            <MultiSourceCombobox
              wordLists={wordLists}
              onSelect={async (word) => {
                try {
                  const record = await getWordByKey(word); // 返回 WordRecord | undefined
                  if (record) {
                    setCurWordData(record.jsonData); // 假设 setCurWordData 需要的是 WordData
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
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        Navbar
        {Array(15)
          .fill(0)
          .map((_, index) => (
            <Skeleton key={index} h={28} mt="sm" animate={false} />
          ))}
      </AppShell.Navbar>
      <AppShell.Main>
        <>
          {Object.keys(curWordData).length !== 0 && (
            <MainCard {...curWordData} />
          )}
        </>
      </AppShell.Main>
      <AppShell.Aside p="md">Aside</AppShell.Aside>
      <AppShell.Footer p="md">Footer</AppShell.Footer>
    </AppShell>
  );
}
