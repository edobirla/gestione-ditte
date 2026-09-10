# Handoff — Gestionale Pavimass

> Generated on 2026-09-04 — resume in a new Claude Code session.

---

## 🎯 Goal

A single-file construction-company management app for Pavimass S.R.L. (Subbiano, AR), owned by Edoardo Birla. Everything lives in one file, `Gestionale Pavimass.html` — HTML, CSS, JS, images inline — that opens by double-click from `file://` on macOS and from iPhone/iPad (Files app → Safari). No external dependencies, no CDN, no build step at runtime, no network requests, except an optional AI reading of the handwritten hour sheet (off by default, key stored locally only). It manages: workers and their compliance documents, cantieri (job sites), clients/professionals, monthly attendance (libro presenze), a document archive, POS (site safety plans), preventivi (quotes), and budget/movimenti. Every paper document the company needs is produced by the app itself via print-to-PDF.

The original brief (Italian, chapters 0–14, given as one message) is the source of truth for hard rules — see "Gotchas" below. It is not saved as a file; it only exists in the first session's conversation history. If a rule is unclear, re-derive it from the seed data and existing code rather than guessing.

Phase 0 delivery (architecture, seed data, all core sections, printing, backup/restore, exports) is **done and was verified in-browser** as of 2026-09-03. This handoff is for **Phase 1: a large round of UX/functionality fixes** the user identified after using the delivered app, listed in "Next Steps" below, in the user's own words (Italian) translated and organized.

---

## 📍 Current State

**Working (verified in-browser 2026-09-03, see prior session transcript for detail):**
- Single-file build from `sorgente/*.css|html|js` via `strumenti/costruisci.py`, `?v=N` cache-busting only matters for the local test server, not for real use.
- IndexedDB persistence (`stato` + `file` blob stores), debounced save, undo/redo (40 steps), 5 recoverable snapshots.
- Backup/restore as a hand-written ZIP (STORE, CRC32), schema migrations (`VERSIONE_SCHEMA=3`), merge (fusione) with per-item choice.
- JS-driven print pagination (`impagina`) for all documents: scadenzario, dichiarazioni, preventivo, POS, libro presenze, checklist, pacchetto committenza — with letterhead on every page and `@page{margin:0}` to suppress browser print headers. **User now says the POS print result is not good** (see Next Steps) — the pagination mechanism works but the actual POS content layout is unsatisfactory.
- PDF text extraction (hand-written inflate/DEFLATE, no libraries) + PSC field proposals (`proponiDatiDaPsc`), tested against a real PSC PDF.
- Photo compression on ingest (canvas, ≤300 KB target), classifier for irregular file names, drag & drop **is implemented in code** (`sorgente/31-navigazione.js`, window-level `dragover`/`drop`, `fileDaDrop` with `webkitGetAsEntry` recursion) but **the user reports it does not work in practice** — needs live debugging, not a rewrite from scratch.
- XLSX/CSV/Markdown export writers, all hand-written, validated with openpyxl.
- Domain rules as pure functions in `sorgente/11-regole.js`, all 40 self-checks pass (`autoverifica()`).
- Optional AI hour-sheet reading: button only exists when an API key is set (Impostazioni → Lettura assistita), calls Anthropic Messages API with the sheet photo, fills the grid with proposals all marked "incerto" (uncertain) for the user to verify before applying. This is the only network call in the whole app.

