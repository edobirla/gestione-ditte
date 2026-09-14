# Handoff — Gestionale (Pavimass)

> Generated on 2026-09-11 — resume in a new Claude Code session.

---

## 🎯 Goal

Single-file construction-company management app, built from `sorgente/*.css|html|js` with
`python3 strumenti/costruisci.py`. No dependencies, no CDN, no network calls. IndexedDB storage;
print/ZIP/XLSX/PDF engines hand-written.

The app is generic: it contains no company's data. Pavimass's own seed data lives in `azienda/`
(gitignored, never commit it).

---

## 📍 Current State

Everything Edoardo asked for through 2026-09-11 is done, verified in-browser and pushed.
`autoverifica()` 39/39.

**Repository — two branches, `https://github.com/edobirla/gestione-ditte` (private):**
- **`sorgenti`** — the working branch: code, tools, docs. **The local checkout must stay on this
  branch.**
- **`main`** — only `index.html` + `.gitignore`. This is what GitHub Pages serves and what Edoardo
  installs as a web app.

**⚠️ Never run `git switch main` in the project folder.** `main` contains nothing but index.html, so
git deletes everything else from the working tree. It already happened once this session. To publish:

```bash
python3 strumenti/pubblica.py
```

It builds the data-free app, refuses to publish if a real codice fiscale or IBAN slipped in, and
updates `main` through a temporary `git worktree` — the real folder is never touched.

**Done this session:**
- **Print regression fixed** (see Failed Attempts) — preventivo, libro presenze and scadenzario
  print again.
- Document **duration** (6 months, 1/2/3/5/10 years) computing the expiry from the issue date;
  optional, for documents that have no fixed duration you still type the date.
- **Sick-leave certificates**: a document type with a period (dal/al) instead of an expiry, with
  its own "Malattia" section.
- **Annual documents** (CU): type flag `annuale`, the document asks for the reference year and
  never shows as expired.
- Persona documents **grouped by category in collapsible sections** (only the one with problems
  opens) with a **search bar**; the dashed drop zone is gone, the top "Aggiungi documento" button
  is itself a drop target.
- **Schema orario** (hours per weekday) removed from the persona card and form; existing data kept.
- **Cessazione**: asks the reason (dimissioni/licenziamento/fine contratto/pensionamento) and the
  letter to upload, files it as a "Cessazione del rapporto" document, and from then on that
  person's documents — and those of closed cantieri — are hidden from the Documenti list behind
  "Mostra archiviati". Nothing is deleted.
- **Photo**: the original is kept, so framing can be re-adjusted any time with "Ritaglia".
- `index.html` carries its own **web-app manifest and icons** as data URLs (icons drawn at build
  time by `strumenti/icona.py`, no libraries), so it stays a single file.

**Not done / open:**
- **GitHub Pages is not enabled yet.** Edoardo has to switch it on: repo → Settings → Pages →
  Source: *Deploy from a branch* → branch `main`, folder `/ (root)`. On a **free** plan Pages only
  works for **public** repositories, so either the repo goes public (it holds no company data now)
  or the plan has to allow private Pages.
- **No offline support for the installed web app.** That needs a service worker, i.e. a second file
  next to index.html (~15 lines). Edoardo asked for index.html only; ask before adding it.
- **Drag & drop on his Chrome** still unconfirmed (fix shipped two sessions ago, never verified by
  him).
- **The payslip hour differences** (128 h in the payslip vs 184 h in presenze for several workers)
  were never explained — either a real discrepancy or the wrong line is being read.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `azienda/` | **Gitignored, never commit.** Pavimass seed data: `60-azienda.js`, `61-immagini-azienda.js` (logo + signatures), `63-presenze-azienda.js`, `Logo Pavimass.png`, `strumenti/` (the scripts that generated them). |
| `strumenti/costruisci.py` | Build. Plain → `Gestionale Pavimass.html` (includes `azienda/`). `--vuoto` → `index.html` (never includes it, adds manifest + icons). |
| `strumenti/pubblica.py` | Builds the data-free app and updates `main` via a temporary worktree. The only safe way to publish. |
| `strumenti/controlla_funzioni.py` | Lists functions/actions that disappeared vs a reference commit. **Run it after any large edit** — deleting whole functions leaves valid syntax, so nothing else catches it. |
| `strumenti/icona.py` | Draws the app icon as a PNG in pure Python (no PIL). |
| `sorgente/45-documenti.js` | Document dialog (duration / period / annual), archive with the "Mostra archiviati" switch, payslip sorting, external-document entry point. |
| `sorgente/41-operai.js` | Person card, documents tab (sections + search), photo crop and re-crop, cessazione, UNILAV import. |
| `sorgente/50-stampa.js` | Print engine and all documents. **This is the file that lost functions**; check it first if a print stops working. |
| `sorgente/20-stato.js` | State, `migrazioni` (schema **5**), `NOME_DB='GestionalePavimass'` — never change this name. |
| `pavimass/`, `template/` | Real company archive and reference documents. Gitignored. Read-only; they are how every parser was verified. |

