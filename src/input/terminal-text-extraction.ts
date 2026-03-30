import type { TerminalLine } from "../state/types";

export function getLineText(line: TerminalLine): string {
  return line.spans.map((span) => span.text).join("");
}

export function getWordAtColumn(
  lineText: string,
  column: number,
): { text: string; startCol: number; endCol: number } {
  if (column < 0 || column >= lineText.length) {
    return { text: "", startCol: column, endCol: column };
  }

  if (!/\S/.test(lineText[column])) {
    return { text: "", startCol: column, endCol: column };
  }

  let startCol = column;
  while (startCol > 0 && /\S/.test(lineText[startCol - 1])) {
    startCol--;
  }

  let endCol = column;
  while (endCol < lineText.length && /\S/.test(lineText[endCol])) {
    endCol++;
  }

  return { text: lineText.slice(startCol, endCol), startCol, endCol };
}
