export function spreadsheetCsv(rows: string[][]) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    // Spreadsheet programs can treat imported CSV cells as formulas.
    const safe = /^[\s\uFEFF]*[=+@-]/.test(value) && !/^-\d+(?:\.\d+)?$/.test(value)
      ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n') + '\r\n';
}

export async function spreadsheetXlsx(rows: string[][]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const data = rows.map((row, index) => row.map(value => ({
    value,
    type: String,
    ...(index === 0 ? { fontWeight: 'bold' as const } : {}),
  })));
  return writeXlsxFile(data, {
    sheet: 'Recovered table',
    stickyRowsCount: 1,
    columns: rows[0].map((_, column) => ({
      width: rows.reduce((largest, row) => Math.max(largest, Math.min(42, (row[column]?.length ?? 0) + 2)), 14),
    })),
  }).toBlob();
}

export function downloadSpreadsheet(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = filename;
  document.body.append(element);
  element.click();
  element.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
