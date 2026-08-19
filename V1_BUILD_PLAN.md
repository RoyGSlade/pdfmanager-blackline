# PDFManager V1 Build Plan

**Status:** Draft for owner attack  
**Planning date:** 2026-08-19  
**Working product name:** PDFManager  
**Design direction:** Blackline Workbench  
**Release family:** Underplain  

> Open a PDF. Keep the original. Make a clean copy.

This is the plan for the complete V1 described in the product brief, not a reduced demo and not an Acrobat clone. It is intentionally written with decision gates and failure conditions so the owner can expand, shrink, or reject parts without the rest of the plan turning into mush.

No implementation is claimed. The workspace began empty, and the current public [PDFManager page](https://donavencrenshaw.com/underplain/pdfmanager/) correctly labels the product as a concept with unproven implementation.

## 1. Recommendation

Build a Windows-first, local-first PDF essentials application as one coordinated V1 campaign with gated internal waves.

The product contract is stronger than a feature list:

1. The document is not uploaded.
2. The original is immutable during the editing session.
3. Every change is reversible until export.
4. Save a Copy is the default.
5. An export is not reported as successful until it is reopened and checked.
6. Limitations are shown before the user invests work, not discovered at export.

The differentiator is **verified local work and safe output**, not “more PDF tools.” PDF24 already offers a broad, free, offline Windows suite and explicitly says files remain on the PC; Sejda Desktop also processes files locally. Competing on the number of checkboxes would be dumb. Compete on one coherent workspace, honest boundaries, and a Safe Save contract. Sources: [PDF24 Creator](https://tools.pdf24.org/en/creator), [Sejda Desktop](https://www.sejda.com/en/desktop).

“Nearly one shot” should mean one planned build campaign with frozen contracts and parallel work inside each wave. It cannot mean one enormous unverified code dump. PDF interoperability, encryption, forms, recovery, installers, and signing require evidence on real files and real machines.

## 2. Default product decisions

These defaults let planning continue without pretending every question is open.

| Decision | Default | Why |
|---|---|---|
| Primary user | Households, freelancers, and small offices handling forms, insurance, school, medical, legal, and receipt PDFs | Clear recurring jobs; no enterprise admin or design-review detour |
| Product model | Free of charge, source available, MIT licensed | This is the published [Underplain contract](https://donavencrenshaw.com/underplain/); a paid or crippled edition would contradict the brand |
| Accounts/cloud | None | They add no value to the V1 promise and weaken the privacy claim |
| Network | Editing works with networking disabled; only explicit update checks may connect | Easy to explain and verify |
| Distribution | Signed direct Windows x64 installer first | Fastest route to a real Underplain release; Store/MSIX is a later distribution decision |
| UI language | English in V1; localization-ready strings from day one | Keeps V1 finite without hard-coding English into the architecture |
| Output modes | Editable PDF and Final flattened PDF | This preserves the requested full-V1 contract; the engine must prove it in Wave 0 |
| Project state | Versioned local project/recovery format in addition to PDF output | Gives lossless app editability and deterministic recovery without pretending every PDF viewer preserves every edit |
| Themes | System light/dark plus Windows contrast themes; branded dark is default | Underplain feel without sacrificing accessibility |
| Signatures | Electronic signatures only; saved signature vault is explicit opt-in | Accurate terminology and safer handling of sensitive signature data |

### Business-model hole to poke

- [ ] Keep PDFManager inside Underplain: free, MIT, no activation, no watermarks, optional paid services through Crenshaw Systems.
- [ ] Move it outside Underplain and design a separate commercial product model.

**Recommendation:** keep it inside Underplain. If financial independence is the goal, monetize installation, customization, deployment, training, and support through Crenshaw Systems. Do not corrupt a public brand promise to squeeze a license screen into the app.

## 3. Complete V1 cut line

Everything in this section ships before V1 is called complete.

### 3.1 Open and view

- File picker, drag-and-drop, and Windows Open With/file association.
- Single-instance handoff when a PDF is opened from Explorer.
- Accurate virtualized multi-page rendering.
- Zoom, fit width, fit page, page jump, thumbnails, and page count.
- Selectable text and search with clear “no selectable text; OCR is not included” behavior.
- Password prompt for protected PDFs; passwords remain in memory and never enter logs, recovery, command arguments, or telemetry.
- Progressive opening: page 1 becomes usable before every thumbnail is rendered.
- Clear states for malformed, unsupported, XFA, scanned, permission-restricted, oversized, or partially recoverable files.
- Document information: filename, size, page count, page dimensions, encryption, AcroForms, and detected digital-signature fields/dictionaries.

### 3.2 Add and edit overlay content

- Text boxes: bundled font choice, size, color, alignment, background, opacity.
- Images: PNG/JPEG assets for initials, stamps, and logos.
- Electronic signatures: draw, type, or import; saving on the device is opt-in.
- Highlight, underline, strike-through, freehand drawing.
- Rectangle, line, arrow, and checkmark.
- Every added object supports select, move, resize, duplicate, delete, copy/paste, undo/redo, keyboard nudge, and z-order.
- One pointer gesture produces one history command; typing is transactionally coalesced.
- Existing paragraphs are never presented as editable.

### 3.3 Fill forms

- Ordinary AcroForm text, multiline, checkbox, radio, dropdown, and option-list fields.
- Read-only and required states respected.
- Existing signature widgets accept placement of an electronic-signature appearance, with explicit copy that this is not certificate-backed signing.
- Export can preserve qualified fields or flatten completed field appearances.
- PDF JavaScript, calculations, validation scripts, launch actions, and XFA filling are disabled.
- Pure XFA is view-only/unsupported. Hybrid XFA receives a warning and may use visual overlays only.

### 3.4 Manage pages

- Reorder with drag-and-drop and keyboard equivalents.
- Rotate, delete, duplicate, insert blank pages.
- Insert pages from another PDF.
- Extract selected pages to a new PDF.
- Merge multiple PDFs.
- Split at selected boundaries.
- Multi-selection with Ctrl/Shift and visible insertion position.
- Structural edits change a virtual page graph first; bytes are rewritten only during export.

Adobe and Preview both use direct thumbnail manipulation for page work. The app should use a full contact-sheet Pages mode rather than forcing structural surgery into a narrow sidebar. Sources: [Adobe Organize Pages](https://helpx.adobe.com/acrobat/desktop/edit-documents/organize-pages/move-pages.html), [Apple Preview page management](https://support.apple.com/en-hk/guide/preview/prvw11793/mac).

### 3.5 Save, export, recover

- Save a Copy is primary and default.
- Overwrite Original is hidden under an explicit advanced action, blocked for signed originals, and requires confirmation.
- Editable PDF preserves supported standard annotations and qualified AcroForms.
- Final PDF flattens Underplain-created overlays and optionally form fields into page content.
- Three image-quality presets: Small, Balanced, High Quality.
- Export selected pages to PNG or JPEG.
- Preserve page boxes, dimensions, orientation, selectable original text, and existing unrelated annotations where qualified.
- Preserve the original encryption policy for a single protected source when qualified. Multiple encrypted sources require an explicit output-encryption decision.
- Detect signed/signature-field PDFs and force “Create a modified copy” before editing.
- Crash recovery restores the last acknowledged editing command.
- The export pipeline stages, validates, reopens, and only then places the destination file.
- A failed export cannot modify or replace the original.

### 3.6 Shell, help, settings, accessibility

- Recent files stored locally, with disable and clear controls.
- Local-only privacy explanation and network behavior page.
- Supported/unsupported features page linked from relevant warnings.
- Keyboard shortcuts and discoverable access keys.
- Full keyboard paths for drag actions, page operations, object movement, and export.
- Narrator labels/state, logical focus order, visible focus, 200% UI scaling, reduced motion, and Windows contrast themes.
- Installer, updater, uninstaller, file association, and signed-binary verification.

### 3.7 Explicitly outside V1

- Existing paragraph replacement or reflow.
- OCR and scanned-document cleanup.
- PDF-to-Word/Office conversion.
- Certificate-backed digital signing or certificate validation.
- Secure redaction.
- Collaboration, comments between users, accounts, cloud storage, AI, mobile, batch processing.
- Full accessibility remediation of source PDFs.
- PDF/A conversion.
- Text-to-speech.
- Print workflow beyond opening the verified copy in the user’s chosen reader.

If a black box is placed over text, call it a rectangle. Do not call it redaction unless the underlying content is provably removed.

## 4. The four Wave 0 truth tests

No production editor UI begins until these pass or the owner explicitly changes the product contract.

### Gate A — Editable annotation interoperability

Map every V1 overlay to a standard PDF annotation where possible:

| Underplain object | Standard output candidate |
|---|---|
| Text box | FreeText |
| Image/electronic signature/checkmark | Stamp with appearance stream |
| Highlight | Highlight with QuadPoints |
| Underline | Underline with QuadPoints |
| Strike-through | StrikeOut with QuadPoints |
| Freehand | Ink |
| Rectangle | Square |
| Line/arrow | Line with line-ending style |

Prototype all types against the pinned PDF.js/pdf-lib/qpdf stack. Reopen, move, resize, delete, and render them in Adobe Reader, Edge, Chrome, PDF.js, and macOS Preview.

**Pass:** all required types retain appearance, page position, and documented editability across the supported reader matrix.  
**Kill:** a required type needs unstable private APIs, corrupts files, drifts, or silently stops being editable.

If killed, the owner must choose one of these—no third fake option:

1. Qualify and budget a commercial local PDF SDK that permits the Underplain distribution model.
2. Amend V1 to “losslessly editable in Underplain project files; flattened in exported PDFs.”

### Gate B — Encrypted round-trip

Test AES-128/AES-256, legacy RC4 read-only handling, Unicode passwords, user/owner passwords, permissions, wrong passwords, copy-encryption, and crashes mid-export.

`pdf-lib` officially does not support encrypted input, while qpdf can accept passwords from standard input and copy encryption parameters. Therefore encrypted files require a qpdf/libqpdf preprocessing boundary rather than passing encrypted bytes directly into pdf-lib. Sources: [pdf-lib encryption limitation](https://github.com/Hopding/pdf-lib#encryption-handling), [qpdf CLI](https://qpdf.readthedocs.io/en/stable/cli.html).

**Default:** build a small signed native helper around libqpdf’s memory APIs so the app does not intentionally write a plaintext working PDF. Passwords pass through an anonymous pipe, never argv.  
**Fallback:** a user-only ACL temp directory with crash cleanup and an honest disclosure that decrypted working bytes can briefly touch disk.  
**Kill:** protection is silently removed/weakened, permission policy mutates, passwords enter logs/argv/recovery, or export cannot be reliably reopened.

### Gate C — Forms during page surgery

Test duplicate field names, multiple widgets, NeedAppearances, rotated widgets, custom checkbox states, multiline/comb fields, Unicode, signature widgets, reorder/delete/duplicate/merge/split.

**Default product rule:** fields in the primary document may remain editable when qualified. Imported, duplicated, or split form pages flatten affected field appearances unless a specific preservation test passes. qpdf documents limitations around document-level form structures and duplicated page objects; calling arbitrary merges “lossless” would be dishonest.

**Kill:** any unsupported form disappears or changes value without a preflight warning and deterministic downgrade.

### Gate D — Coordinate fidelity

Use one canonical space: unrotated PDF user space relative to the visible CropBox, in PDF points/user units, bottom-left origin. Only the rendering/export adapters may translate to top-left DOM/canvas/device pixels.

Test CropBox offsets, MediaBox differences, negative origins, `/UserUnit`, 0/90/180/270-degree rotation, mixed sizes, landscape, high DPI, zoom, and resize.

**Pass:** PDF → viewport → PDF round-trip error is at most 0.25 point; exported corners differ from preview by at most 0.5 point.  
**Kill:** coordinates depend on zoom or any must-support fixture exceeds tolerance.

## 5. Experience design — Blackline Workbench

The live DonavenCrenshaw.com reference uses deep black surfaces, restrained white/gray text, Inter, mono metadata, metallic headings, hairline borders, circuit traces, light bloom, and explicit proof/maturity language. That was directly observed on the [homepage](https://donavencrenshaw.com/), [Underplain](https://donavencrenshaw.com/underplain/), and [PDFManager concept](https://donavencrenshaw.com/underplain/pdfmanager/).

The app must feel launched by Underplain without turning a portfolio page into a cockpit.

### 5.1 Principles

1. **Paper first:** the PDF is the brightest and quietest object.
2. **Proof, not magic:** Original untouched, Recovery current, Local only, and Copy verified are visible factual states.
3. **One bench, clear modes:** Fill & Sign, Mark Up, and Pages change the contextual tools; open/save/search/zoom remain stable.
4. **Reversible by construction:** undo is universal; delete is reversible in-session; overwrite is exceptional.
5. **Decoration earns its keep:** circuit lines, glow, and motion indicate real state or relationship and never touch the document page.

### 5.2 Shell

- **Home:** dominant Open a PDF/drop target; Fill & Sign, Combine files, Organize pages shortcuts; recovery above recents; privacy proof line.
- **Top bar:** filename/dirty state, Open, Save a Copy, Undo/Redo, Search, zoom/fit, Export.
- **Task rail:** Select, Fill & Sign, Mark Up, Pages. Labels appear for first-run use.
- **Page sidebar:** resizable thumbnails for navigation in content modes.
- **Context strip:** tools for the active mode.
- **Canvas:** neutral work surface with pristine white paper; no grain, scanlines, or glow under the page.
- **Inspector:** appears only for a selected object/page; becomes a drawer in narrower windows.
- **Integrity rail:** `ORIGINAL UNTOUCHED · RECOVERY CURRENT · 17 EDITS · LOCAL ONLY` plus page/zoom.
- **Pages mode:** center canvas becomes a large contact sheet with an imported-file tray.

Minimum supported window target: 1024×720. F6 cycles major regions; Tab moves within a region; arrow keys operate toolbars/thumbnails; Escape cancels the active tool or closes a transient surface.

### 5.3 Tokens

| Role | Default |
|---|---|
| Void | `#08090B` |
| Chrome | `#0D0F12` |
| Raised | `#15181D` |
| Canvas | `#20242A` |
| Paper | `#FCFCFA` |
| Primary text | `#F4F5F6` |
| Secondary text | `#B0B5BD` |
| Signal accent | `#74D7FF` |
| Success | `#73D9A2` |
| Warning | `#FFC56B` |
| Danger | `#FF7B83` |
| UI type | Segoe UI Variable |
| Metadata | Cascadia Mono or IBM Plex Mono |
| Spacing | 4/8/12/16/24/32 |
| Motion | 100–160ms controls; 180–220ms panels; 220–260ms page relocation |

Colors never carry state alone. Normal text must meet 4.5:1 contrast; high-contrast mode replaces decorative styling with system colors. Microsoft treats keyboard, focus, contrast themes, and screen-reader support as core Windows accessibility requirements. Sources: [Windows accessibility overview](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-overview), [accessible text](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessible-text-requirements).

### 5.4 Signature interactions

1. **Integrity rail:** live proof of original, recovery, local, edit, and export state.
2. **Page Loom:** the contact sheet uses a bright structural insertion seam and immediate renumbering.
3. **Drafting guides:** move/resize shows T-square guides and a mono coordinate readout; Alt-drag duplicates.
4. **Proof Pass:** export shows only real phases—prepare, stage, write, reopen, verify, place copy.
5. **Recovery ticket:** timestamped card states exactly which file, pages, edits, and checkpoint can be restored.

### 5.5 Do not copy from the website

- Giant metallic headings in the editor.
- Fixed 264px navigation.
- Persistent grain, scanlines, glow, or ambient animation.
- Tiny all-caps mono text for normal UI.
- A rotating sigil or cyberpunk decoration.

Those are good portfolio language and lousy document-workstation ergonomics.

## 6. Architecture

### 6.1 Core flow

```text
Windows shell / file dialogs / Open With
                  |
                  v
Electron main: file grants, lifecycle, recovery, updater, save transaction
                  |
           typed preload bridge
                  |
                  v
Sandboxed React renderer
  |              |                 |
  |              |                 +--> SVG/DOM overlay editor
  |              +--> editor-core command reducer/history/page graph
  +--> PDF.js worker: render, text, search, forms, metadata
                  |
                  v
pdf-engine export worker --> provisional pdf-lib adapter
                  |
                  v
fixed native broker/helper --> qpdf/libqpdf
                  |
                  v
staged bytes --> qpdf check --> PDF.js reopen --> verified copy/replace
```

### 6.2 Technology decisions

| Area | Decision |
|---|---|
| Desktop shell | Electron Forge, React, TypeScript, Vite |
| Viewer | Pinned matching versions of `pdfjs-dist` worker and API |
| Editing UI | React DOM/SVG overlay; do not bind product state to PDF.js editor internals |
| Editor state | Pure TypeScript command reducer with versioned serializable commands and stable IDs |
| PDF authoring | `pdf-lib` behind a replaceable adapter until Wave 0 proves it |
| Structure/encryption/checks | qpdf plus a minimal fixed native broker; libqpdf helper if encrypted memory processing is required |
| IPC validation | Narrow verb-based preload APIs plus schema validation; opaque document handles instead of arbitrary paths |
| Recovery | Encrypted append journal + periodic snapshots + content-addressed assets |
| Tests | Vitest/property tests, Playwright renderer/dev flows, packaged-build smoke tests, visual diffs, cross-reader manual qualification |
| Packaging | Electron Forge + signed Squirrel.Windows x64 initially |

PDF.js is a viewer foundation, not the product’s domain model. Its viewer can be reskinned/built upon and it supplies rendering/search/text layers, but editor internals must not leak into `editor-core`. [PDF.js getting started](https://mozilla.github.io/pdf.js/getting_started/).

Electron’s renderer is a hostile-document boundary. Follow the official checklist: sandbox, context isolation, no Node integration, restrictive CSP, sender validation, restricted navigation/windows, current Electron, custom app protocol, and narrow IPC. [Electron security](https://www.electronjs.org/docs/latest/tutorial/security).

### 6.3 Core data model

```text
Project
  schemaVersion
  sources[] { sourceId, sha256, byteLength, encrypted, pathHint?, embedded? }
  pages[]   { pageId, sourceId?, sourcePageIndex?, blankSpec?, rotationDelta }
  objects[] { objectId, pageId, type, geometry, style, zIndex, assetHash? }
  fields[]  { sourceId, qualifiedName, widgetId?, value, policy }
  history   { commands[], cursor, snapshots[] }
```

Rules:

- Original sources are immutable.
- Page/object IDs survive reorder, delete, undo, and recovery; page indexes do not.
- Commands are deterministic, serializable, schema-versioned, and library-independent.
- Imported assets are deduplicated by SHA-256.
- PDF libraries are only reachable through `pdf-engine` contracts.
- Every schema change includes a migration or a safe read-only failure.

### 6.4 Export transaction

1. Freeze an immutable project revision and source hashes.
2. Revalidate source size/hash/mtime; stop if an external change is detected.
3. Preflight encryption, permissions, signatures, XFA, active content, forms, and page boxes.
4. Materialize the virtual page graph.
5. Apply field changes and regenerate appearances with the exact embedded font bytes.
6. Write standard annotations for Editable PDF or page-content appearances for Final PDF.
7. Preserve unrelated source annotations; never flatten everything by accident.
8. Restore/copy qualified encryption.
9. Write a staged output in the destination directory.
10. Run qpdf structural checks and reopen through PDF.js.
11. Verify page count/order/dimensions, expected objects/forms, and encryption state.
12. Place the new copy atomically. Explicit overwrite additionally uses a backup and rollback journal.
13. Update recovery only after the placed file reopens successfully.

### 6.5 Digital signatures

- Detect signature widgets/dictionaries and signature ByteRange indicators.
- V1 does not validate certificate chains, revocation, timestamps, or cryptographic validity.
- A byte-for-byte copy can preserve a signature; any rewritten output invalidates it.
- Signed inputs open view-only until the user chooses **Create a modified copy**.
- Signed originals cannot be overwritten in V1.

User copy:

> This PDF contains a certificate-backed digital signature. Editing will invalidate it in the modified copy. The signed original will not be changed.

### 6.6 Fonts and language

- Bundle a small OFL-licensed set and use the same bytes/metrics for preview and export.
- Use `fontkit` or the qualified replacement to embed/subset.
- Do not expose arbitrary system fonts until embedding rights and shaping are solved.
- Publish the scripts actually proven by fixtures. Do not claim universal Unicode from one emoji test.

## 7. Security and privacy model

PDFs are untrusted input. Every layer assumes malformed or hostile files exist.

### Renderer

- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`.
- Bundled UI only through a custom `app://` scheme; no remote pages or `webview`.
- `connect-src 'none'` in the editor window; updates occur only in main.
- No PDF.js scripting bundle; scripting disabled and `isEvalSupported: false` qualified.
- Navigation and new windows denied; external HTTPS links require confirmation.
- Embedded files, `file:`, `javascript:`, `data:`, launch actions, and PDF links never auto-open.

### Desktop/native boundary

- Renderer receives opaque handles, not filesystem access.
- Preload exposes named verbs, never `ipcRenderer`, shell, paths, or arbitrary commands.
- Every IPC payload and sender is validated.
- qpdf/helper invocation uses fixed executable paths, allowlisted operations, no shell, minimal environment, timeouts, size limits, and job cancellation.
- Pinned native binaries are checksum-verified during packaging.
- Production Electron fuses disable RunAsNode, NODE_OPTIONS, and inspector arguments and enable ASAR integrity/ASAR-only loading.

### Sensitive local state

- No document content, filenames, paths, form values, signatures, or passwords in logs or telemetry.
- Crash reporting is off unless the user explicitly exports a scrubbed diagnostic bundle.
- Recovery and saved signature assets use AES-GCM; their key is wrapped with Electron safeStorage/Windows DPAPI.
- DPAPI protects against other Windows accounts and casual disk inspection, not malware running as the same user; the app must not overclaim.
- Recovery never stores PDF passwords. Encrypted originals require password re-entry after a crash.
- Clear Recovery deletes application records but does not promise forensic secure erase from SSDs.

## 8. Repository shape

```text
PDFEditor/
├── AGENTS.md
├── README.md
├── LICENSE
├── package.json
├── pnpm-workspace.yaml
├── docs/
│   ├── product-spec.md
│   ├── supported-features.md
│   ├── file-compatibility.md
│   ├── security-model.md
│   ├── architecture.md
│   ├── design-system.md
│   ├── decisions.md
│   └── release-checklist.md
├── apps/desktop/
│   ├── main/
│   ├── preload/
│   ├── renderer/
│   └── packaging/
├── packages/
│   ├── contracts/
│   ├── editor-core/
│   ├── coordinate-engine/
│   ├── pdf-engine/
│   │   ├── inspect/
│   │   ├── render/
│   │   ├── annotations/
│   │   ├── forms/
│   │   ├── pages/
│   │   ├── export/
│   │   └── validate/
│   ├── native-broker/
│   ├── recovery/
│   ├── ui/
│   ├── shared/
│   └── test-fixtures/
├── tests/
│   ├── unit/
│   ├── property/
│   ├── integration/
│   ├── export-compatibility/
│   ├── visual-regression/
│   ├── security/
│   ├── fault-injection/
│   └── end-to-end/
├── scripts/
│   ├── build/
│   ├── fixture-validation/
│   ├── package/
│   └── release/
└── third-party/
    ├── licenses/
    ├── notices/
    └── sbom/
```

The contracts, editor core, coordinate engine, and PDF engine boundaries are frozen before multiple agents write code. React components never call PDF libraries directly.

## 9. Director-led build campaign

The native collaboration limit is four concurrent slots: one director plus three workers. Every wave uses non-overlapping file ownership, explicit handoffs, and director-run integration checks. Workers do not commit, push, merge, or edit each other’s areas.

| Wave | Parallel lanes | Exit gate |
|---|---|---|
| 0. Truth tests and dossier | A: annotation/encryption engine spikes; B: coordinate/forms/page-surgery spikes; C: six critical journey storyboards + fixture intake | Four truth gates resolved; ADRs and supported-feature matrix signed off |
| 1. Secure foundation | A: Electron main/preload/security shell; B: editor contracts/core; C: design tokens/components/test harness | Renderer cannot access filesystem/network/arbitrary IPC; production fuse audit passes |
| 2. Intake and viewer | A: PDF.js worker/render virtualization; B: shell/open/recents/password/info; C: viewer fixtures/performance/accessibility | Normal/encrypted/malformed/scanned/large fixtures open without renderer crash |
| 3. Coordinate and object editor | A: coordinate engine/SVG overlay; B: commands/selection/history/clipboard; C: tools/inspector/keyboard flows | Every object behavior works; deterministic replay and coordinate tolerances pass |
| 4. Forms and signatures | A: field read/write/appearance; B: Fill & Sign UX/signature vault; C: cross-reader form corpus | Supported form types reopen with correct values/appearance; XFA/JS fail honestly |
| 5. Page workspace | A: virtual page graph/export materialization; B: Page Loom/contact sheet; C: randomized page-operation tests | Reorder/rotate/delete/duplicate/insert/extract/merge/split match graph and never alter sources |
| 6. Export and validation | A: annotation/content export; B: qpdf/libqpdf/encryption/native broker; C: Save a Copy/Proof Pass/fault tests | Editable + final modes pass the reader matrix; induced failures preserve original bytes |
| 7. Recovery and hardening | A: encrypted journal/snapshots/migration; B: recovery UX/settings/diagnostics; C: crash/security/fuzz tests | Kill at every write boundary restores last acknowledged command |
| 8. Product polish | A: performance and large files; B: light/dark/contrast/responsive/motion; C: Narrator/keyboard/error states | Six critical journeys pass at 1024×720 and 100/125/150/200% scaling |
| 9. Release system | A: Forge/Squirrel/updater; B: signing/SBOM/notices; C: clean-VM install/update/uninstall/Open With | Every PE/installer verifies; tampered update rejected; failed update leaves previous version usable |
| 10. Qualification and launch proof | A: 150+ fixture sweep; B: compatibility docs/screenshots/demo; C: site/release dossier | All release gates green; website status changes only after artifacts and evidence exist |

### Tools and MCP roles during the build

- **Director + native collaboration agents:** split independent engine, UI, and test lanes; one director owns contracts, integration, and acceptance.
- **Browser control:** inspect the live Underplain design, test local UI behavior, and capture reproducible visual evidence.
- **Computer control:** packaged Windows installer, file association, Open With, native dialogs, contrast themes, and uninstall smoke tests.
- **Web research:** current primary documentation, dependency releases, licenses, CVEs, Electron support, qpdf behavior, and Windows distribution requirements.
- **GitHub connector/CLI, once a repo exists and the owner authorizes publishing:** issues, review, CI evidence, draft releases, and release artifacts.
- **No design plugin is required for V1:** the design system is code-native. Figma/Canva would add process, not proof.

## 10. Verification system

### 10.1 Fixture corpus

Start with at least 150 redistributable or generated PDFs. Never commit customer documents.

| Category | Minimum |
|---|---:|
| Ordinary text/image PDFs | 25 |
| AcroForms | 25 |
| Encrypted/permission variants | 15 |
| Signed/signature-field variants | 15 |
| Existing annotations | 15 |
| Rotated/cropped/mixed-size/UserUnit | 15 |
| Scanned/no-text | 10 |
| Malformed/recoverable/hostile active content | 10 |
| Large/performance/pathological images/fonts | 10 |
| International text/font fixtures | 10 |

Each fixture carries source/license, expected classification, allowed warnings, operation recipe, structural assertions, visual baselines, and reader-matrix results.

### 10.2 Test layers

- **Unit/property:** reducers, command inverses, page graph invariants, coordinate transforms, migrations, filename/path rules.
- **Adapter contracts:** identical inspect/export/validate expectations for any PDF engine implementation.
- **Structural:** qpdf exit/output, page tree, boxes, form values, encryption, signature detection, active-content detection.
- **Visual:** fixed-DPI preview versus exported output with bounded antialias tolerance.
- **Cross-reader:** Adobe Reader, Edge, Chrome, and PDF.js on every release candidate; Preview on a real Mac before it is named supported.
- **E2E:** renderer/dev Electron automation plus separate packaged-build smoke tests.
- **Fault injection:** disk full, file lock, permission denied, source mutation, worker kill, app kill, qpdf timeout, torn recovery, failed update.
- **Security:** malicious PDF corpus, IPC fuzzing, CSP/navigation, no-shell native calls, dependency/SBOM scan, log scrub, packet capture showing zero document egress.
- **Accessibility:** automated checks plus keyboard/Narrator task runs and every Windows contrast theme.

### 10.3 Reference performance envelope

Do not advertise these numbers until measured on a named reference PC:

- Routine: 500 pages / 100 MB.
- Best effort with warning: 1,500 pages / 300 MB.
- First visible page in at most 3 seconds for the routine fixture.
- Idle memory at most 1.2 GB for the 500-page fixture.
- No editor operation blocks the renderer for more than 100 ms.

Virtualize page shells/thumbnails, retain canvases only for visible pages plus overscan, cancel obsolete renders, and keep device-pixel ratio out of canonical geometry. PDF.js itself warns against keeping every high-resolution page canvas alive. [PDF.js FAQ](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions).

## 11. Binary release gates

V1 is not complete until every statement below is true.

- [ ] A first-time user can fill, electronically sign, and export without instructions.
- [ ] A user can merge/reorder several PDFs in under two minutes.
- [ ] Every editor/page action supports undo/redo and crash recovery.
- [ ] Every successful export passes qpdf policy and PDF.js reopen.
- [ ] Editable and Final outputs behave as documented in the cross-reader matrix.
- [ ] Zero silent corruption across all must-support fixtures.
- [ ] Original bytes remain identical after every induced export failure.
- [ ] Unsupported forms/XFA/scripts are identified before editing and never silently lost.
- [ ] Passwords never enter argv, logs, recovery, telemetry, or crash diagnostics.
- [ ] Every signed/signature-field fixture triggers the modified-copy warning; signed originals cannot be overwritten.
- [ ] Normal editing works with networking disabled and packet capture proves no document egress.
- [ ] Renderer sandbox, CSP, IPC, navigation, fuse, and dependency security tests pass.
- [ ] Keyboard/Narrator users can open, fill, sign, organize, export, recover, and resolve every warning.
- [ ] Installer/update/uninstaller/Open With pass on clean standard-user Windows 10 and 11 VMs.
- [ ] App executable, native helper, bundled executable/DLLs, and installer verify with SignTool and timestamping.
- [ ] Tampered updates fail closed; failed updates leave the previous version launchable.
- [ ] SBOM and notices include Electron/Chromium, PDF.js assets, React, pdf-lib/replacement, qpdf and its DLLs, fontkit, and fonts.
- [ ] Public limitations, privacy/network behavior, supported platforms, screenshots, demo, checksums, source, license, and release notes exist.
- [ ] macOS Preview compatibility has been tested on a real Mac or removed from launch claims.

Microsoft currently recommends Artifact Signing for public non-Store Windows distribution, but valid new binaries may still need SmartScreen reputation. Do not promise that signing instantly removes warnings. Sources: [Windows signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options), [Artifact Signing integration](https://learn.microsoft.com/en-us/azure/artifact-signing/how-to-signing-integrations).

## 12. Launch sequence

1. **Concept:** current state; plan and broad intent only.
2. **Prototype:** Wave 0 engines prove annotations, encryption, forms, and coordinates on ugly fixtures.
3. **Private alpha:** full vertical journeys work; installer may be signed; known limitations are explicit.
4. **Public alpha:** signed installer, source, license, checksums, SBOM, dossier, screenshots, demo, and clean-machine evidence are public.
5. **Beta:** fixture sweep, external tester recovery/export feedback, and accessibility tasks are green.
6. **Stable V1:** all binary release gates above pass; no P0/P1 known corruption bug; updater/rollback is proven.

The public PDFManager page should not be promoted merely because the UI looks finished. Underplain’s strongest design element is its refusal to fake maturity. The website status changes when repository-owned proof exists.

### Rough effort, not a promise

For one owner working with a Codex director and three parallel agents, budget roughly 12–18 focused calendar weeks for a signed stable V1, assuming Wave 0 does not force a commercial engine change. Two experienced human engineers plus the agent wave could compress that toward 8–12 weeks. Cross-reader validation, signing, clean-VM tests, accessibility, and recovery fault injection do not compress like boilerplate.

## 13. Risk register

| Risk | Likelihood / impact | Response |
|---|---|---|
| pdf-lib silently mishandles real PDFs | High / Critical | Provisional adapter, 150+ fixture kill-gate, replace before UI lock |
| “Editable PDF” is not interoperable | High / Critical | Gate A; commercial SDK or explicit product-scope amendment |
| Encrypted work leaks plaintext temp data | Medium / High | libqpdf memory helper or disclosed ACL temp policy |
| Forms break during merge/duplicate/split | High / High | Flatten affected fields with preflight warning unless preservation passes |
| Coordinate drift on rotated/cropped pages | Medium / Critical | One canonical transform contract and golden tolerance gate |
| Existing digital signature is invalidated unnoticed | Medium / Critical | Defense-in-depth detection, view-only default, modified-copy gate |
| Malicious PDF escapes renderer/native boundary | Medium / Critical | sandbox, no scripting, narrow IPC, native broker limits, malicious corpus |
| Recovery becomes a privacy liability | Medium / High | encrypted local store, short retention, clear controls, no passwords |
| “Free local PDF editor” is undifferentiated | High / Medium | lead with integrity rail, Safe Save, one workspace, public proof |
| Signing succeeds but SmartScreen warns | High / Medium | sign/timestamp, honest launch copy, build reputation, Store later |
| Agent parallelism produces integration sludge | Medium / High | freeze contracts, non-overlapping ownership, director acceptance after each wave |

## 14. Owner attack surface

Mark the default, replace it, or write the missing constraint. These answers change architecture or release scope.

### Critical now

1. **Interoperable annotations**  
   Default: Editable PDF must preserve standard editable annotations for every V1 object; Wave 0 stops the build if it cannot.  
   Your change: _______________________________________________

2. **Encrypted working data**  
   Default: fund/build the small libqpdf memory helper; the app does not intentionally stage plaintext protected PDFs.  
   Your change: _______________________________________________

3. **Forms during page surgery**  
   Default: imported, duplicated, and split form pages flatten affected widgets with a preflight explanation.  
   Your change: _______________________________________________

4. **Underplain economics**  
   Default: free/MIT/no account/no activation; paid help belongs to Crenshaw Systems.  
   Your change: _______________________________________________

5. **Launch target**  
   Default: Windows 10/11 x64 direct signed installer; ARM64, Store/MSIX, macOS, and Linux later.  
   Your change: _______________________________________________

6. **Language support**  
   Default: English UI; advertise only scripts proven by bundled-font fixtures.  
   Must-have scripts: __________________________________________

### Product and design

7. **Public name**  
   Default: keep PDFManager as a working name; run trademark/domain/search testing before public alpha because it is generic. Blackline Workbench is a design codename, not the product name.  
   Your candidate: _____________________________________________

8. **Pages mode**  
   Default: full contact-sheet workspace, not sidebar-only.  
   Your change: _______________________________________________

9. **Accent and theme**  
   Default: one cyan functional accent, system light/dark, Windows contrast themes.  
   Your change: _______________________________________________

10. **Saved signature**  
    Default: explicit opt-in encrypted local vault, off by default.  
    Your change: _______________________________________________

11. **Update network behavior**  
    Default: explicit manual check in V1; signed automatic checks may be enabled later with clear settings.  
    Your change: _______________________________________________

12. **Recent files**  
    Default: local recents on, clear/disable available, full paths not shown on Home.  
    Your change: _______________________________________________

### Delivery dependencies

13. **Real Mac access for Preview qualification**  
    Available route: ___________________________________________

14. **Windows signing identity and CI authorization**  
    Available route: ___________________________________________

15. **Reference Windows machines/VMs**  
    Available route: ___________________________________________

16. **Legally redistributable PDF fixture sources**  
    Available route: ___________________________________________

## 15. NOW / NEXT / LATER

### NOW

1. Attack and approve the six Critical now decisions.
2. Choose the working/public naming direction.
3. Initialize the repository, product dossier, ADRs, and fixture manifest.
4. Run Wave 0 only.

### NEXT

Proceed through Waves 1–10. A wave begins only after the prior exit gate is accepted. The director keeps the critical path and integrates all worker output.

### LATER

Evaluate ARM64, Store/MSIX, Linux/macOS, OCR, secure redaction, PDF/A, certificate-backed signing, conversion, print workflow, batch processing, collaboration, and accessibility remediation only after stable V1 evidence exists.

The clearest next move is to answer items 1–6 in **Owner attack surface**. Those answers decide the engine, native helper, release packaging, font corpus, and whether the full V1 is technically honest.

## Research basis

- [Donaven Crenshaw homepage](https://donavencrenshaw.com/)
- [Underplain](https://donavencrenshaw.com/underplain/)
- [Current PDFManager concept](https://donavencrenshaw.com/underplain/pdfmanager/)
- [PDF.js documentation](https://mozilla.github.io/pdf.js/getting_started/)
- [pdf-lib documentation](https://pdf-lib.js.org/)
- [qpdf documentation](https://qpdf.readthedocs.io/en/stable/)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron packaging](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging)
- [Windows accessibility](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-overview)
- [Windows Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/)
- [Adobe Organize Pages](https://helpx.adobe.com/acrobat/desktop/edit-documents/organize-pages/move-pages.html)
- [Apple Preview page management](https://support.apple.com/en-hk/guide/preview/prvw11793/mac)
- [PDF24 Creator](https://tools.pdf24.org/en/creator)
- [Sejda Desktop](https://www.sejda.com/en/desktop)
