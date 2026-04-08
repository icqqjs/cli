import React, { useState, useEffect, useMemo } from "react";
import { Text, Box, useInput } from "ink";
import fs from "node:fs";
import path from "node:path";
import type { IpcClient } from "../lib/ipc-client.js";
import type { IpcEvent } from "../daemon/protocol.js";
import { Actions } from "../daemon/protocol.js";

// ── Popular QQ face emojis (id → name) ──
const FACE_MAP: [number, string][] = [
  [0, "😊 惊讶"], [1, "😖 撇嘴"], [2, "😍 色"], [4, "😎 得意"],
  [5, "😢 流泪"], [6, "☺️ 害羞"], [7, "🤐 闭嘴"], [8, "😴 睡"],
  [9, "😭 大哭"], [10, "😅 尴尬"], [11, "😠 发怒"], [12, "😜 调皮"],
  [13, "😁 呲牙"], [14, "😲 微笑"], [15, "🙁 难过"], [16, "😃 酷"],
  [18, "😱 抓狂"], [19, "🤮 吐"], [20, "🤭 偷笑"], [21, "😊 可爱"],
  [22, "🙄 白眼"], [23, "😤 傲慢"], [24, "😫 饥饿"], [25, "😪 困"],
  [26, "😨 惊恐"], [27, "😰 流汗"], [28, "😄 憨笑"], [29, "😏 悠闲"],
  [30, "💪 奋斗"], [31, "🤬 咒骂"], [32, "🤔 疑问"], [33, "🤫 嘘"],
  [34, "😵 晕"], [35, "😩 折磨"], [36, "🤑 衰"], [37, "💀 骷髅"],
  [38, "👊 敲打"], [39, "👋 再见"], [41, "😮‍💨 发抖"], [42, "😡 爱情"],
  [43, "🦗 跳跳"], [46, "🐷 猪头"], [49, "🤗 拥抱"], [53, "🎂 蛋糕"],
  [55, "💣 炸弹"], [56, "🔪 刀"], [59, "💩 便便"], [60, "☕ 咖啡"],
  [63, "🌹 玫瑰"], [64, "🥀 凋谢"], [66, "❤️ 爱心"], [67, "💔 心碎"],
  [74, "🌞 太阳"], [75, "🌙 月亮"], [76, "👍 赞"], [77, "👎 踩"],
  [78, "🤝 握手"], [79, "✌️ 胜利"], [96, "😂 冷汗"], [97, "😥 擦汗"],
  [98, "😋 抠鼻"], [99, "👏 鼓掌"], [100, "😳 糗大了"], [101, "😏 坏笑"],
  [104, "😿 委屈"], [106, "😷 吓"], [109, "👌 OK"], [111, "🤡 鄙视"],
  [116, "😘 飞吻"], [118, "🤩 发呆"], [120, "👊 拳头"], [122, "👎 差劲"],
  [123, "🤟 爱你"], [124, "🚫 NO"], [125, "👍 OK"], [129, "🤙 转圈"],
  [144, "🍻 干杯"], [147, "🔫 匕首"], [171, "🍵 茶"], [174, "🎵 音符"],
  [178, "😺 微笑猫"], [179, "😿 泪奔猫"], [212, "🤓 微微一笑"],
  [320, "🐶 狗头"], [325, "😅 苦涩"], [326, "🤌 裂开"],
];

// Image extensions
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".flac", ".ogg", ".m4a", ".amr", ".silk"]);
const VIDEO_EXTS = new Set([".mp4", ".avi", ".mkv", ".mov", ".wmv"]);
const MEDIA_EXTS = new Set([...IMAGE_EXTS, ...AUDIO_EXTS, ...VIDEO_EXTS]);

type Message = {
  nickname: string;
  content: string;
  time: number;
};

type MemberInfo = {
  user_id: number;
  nickname: string;
  card: string;
};

type Mode = "chat" | "at" | "emoji" | "file";

type FileEntry = {
  name: string;
  fullPath: string;
  isDir: boolean;
  tag: "image" | "audio" | "video" | "other";
};

type Props = {
  ipc: IpcClient;
  type: "private" | "group";
  id: number;
};

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("zh-CN", { hour12: false });
}

