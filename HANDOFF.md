# Handoff — Gestionale (Pavimass)

> Generated on 2026-09-10 — resume in a new Claude Code session.

---

## 🎯 Goal

Single-file construction-company management app, built from `sorgente/*.css|html|js` with
`python3 strumenti/costruisci.py`. No dependencies, no CDN, no network calls, no runtime build.
IndexedDB storage; print/ZIP/XLSX/PDF engines all hand-written.

Edoardo (owner of Pavimass S.R.L.) uses it daily. As of this session the app is **generic**: it
contains no company's data. Pavimass's own data lives outside the repo in `azienda/` (gitignored).

**The work is now on GitHub: `https://github.com/edobirla/gestione-ditte` (private).**
`origin/main` is up to date. Future sessions should commit and push there.

---

## 📍 Current State

Everything requested through 2026-09-10 is done, verified in-browser, committed and pushed.
`autoverifica()` is 39/39 green. Edoardo said he has no further ideas for now.

**Working (this session):**
- **Photo crop.** Person photo is cropped by hand: drag to pan, slider/wheel to zoom, round mask
  showing exactly what will be kept (`ritagliaFoto` in `41-operai.js`).
- **Preventivo status** changeable from the list (dropdown) and from the record (button group).
- **Declarations.** The preview no longer saves on open. Two buttons: *Modifica* (date, which
  signature to apply from the whole archive, and the text for that one compilation) and *Salva*
  (registers it and returns to the cantiere on the Checklist tab, where the item shows as done).
- **Payslips.** One PDF per worker containing only their pages, no blank pages
  (`estraiPaginePdf` in `56-pdf-pagina.js`); netto/lordo/hours read automatically; hours compared
  against presenze with "Va bene così" / "Da rivedere"; share button per month.
- **Personal data from UNILAV** (`anagraficaDaTesto` in `41-operai.js`): fills the person form,
  which stays editable; updates an existing person when the CF already exists.
- **Company data removed from the app** (see below) and repo published.

