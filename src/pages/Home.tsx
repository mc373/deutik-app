import { useDisclosure } from "@mantine/hooks";
import {
  AppShell,
  Group,
  Burger,
  Skeleton,
  Button,
  Autocomplete,
} from "@mantine/core";
import { UserButton, useClerk } from "@clerk/clerk-react";

import React, { useState, useEffect } from "react";

import { parseSimpleWordList } from "../utils/tools";
import MultiSourceCombobox from "../components/MultiSourceCombobox";
export default function Home() {
  const [opened, { toggle }] = useDisclosure();
  const { user } = useClerk();

  const [wordLists, seWordLists] = useState<any[]>([]); // 使用any[]类型来存储解析后的数据
  const parseCSV = async () => {
    const response = await fetch("/data/wordlist_fup2.csv");
    const text = await response.text();
    console.log("CSV内容：", text); // 打印CSV内容以调试
    return new Promise((resolve) => {
      resolve(parseSimpleWordList(text)); // 得到对象数组
    });
  };
  // const wordLists = [
  //   ["Apfel", "Banane", "Computer", "Dokument"], // 基础词汇
  //   ["Abend", "Buch", "Chemie", "Datum"], // 中级词汇
  //   ["Aktie", "Börse", "Dividende", "Ertrag"], // 高级/专业词汇
  // ];
  useEffect(() => {
    const fetchData = async () => {
      const result = await parseCSV();

      if ((result as any[]).length > 0) {
        seWordLists([result] as any[]); // 将解析后的数据存储到状态中
        console.log(result);
      }
    };
    fetchData();
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
            <h2>多级词汇搜索 (Combobox实现)</h2>
            <MultiSourceCombobox
              wordLists={wordLists}
              onSelect={(word) => console.log("选中:", word)}
            />
            <p style={{ marginTop: 10, color: "#666" }}>
              提示：输入至少3个字符后开始搜索，会依次从基础、中级、高级词汇中查找
            </p>
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
        {user ? <div>欢迎，{user.username}!</div> : ""}
      </AppShell.Main>
      <AppShell.Aside p="md">Aside</AppShell.Aside>
      <AppShell.Footer p="md">Footer</AppShell.Footer>
    </AppShell>
  );
}
