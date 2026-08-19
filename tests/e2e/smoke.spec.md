# PDFManager browser smoke specification

This is the manual compatibility specification for the MVP. The companion
`smoke.spec.ts` covers launch, mode, privacy, proof-pass download, and reopen; these cases remain
manual until the product exposes stable test fixtures and accessible state for
the deeper workflows.

## Preconditions

1. Run `npm ci`.
2. Run `npm run dev`.
3. Use a fresh browser profile or clear the `pdfmanager_blackline_*` local
   storage keys.

## Scenarios

### Launch and fixture

- Open the Vite URL.
- Click “Try Sample PDF” and expect the generated “IRS Form W-9” fixture to
  open.
- Expect a visible page canvas and the “Save a Copy” action.
- Select `Pages`, then `Mark Up`, then `Sign`; expect the active workspace to
  change without a full-page reload.

### Open, inspect, and search

- Return home and choose a local `.pdf` from the ingestion zone.
- Expect the filename, page count, dimensions, and source SHA-256 in document
  info.
- Open Search and enter text present in the fixture; navigate next/previous
  matches.
- Drop a non-PDF file; expect a validation message and no document replacement.

### Reversible markup

- Choose Mark Up → Text (or Highlight), draw one object on the page, and move it.
- Press `Ctrl+Z`, then `Ctrl+Y`; expect the object to disappear and reappear.
- Open document info; expect the source SHA-256 to remain the same.

### Page operations

- In Pages mode, reorder two pages, rotate one page, duplicate one page, and add
  a blank page.
- Delete a page, but verify the final remaining page cannot be deleted.
- Return to Select mode and confirm thumbnails and page count reflect the graph.

### Export proof pass

- Open Save a Copy and choose Final Flattened PDF; run Proof Pass.
- Expect four passing checks: PDF header, structural reopen, source
  immutability, and non-zero output size.
- Download the copy, reopen it in PDFManager, and compare page count and visible
  markup with the source session.
- Open the downloaded copy in at least two independent PDF readers and record
  page count and visible-mark differences; this is evidence collection, not a
  cross-reader guarantee.

### Signature storage

- Save a signature only when explicitly opting in; remove it and verify it no
  longer appears in the browser-local list.

## Automation handoff

When expanding Playwright coverage, convert each heading into a tagged test and use
generated fixture bytes rather than filesystem paths. Assert accessible labels
and state, not Tailwind class names or decorative text. Keep exported files in a
temporary test directory and clean them after each run.
