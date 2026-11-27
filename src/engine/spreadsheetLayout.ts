export interface TableToken {
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  confidence?: number;
}

export interface TableRow {
  id: string;
  cells: string[];
  review: boolean[];
}

export interface TablePage {
  number: number;
  method: 'text' | 'scan';
  lines: TableToken[][];
  guides: number[];
}

function median(values: number[]) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
}

export function groupTableLines(tokens: TableToken[]): TableToken[][] {
  const center = (token: TableToken) => (token.top + token.bottom) / 2;
  const tolerance = median(tokens.map(token => token.bottom - token.top)) * 0.6;
  const lines: TableToken[][] = [];
  let line: TableToken[] = [];
  let baseline = -Infinity;
  for (const token of [...tokens].sort((a, b) => center(a) - center(b))) {
    if (center(token) - baseline > tolerance) {
      line = [];
      lines.push(line);
      baseline = center(token);
    }
    line.push(token);
  }
  return lines.map(items => items.sort((a, b) => a.left - b.left));
}

export function detectColumnGuides(lines: TableToken[][], pageAspect: number) {
  const rowHeight = median(lines.flatMap(line => line.map(token => token.bottom - token.top)));
  const minGap = Math.max(0.008, rowHeight * pageAspect * 1.2);
  const dataLines = lines.filter(line => line.length > 1);
  const minimumSupport = Math.max(2, Math.ceil(dataLines.length * 0.46));
  const gaps = dataLines.flatMap((line, row) => line.slice(1).flatMap((token, index) => {
    const left = line[index].right;
    const right = token.left;
    return right - left >= minGap ? [{ left, right, row }] : [];
  }));
  // Evaluate recurring next-column starts, then place each guide inside the
  // shared whitespace just before that start. Variable-width names stay intact.
  const guides: number[] = [];
  const usedGaps = new Set<typeof gaps[number]>();
  const candidates = [...gaps].sort((a, b) => a.right - b.right);
  for (const candidate of candidates) {
    const group = gaps.filter(gap =>
      !usedGaps.has(gap) && Math.abs(gap.right - candidate.right) <= minGap * 0.65
    );
    if (new Set(group.map(gap => gap.row)).size < minimumSupport) continue;
    const left = Math.max(...group.map(gap => gap.left));
    const right = Math.min(...group.map(gap => gap.right));
    if (right <= left) continue;
    const guide = right - Math.min((right - left) / 2, minGap);
    if (guides.some(existing => Math.abs(existing - guide) < minGap * 1.5)) continue;
    guides.push(guide);
    group.forEach(gap => usedGaps.add(gap));
  }
  return guides.slice(0, 39).sort((a, b) => a - b);
}

export function buildTableRows(page: TablePage, guides: number[]): TableRow[] {
  return page.lines.map((line, index) => {
    const cells = Array.from({ length: guides.length + 1 }, () => '');
    const review = cells.map(() => false);
    for (const token of line) {
      // If a guide cuts a word, retain it intact and mark the selected cell.
      const center = (token.left + token.right) / 2;
      const column = guides.filter(guide => guide <= center).length;
      cells[column] = cells[column] ? `${cells[column]} ${token.text}` : token.text;
      review[column] ||= (token.confidence !== undefined && token.confidence < 85) ||
        guides.some(guide => guide > token.left && guide < token.right);
    }
    return { id: `${page.number}-${index}`, cells, review };
  });
}

export function parseTablePages(input: string, count: number): number[] {
  if (!input.trim()) return Array.from({ length: count }, (_, index) => index + 1);
  const selected = new Set<number>();
  for (const part of input.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match) throw new Error('Enter page numbers like 1–4, 6.');
    const first = Number(match[1]);
    const last = Number(match[2] ?? match[1]);
    if (first < 1 || last < first || last > count) {
      throw new Error(`Choose pages between 1 and ${count} in ascending ranges.`);
    }
    for (let page = first; page <= last; page += 1) selected.add(page);
  }
  return [...selected].sort((a, b) => a - b);
}
