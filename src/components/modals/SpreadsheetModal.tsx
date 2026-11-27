import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, ScanLine, Table2, X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { buildTableRows, parseTablePages, type TablePage, type TableRow } from '../../engine/spreadsheetLayout';
import { downloadSpreadsheet, spreadsheetCsv, spreadsheetXlsx } from '../../engine/spreadsheetExport';
import { readSpreadsheetPages, spreadsheetPagePreview, type SpreadsheetSource } from '../../engine/spreadsheetReader';

const buttonShape = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';
const button = `${buttonShape} hover:bg-white/10`;
const primary = `${buttonShape} bg-emerald-300 font-semibold text-black hover:bg-emerald-200`;
const field = 'min-h-10 rounded-lg border border-white/20 bg-[#101415] px-3 text-sm text-white';

export function SpreadsheetModal({ onClose }: { onClose: () => void }) {
  const { state } = useEditor();
  const dialog = useRef<HTMLDialogElement>(null);
  const running = useRef<AbortController | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState('');
  const [forceScan, setForceScan] = useState(false);
  const [progress, setProgress] = useState<{ label: string; value: number } | null>(null);
  const [error, setError] = useState('');
  const [pages, setPages] = useState<TablePage[]>([]);
  const [activeNumber, setActiveNumber] = useState(1);
  const [mode, setMode] = useState<'review' | 'layout'>('review');
  const [guidesByPage, setGuidesByPage] = useState<Record<number, number[]>>({});
  const [headers, setHeaders] = useState<Record<number, string>>({});
  const [sourceHeader, setSourceHeader] = useState(false);
  const [hideRepeated, setHideRepeated] = useState(true);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [onlyReview, setOnlyReview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewZoom, setPreviewZoom] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
    return () => running.current?.abort();
  }, []);

  const sources = useMemo<SpreadsheetSource[]>(() => state.pages.map((page, index) => ({
    number: index + 1, page, source: state.sources.find(source => source.sourceId === page.sourceId),
  })), [state.pages, state.sources]);
  const activeSource = sources[activeNumber - 1];

  useEffect(() => {
    if (mode !== 'layout' || !activeSource?.source) return;
    const controller = new AbortController();
    setPreviewError('');
    spreadsheetPagePreview(activeSource, controller.signal).then(canvas => {
      if (controller.signal.aborted) return;
      canvas.className = 'block h-auto w-full';
      preview.current?.replaceChildren(canvas);
    }).catch(() => {
      if (!controller.signal.aborted) setPreviewError('Could not show the original page.');
    });
    return () => {
      controller.abort();
      preview.current?.replaceChildren();
    };
  }, [activeSource, mode]);

  const rowsByPage = useMemo(() => pages.map(page => ({
    ...page, rows: buildTableRows(page, guidesByPage[page.number] ?? page.guides),
  })), [pages, guidesByPage]);
  const columnCount = Math.max(1, ...pages.map(page => (guidesByPage[page.number] ?? page.guides).length + 1));
  const active = rowsByPage.find(page => page.number === activeNumber);
  const activeGuides = guidesByPage[activeNumber] ?? active?.guides ?? [];
  const firstRow = rowsByPage.find(page => page.rows.length)?.rows[0];
  const resolvedHeaders = Array.from({ length: columnCount }, (_, column) =>
    headers[column] ?? (sourceHeader && firstRow?.cells[column] ? firstRow.cells[column] : `Column ${column + 1}`));
  const sameAsHeader = (row: TableRow) => firstRow && row.cells.length === firstRow.cells.length &&
    row.cells.every((cell, index) => cell.trim().toLowerCase() === firstRow.cells[index].trim().toLowerCase());
  const dataPages = rowsByPage.map(page => ({
    number: page.number,
    rows: page.rows.filter((row, index) => !removed.has(row.id) &&
      !(sourceHeader && (row.id === firstRow?.id || (hideRepeated && index === 0 && sameAsHeader(row))))),
  }));
  const reviewCell = (row: TableRow, column: number) =>
    row.review[column] && edits[`${row.id}-${column}`] === undefined;
  const needsReview = (row: TableRow) => row.review.some((_, column) => reviewCell(row, column));
  const rowCount = dataPages.reduce((total, page) => total + page.rows.length, 0);
  const flagged = dataPages.reduce((total, page) => total + page.rows.filter(needsReview).length, 0);
  const shownRows = dataPages.find(page => page.number === activeNumber)?.rows
    .filter(row => !onlyReview || row.review.some(Boolean)) ?? [];

  async function extract() {
    if (running.current) return;
    setError('');
    const controller = new AbortController();
    try {
      const numbers = parseTablePages(range, sources.length);
      running.current = controller;
      setProgress({ label: 'Preparing pages', value: 0 });
      const loaded = await readSpreadsheetPages(numbers.map(number => sources[number - 1]), forceScan,
        controller.signal, (number, stage, value) => {
          setProgress({ label: `${stage} · page ${number}`, value: (numbers.indexOf(number) + value) / numbers.length });
        });
      if (controller.signal.aborted) return;
      if (!loaded.some(page => page.lines.length)) {
        throw new Error('No readable rows were found. Try an upright, clearer scan or a different page range.');
      }
      const reference = loaded.find(page => page.guides.length > 0)?.guides;
      const initial = Object.fromEntries(loaded.filter(page => page.lines.length && !page.guides.length && reference)
        .map(page => [page.number, [...reference!]]));
      const firstPage = loaded.find(page => page.lines.length)!;
      const firstRows = buildTableRows(firstPage, initial[firstPage.number] ?? firstPage.guides);
      const first = firstRows[0].cells;
      const looksLikeHeader = first.filter(Boolean).length > 1 &&
        first.every(cell => !/\d/.test(cell)) && firstRows.slice(1, 5).some(row => row.cells.some(cell => /\d/.test(cell)));
      setGuidesByPage(initial);
      setSourceHeader(looksLikeHeader);
      setHeaders({});
      setEdits({});
      setRemoved(new Set());
      setOnlyReview(false);
      setActiveNumber(firstPage.number);
      setPages(loaded);
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'Could not read the PDF. Try again.');
      }
    } finally {
      running.current = null;
      if (!controller.signal.aborted) setProgress(null);
    }
  }

  function changeGuides(next: number[], all = false) {
    const affected = new Set(all ? pages.map(page => page.number) : [activeNumber]);
    setGuidesByPage(previous => ({ ...previous, ...Object.fromEntries([...affected].map(number => [number, next])) }));
    // Existing edits are attached to the original columns for each page.
    setEdits(previous => Object.fromEntries(Object.entries(previous)
      .filter(([key]) => !affected.has(Number(key.split('-')[0])))));
  }

  async function save(format: 'csv' | 'xlsx') {
    if (exporting) return;
    setError('');
    setExporting(true);
    try {
      const output = [resolvedHeaders, ...dataPages.flatMap(page => page.rows.map(row =>
        resolvedHeaders.map((_, column) => edits[`${row.id}-${column}`] ?? row.cells[column] ?? ''),
      ))];
      const blob = format === 'csv' ? new Blob([spreadsheetCsv(output)], { type: 'text/csv;charset=utf-8' })
        : await spreadsheetXlsx(output);
      downloadSpreadsheet(blob, `${state.projectName || 'recovered-table'}.${format}`);
    } catch {
      setError('Could not prepare the download. Try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="spreadsheet-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => event.stopPropagation()}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[min(70rem,calc(100%-1rem))] max-w-none overflow-hidden rounded-2xl border border-white/15 bg-[#0b1112] p-0 text-white shadow-2xl backdrop:bg-black/80"
    >
      <div className="flex max-h-[calc(100dvh-1rem)] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <Table2 className="mt-1 size-5 shrink-0 text-emerald-300" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="spreadsheet-title" className="text-lg font-semibold">PDF to spreadsheet</h2>
              <p className="truncate text-sm text-slate-300">{state.projectName}.pdf</p>
            </div>
          </div>
          <button type="button" className={button} aria-label="Close spreadsheet tool" onClick={onClose}><X className="size-4" /></button>
        </header>

        <div className="min-h-0 overflow-auto p-4 sm:p-6">
          {!pages.length ? (
            <form className="max-w-md space-y-4" onSubmit={event => { event.preventDefault(); void extract(); }}>
              <p className="text-sm text-slate-200">Recover rows and columns from a printed table. Scans are read on this device.</p>
              <label className="flex flex-col gap-1.5 text-sm">
                Pages to read
                <input className={field} value={range} onChange={event => setRange(event.target.value)}
                  placeholder={`All ${sources.length} ${sources.length === 1 ? 'page' : 'pages'}`} disabled={!!progress} />
                <span className="text-xs text-slate-400">To read specific pages, enter a range like 1–4 or 1, 3.</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-200">
                <input className="mt-1 accent-emerald-300" type="checkbox" checked={forceScan}
                  onChange={event => setForceScan(event.target.checked)} disabled={!!progress} />
                Read every page as a scan
              </label>
              {progress ? (
                <div role="status" className="space-y-2">
                  <p className="text-sm">{progress.label}</p>
                  <progress className="h-2 w-full accent-emerald-300" max={1} value={progress.value} />
                </div>
              ) : (
                <button type="submit" className={primary}><ScanLine className="size-4" /> Read table</button>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button className={mode === 'review' ? primary : button} aria-pressed={mode === 'review'} onClick={() => setMode('review')}>Review rows</button>
                  <button className={mode === 'layout' ? primary : button} aria-pressed={mode === 'layout'} onClick={() => setMode('layout')}>Adjust columns</button>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  PDF page
                  <select className={field} value={activeNumber} onChange={event => setActiveNumber(Number(event.target.value))}>
                    {pages.map(page => <option key={page.number} value={page.number}>
                      {page.number} · {page.lines.length ? (page.method === 'scan' ? 'Scan' : 'PDF text') : 'No rows'}
                    </option>)}
                  </select>
                </label>
              </div>

              {mode === 'layout' ? (
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
                  <div className="mx-auto w-full min-w-0 max-w-[44rem] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-300">Original page</span>
                      <button className={button} onClick={() => setPreviewZoom(previous => !previous)}>
                        {previewZoom ? 'Fit page' : 'Zoom in'}
                      </button>
                    </div>
                    <div className="max-h-[45dvh] overflow-auto rounded-lg bg-white/5">
                      <div className={`relative ${previewZoom ? 'min-w-[52rem]' : 'w-full'}`}>
                        <div key={activeNumber} ref={preview} />
                        {activeGuides.map(guide => <div key={guide}
                          className="pointer-events-none absolute inset-y-0 w-0.5 bg-emerald-400 shadow-[0_0_0_1px_#0b1112]"
                          style={{ left: `${guide * 100}%` }} />)}
                        {activeSource?.source && <button
                          type="button"
                          aria-label="Add column divider at clicked position"
                          tabIndex={-1}
                          className="absolute inset-0 cursor-crosshair"
                          onClick={event => {
                            if (event.detail === 0 || activeGuides.length >= 39) return;
                            const rect = event.currentTarget.getBoundingClientRect();
                            const position = Math.round((event.clientX - rect.left) / rect.width * 1000) / 1000;
                            if (position > 0 && position < 1 && !activeGuides.includes(position)) {
                              changeGuides([...activeGuides, position].sort((a, b) => a - b));
                            }
                          }}
                        />}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-lg border border-white/10 p-3">
                    <p className="text-sm text-slate-200">Tap between columns on the page, or adjust the dividers below.</p>
                    {previewError && <p role="alert" className="text-sm text-amber-300">{previewError}</p>}
                    {activeGuides.map((guide, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <label className="flex flex-1 items-center justify-between gap-1 text-sm">
                          Divider {index + 1}
                          <input aria-label={`Divider ${index + 1} position`} type="number" step="0.1" className={`${field} w-20`}
                            min={0.1} max={99.9} value={Math.round(guide * 1000) / 10}
                            onChange={event => {
                              const value = Number(event.target.value) / 100;
                              if (value > (activeGuides[index - 1] ?? 0) && value < (activeGuides[index + 1] ?? 1)) {
                                changeGuides(activeGuides.map((existing, slot) => slot === index ? value : existing));
                              }
                            }} />
                          %
                        </label>
                        <button className={button} aria-label={`Remove divider ${index + 1}`}
                          onClick={() => changeGuides(activeGuides.filter((_, slot) => slot !== index))}><X className="size-4" /></button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <button className={button} disabled={activeGuides.length >= 39} onClick={() => {
                        const edges = [0, ...activeGuides, 1];
                        const gaps = edges.slice(1).map((end, index) => ({ start: edges[index], end }));
                        const widest = gaps.reduce((a, b) => a.end - a.start >= b.end - b.start ? a : b);
                        changeGuides([...activeGuides, (widest.start + widest.end) / 2].sort((a, b) => a - b));
                      }}>Add divider</button>
                      <button className={button} onClick={() => changeGuides(active?.guides ?? [])}>Auto-detect</button>
                      {pages.length > 1 && <button className={button} onClick={() => changeGuides(activeGuides, true)}>Use on all pages</button>}
                    </div>
                    <p className="text-xs text-slate-400">Set dividers before editing cells. Moving a divider rebuilds that page's cells.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-200">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-emerald-300" checked={sourceHeader}
                        onChange={event => setSourceHeader(event.target.checked)} />
                      Use first row as headers
                    </label>
                    {sourceHeader && pages.length > 1 && <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-emerald-300" checked={hideRepeated}
                        onChange={event => setHideRepeated(event.target.checked)} />
                      Skip matching headers on later pages
                    </label>}
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-emerald-300" checked={onlyReview}
                        onChange={event => setOnlyReview(event.target.checked)} />
                      Show rows flagged by the reader
                    </label>
                    {removed.size > 0 && <button className="text-emerald-300 underline" onClick={() => setRemoved(new Set())}>Restore removed rows</button>}
                  </div>
                  {active && active.lines.length > 0 && activeGuides.length + 1 !== columnCount && (
                    <p className="text-sm text-amber-300">This page has fewer columns than another page. Check its dividers before exporting.</p>
                  )}
                  <div tabIndex={0} role="region" aria-label="Editable spreadsheet preview" className="max-h-[46dvh] overflow-auto rounded-lg border border-white/15">
                    <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-[#192628]">
                        <tr>
                          <th className="w-12 px-2 py-2" scope="col"><span className="sr-only">Row</span></th>
                          {resolvedHeaders.map((header, column) => (
                            <th className="border-l border-white/10 p-1.5" scope="col" key={column}>
                              <input aria-label={`Column ${column + 1} header`} className={`${field} w-36 font-medium sm:w-44`}
                                value={header} onChange={event => setHeaders(previous => ({ ...previous, [column]: event.target.value }))} />
                            </th>
                          ))}
                          <th className="w-12 px-2 py-2" scope="col"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {shownRows.map(row => {
                          const rowNumber = Number(row.id.split('-')[1]) + 1;
                          return <tr key={row.id} className="odd:bg-white/[0.025]">
                            <th scope="row" className="border-t border-white/10 px-2 text-right font-mono font-normal text-slate-400">{rowNumber}</th>
                            {resolvedHeaders.map((header, column) => {
                              const key = `${row.id}-${column}`;
                              const flaggedCell = reviewCell(row, column);
                              return <td key={column} className={`border-t border-l border-white/10 p-1 ${flaggedCell ? 'bg-amber-300/15' : ''}`}>
                                <input
                                  aria-label={`Row ${rowNumber}, ${header || `column ${column + 1}`}${flaggedCell ? ', check value' : ''}`}
                                  title={flaggedCell ? 'Check this value against the scan' : undefined}
                                  className="min-h-9 w-36 rounded px-2 text-white sm:w-44"
                                  value={edits[key] ?? row.cells[column] ?? ''}
                                  onChange={event => setEdits(previous => ({ ...previous, [key]: event.target.value }))}
                                />
                              </td>;
                            })}
                            <td className="border-t border-white/10 px-1">
                              <button aria-label={`Remove row ${rowNumber}`} className="rounded p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                                onClick={() => setRemoved(previous => new Set([...previous, row.id]))}><X className="size-4" /></button>
                            </td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                    {!shownRows.length && <p className="p-3 text-sm text-slate-300">{onlyReview ? 'No flagged rows on this page.' : 'No rows to review on this page.'}</p>}
                  </div>
                  <p className="text-xs text-slate-400">Click any header or cell to edit it. Compare account numbers with the page before using them.</p>
                </>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-4 text-sm text-amber-300">{error}</p>}
        </div>

        {pages.length > 0 && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#101819] p-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <button className={button} onClick={() => { setPages([]); setMode('review'); setError(''); }}><ArrowLeft className="size-4" /> Start over</button>
            <p role="status" className="text-sm text-slate-300">
              {rowCount} {rowCount === 1 ? 'row' : 'rows'} · {columnCount} {columnCount === 1 ? 'column' : 'columns'}
              {flagged > 0 && <span className="text-amber-300"> · {flagged} to check</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={button} disabled={!rowCount || exporting} onClick={() => void save('csv')}>Download CSV</button>
            <button className={primary} disabled={!rowCount || exporting} onClick={() => void save('xlsx')}>
              <Download className="size-4" /> Download Excel
            </button>
          </div>
        </footer>}
      </div>
    </dialog>
  );
}
