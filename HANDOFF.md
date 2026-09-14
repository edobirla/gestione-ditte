# Handoff — Gestionale (Pavimass)

> Generated on 2026-09-14 — resume in a new Claude Code session.

---

## 🎯 Goal

Gestionale Pavimass is a single-file HTML app (built from `sorgente/*.js` + `*.css` + `02-guscio.html` into `index.html`) for a small construction/flooring company: workers, worksites (cantieri), documents/expiries, attendance (presenze), quotes, budget, vehicles, suppliers. No external libraries — everything (PDF text extraction, PDF decryption, image compression, etc.) is hand-written vanilla JS on purpose. Built and iterated live with the owner (Edoardo), who tests on the real published app and reports bugs conversationally.

---

## 📍 Current State

Everything from this session is **committed and published** (`main` branch, GitHub Pages). Working tree is clean. Repo has two branches: `sorgenti` (source, checked out locally — never `git switch main`, it empties the working directory) and `main` (only `index.html`, published via `python3 strumenti/pubblica.py`).

**Working (done and verified this session):**
- Fixed UNILAV-import crash when adding a brand-new person (`dialogoPersona` treated any non-null object as "edit", not "new").
- Added a real "Elimina" (delete) button for a persona, even when cessato (archived), with cascade cleanup of their documents/buste paga/presenze and a block if they're the Legal Representative/RSPP/RLS.
- Fixed `persona-foto` (photo upload) passing the wrong object into `caricaImmagine`/`leggiComeDataUrl` (should've been `.blob`) — caused "Overload resolution failed" on every photo upload, not just HEIC.
- Redesigned the person's header photo: bigger, square with rounded corners, click-to-open a WhatsApp-style menu (change/crop/remove); removed the duplicate photo card from the Anagrafica tab.
- `firmaSenzaSfondo` (signature background removal) now fills white before drawing, so a PNG that's already transparent doesn't turn solid black.
- "Primo Soccorso 16h" and "Antincendio Livello 2" document types were `obbligatorio:'si'` (required for everyone) instead of gated by the matching qualifica — fixed + schema migration 6 for already-saved data.
- `riepilogoScadenze()`: documents whose type is `obbligatorio:'no'` (e.g. tessera sanitaria) no longer generate dashboard/scadenzario alerts — still shown with real status next to the document on the person's own page.
- Added "Da Visura" button in Impostazioni → Azienda: reads a real camera-di-commercio visura PDF and pre-fills company data. Rewrote the extraction against a **real** visura the user attached (the guessed format was wrong) — see `datiAziendaDaTesto()` in `sorgente/48-impostazioni.js`.
- **Found and fixed the real root cause of the visura not being read at all: the PDF was encrypted** (standard PDF security handler, empty user password — normal for official InfoCamere documents). Added a full standard-handler decryptor (own MD5 + RC4 in `sorgente/54-pdf.js`, AES via Web Crypto) so any PDF with this common protection can now be read.
- Company logo can now actually be uploaded (Documenti → Modelli → Carta intestata e firme had no upload button for it, only for the other stamps/signatures) and shows next to "Gestionale" in the top bar (was hardcoded to the app's generic icon, now updates live via `render()`).
- Assistente documento esterno (the "fill in someone else's PDF form" tool): fixed it treating *any* image found in a PDF's resources as a full-page scan, even one that isn't actually drawn on the page (found via a "Do" placement bug) or that's just a small logo. Now tracks real image position/size via the CTM and only treats it as a full-page scan if it truly covers most of the page.
- Added a raw-bitmap (FlateDecode, non-JPEG) image decoder for PDFs — many "Print to PDF" exports from Word/WPS embed uncompressed bitmaps instead of JPEG.
- Added PDF weight reduction: `comprimiPdf()` in `sorgente/54-pdf.js` recompresses embedded photos and rewrites the PDF keeping everything else byte-identical (same technique already used by `estraiPaginePdf`). Wired into the "file too heavy" warning (now has a "Riduci" button) and into Impostazioni → Peso archivio's existing "ricomprimi" button (was image-only, now also PDFs).
- "Nomina Preposto/Antincendio/Primo Soccorso" no longer shows as "mancante" on a person's own page — it's cantiere-specific (a nomination letter is written for one worksite), not a generic per-person requirement. Schema migration 7.

**Not working / needs attention next session (see Next Steps — this is the priority list from the owner, dumped verbatim at the end of this session, not yet triaged or reproduced):**
- PDFs don't scroll in the right-hand panel.
- **Likely regression from this session's new PDF-compression feature**: using "Sostituisci con una versione più leggera" (the new `file-ricomprimi` → `comprimiPdf` path, see above) on a 2.9MB scanned PDF turned the resulting document **black**. This needs investigation first — see Next Steps #1.
- Printing presenze (attendance) doesn't work anymore.
- Some vague/unclear items from the owner's dump need a follow-up conversation to clarify exact intent (marked below).

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `sorgente/54-pdf.js` | Hand-written PDF engine: inflate, object/xref parsing, Form XObject expansion, text extraction, **new this session**: standard-handler decryption (MD5+RC4+AES) and `comprimiPdf()`/`riscriviPdfConImmagini()` (PDF weight reduction) — **prime suspect for the black-PDF bug**. |
| `sorgente/56-pdf-pagina.js` | Page reconstruction for the Assistente (positioned text/lines/images), `estraiPaginePdf()`, `bitmapGrezzoADataUrl()` (raw bitmap → PNG, used by both the Assistente and `comprimiPdf()` — also a suspect). |
| `sorgente/57-assistente.js` | "Assistente documento esterno" UI — cover/stamp/sign/now also positions real images; already has a "Casella di testo" (text box) button, contrary to what the owner thought was missing last session. |
| `sorgente/44-presenze.js` | Attendance grid; `riempiMese()` (line ~221) and the persone list at line ~13 (`stato.persone.filter(p=>(p.inLibroPresenze&&p.attivo)...)`) is where "add soci to the fill tool" goes. Festività (holiday) coloring logic lives here too — needs a paid/unpaid-per-holiday flag. |
| `sorgente/50-stampa.js` | `docLibroPresenze()` / `stampaLibroPresenze()` (~line 339-368) — where the broken attendance print lives. |
| `sorgente/45-documenti.js` | `vistaBustePaga()` (~line 398, buste paga view) — where "organize by year/month" goes; also has the new "Riduci" button wiring for heavy-file warnings (`acquisisciConAnteprima`). |
| `sorgente/48-impostazioni.js` | Company data edit dialog, `datiAziendaDaTesto()` (visura parsing), `AZIONI['file-ricomprimi']` (now branches PDF vs image). |
| `sorgente/60-dati.js` | Document type catalog (`TIPI_DOCUMENTO_INIZIALI`) — this is where `obbligatorio`/`soloCantiere`/etc. flags live; **any change here needs a matching migration in `20-stato.js`** or existing installs won't get it (see Gotchas). |
| `sorgente/20-stato.js` | `VERSIONE_SCHEMA` (currently 7) + `migrazioni` object — append-only, never edit past migrations. |
| `strumenti/pubblica.py` | Publishes `sorgenti` → `main` (GitHub Pages). Refuses to publish if it finds a real codice fiscale/IBAN in the built file. |
| `strumenti/costruisci.py` | Builds `index.html` (or `Gestionale Pavimass.html` with `--vuoto` omitted) from `sorgente/*`. |
| `strumenti/controlla_funzioni.py` | Diffs function/action names against a git ref — run after any non-trivial change (there was a real silent-regression incident in an earlier session, see `handoff-history/`). |

---

## ❌ Failed Attempts / Wrong Assumptions (this session)

### Assumed the visura camerale format without seeing a real one
- **What:** First implementation of `datiAziendaDaTesto()` guessed at label wording and address ordering.
- **Why it failed:** The real format (owner attached an actual visura) uses completely different labels/order — e.g. address is "Comune (Prov) Via CAP Frazione", not "Via CAP Comune (Prov)" as guessed; "Denominazione" only appears in a later section, not on page 1.
- **Lesson (already in project memory too):** Always ask for/read a real sample document before writing an extraction regex, don't guess from general knowledge of what a document "probably" looks like.

### Assumed a PDF resource image was the page content
- **What:** For the Assistente, the first fix (raw-bitmap decoding) just grabbed "the biggest image in the page's resources" and displayed it full-page as if it were a scan.
- **Why it failed:** On the owner's `Verbale_consegna_DPI` PDF, that image (the Pavimass logo) was sitting unused in the resources — never actually drawn via a `Do` operator on that page. The real page content turned out to be vector-outlined text (no real Tj/TJ text operators at all — confirmed independently via both `estraiTestoPdf()` and `elementiPagina()`), which this lightweight reconstruction tool genuinely cannot render. Told the owner honestly: needs either a screenshot/photo upload instead, or re-exporting the source .docx to PDF with a tool that embeds real text.

---

## ✅ Working Solutions

- **PDF decryption**: standard security handler, empty user password, MD5+RC4 hand-rolled (Web Crypto has neither), AES-CBC via `crypto.subtle` when the PDF uses `/V 4 /AESV2`. Only classic `trailer`/xref-table PDFs are supported (not XRef-stream-only PDF 1.5+ files) — acceptable scope limit, documented in code.
- **Schema migrations for `sorgente/60-dati.js` changes**: `normalizzaStato()` only *adds* missing tipiDocumento entries by id, it never merges new/changed fields into ones a user's browser already has saved. Every change to an existing entry's fields (as opposed to brand-new entries) needs a migration in `20-stato.js`, or real installs (including the owner's live data) silently keep the old broken behavior forever. Did this correctly twice this session (migrations 6 and 7) — **keep doing this**.
- **Verify against real user-supplied files, not synthetic ones**: this session's real breakthroughs (visura format, the encrypted-PDF root cause, the unused-image-resource root cause) all came from asking for/using the owner's actual files instead of testing with hand-crafted ones.

---

## 🔧 Dependencies & Setup

```bash
# Rebuild the installable app (no company data) after any sorgente/ change:
python3 strumenti/costruisci.py --vuoto      # → index.html

# Publish sorgenti → main (GitHub Pages):
python3 strumenti/pubblica.py

# Sanity checks before committing:
cat sorgente/[0-9]*.js > /tmp/all.js && node --check /tmp/all.js
python3 strumenti/controlla_funzioni.py HEAD
```

No package manager, no build tooling beyond the two Python scripts above. No test framework — verification this session was done by opening the built `index.html` in the Browser pane preview and exercising each fix by hand (and, for PDF logic, by round-tripping the owner's real attached files directly in the browser console).

---

## ➡️ Next Steps

Ordered by priority — items 1-8 are the owner's own list from this session's end, pasted close to verbatim so intent isn't lost in re-summarizing. **None of these have been investigated or reproduced yet.**

1. **[Suspected regression, investigate first]** PDF compression turns a scanned PDF black. Owner: *"quando ho fatto 'sostituisci con una versione più leggera' per una scansione pdf di 2,9MB mi ha fatto il documento nero"* (when I did "replace with a lighter version" for a 2.9MB scanned PDF it made the document black). This is almost certainly in this session's new code: `comprimiPdf()`/`riscriviPdfConImmagini()` (`sorgente/54-pdf.js`) or `bitmapGrezzoADataUrl()` (`sorgente/56-pdf-pagina.js`). Prime suspects: the CMYK→RGB conversion formula in `bitmapGrezzoADataUrl` (if the scan's raw bitmap is actually CMYK and the formula is wrong for this producer's convention), or the `/ColorSpace` rewrite to `/DeviceRGB` in `riscriviPdfConImmagini` being wrong if the source wasn't what was assumed, or a JPEG quality/encoding edge case. Get the actual 2.9MB PDF from the owner and reproduce before touching code.
2. PDF preview doesn't scroll in the right-hand panel ("non scorrono i pdf nella barra destra"). Need to find which panel/CSS this refers to — ask the owner which screen, or reproduce by opening a multi-page PDF preview.
3. **[Needs design clarification]** When a document is renewed, the old one should auto-archive "so it takes up basically no space", with an archive somewhere in Impostazioni holding all the old files "not taking up any space". This is contradictory as literally stated (archived bytes still take space) — clarify with the owner what they actually want: heavy re-compression of superseded documents? Keeping only a thumbnail/metadata and dropping the original blob? A separate lower-priority storage tier? Don't build anything until this is nailed down.
4. Buste paga (payslips) view: organize by year and month (there's already some year/month grid — see `vistaBustePaga()` in `sorgente/45-documenti.js` — clarify what's missing/wrong with the current layout vs. what's wanted).
5. Presenze "fill tool" (`riempiMese`/copy-between-people, `sorgente/44-presenze.js`): include *soci* (partners), not just *operai* (workers), and categorize them (group by category in the picker) — currently the picker only pulls from `stato.persone.filter(p=>p.inLibroPresenze&&p.attivo)`, which should already include soci if `inLibroPresenze` is set right, so check whether this is a filter bug or a UI-grouping request.
6. Add notes to each month's attendance sheet compilation, visible on the printed sheet too, with the option of a preset/default note. There's already a per-person/month note (see memory history — printed "only if compiled") — clarify whether this is about that existing note or a *new*, different (e.g. per-day-cell) note.
7. **[Bug, connected to #6?]** Attendance printing (`stampaLibroPresenze()` in `sorgente/50-stampa.js`) doesn't work anymore. Owner also said *"non uscite sul tasto ma esporta"* — unclear phrasing (possibly: the print button produces nothing but "esporta"/export works — i.e. this may be the same bug described two ways). **Ask the owner to clarify this exact sentence before guessing.**
8. Paid vs. unpaid holidays: some employees have paid public holidays and some don't. Need a per-person (or per-holiday?) toggle for whether a given festività is retribuita (paid) or not; paid → row shown in green, unpaid → row shown in red (currently festività rows use fixed brand colors, see Fase 2 in `handoff-history/`).

---

## ⚠️ Gotchas / Traps

- **Never `git switch main`** in this working directory — `main` only has `index.html`, checking it out empties the folder. Publish with `strumenti/pubblica.py` (uses a temp worktree) instead.
- **Every `sorgente/60-dati.js` catalog edit needs a migration** in `sorgente/20-stato.js` (bump `VERSIONE_SCHEMA`, add a numbered migration) or it silently does nothing for the owner's real, already-populated browser data. Easy to forget — check this first whenever changing an existing tipoDocumento/tipo's fields.
- **Always rebuild + republish** after a `sorgente/` change: `costruisci.py --vuoto` then `pubblica.py` — the user tests on the *published* app, not the local source. Forgetting this makes a "fixed" bug look unfixed to them.
- **`git status`/`controlla_funzioni.py` before committing** — there was a real silent-regression incident in an earlier session (index-based file surgery deleted several print functions; nothing caught it except a dedicated diff-of-function-names tool). Always run `controlla_funzioni.py HEAD` after touching source.
- **Ask for the real file before writing extraction/parsing logic.** This whole session's biggest wins (visura format, PDF encryption, the unused-image-resource bug) only surfaced once real files were involved — guessed formats were wrong both times they were tried.
- **The Assistente documento esterno is not a PDF renderer** — it reconstructs text/lines/images by parsing PDF operators, on purpose (ponytail: a real PDF renderer is "un'altra scala di lavoro" — see the comment header of `sorgente/56-pdf-pagina.js`). PDFs with text saved as vector outlines (common from some "Print to PDF" pipelines) cannot be shown faithfully; this is a known, accepted ceiling, not a bug to keep chasing.

---

## 💬 Notes

- The owner (Edoardo) communicates in Italian, tests on the real published app on his own devices, and reports bugs conversationally/imprecisely — always worth asking one clarifying question rather than guessing when a report is ambiguous (see items 3, 6, 7 above).
- Memory file exists at the Claude Code memory path (`gestionale-pavimass-stato-consegna.md` and `gestionale-pavimass-ricostruire-index.md`) with cross-session project history — read it at the start of a new session, but verify anything file/line-specific against current code since it can drift.
- `strumenti/pubblica.py` blocks publishing if it detects a real codice fiscale or IBAN pattern in the built `index.html` — if a future session hits that block unexpectedly, check `sorgente/` for accidentally-hardcoded real data before assuming it's a false positive.
