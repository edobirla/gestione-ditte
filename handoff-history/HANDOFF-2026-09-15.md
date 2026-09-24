# Handoff — Gestionale (Pavimass)

> Generated on 2026-09-15 — resume in a new Claude Code session.

---

## 🎯 Goal

Gestionale Pavimass is a single-file HTML app (built from `sorgente/*.js` + `01-stile.css` + `02-guscio.html` into `index.html`) for a small flooring/construction company: workers (operai), worksites (cantieri), documents and expiries, attendance (presenze), quotes, budget, vehicles, suppliers. No external libraries — PDF parsing/decryption/compression, image handling, everything is hand-written vanilla JS on purpose. Built and iterated live with the owner, who tests on the **published** app (GitHub Pages) and reports bugs conversationally in Italian.

---

## 📍 Current State

Everything is **committed on `sorgenti` and published on `main`** (commit `2a343fb`, `pubblica.py` pushed `main` → `8a029fd`). Working tree clean.

**Done this session (2026-09-15, verified in the Browser pane with a synthetic 4-page PDF):**
- **Silenceable expiries.** New per-document flag `avvisoTaciuto`. In the document panel (`apriDocumento`, `sorgente/45-documenti.js`) a scaduto/in-scadenza/pianificare document whose type is *not* `bloccaIdoneita` shows an inline notice with a **«Non segnalare più»** / **«Segnala di nuovo»** button (`AZIONI['documento-taci']`). Effects: `infoDocumento()` (`41-operai.js`) adds `info.silenziato=true`; new helper `documentoCritico(info)` is now the single test used by the Documenti tab counter (`nDocCritici`), the per-category "N da sistemare" pill (both person page and Documenti → Archivio), `riepilogoScadenze()` (`richiesto()` also requires `!silenziato` → dashboard + scadenzario), `idoneita().avvisi` (rebuilt from `dettagli`, skipping silenced docs), `documentoPiuCritico()` (silenced ranks as `riferimento`), row class (`riga-riferimento` instead of red). `pillolaDocumento()` (`30-ui.js`) renders a grey pill "Scaduto il … · non segnalato" with new icon `#i-silenzio` (`02-guscio.html`). Blocking types (UNILAV, visita medica…) deliberately can't be silenced. **No schema migration needed** (new optional field, absent = old behaviour).
- **UNILAV auto-saved as a document.** `dialogoPersona()` now *returns the person id* (new or existing). `AZIONI['persona-da-documento']` awaits it and, if the PDF was recognised as UNILAV (`r.eUnilav`), calls new `salvaUnilavFraDocumenti(pid,file,dataAssunzione)` (`41-operai.js`): archives the file (renamed via `nomeFileProposto('unilav',…)`), skips if the same file id is already on an UNILAV doc of that person, marks any previous UNILAV of the person `sostituitoDa`, pushes a `tipoId:'unilav'`, `senzaScadenza:true` document with `dataEmissione = dataAssunzione` read from the PDF.
- **"PDF doesn't scroll in the right panel" — root cause found and fixed.** It was not specific to new workers: inside the scrollable `#pannello .corpo`, the PDF `<iframe>` swallows wheel events, so once the PDF filled the visible panel the panel itself could never be scrolled. Fix: `apriPannello()` (`30-ui.js`) accepts `opz.anteprima` (an element id) and renders a **fixed preview box** `.anteprima-fissa` *below* the body, taking all remaining height; the body becomes `flex:0 1 auto; max-height:55%`. `apriDocumento` passes `anteprima:'anteprima-doc'` and no longer embeds `<div id="anteprima-doc">` in the meta HTML; `doc-anteprima-file` no longer `scrollIntoView`s. Added an **«Apri a tutto schermo»** button (reuses `AZIONI['file-apri']`). CSS in `01-stile.css` right after `.anteprima-doc`.

**Also landed between the 09-14 handoff and this session (other sessions, see `git log a2f2b04..HEAD`):** the black-PDF compression bug (real cause: `analizzaPdf` dictionary capture included stream bytes → `dizionarioVero()` in `54-pdf.js`), phantom scrollbars (CSS `overflow-y` rule), buste paga per mese view, festività pagate flag + per-holiday exclusion, presenze notes always discoverable, Soci/Dipendenti grouping in the presenze fill/copy pickers, "Uscite"→"Esporta" rename, renewed documents hidden behind "Mostra rinnovati", archive grouped by category, proposed file names from document type.

**Not verified / possibly still open:**
- Attendance **printing** (`stampaLibroPresenze()` in `50-stampa.js`): the 09-14 handoff said it "doesn't work anymore"; no commit since claims to have fixed it. Ask the owner whether it still fails before assuming either way.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `sorgente/41-operai.js` | `infoDocumento()` (+`silenziato`), `documentoCritico()`, `idoneita()`, `riepilogoScadenze()`, `documentoPiuCritico()`, person page (`vistaPersona`/`schedaDocumentiPersona`), UNILAV import (`anagraficaDaTesto`, `persona-da-documento`, new `salvaUnilavFraDocumenti`), `dialogoPersona` (now returns id). |
| `sorgente/45-documenti.js` | Document panel `apriDocumento` (silencing notice, fixed preview, «Apri a tutto schermo»), `AZIONI['documento-taci']`, archive view, `dialogoDocumento`, `acquisisciConAnteprima` (shows a modal on duplicates/compression — remember it awaits a click). |
| `sorgente/30-ui.js` | `apriPannello({anteprima})`, `pillolaDocumento` (silenced pill), dialogs. |
| `sorgente/01-stile.css` | `#pannello`, `.anteprima-fissa`, `.corpo.con-anteprima`. |
| `sorgente/02-guscio.html` | SVG icon sprite (`#i-silenzio` added). |
| `sorgente/11-regole.js` | Pure domain rules (`statoDocumento`, `idoneitaPersona`, …) — untouched this session; keep it pure (no `stato`, no DOM). |
| `sorgente/60-dati.js` / `20-stato.js` | Document type catalog / `VERSIONE_SCHEMA` (7) + migrations. Any change to an *existing* catalog entry needs a migration. |
| `strumenti/costruisci.py` / `pubblica.py` / `controlla_funzioni.py` | Build (`--vuoto`), publish `sorgenti`→`main`, function-name regression check. |