**Not working / needs this session's work:** see Next Steps — this is the bulk of the work now.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `Gestionale Pavimass.html` | **Deliverable.** Built file — do not hand-edit for anything beyond a trivial one-line fix; edit `sorgente/` and rebuild instead. |
| `strumenti/costruisci.py` | Concatenates `sorgente/*.css\|html\|js` (sorted) into the deliverable. Run after every `sorgente/` change: `python3 strumenti/costruisci.py`. |
| `strumenti/estrai_pos.py` | Regenerates `sorgente/62-pos-testo.js` (`POS_TESTO`) from `POS_Pavimass_Template_v4.docx` — only needed if the Word template changes. |
| `strumenti/immagini.py` | Regenerates `sorgente/61-immagini.js` (`IMMAGINI` — logo, signatures) — only needed if source images change. |
| `strumenti/presenze_iniziali.py` | Regenerates `sorgente/63-presenze-iniziali.js` (seed attendance data) from the 2026 Excel libro presenze. |
| `sorgente/00-mappa.txt` | Section map — keep it in sync if sections are added/renamed. |
| `sorgente/01-stile.css` | All CSS: design tokens, dark theme, print pages (`.pagina`, `.doc`, `.doc.pos`), mobile responsive rules (stacked table cells ≤760px). **Likely to change a lot** for the layout/filter-density work below. |
| `sorgente/02-guscio.html` | App shell: SVG icon sprite, `#app` bar/menu/content, `#pannello`, `#dialoghi`, `#avvisi`, `#stampa`, hidden file inputs. |
| `sorgente/10-utilita.js` | Formatters, date parsing, escaping (`h`, `html`, `grezzo`). |
| `sorgente/11-regole.js` | Pure domain-rule functions — idoneità, rounding, expiry logic, `autoverifica()`. |
| `sorgente/20-stato.js` | DB open/load/save, `esegui`/`annulla`/`ripristina` (undo stack), accessors (`persona`, `cantiere`, `documentiDi`, `meseP`, …). |
| `sorgente/21-archivio.js` | File blob store, hashing/dedup, image compression, quota. |
| `sorgente/22-backup.js` | ZIP writer/reader, backup/restore/merge, `documentazioneSchema()`. |
| `sorgente/30-ui.js` | Reusable UI: `dialogo`, `tabella`, `modulo`, `apriPannello`, charts. |
| `sorgente/31-navigazione.js` | Router, menu, theme, global search, keyboard shortcuts, **drag & drop handling** (`acquisizioneRapida`, `fileDaDrop`) — needs debugging, see Next Steps #4. |
| `sorgente/40-dashboard.js` | Dashboard tiles. |
| `sorgente/41-operai.js` | Worker list/scheda — **needs "no longer with the company" status** (Next Steps #2) and back-navigation (#1). |
| `sorgente/42-cantieri.js` | Cantieri list/scheda, checklist — **needs active/closed filter, year filter, location filter** (Next Steps #3). |
| `sorgente/43-clienti.js` | Client scheda, stats. |
| `sorgente/44-presenze.js` | Attendance grid — **user wants this rebuilt as a per-worker card view, and wants only the 8 worked hours shown, not "two sets of hours"** (Next Steps #5 and #8 — these may be the same underlying issue, see note there). |
| `sorgente/45-documenti.js` | Archive, document previews — **PDF/image preview must not show the Chrome print/viewer chrome, and large previews must be resized** (Next Steps #6). Also home of `dialogoDocumento`, `acquisizioneRapida` (drag & drop entry point). |
| `sorgente/46-preventivi.js` | Preventivi editor, listino — **needs to allow a preventivo for a cantiere not yet saved as a cantiere record** (Next Steps #2b). |
| `sorgente/48-impostazioni.js` | Settings, incl. **`modelli.dichiarazioni` editor — the whole templates/dichiarazioni system needs a redesign** (Next Steps #7, biggest item). |
| `sorgente/50-stampa.js` | Print pagination engine + `docDichiarazione`, `docPos`, etc. — **POS layout needs real rework: repeated content, missing sections, missing images** (Next Steps #5-POS). |
| `sorgente/51-esporta.js` | Downloads, exports, `condividiOScarica` (uses `navigator.share`) — **user wants direct email/WhatsApp sharing, verify this already covers it or needs extending** (Next Steps #9). |
| `sorgente/52-pos.js` | POS wizard + `docPos` renderer — same POS layout work as above. |
| `../programma segreteria/Segreteria Casentino (agg. 01-09).html` | **Reference app**, not part of this project — the user wants the `dichiarazioni`/templates UX in Pavimass to take inspiration from how that app compiles and prints a precompiled letter. Look at it, don't copy code (different app, different data model), just the interaction pattern: pick a template → fill a short form → get a print-ready letter. |

---

## ❌ Failed Attempts

None yet for this phase — this handoff starts a new round of work. The only thing worth flagging as *not a failed attempt but an open risk*: drag & drop is fully implemented (window-level listeners, folder recursion) and worked when tested via the browser MCP's synthetic drop events in the prior session, but the user reports it doesn't work for them in real use. Synthetic DOM events may not have exercised the exact code path a real OS-level drag exercises (e.g. `dataTransfer.types`, `effectAllowed`, or a listener attached to the wrong element/z-index layer covering it). **Start Next Steps #4 by reproducing with real mouse drag via computer-use or asking the user to describe exactly what they see (cursor icon, any console error), not by re-reading the code and assuming it's fine.**

---

## ✅ Working Solutions

- Single-file architecture via build-time concatenation of `sorgente/` — keep this. Never let the deliverable HTML and `sorgente/` drift apart; always edit `sorgente/` and rebuild.
- Undo/redo via `esegui(descrizione, fn, opz)` wrapping every state mutation — reuse this pattern for any new mutation, don't bypass it.
- `autoverifica()` self-check — run it after structural changes to `sorgente/11-regole.js` or the seed data shape.
- Test loop: `.claude/launch.json` has a `"gestionale"` config running `python3 -m http.server 8765` — use the Browser MCP against `http://localhost:8765/Gestionale%20Pavimass.html?v=N` (bump N to bust cache) for all interactive testing. The in-app browser **refuses real `file://` URLs**, so file:// itself can only be checked with computer-use (screenshot-only, no interaction) or by asking the user.

---

## 🔧 Dependencies & Setup

```bash
# Rebuild the deliverable after any sorgente/ change
python3 strumenti/costruisci.py

# Local test server (or use the .claude/launch.json "gestionale" config with the preview tool)
python3 -m http.server 8765
# then open http://localhost:8765/Gestionale%20Pavimass.html?v=<bump-this>
```

No package manager, no npm, no build tooling beyond the one Python script. Python 3 stdlib only (used for the `strumenti/` scripts, `openpyxl` was used ad hoc in the previous session just to validate an XLSX export, not a hard dependency).

---

## ➡️ Next Steps

In the user's words, organized and prioritized by how self-contained each item is (not necessarily the order to work in — read all of them before starting, several touch the same files):

1. **Back navigation is missing.** Once inside a detail page (a worker, a cantiere, a document…) there's no way to go back. Add a back button/breadcrumb consistently across all detail views. Likely a router-level fix in `sorgente/31-navigazione.js` (`vai`/`render`) rather than per-view — check whether the hash router already tracks history depth before adding a bespoke back stack per view.

2. **Worker status: "no longer with the company".**
   - Need a way to mark a `persona` as no longer employed (there's already `attivo`/`dataCessazione` in the schema per `SCHEMA DATI.md` — check `sorgente/41-operai.js` for whether the UI actually exposes setting `dataCessazione` and toggling `attivo`, and whether inactive workers are filtered correctly everywhere they should be: idoneità/scadenzario, presenze grid, cantiere squadra picker).
   - **Related, same conversation topic:** preventivi need to be creatable for a cantiere that isn't saved as a `cantiere` record yet — the user quotes jobs before they're won, so the cantiere doesn't exist in the system at quote time. Check `sorgente/46-preventivi.js`: does `dialogoModulo`/`cantiereId` require picking from the existing `cantieri[]` list? If so, either allow a free-text cantiere name on the preventivo (decoupled from the `cantieri[]` collection) or add a lightweight "cantiere in preventivo" pseudo-status that later gets promoted to a real cantiere record when won. Ask the user which they'd prefer if it's not obvious from re-reading `SCHEMA DATI.md`'s `preventivi[0]` shape — this is a modeling decision, not just a UI one.

3. **General layout — filters take too much space, and filters are missing where needed.**
   - Some pages have year/etc. filter controls that occupy too much vertical space for what they do — check `sorgente/01-stile.css` for the filter-bar component (search for `.filtri` or similar) and design something more compact (a single row, or a popover/dropdown pattern instead of always-expanded controls).
   - Cantieri list specifically needs: an active/closed toggle (**not both shown mixed together — this is explicit**), a year filter, a location/place filter. Generalize: audit every list view (`sorgente/42-cantieri.js`, `sorgente/43-clienti.js`, `sorgente/45-documenti.js`, `sorgente/47-budget.js`) for what filters would actually help and add them with the same compact pattern once designed.

4. **Drag & drop doesn't work in real use.** Code exists (`sorgente/31-navigazione.js`: `acquisizioneRapida`, `fileDaDrop`) but the user says dragging a file in does nothing. Debug live — don't assume the code is correct because it passed synthetic-event tests before. Reproduce with a real drag (computer-use or ask the user for exact repro steps/screen recording) before touching the code.

5. **Libro presenze (attendance) needs a full redesign**, not a tweak: "qualcosa di diverso, di più moderno e leggibile, una scheda per ogni operaio" — a per-worker card layout instead of (presumably) the current grid-only view. This is `sorgente/44-presenze.js`. Given the size, treat this as its own design pass: look at the current grid's data model (`assicuraMesePersona`, `meseP`) which stays the same, but the presentation should become one card per worker (possibly with the existing grid still available as a secondary/detail view, or replaced entirely — clarify with the user before committing to "replaced" vs. "grid becomes the drill-down from the card").

6. **Document preview must not show browser print chrome, and must resize large previews.** When viewing an attached PDF/image (e.g. under a worker's documents), the user doesn't want to see Chrome's own PDF-viewer toolbar/print controls, just the document; and if the file is large it should be scaled down so it doesn't dominate the page. Check `htmlAnteprimaFile` and `apriDocumento` in `sorgente/45-documenti.js` — likely rendering a bare `<embed>`/`<object>`/`<iframe>` for PDFs that inherits the browser's native viewer chrome; consider an `<img>`-based preview for images (already probably done) and, for PDFs, either constrain the iframe/embed more (some browsers support `#toolbar=0` on PDF embeds, though support varies and it's not guaranteed cross-browser) or render a bounded thumbnail with a separate "open full" action.

7. **The dichiarazioni/templates system is too complicated and doesn't print well.** This is the biggest item. Current state: `sorgente/48-impostazioni.js` has a `modelli.dichiarazioni` editor (placeholder-based text templates) and `sorgente/50-stampa.js` has `contestoDichiarazione`/`docDichiarazione` to fill placeholders and print. The user finds this hard to understand and says the output isn't printable well. **Explicit direction from the user:** look at `../programma segreteria/Segreteria Casentino (agg. 01-09).html` (a separate, already-built app in a sibling project folder) — specifically how it lets someone pick a letter template, fill it in, and get a precompiled, printable letter — and take inspiration from that interaction pattern for the Pavimass dichiarazioni, not from its code (different data model, different app, do not import code from it). Goal stated directly by the user: "deve essere semplice e immediato per me compilare e stampare" (must be simple and immediate for me to fill in and print).

8. **"Two sets of hours" in the libro/hour tracking should become just the 8 daily worked hours, everywhere in the app.** The user's exact words: "nel libretto delle ore che risultino solo le 8 ore giornaliere lavorate, non due set di ore, in tutta l'app questo." This needs clarification before implementing — re-read `sorgente/44-presenze.js`'s cell model (`{ore, cantiere, committente}` per day) and the printed `docLibroPresenze` layout to find where two separate hour figures currently appear (e.g. declared hours on the sheet vs. entered/computed hours — `oreDichiarate` vs. the grid total, discussed in the prior session under "riepilogo persona dialog"). **Ask the user to point at the actual screen/printout where they see two numbers** before changing logic — this could be a display fix (show one) or a data-model fix (stop tracking two), and guessing wrong here risks losing real payroll data. This is very possibly the same root issue as item 5's presenze redesign — consider tackling them together.

9. **POS print output needs real layout work**, separate from and probably deeper than item 6's PDF-chrome issue: "alcune cose si ripetono, altre non si vedono del tutto, alcune immagini mancano" (some things repeat, others don't show at all, some images are missing) in the printed POS. This is `sorgente/50-stampa.js` (`impagina` pagination engine) + `sorgente/52-pos.js` (`docPos`, `renderBlocchiPos`, `renderTabellaPos`). Given the prior session already fixed several POS pagination bugs (image sizing, cover page overlap, table rowspan), this next round needs the user to open a real generated POS PDF with them and point out exactly which sections repeat, which are missing, and which images are absent — don't try to guess from the code which of the ~25 POS sections and 8 lavorazione cards are affected.

10. **Direct sharing via email/WhatsApp.** Check what `condividiOScarica` in `sorgente/51-esporta.js` already does — it uses `navigator.share` with files as a fallback-to-download pattern, which on iOS/iPadOS Safari already surfaces Mail and WhatsApp in the native share sheet if those apps are installed. Verify with the user whether this already satisfies the need (test on a real iPhone/iPad, which the prior session could not do) before building anything new — this might already be done and just untested on-device.

**Not in scope for this session, explicitly deferred by the user:** managing "il consorzio" (a separate business entity/consortium Pavimass is part of) inside the same app, kept fully separate from Pavimass data. The user only asked whether it's feasible — **answer: yes, architecturally straightforward** once the Pavimass gestionale is solid, following the same single-file/IndexedDB pattern but as a genuinely separate `.html` file with its own IndexedDB database name (not a multi-company mode inside this app — the brief explicitly forbids multi-company handling in one instance). Do not start building this now; it's a future, separate project.

---

## ⚠️ Gotchas / Traps

Hard rules from the original brief (chapters 0–14, given verbatim in the first message of the prior session — not saved to a file, so re-derive from context/seed data if in doubt, don't guess):

- **"Non inventare dati, mai"** — never invent data. Missing data must show `[DA COMPILARE]` in red, everywhere, always.
- Birla Costel Ovidiu's title is **always and only "Legale Rappresentante"** — never "Amministratore Unico".
- **Never hours on Saturday/Sunday** in the libro presenze.
- **FS (festività) code only valid if the holiday falls on a weekday.**
- **Always imponibile, never the total document amount**, in movimenti/budget.
- **Never assign an invoice to a cantiere by similarity** — mark "da verificare" instead.
- **Company rounding**: multiples of 10, remainder 0–3 rounds down, 4–9 rounds up (1425→1430, 901→900, 2442→2440) — see `arrotondaAziendale` in `sorgente/11-regole.js`. Do not replace with standard rounding.
- **Never include expired documents in a committenza package** without explicit forced motivation from the user.
- **Don't load the whole archive into memory** — file blobs are fetched by hash/id on demand, not preloaded.
- **No authentication, no server sync, no push notifications, no multi-company mode.**
- **No system dialogs** (`confirm`/`prompt`) — everything goes through the custom `dialogo`/`avviso` UI in `sorgente/30-ui.js`.
- **Produced file names use spaces, not underscores** — hyphens only inside dates (e.g. `Scadenzario Pavimass 03-09-26.pdf`).
- **The AI hour-sheet reading key stays local, never enters the backup, and the button must not exist at all when no key is set** — this is already implemented correctly (`sorgente/44-presenze.js`, `leggiFoglioConAi`), don't regress it while touching the presenze redesign (item 5/8).
- **Italian everywhere**: UI text, code identifiers, comments. This handoff file is the one intentional exception (per the skill's own convention, for token efficiency across sessions) — all code and user-facing work stays Italian.
- **Dates `gg/mm/aaaa`, numbers `1.234,50 €`** — formatting helpers already exist in `sorgente/10-utilita.js` (`fData`, `fEuro`, `fNum`), reuse them, don't reformat inline.
- **Never deliver without actually opening the app in a browser and looking at the produced PDFs.** This was a hard requirement from the original brief and should still apply to this round of fixes — don't report something fixed without visually verifying it, especially the print/layout items (5, 6, 7, 9).
- The `pavimass/` folder at the project root (sibling to `sorgente/`) is the **real company document archive** (synced via a `.sync` folder), not a test fixture — never modify or delete anything in it.
- Test artifacts from the prior session (`_risorse_prova`, `_prova_cantieri`, `_prova_immagini` symlinks/folders) were already cleaned up — if similar throwaway symlinks are created again for testing, remove them before ending the session.
- iPhone/iPad real-device testing and real Safari `file://` interaction testing were **never possible** in the prior session (no device, and the in-app browser refuses `file://` while computer-use grants browsers read-only/screenshot-only access) — state this honestly again if it's still true rather than claiming it was verified.

---

## 💬 Notes

- The user is the company's administrator (Edoardo Birla), not a developer — expect feedback in terms of "what I see on screen is wrong/missing" rather than technical bug reports. When a requirement is ambiguous (items 2b, 8, 9 above especially), the right move is to ask for a screenshot or a concrete example rather than guess and risk breaking a payroll/legal-compliance rule.
- Given the size of this list, consider proposing a phase order to the user at the start of the next session rather than working top-to-bottom blindly — some items are small (1, 4, 10-verification), some are substantial redesigns (5, 7, and possibly 8 combined with 5). Splitting into "quick fixes first" then "the two big redesigns" is a reasonable default to propose, but let the user confirm priority since they may want the POS or dichiarazioni fixed first for an urgent job.
- Re-run `python3 strumenti/costruisci.py` and `autoverifica()` after every meaningful change, and rebuild the test loop against `http://localhost:8765` — the workflow that worked well in the prior session.