function getFileTag(ext: string): FileEntry["tag"] {
  if (IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  return "other";
}

function tagColor(tag: FileEntry["tag"]): string {
  switch (tag) {
    case "image": return "green";
    case "audio": return "cyan";
    case "video": return "magenta";
    default: return "white";
  }
}

function tagLabel(tag: FileEntry["tag"]): string {
  switch (tag) {
    case "image": return "图";
    case "audio": return "音";
    case "video": return "视";
    default: return "文";
  }
}

const PAGE_SIZE = 10;

export function ChatSession({ ipc, type, id }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");

  // ── @ autocomplete state ──
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [atQuery, setAtQuery] = useState("");
  const [atIndex, setAtIndex] = useState(0);

  // ── Emoji state ──
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [emojiPage, setEmojiPage] = useState(0);

  // ── File picker state ──
  const [fileCwd, setFileCwd] = useState(process.cwd());
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [fileIndex, setFileIndex] = useState(0);
  const [fileFilter, setFileFilter] = useState("");

  // Load group members for @ autocomplete
  useEffect(() => {
    if (type !== "group") return;
    void (async () => {
      try {
        const resp = await ipc.request(Actions.LIST_GROUP_MEMBERS, { gid: id });
        if (resp.ok && Array.isArray(resp.data)) {
          setMembers(
            (resp.data as MemberInfo[]).map((m) => ({
              user_id: m.user_id,
              nickname: m.nickname,
              card: m.card || "",
            })),
          );
        }
      } catch { /* ignore */ }
    })();
  }, [ipc, type, id]);

  // Subscribe to live messages
  useEffect(() => {
    const sub = ipc.subscribe(
      Actions.SUBSCRIBE,
      { type, id },
      (event: IpcEvent) => {
        if (event.event === "message") {
          const data = event.data as any;
          setMessages((prev) => [
            ...prev.slice(-100),
            {
              nickname: data.nickname,
              content: data.raw_message,
              time: data.time,
            },
          ]);
        }
      },
    );
    return () => { void sub.unsubscribe(); };
  }, [ipc, type, id]);

  // Load files when entering file mode or changing directory
  useEffect(() => {
    if (mode !== "file") return;
    try {
      const entries = fs.readdirSync(fileCwd, { withFileTypes: true });
      const list: FileEntry[] = [];
      // Add parent dir entry
      const parent = path.dirname(fileCwd);
      if (parent !== fileCwd) {
        list.push({ name: "..", fullPath: parent, isDir: true, tag: "other" });
      }
      for (const e of entries) {
        if (e.name.startsWith(".")) continue; // skip hidden
        const full = path.join(fileCwd, e.name);
        if (e.isDirectory()) {
          list.push({ name: e.name + "/", fullPath: full, isDir: true, tag: "other" });
        } else {
          const ext = path.extname(e.name).toLowerCase();
          if (MEDIA_EXTS.has(ext) || fileFilter === "") {
            list.push({ name: e.name, fullPath: full, isDir: false, tag: getFileTag(ext) });
          }
        }
      }
      // sort: dirs first, then by name
      list.sort((a, b) => {
        if (a.name === "..") return -1;
        if (b.name === "..") return 1;
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setFileEntries(list);
      setFileIndex(0);
    } catch {
      setFileEntries([]);
    }
  }, [mode, fileCwd, fileFilter]);

  // ── Filtered lists ──
  const filteredMembers = useMemo(() => {
    if (!atQuery) return members;
    const q = atQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.card.toLowerCase().includes(q) ||
        m.nickname.toLowerCase().includes(q) ||
        String(m.user_id).includes(q),
    );
  }, [members, atQuery]);

  const filteredEmojis = useMemo(() => {
    if (!emojiQuery) return FACE_MAP;
    const q = emojiQuery.toLowerCase();
    return FACE_MAP.filter(([id, name]) =>
      name.toLowerCase().includes(q) || String(id) === q,
    );
  }, [emojiQuery]);

  const filteredFiles = useMemo(() => {
    if (!fileFilter) return fileEntries;
    const q = fileFilter.toLowerCase();
    return fileEntries.filter(
      (f) => f.name === ".." || f.name.toLowerCase().includes(q),
    );
  }, [fileEntries, fileFilter]);

  // ── Key handling ──
  useInput((char, key) => {
    // ── @ Mode ──
    if (mode === "at") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (key.upArrow) {
        setAtIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setAtIndex((i) => Math.min(filteredMembers.length - 1, i + 1));
        return;
      }
      if (key.tab) {
        // select "all"
        setInput((prev) => prev + "[at:all]");
        setMode("chat");
        return;
      }
      if (key.return) {
        const member = filteredMembers[atIndex];
        if (member) {
          setInput((prev) => prev + `[at:${member.user_id}]`);
        }
        setMode("chat");
        return;
      }
      if (key.backspace || key.delete) {
        setAtQuery((q) => q.slice(0, -1));
        setAtIndex(0);
        return;
      }
      if (char && !key.ctrl && !key.meta) {
        setAtQuery((q) => q + char);
        setAtIndex(0);
      }
      return;
    }

    // ── Emoji Mode ──
    if (mode === "emoji") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (key.upArrow) {
        setEmojiIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setEmojiIndex((i) => Math.min(filteredEmojis.length - 1, i + 1));
        return;
      }
      if (key.leftArrow) {
        setEmojiPage((p) => Math.max(0, p - 1));
        setEmojiIndex(0);
        return;
      }
      if (key.rightArrow) {
        const maxPage = Math.floor((filteredEmojis.length - 1) / PAGE_SIZE);
        setEmojiPage((p) => Math.min(maxPage, p + 1));
        setEmojiIndex(0);
        return;
      }
      if (key.return) {
        const globalIdx = emojiPage * PAGE_SIZE + emojiIndex;
        const emoji = filteredEmojis[globalIdx];
        if (emoji) {
          setInput((prev) => prev + `[face:${emoji[0]}]`);
        }
        setMode("chat");
        return;
      }
      if (key.backspace || key.delete) {
        setEmojiQuery((q) => q.slice(0, -1));
        setEmojiIndex(0);
        setEmojiPage(0);
        return;
      }
      if (char && !key.ctrl && !key.meta) {
        setEmojiQuery((q) => q + char);
        setEmojiIndex(0);
        setEmojiPage(0);
      }
      return;
    }

    // ── File Mode ──
    if (mode === "file") {
      if (key.escape) {
        setMode("chat");
        setFileFilter("");
        return;
      }
      if (key.upArrow) {
        setFileIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setFileIndex((i) => Math.min(filteredFiles.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const entry = filteredFiles[fileIndex];
        if (entry) {
          if (entry.isDir) {
            setFileCwd(entry.fullPath);
            setFileFilter("");
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTS.has(ext)) {
              // Images: insert as [image:path], parseMessage handles base64
              setInput((prev) => prev + `[image:${entry.fullPath}]`);
            } else {
              // Non-image files: send via file transfer IPC
              void sendFile(entry.fullPath, entry.name);
            }
            setMode("chat");
            setFileFilter("");
          }
        }
        return;
      }
      if (key.backspace || key.delete) {
        setFileFilter((q) => q.slice(0, -1));
        setFileIndex(0);
        return;
      }
      if (char && !key.ctrl && !key.meta) {
        setFileFilter((q) => q + char);
        setFileIndex(0);
      }
      return;
    }

    // ── Chat Mode ──
    if (key.return) {
      const text = input.trim();
      if (!text) return;
      void sendMessage(text);
      setInput("");
      return;
    }
    if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }
    // Ctrl+G → open @ panel (group only)
    if (key.ctrl && char === "g" && type === "group") {
      setMode("at");
      setAtQuery("");
      setAtIndex(0);
      return;
    }
    // Ctrl+Y → open emoji panel
    if (key.ctrl && char === "y") {
      setMode("emoji");
      setEmojiQuery("");
      setEmojiIndex(0);
      setEmojiPage(0);
      return;
    }
    // Ctrl+O → open file picker
    if (key.ctrl && char === "o") {
      setMode("file");
      setFileCwd(process.cwd());
      setFileFilter("");
      setFileIndex(0);
      return;
    }

    if (char && !key.ctrl && !key.meta) {
      setInput((prev) => prev + char);
    }
  });

  const sendMessage = async (text: string) => {
    setSending(true);
    try {
      const action =
        type === "private"
          ? Actions.SEND_PRIVATE_MSG
          : Actions.SEND_GROUP_MSG;
      const params =
        type === "private"
          ? { uid: id, message: text }
          : { gid: id, message: text };
      await ipc.request(action, params);
      setMessages((prev) => [
        ...prev.slice(-100),
        {
          nickname: "我",
          content: text,
          time: Math.floor(Date.now() / 1000),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          nickname: "系统",
          content: `发送失败: ${e instanceof Error ? e.message : String(e)}`,
          time: Math.floor(Date.now() / 1000),
        },
      ]);
    }
    setSending(false);
  };

  const sendFile = async (filePath: string, fileName: string) => {
    setSending(true);
    try {
      const action =
        type === "private"
          ? Actions.SEND_PRIVATE_FILE
          : Actions.SEND_GROUP_FILE;
      const params =
        type === "private"
          ? { uid: id, file: filePath }
          : { gid: id, file: filePath };
      await ipc.request(action, params);
      setMessages((prev) => [
        ...prev.slice(-100),
        {
          nickname: "我",
          content: `[文件] ${fileName}`,
          time: Math.floor(Date.now() / 1000),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          nickname: "系统",
          content: `文件发送失败: ${e instanceof Error ? e.message : String(e)}`,
          time: Math.floor(Date.now() / 1000),
        },
      ]);
    }
    setSending(false);
  };

  // ── Render ──
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        ━━ {type === "group" ? "群聊" : "私聊"} ({id}) ━━
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {messages.map((msg, i) => (
          <Text key={i}>
            <Text dimColor>[{formatTime(msg.time)}]</Text>{" "}
            <Text bold>{msg.nickname}</Text>: {msg.content}
          </Text>
        ))}
      </Box>

      {/* ── @ Autocomplete Panel ── */}
      {mode === "at" && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="cyan" paddingX={1}>
          <Text bold color="cyan">@ 成员 <Text dimColor>(Tab: @全体 | Enter: 选择 | Esc: 取消)</Text></Text>
          <Text>搜索: {atQuery}<Text color="cyan">█</Text></Text>
          <Box flexDirection="column" marginTop={1}>
            {filteredMembers.slice(0, PAGE_SIZE).map((m, i) => (
              <Text key={m.user_id}>
                {i === atIndex ? <Text color="yellow">❯ </Text> : <Text>  </Text>}
                <Text bold>{m.card || m.nickname}</Text>
                <Text dimColor> ({m.user_id})</Text>
              </Text>
            ))}
            {filteredMembers.length === 0 && <Text dimColor>无匹配成员</Text>}
            {filteredMembers.length > PAGE_SIZE && (
              <Text dimColor>… 还有 {filteredMembers.length - PAGE_SIZE} 人</Text>
            )}
          </Box>
        </Box>
      )}

      {/* ── Emoji Panel ── */}
      {mode === "emoji" && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="magenta" paddingX={1}>
          <Text bold color="magenta">表情 <Text dimColor>(←→ 翻页 | ↑↓ 选择 | Enter: 插入 | Esc: 取消)</Text></Text>
          <Text>搜索: {emojiQuery}<Text color="cyan">█</Text></Text>
          <Box flexDirection="column" marginTop={1}>
            {filteredEmojis.slice(emojiPage * PAGE_SIZE, (emojiPage + 1) * PAGE_SIZE).map(([faceId, name], i) => (
              <Text key={faceId}>
                {i === emojiIndex ? <Text color="yellow">❯ </Text> : <Text>  </Text>}
                <Text>{name}</Text>
                <Text dimColor> [face:{faceId}]</Text>
              </Text>
            ))}
            {filteredEmojis.length === 0 && <Text dimColor>无匹配表情</Text>}
            {filteredEmojis.length > PAGE_SIZE && (
              <Text dimColor>
                第 {emojiPage + 1}/{Math.ceil(filteredEmojis.length / PAGE_SIZE)} 页
              </Text>
            )}
          </Box>
        </Box>
      )}

      {/* ── File Picker Panel ── */}
      {mode === "file" && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="green" paddingX={1}>
          <Text bold color="green">文件 <Text dimColor>(↑↓ 选择 | Enter: 打开/插入 | Esc: 取消)</Text></Text>
          <Text dimColor>目录: {fileCwd}</Text>
          <Text>过滤: {fileFilter}<Text color="cyan">█</Text></Text>
          <Box flexDirection="column" marginTop={1}>
            {filteredFiles.slice(0, PAGE_SIZE).map((f, i) => (
              <Text key={f.fullPath}>
                {i === fileIndex ? <Text color="yellow">❯ </Text> : <Text>  </Text>}
                {f.isDir ? (
                  <Text color="blue">{f.name}</Text>
                ) : (
                  <>
                    <Text color={tagColor(f.tag)}>[{tagLabel(f.tag)}]</Text>
                    <Text> {f.name}</Text>
                  </>
                )}
              </Text>
            ))}
            {filteredFiles.length === 0 && <Text dimColor>无匹配文件</Text>}
            {filteredFiles.length > PAGE_SIZE && (
              <Text dimColor>… 还有 {filteredFiles.length - PAGE_SIZE} 个</Text>
            )}
          </Box>
        </Box>
      )}

      {/* ── Input Line ── */}
      {mode === "chat" && (
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color="green">&gt; </Text>
            <Text>
              {input}
              <Text color="cyan">█</Text>
            </Text>
            {sending && <Text color="yellow"> 发送中…</Text>}
          </Box>
          <Text dimColor>
            {type === "group" ? "Ctrl+G @成员 | " : ""}Ctrl+Y 表情 | Ctrl+O 文件
          </Text>
        </Box>
      )}
    </Box>
  );
}
