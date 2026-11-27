# PDF to spreadsheet

Printed account lists should come back as usable rows and columns without retyping hundreds of entries.

Open a PDF, recover its table, set your own column names, check values against the page, and download CSV or Excel. Excel keeps identifiers as text so leading zeros survive.

Verify with fabricated account lists. A lined, image-only packet of 200 accounts should preserve row count, blank cells, and leading zeros. A borderless layout should keep multiword names together and allow manual column adjustments. A PDF with selectable text should take the direct extraction path. Check both downloads and the review screen at phone width.

Reuse PDF.js for page rendering and positioned text. Run English OCR in a browser worker for scanned pages. Infer columns from grid lines or repeated gaps. Let the user correct the proposed boundaries and edit the export grid. Read the selected pages in document order and keep page references during review.
