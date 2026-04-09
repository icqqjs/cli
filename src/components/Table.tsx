import React from "react";
import { Text, Box } from "ink";

/** Calculate display width accounting for CJK fullwidth characters */
function stringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0)!;
    // CJK Unified Ideographs, CJK Ext-A/B, Fullwidth Forms, Hangul, Kana, etc.
    if (
      (code >= 0x1100 && code <= 0x115f) ||  // Hangul Jamo
      (code >= 0x2e80 && code <= 0x303e) ||  // CJK Radicals, Kangxi, Symbols
      (code >= 0x3040 && code <= 0x33bf) ||  // Hiragana, Katakana, CJK compat
      (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Ext-A
      (code >= 0x4e00 && code <= 0xa4cf) ||  // CJK Unified, Yi
      (code >= 0xac00 && code <= 0xd7af) ||  // Hangul Syllables
      (code >= 0xf900 && code <= 0xfaff) ||  // CJK Compat Ideographs
      (code >= 0xfe30 && code <= 0xfe6f) ||  // CJK Compat Forms
      (code >= 0xff01 && code <= 0xff60) ||  // Fullwidth Forms
      (code >= 0xffe0 && code <= 0xffe6) ||  // Fullwidth Signs
      (code >= 0x20000 && code <= 0x2fa1f)   // CJK Ext-B..F, Compat Supplement
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

type Column = {
  key: string;
  header: string;
  width?: number;
};

type Props = {
  columns: Column[];
  data: Record<string, unknown>[];
};

export function Table({ columns, data }: Props) {
  const widths = columns.map((col) => {
    const maxData = data.reduce((max, row) => {
      const val = String(row[col.key] ?? "");
      return Math.max(max, stringWidth(val));
    }, stringWidth(col.header));
    return col.width ?? Math.min(maxData + 2, 50);
  });

  return (
    <Box flexDirection="column">
      <Box>
        {columns.map((col, i) => (
          <Box key={col.key} width={widths[i]} marginRight={1}>
            <Text bold color="cyan">
              {col.header}
            </Text>
          </Box>
        ))}
      </Box>
      <Box>
        {columns.map((col, i) => (
          <Box key={col.key} width={widths[i]} marginRight={1}>
            <Text dimColor>{"─".repeat(Math.max(widths[i]! - 1, 1))}</Text>
          </Box>
        ))}
      </Box>
      {data.map((row, rowIdx) => (
        <Box key={rowIdx}>
          {columns.map((col, i) => (
            <Box key={col.key} width={widths[i]} marginRight={1}>
              <Text>{String(row[col.key] ?? "")}</Text>
            </Box>
          ))}
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>共 {data.length} 条</Text>
      </Box>
    </Box>
  );
}
