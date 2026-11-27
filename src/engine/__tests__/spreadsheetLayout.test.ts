import { describe, expect, it } from 'vitest';
import { buildTableRows, detectColumnGuides, groupTableLines, parseTablePages, type TableToken } from '../spreadsheetLayout';

function word(text: string, left: number, right: number, top: number, confidence?: number): TableToken {
  return { text, left, right, top, bottom: top + 0.013, confidence };
}

describe('spreadsheet layout', () => {
  it('keeps multiword names together and preserves an empty middle cell', () => {
    const lines = groupTableLines([
      word('Account', 0.08, 0.15, 0.10), word('Name', 0.30, 0.36, 0.10), word('Status', 0.72, 0.78, 0.10),
      word('000023', 0.08, 0.15, 0.13), word('River', 0.30, 0.35, 0.133),
      word('West', 0.36, 0.41, 0.133), word('Open', 0.72, 0.77, 0.132, 74),
      word('000024', 0.08, 0.15, 0.16), word('Closed', 0.72, 0.79, 0.16),
    ]);
    const guides = detectColumnGuides(lines, 1.3);
    expect(guides).toHaveLength(2);
    const rows = buildTableRows({ number: 2, method: 'scan', lines, guides }, guides);
    expect(rows.map(row => row.cells)).toEqual([
      ['Account', 'Name', 'Status'], ['000023', 'River West', 'Open'], ['000024', '', 'Closed'],
    ]);
    expect(rows[1]).toMatchObject({ id: '2-1', review: [false, false, true] });
  });

  it('deduplicates selected pages and preserves document order', () => {
    expect(parseTablePages('6, 1-3, 2', 6)).toEqual([1, 2, 3, 6]);
    expect(parseTablePages('', 2)).toEqual([1, 2]);
    expect(() => parseTablePages('2-1', 8)).toThrow();
    expect(() => parseTablePages('0, 2', 8)).toThrow();
    expect(() => parseTablePages('9', 8)).toThrow();
  });
});
