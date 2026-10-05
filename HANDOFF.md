# Handoff — Gestionale (Pavimass)

> Generated on 2026-10-05 — resume in a new Claude Code session.

---

## 🎯 Goal

Gestionale Pavimass is a single-file HTML app (built from `sorgente/*.js` + `01-stile.css` + `02-guscio.html` into `index.html`) for a small flooring/construction company: workers, worksites, documents/expiries, attendance (presenze), quotes, budget/invoices, vehicles, suppliers, year-end inventory (rimanenze). Vanilla JS, no external libs on purpose. The owner tests on the **published** app (GitHub Pages) and reports in Italian. The printed monthly "Scheda ore" (one A4 page per worker) goes to the accountant, so its readability and "exactly one page per worker" are hard requirements.

---

## 📍 Current State

Everything is **committed on `sorgenti` (e0e0ba1), pushed, and published on `main` (15ba380)**. Working tree clean except this HANDOFF.

**Done this session (presenze round, all verified in the Browser pane with the owner's real data via `Gestionale Pavimass.html`):**
- Click a worker's **name** in the Presenze grid → opens his compilation sheet (`apriTrascrizione`, `AZIONI['presenze-compila']` in `44-presenze.js`). Works also for `soloTrasferte` people (single "Località trasferta" column); the "Compila un operaio" picker no longer filters them out. The name no longer links to the worker page from the grid.
- **Cantieri in corso suggested** while typing in cantiere/committente (grid editor and compilation sheet): `suggerimentiCantieri(campo)` → "cantiere · committente · comune", searches all three, open cantieri first, then history.
- **"Ripeti la riga N fino al giorno [__] · Compila uguale"** bar in the compilation sheet: copies the focused row to following workdays up to the day typed (skips weekends, writes FS on holidays).
- **Note field** in the compilation sheet (`[data-nota]`, saved to `mp.note`).
- **Importo**: single field "Importo del mese", prefilled with the automatic value; if the owner changes it, it is stored (`importoManuale`+`importoForzato=true` internally) and stays; clearing it returns to automatic. No "forzato"/✎ shown anywhere (grid, operai page, print).
- **Grid** table is `width:100%` (no white space on the right).
- **Holidays**: `completaFestivita(anno,mese)` (called from `VISTE.presenze`) writes FS on weekday holidays for active libro-presenze people who already have data in that month; print also shows FS for empty holiday rows. Holiday rows/cells use a soft red diagonal hatch (like weekends but red) in grid (light + dark theme) and print.
- **Printed scheda ore** (`docLibroPresenze` in `50-stampa.js`, CSS `table.ore-mensili`/`.ore-*` in `01-stile.css`): bigger fonts (rows 10.5pt, hours 12pt bold, total 22pt, "Totale mese" 14pt), **name in the box 18pt**, box "Qualifica" = **Socio / Dipendente** (no more mansione), table `table-layout:fixed` with single-line ellipsis cells (long committente/località used to wrap and push the sheet onto a 2nd page), località column 55mm, `.stretta` compact class when notes/extra lines are long, note box turns **red** (border, bg, bold red 12pt text; 9pt if >320 chars) when a note exists; auto lines (assenze, festività pagate) stay small black. No tint on worked rows (owner explicitly did not want it).
- **Order**: `personePresenze` sorts soci first, then dipendenti, each alphabetically by "cognome nome" (affects grid, print, keyboard navigation, exports).

**Not verified / open:**
- Mobile (phone) Presenze view has no button to open the compilation sheet (only the old per-person card).
- Holiday red hatch was checked in computed CSS, not by eye (Browser pane was not compositing); owner should confirm tone.
- A single note of ~1500+ characters would still push the footer to a 2nd page (not realistic).
- Earlier open items: service worker on real GitHub Pages/iPhone; `cantiereDaCella` ambiguity (e.g. "Arezzo"); libro presenze printing repro if the owner reports again.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `sorgente/44-presenze.js` | `personePresenze` (sorting), `completaFestivita`, `suggerimentiCantieri`, `apriTrascrizione` (repeat bar, note, soloTrasferte), importo dialog in `presenze-persona`. |
| `sorgente/50-stampa.js` | `docLibroPresenze`: Socio/Dipendente, FS fallback, note box classes, `stretta` heuristic (`righeNote`, chars/48). |
| `sorgente/01-stile.css` | `.presenze-griglia` (width, festivo hatch, `.nome-compila`), `.doc table.ore-mensili…`, `.doc .riq…` print styles. |
| `sorgente/41-operai.js` | ✎ forzato indicator removed from hours table. |
| `strumenti/costruisci.py`, `pubblica.py`, `controlla_funzioni.py` | Build / publish / safety check (see Setup). |

---

## ❌ Failed Attempts

### Light-blue tint on worked rows in the printed sheet
- **What:** added `tr.lavorato` background to make hours stand out.
- **Why it failed:** owner did not want coloured rows. Removed. Hours stand out via bold 12pt only.

### Bigger print fonts without row control
- **What:** first bump to 10pt rows / .5mm padding made every sheet 2 pages (14 pages for 7 workers).
- **Fix:** tighter padding + 10.5pt text/12pt hours; then owner still saw 2 pages on real data → cause was long committente/località wrapping. Fixed with `table-layout:fixed` + nowrap/ellipsis. Always stress-test with very long strings and long notes (impaginazione splits tables by rows → silent extra pages).

### Testing print in the Browser pane
- `.anteprima-stampa` overlays stay in the DOM: `.remove()` it between runs or `querySelector` returns the old one (gave a false "7/9 pages"). Page count check: `.anteprima-stampa .pagina` length must equal `personePresenze(a,m).length`.

---

## ✅ Working Solutions

- **Verify with real data in memory**: `python3 strumenti/costruisci.py` → open `http://localhost:8765/Gestionale%20Pavimass.html`, console: `window.salvaStato=()=>{}; stato=normalizzaStato(datiIniziali()); render();`. Stress prints with `stampaLibroPresenze(2026,7)` over several months/notes.
- Programmatic `.focus()` does not fire `focusin` in the pane: dispatch `new FocusEvent('focusin',{bubbles:true})` in tests.
- Importo override rule: save only if the typed value differs from the value shown at open (`calc.importo`), so editing aggiustamenti alone doesn't freeze the amount.

---

## 🔧 Dependencies & Setup

```bash
python3 strumenti/costruisci.py --vuoto      # → index.html (published, no company data)
python3 strumenti/costruisci.py              # → Gestionale Pavimass.html (with data, gitignored)
cat sorgente/[0-9]*.js > /tmp/all.js && node --check /tmp/all.js
python3 strumenti/controlla_funzioni.py HEAD
python3 strumenti/pubblica.py                # publish index.html + sw.js to main
git push origin sorgenti                     # pubblica.py does NOT push sorgenti
```
Preview: `.claude/launch.json` config "gestionale" (python http.server 8765); restart with `preview_start` if navigation is denied.

---

## ➡️ Next Steps

1. Ask the owner to print July on the published app and confirm: red holiday hatch tone, one page per worker, red note box, Socio/Dipendente, name size, alphabetical order.
2. If any worker still goes to 2 pages: get worker + month (or screenshot of the preview), inspect with his real data.
3. Optional: add a "Compila il mese" button in the phone view (`vistaPresenzeMobile`).
4. Earlier backlog: Rimanenze 2025 trial by the owner, XML/ZIP/p7m import, offline on iPhone, possible località→cantiere pinning.

---

## ⚠️ Gotchas / Traps

- **Never `git switch main`** in the working folder (empties it). Publish only via `strumenti/pubblica.py`.
- Rebuild `index.html` (and commit) with every `sorgente/` change, then publish and push `sorgenti`.
- Source lines are very long one-liners: edit with exact-string Python replacements (assert count==1); never `//` comments mid-line.
- `.presenze-griglia` print/preview pages are fixed 297mm with `overflow:hidden`; body height ≈ 888px; a 31-day sheet had ~100px slack after the fixes — keep it that way when touching print CSS.
- New top-level state keys go in `datiIniziali`; catalog edits in `60-dati.js` need a migration in `20-stato.js`.
- Never leave a service worker registered on localhost.

---

## 💬 Notes

- The owner writes in Italian; commit messages/comments Italian, this file English. Commits end with the Co-Authored-By line given by the harness.
- Owner preferences voiced this session: accountant must not be confused (hours must be obvious even for people with no committente/località; notes must not be overlooked); one page per worker is non-negotiable; no forced-amount wording anywhere.