---

## ❌ Failed Attempts

### Replacing a region of a file by index (this session's regression)
- **What:** rewriting `AZIONI['dichiarazione-compila']` with
  `s[:s.index(inizio)] + nuovo + s[s.index("\nfunction docChecklist(c){"):]`.
- **Why it failed:** everything between the two anchors was deleted —
  `docScadenzario`, `docPreventivo`, `stampaPreventivo`, `classeGiornoOre`, `docLibroPresenze`,
  `stampaLibroPresenze`. The file stayed syntactically valid, `node --check` passed, `autoverifica()`
  stayed 39/39, and printing silently stopped working for two sessions.
- **Rule:** never delete by range across unknown content. After any large edit run
  `python3 strumenti/controlla_funzioni.py <commit>`.

### `git switch main` to update the published file
- **What:** switching to `main` to copy index.html in.
- **Why it failed:** `main` tracks only index.html, so git removed `sorgente/`, `strumenti/` and the
  docs from the working folder. Recovered with `git switch sorgenti`. Use `strumenti/pubblica.py`.

### Straight apostrophes inside single-quoted Italian strings
- `'…all'impresa…'` → `SyntaxError: Unexpected identifier 'impresa'`, the whole script stops parsing
  and the app shows only its shell. Use the typographic `’`.

### Earlier sessions (still valid)
- Writing parsers without opening the real file in `pavimass/` (payslips hide their text in a Form
  XObject and draw one letter at a time; the MPS distinta lists all labels before all values).
- Blank pages as payslip separators — they separate pages, not people.
- Following `/Parent` when extracting PDF pages — it drags in the whole document.

---

## ✅ Working Solutions (keep)

- Company data outside the app; `datiIniziali()` calls `datiAzienda(s)` only if `azienda/` was
  included in the build.
- Payslip netto = competenze − trattenute, anchored on the doubled IRPEF lorda.
- Bank transfers anchored on the beneficiary's IBAN.
- Print layouts follow the real templates in `template/`.
- `print-color-adjust:exact` on `.pagina`, or Chrome drops backgrounds when printing.
- `<details>`/`<summary>` for collapsible sections — no state to keep.

---

## 🔧 Dependencies & Setup

```bash
python3 strumenti/costruisci.py             # his own file, with azienda/
python3 strumenti/costruisci.py --vuoto     # index.html, no company data
python3 strumenti/pubblica.py               # build + publish to main
cat sorgente/[0-9]*.js > /tmp/all.js && node --check /tmp/all.js
python3 strumenti/controlla_funzioni.py HEAD~1
```

Local server: `.claude/launch.json` config "gestionale" (`python3 -m http.server 8765`), then
`http://localhost:8765/Gestionale%20Pavimass.html?v=N`. In the console, `autoverifica()` must stay
39/39.

---

## ➡️ Next Steps

1. **Tell him to enable GitHub Pages** (Settings → Pages → branch `main`, root) and warn that on a
   free plan the repo must be public for Pages to work — it no longer contains company data, so
   that is a decision he can now make safely.
2. **Ask whether he wants offline support** for the installed app: it needs one extra file
   (`sw.js`) beside index.html.
3. Ask about drag & drop on Chrome, and about the payslip hour differences.
4. Remind him to **back up before any update**: his data lives only in his browser, and the seed
   data is no longer in the code.

---

## ⚠️ Gotchas / Traps

- **Stay on the `sorgenti` branch.** Publishing goes through `strumenti/pubblica.py`.
- **Never commit `azienda/`, `pavimass/`, `template/` or the built `.html` files.**
- **Never change `NOME_DB`** (IndexedDB key) or the `pavimass-tema` localStorage key.
- **Never rename `Gestionale Pavimass.html`** — in Safari the archive is bound to the file.
- This environment cannot test real file pickers or real OS drag & drop. Say so.
- `.git` grew to 5.7 GB once from interrupted operations; `git gc --prune=now` fixed it. Check with
  `du -sh .git`.

---

## 💬 Notes

- The two standing rules: **never invent a datum** (missing values print `[DA COMPILARE]` in red),
  and **it must be obvious to someone who has never used it**.
- The app is still named "Gestionale Pavimass" as a file name and DB name, but shows
  "Gestionale <company>" from the data.
