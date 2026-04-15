import type { TerminalLine } from '../state/types'

export function getLineText(line: TerminalLine): string {
  return line.spans.map((span) => span.text).join('')
}

export function extractStreamText(
  lines: TerminalLine[],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): string {
  if (startRow > endRow || (startRow === endRow && startCol > endCol)) {
    ;[startRow, endRow] = [endRow, startRow]
    ;[startCol, endCol] = [endCol, startCol]
  }

  const clampedStart = Math.max(0, startRow)
  const clampedEnd = Math.min(lines.length - 1, endRow)
  const parts: string[] = []

  for (let row = clampedStart; row <= clampedEnd; row++) {
    const text = getLineText(lines[row] as TerminalLine)
    if (row === startRow && row === endRow) {
      parts.push(text.slice(Math.max(0, startCol), Math.max(0, endCol)))
    } else if (row === startRow) {
      parts.push(text.slice(Math.max(0, startCol)))
    } else if (row === endRow) {
      parts.push(text.slice(0, Math.max(0, endCol)))
    } else {
      parts.push(text)
    }
  }

  return parts.join('\n')
}

export function getWordAtColumn(
  lineText: string,
  column: number
): { text: string; startCol: number; endCol: number } {
  if (column < 0 || column >= lineText.length) {
    return { endCol: column, startCol: column, text: '' }
  }

  const ch = lineText[column]
  if (!ch || !/\S/.test(ch)) {
    return { endCol: column, startCol: column, text: '' }
  }

  let startCol = column
  while (startCol > 0 && /\S/.test(lineText[startCol - 1] as string)) {
    startCol--
  }

  let endCol = column
  while (endCol < lineText.length && /\S/.test(lineText[endCol] as string)) {
    endCol++
  }

  return { endCol, startCol, text: lineText.slice(startCol, endCol) }
}
