# Architecture

## System boundary

PDFManager is a client-only React application built with Vite. There is no
application backend, database, account system, or native helper. Source PDF
bytes, the virtual page graph, overlays, and form values stay in browser memory
for the editing session.

```text
HomeHub -> EditorContext -> virtual pages / overlays / history
                         -> pdfRenderer (PDF.js + bundled worker)
                         -> pdfEngine (pdf-lib composition + proof report)

Shell -> ContextStrip / DocumentCanvas / PageThumbnailSidebar
      -> PageLoomContactSheet / export and information dialogs
```

## Module boundaries

- `components/` owns presentation and input. It uses `useEditor()` instead of
  manipulating PDF bytes directly.
- `context/EditorContext.tsx` owns document lifecycle, selection, in-memory
  state, edit history, search, and the opt-in local signature list.
- `engine/pdfRenderer.ts` owns PDF.js parsing, canvas rendering, text extraction,
  annotations, caching, and the bundled worker URL.
- `engine/pdfEngine.ts` owns inspection, input validation, immutable source
  copies, virtual-page materialization, flattened overlay/form export, typed
  errors, and verification reports.
- `types/` defines the contracts crossing those layers. `fixtures/` creates
  redistributable PDFs used by the product and tests.

## Data flow

1. The browser reads a selected `File` into a `Uint8Array`.
2. Inspection clones and hashes those bytes, parses document metadata, and
   creates virtual `PageNode` records.
3. PDF.js renders cloned bytes. User operations change the page graph and
   overlays, not the source byte array.
4. Export validates source IDs, pages, coordinates, overlays, and settings;
   composes a fresh PDF; then flattens supported form values and marks.
5. Verification checks the PDF header, reopens the output, checks page count and
   non-empty bytes, and hashes every retained source again.
6. Only a passing report enables the browser download.

## Trust and failure boundaries

- SHA-256 requires Web Crypto. There is no counterfeit non-cryptographic
  fallback; verification fails if real SHA-256 is unavailable.
- PNG and JPEG are the only supported image/signature export formats.
- Files larger than 100 MB are rejected before parsing in this MVP.
- Encrypted, signed, XFA, scripted, and malformed documents are unsupported or
  unqualified and must fail without mutating retained source bytes.
- Opted-in saved signatures use unencrypted `localStorage`. Session recovery is
  not implemented and is not advertised.
- The app has no document-upload or telemetry code. The PDF.js worker and fonts
  are local build assets, but extensions and host infrastructure remain outside
  the app's control.

## Next modular cuts

1. Extract pure editor transitions into a reducer with transaction-level
   history tests for pointer gestures.
2. Put inspect/render/export behind a `PdfAdapter` interface.
3. Add a redistributable compatibility corpus for forms, rotations, annotations,
   malformed inputs, and large files.
4. Prove cross-reader output before offering editable annotations.
5. Keep any future desktop filesystem access behind a narrow typed boundary.