**Working (previous sessions, don't re-do):** everything listed in the project memory file
`gestionale-pavimass-stato-consegna.md` — read it first, it has the full architecture and history.

**Not working / known limits:**
- **Drag & drop on real Chrome is still unconfirmed.** A concrete cause was found and fixed (PDF
  previews are `<iframe>`s that swallowed the drop; they now become `pointer-events:none` while a
  file is being dragged). Edoardo has not reported back whether it works now. **Ask him.**
- **Assistant page reconstruction is not pixel-faithful.** It re-places text and rules at their
  real coordinates; it is not a PDF viewer. Fine for filling a form, not for an exact copy.
- **No OCR anywhere.** Scans and photos (e.g. a photographed ID card, the 2017 UNILAVs) cannot be
  read. The app says so instead of pretending.
- **`importoPavimass`** is still the field name in the cantiere data model (label and exports are
  already generic). Renaming it needs a migration; not worth it unless something else touches it.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `azienda/` | **Not in the repo, gitignored.** Pavimass's real seed data: `60-azienda.js` (company, people, clients, cantieri, price list, vehicles, suppliers), `61-immagini-azienda.js` (logo + 4 signatures), `63-presenze-azienda.js`, `strumenti/` (the scripts that produced them). **Never commit this.** |
| `strumenti/costruisci.py` | Build. Plain run includes `azienda/` → `Gestionale Pavimass.html`. `--vuoto` never includes it → `Gestionale (senza dati).html`, the file to give to anyone else. Both are gitignored. |
| `sorgente/60-dati.js` | Now generic only: document types, declaration templates, work types, empty company skeleton. Calls `datiAzienda(s)` if the `azienda/` build included it. |
| `sorgente/54-pdf.js` | `analizzaPdf()` (opens a PDF once: objects, streams, pages, fonts, Form XObject expansion) + `estraiTestoPdf()` on top of it. |
| `sorgente/56-pdf-pagina.js` | `rendiPaginaPdf()` (page → positioned HTML elements; falls back to the embedded JPEG for scans) and `estraiPaginePdf()` (new PDF with selected pages, objects copied byte for byte). |
| `sorgente/57-assistente.js` | Fill other companies' forms: suggested fields, one-click company data, signatures from the archive, drag + resize, print/share/archive. |
| `sorgente/45-documenti.js` | Document archive, payslip sorting (`smistaBustaPdf`, `leggiTotaliBusta`, `confrontoBusta`), external-document entry point. |
| `sorgente/50-stampa.js` | Print engine, `docLibroPresenze`, `docPreventivo`, `compilaDichiarazione` (preview → Modifica/Salva). |
| `sorgente/20-stato.js` | State, `migrazioni` (schema version **5**), `NOME_DB='GestionalePavimass'` — **never change this name**, it is the browser storage key. |
| `pavimass/` | The real company archive, gitignored. **Read-only for diagnosis, never modify.** It is where the real PDFs live and it is how every parser in this app was verified. |
| `template/` | Real reference documents (Scheda Ore Mensile, a real preventivo). Gitignored, read before touching any print layout. |

---

## ❌ Failed Attempts (this session and the two before it)

### Writing parsers without opening the real file
- **What:** the payslip splitter and the bank-transfer reader were both written from a reasonable
  guess about the format.
- **Why it failed:** both were wrong in ways no amount of reasoning would have found. The payslips
  hide all their text inside a Form XObject (`/Fm1 Do`) and draw one letter at a time; the MPS
  distinta prints *all* labels first and *all* values afterwards, so "value near label" picked the
  ordinante instead of the beneficiary.
- **Rule:** open the real file in `pavimass/` first. From the browser console:
  `await estraiTestoPdf(await (await fetch('/pavimass/…')).blob())`. For raw structure, Python +
  `zlib.decompress` on the streams.

### Blank pages as payslip separators
- **What:** grouped payslip pages by blank-page boundaries.
- **Why it failed:** page and blank page always alternate; workers with several sheets still have a
  blank between them. Blank pages separate *pages*, not people. Only the name on the sheet does.

### Following `/Parent` when extracting PDF pages
- **What:** transitive closure of object references starting from the selected pages.
- **Why it failed:** a page's `/Parent` leads to the original page tree, which lists every page in
  the document — the "extract 6 pages" result still had all 52. `/Parent` is stripped before the
  closure and a fresh page tree is written.

### Straight apostrophes in Italian strings
- **What:** replacing "Pavimass" with "dell'impresa" inside single-quoted JS strings.
- **Why it failed:** `SyntaxError: Unexpected identifier 'impresa'` — the whole script stopped
  parsing and the app showed only the shell. Use the typographic apostrophe `’` inside single-quoted
  strings (the app already uses it in prose), and always run the syntax check below after edits.

### Reading the netto from the payslip text
- **What:** looking for the "NETTO BUSTA" value.
- **Why it failed:** the box splits it ("1.048,00" comes out as "048" + "00"). It is derived
  instead: competenze − trattenute, the pair that precedes the IRPEF lorda repeated twice at the
  bottom of the sheet. Verified by hand on two real payslips.

---

## ✅ Working Solutions (keep, don't re-litigate)

- **Company data lives outside the app.** `datiIniziali()` is generic and calls `datiAzienda(s)`
  only if the `azienda/` files were included in the build. This is what makes the program
  give-away-able, and it is the whole point of the last commit — don't put company data back in
  `sorgente/`.
- **Payslip netto = competenze − trattenute**, anchored on the doubled IRPEF lorda. Don't go back
  to searching for the printed value.
- **Bank transfer parsing anchors on the beneficiary's IBAN**: name and amount above it, causale
  below, our own IBAN skipped. Don't go back to label proximity.
- **Print layouts follow the real templates in `template/`**, not invented ones. A previous session
  redesigned the libro presenze "with creative freedom" and it was rejected outright.
- **`print-color-adjust:exact` on `.pagina`** — without it Chrome drops backgrounds when printing
  and the black table header and coloured rows vanish from paper.
- **`<details>`/`<summary>` for the cantiere checklist** — no state to keep, opens itself only when
  something is wrong.

---

## 🔧 Dependencies & Setup

```bash
# Build with Pavimass's data (Edoardo's own file)
python3 strumenti/costruisci.py

# Build the clean file to give to anyone else
python3 strumenti/costruisci.py --vuoto

# Local server for browser testing (the in-app browser refuses file://)
# .claude/launch.json already has the "gestionale" config: python3 -m http.server 8765
# then http://localhost:8765/Gestionale%20Pavimass.html?v=N   (bump N to bust the cache)
```

Syntax check after every edit (catches the apostrophe class of bug immediately):

```bash
cat sorgente/[0-9]*.js > /tmp/all.js && node --check /tmp/all.js
```

In the browser console, `autoverifica()` runs 39 self-checks — **must stay 39/39**.

No package manager, no dependencies.

---

## ➡️ Next Steps

Nothing is pending: Edoardo explicitly said he has no further ideas for now. When work resumes:

1. **Ask whether drag & drop now works on his Chrome.** It is the only fix shipped without real
   verification. If it still fails, ask precisely: does the drop zone highlight while dragging?
   Any console error? Is a PDF preview open on that page?
2. **Ask whether the payslip hour differences were real.** The first run flagged 128 h in the
   payslip against 184 h in presenze for several workers — that is a big gap and it is either a
   genuine discrepancy worth chasing with the accountant, or a sign that the hours line being read
   ("LAVORO ORDINARIO") is not the one he compares against.
3. **Suggest a backup before any future update.** His data lives only in his browser; with the seed
   data gone from the code, a browser reset can no longer be recovered from the app file alone.
4. Ideas raised in earlier sessions and never discussed: company insurance policies, bank/loans,
   chamber-of-commerce filings, company DVR as its own section, subcontractor dossiers, legal
   disputes, waste register, tax deadlines calendar.

---

## ⚠️ Gotchas / Traps

- **Never commit `azienda/`, `pavimass/`, `template/`, or the built `.html` files.** `.gitignore`
  covers all of them. Before any push, a quick audit is cheap:
  `git ls-files | xargs grep -lE '[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]'`
  (the only hits should be the fictional test values in `sorgente/11-regole.js`).
- **Never change `NOME_DB`.** It is the IndexedDB key: changing it makes all existing data
  invisible.
- **Never rename `Gestionale Pavimass.html`** — in Safari the archive is bound to the single file.
- **This environment cannot test real native file pickers or real OS drag & drop.** Say so instead
  of dressing up a synthetic test as verification.
- **`git gc` matters here.** `.git` had grown to 5.7 GB of unreachable objects from interrupted
  operations; `git gc --prune=now` brought it to 3.8 MB. Check with `du -sh .git` occasionally.
- **`gh` is not installed and there is no global git identity.** The repo has a local identity
  (`edoardobirla02@gmail.com`) and pushes over HTTPS with the macOS keychain helper, which works.

---

## 💬 Notes

- The app is still *called* "Gestionale Pavimass" as a file name and DB name, but shows
  "Gestionale <company>" from the data. If it is ever handed to another company for real, the file
  name is the only cosmetic leftover — and it must not be changed on Edoardo's own copy.
- The design principle he stated as "la regola principale del programma": it must be obvious to
  someone who has never used it, visually and functionally. That is why the declaration placeholder
  editor became a list of Italian field names, and why the assistant lets you drag things instead
  of typing coordinates. Keep applying it.
- The other standing rule: **never invent a datum.** Missing values print `[DA COMPILARE]` in red.
