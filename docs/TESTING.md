# Testing strategy

## Executable gates

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

`npm run check` runs typecheck, unit tests, and the production build. Playwright
is separate so local contributors can run fast checks without launching a
browser; CI runs both.

## Current automated evidence

Vitest covers:

- SHA-256 known vectors and typed-array slice handling;
- coordinate round trips at 0, 90, 180, and 270 degrees;
- PDF page selection, reorder, rotation, and flattened overlay export;
- source-byte immutability;
- structural output reopen and typed invalid-input failures.

Playwright covers:

- the explicit home-to-sample workbench journey;
- primary mode navigation and the privacy dialog;
- proof-pass export, browser download, and reopening the downloaded PDF.

All PDF fixtures are generated from source. Do not commit customer documents.

## Manual compatibility charter

The remaining manual matrix lives in
[`tests/e2e/smoke.spec.md`](../tests/e2e/smoke.spec.md). Prioritize:

1. file picker and drag/drop failures;
2. multi-page reorder/rotate/duplicate/delete export;
3. text, drawing, image, and signature coordinate fidelity;
4. supported AcroForm value flattening;
5. output rendering in PDF.js, Edge, Adobe Reader, and another independent
   reader;
6. memory and responsiveness at the 100 MB input limit.

Encrypted, signed, XFA, scripted, OCR, and redaction workflows are negative
tests until their implementations and acceptance criteria exist.

## CI contract

`.github/workflows/ci.yml` uses Node 22, installs with `npm ci`, installs the
Playwright Chromium runtime, and runs typecheck, Vitest, Playwright, and the
production build. A failing gate blocks the build from being treated as
shareable.

## Failure invariants

- Invalid input cannot replace or mutate the active source.
- Delete cannot remove the final page.
- Export must reject missing/duplicate sources, invalid page references,
  unsupported image data, and invalid ranges with typed errors.
- A passing proof report requires a parseable output, expected page count,
  non-empty bytes, and unchanged source hashes.
- UI copy must not claim editable annotations, encryption/signature support,
  recovery, secure signature storage, or cross-reader fidelity without tests.
