import React from "react";
import { Text, Box } from "ink";

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
      return Math.max(max, val.length);
    }, col.header.length);
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