---

## ❌ Failed Attempts / Wrong Assumptions

### Assuming the scroll bug was about new workers
- **What:** the report said it happened "when I open a new worker and add their first documents".
- **Reality:** reproduced with any person/any document — the iframe wheel-capture is universal; with a first document there was simply nothing else on the page that made the trapped panel scroll obvious. Lesson: reproduce before believing the reported precondition.

### Testing `salvaUnilavFraDocumenti` from the console with an already-archived file
- **What:** called it with the same PDF bytes already stored as `tessera.pdf`.
- **Effect:** `acquisisciConAnteprima` opened its "file già nell'archivio" modal and the console script timed out waiting; after clicking Ok it worked, but the stored file kept the *old* name (dedupe by hash keeps the first name). Not a bug — in real use the UNILAV is a distinct file — but don't be surprised by it in tests.

---

## ✅ Working Solutions

- **Silence ≠ no expiry.** `avvisoTaciuto` leaves `dataScadenza` and the real `stato` untouched; only the *alerting* layer changes, through one helper (`documentoCritico`). Keep routing every "is this a problem?" test through it rather than re-checking `stato==='scaduto'` in new places (`42-cantieri.js` checklists intentionally still look at the raw state: worksite requirements must not be silenceable).
- **Fixed preview box under a scrollable body** is the right shape for any panel that embeds an iframe/PDF. Reuse `apriPannello({anteprima:id})` if another panel ever needs an embedded viewer.
- **Verify against real files** (from earlier sessions, still true): the black-PDF, visura and encrypted-PDF fixes all came from the owner's actual files.

---

## 🔧 Dependencies & Setup

```bash
# Rebuild the installable app (no company data) after any sorgente/ change:
python3 strumenti/costruisci.py --vuoto      # → index.html

# Sanity checks before committing:
cat sorgente/[0-9]*.js > /tmp/all.js && node --check /tmp/all.js
python3 strumenti/controlla_funzioni.py HEAD

# Local preview (the Browser pane blocks scripts on file://):
python3 -m http.server 8765 --bind 127.0.0.1   # then open http://127.0.0.1:8765/index.html

# Publish sorgenti → main (GitHub Pages):
python3 strumenti/pubblica.py
```

No package manager, no test framework. Verification = open the built `index.html` in the Browser pane and exercise the feature; for automated checks drive the app from the console (`esegui(...)`, `apriDocumento(id)`, `stato`, `AZIONI`).

---

## ➡️ Next Steps

1. **Ask the owner whether attendance printing (`stampaLibroPresenze`) still fails.** Last known report 09-14; nothing since. If yes: reproduce in the Browser pane with a filled month, check `anteprimaStampa`/`docLibroPresenze` in `50-stampa.js`.
2. **Confirm the three fixes on the owner's real devices** (Mac + iPhone): silence button visible on his expired tessera sanitaria; UNILAV appears under the person's documents after "Da UNILAV"; PDF panel now scrolls. On iPhone the fixed preview box shows only page 1 (known WebKit limit, unchanged) — «Apri a tutto schermo» is the escape hatch.
3. Optional polish if requested: show a small "N non segnalati" hint in the person's Documenti header, so silenced-but-expired documents aren't forgotten forever.
4. Anything new the owner reports — his lists arrive verbatim and imprecise; ask one clarifying question rather than guessing (see 09-14 handoff items 3/6/7 for examples).

---

## ⚠️ Gotchas / Traps

- **Never `git switch main`** in this working directory — `main` only contains `index.html`; checking it out empties the folder. Publish with `strumenti/pubblica.py` (temp worktree).
- **Always rebuild + republish** after a `sorgente/` change; the owner tests the published app. Commit `index.html` together with the source (project memory rule).
- **Every edit to an existing `60-dati.js` catalog entry needs a migration** in `20-stato.js`; `normalizzaStato()` only adds missing entries by id.
- **`acquisisciConAnteprima` can open a modal** (duplicates, compression summary, heavy file). Any code that awaits it must expect a user click — including console-driven tests.
- **Run `controlla_funzioni.py HEAD`** before committing (past silent-regression incident).
- `pubblica.py` refuses to publish if it finds a real codice fiscale/IBAN in the built file.
- The Browser pane serves `file://` pages with `script-src 'none'` — always use the local http server.

---

## 💬 Notes

- The owner writes in Italian; commit messages and code comments are in Italian, this handoff in English by convention.
- This session's last three requests were made from the wrong chat (the gym-app session); they were handled here anyway. The other project in this workspace (`programma palestra/`, "Atlas" PWA) is unrelated and has its own README.
- Project memory files: `gestionale-pavimass-stato-consegna.md`, `gestionale-pavimass-ricostruire-index.md` (Claude Code memory dir for this project). Verify file/line specifics against current code.
