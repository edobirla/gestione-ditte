# Handoff — Gestionale (Pavimass)

> Generated on 2026-09-24 — resume in a new Claude Code session.

---

## 🎯 Goal

Gestionale Pavimass is a single-file HTML app (built from `sorgente/*.js` + `01-stile.css` + `02-guscio.html` into `index.html`) for a small flooring/construction company: workers, worksites (cantieri), documents/expiries, attendance (presenze), quotes, budget/invoices, vehicles, suppliers, and now year-end inventory ("rimanenze") for the accountant. No external libraries — everything hand-written vanilla JS on purpose. The owner tests on the **published** app (GitHub Pages) and reports in Italian.

---

## 📍 Current State

Everything is **committed on `sorgenti` (b1c1fe3), pushed to `origin/sorgenti`, and published on `main` (14c3c3a: `index.html` + `sw.js` + `.gitignore`)**. Working tree clean except this HANDOFF.

**Done this session (all verified in the Browser pane, most with the owner's real data via `Gestionale Pavimass.html`):**
- **Rimanenze section** (`sorgente/58-rimanenze.js`, menu item after Budget). `stato.rimanenze["AAAA"]={magazzino,lavori,fatture}` (new top-level key `rimanenze:{}` in `60-dati.js`, no migration needed). Three tabs:
  - Magazzino: inline-editable rows (qta×costo), import from the owner's inventory xlsx (`magazzinoDaGriglia` + existing `grigliaDaXlsx`; real file `~/Lavoro/pavimass/rimanenze/2025/rimanenze 2025.xlsx` → 50 rows, total 28.615,60 € = his PDF), copy from previous year.
  - Lavori in corso: `proposteRimanenze(anno)` — per cantiere, hours in presenze after its last `entrata` dated ≤31/12 (`oreCantiere` × `tariffaOraria`) + non-manodopera `uscite` in the same window. If a following invoice exists in year+1 → goes to Fatture da emettere instead. Importo presunto is typed by the user.
  - Fatture da emettere: from `entrate` of year+1; manual "Da una fattura emessa" picker.
  - Export: one PDF (`docRimanenze(anno)`, one section per page, custom header like the libro presenze) or one section; empty sections print "Al 31/12/AAAA non risultano …". Print rows compact (`table.rimanenze` CSS) so 50 items fit one A4.
  - Inline edits use `esegui(...,{senzaRender:true})` and patch totals in the DOM so Tab keeps focus.
- **Dialogs with inputs no longer close on backdrop click** (`dialogo()` in `30-ui.js`) — the owner lost UNILAV worker data that way. X / Annulla / Esc still close.
- **Menu**: Fornitori moved under Clienti. **Clients deletable** (`eliminaCliente` in `43-clienti.js`: confirm lists linked cantieri/preventivi/fatture, nulls those references; undoable).
- **Code review fixes** (3 Sonnet reviewers + own verification): FatturaPA TD04 → `nota_credito` with `notaSu`; in-batch XML dedupe; Budget quick filters keep the year; `tabella()` auto-assigns an id to clickable tables (Scadenzario opened the wrong document); `leggiNumero('0.004')` no longer = 4 (thousands regex now requires a non-zero leading group); `salvaFile` un-trash goes through `esegui`; cantieri search by committente/affidataria; list pagination budget in `impagina`; "commitente" typo in presenze Excel; null guard in Esportazioni; negative quantities in preventivi.
- **Invoice import** (`47-budget.js`): accepts `.xml`, `.p7m` (`xmlDaP7m`: minimal ASN.1 walker, handles DER, BER indefinite length, chunked OCTET STRING, base64/PEM — tested with 4 openssl-signed variants) and `.zip` containing them (`testiFattureDaFile`). **Cantiere proposed** by `cantierePerFattura(testo, clienteId)` (name/address words in Causale/Descrizione/references, or the only open cantiere of that client); stays `daVerificare`, note says "cantiere proposto … da confermare".
- **Presenze cantiere recognition**: owner writes mostly the *località* in the "cantiere" row (e.g. "piancastagnaio", "firenze"). New `cantiereDaCella(cella, iso)` in `44-presenze.js`: exact name → else cantiere whose name/comune contains the word, active that day (dataInizio/dataFine), disambiguated by committente; only if unique. Used by the grid (unrecognised cells dotted-orange underline with tooltip; recognised ones show "→ cantiere X") and by Rimanenze `oreCantiere`. With real data this took attributable hours from ~0 to hundreds per cantiere. Exact names are saved canonically (`nomeCantiereCanonico`), suggestions list open cantieri first.
- **Offline**: `strumenti/sw.js` (network-first, cache fallback, cache name `gestionale`), registered in `99-avvio.js` only when `location.protocol==='https:'`. `pubblica.py` copies it to `main` and adds `!sw.js` to main's `.gitignore`. Verified locally by registering a temp copy, stopping the server and reloading (page loaded from cache); temp SW unregistered afterwards.

**Not verified / open:**
- Service worker on the real GitHub Pages site / installed iPhone app (only simulated locally).
- `cantiereDaCella` heuristics on ambiguous comuni: e.g. "Arezzo" outside Lidl/Guidelli date ranges resolves to "Olmo" (the only Arezzo cantiere without dates). Values in Rimanenze are editable, but warn the owner if numbers look off.
- Libro presenze printing: owner said on 09-14 it "doesn't work"; this session it renders 7 pages for July 2026 and a reviewer found no defect. Ask for exact repro if he still sees it.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `sorgente/58-rimanenze.js` | NEW — whole Rimanenze section, proposals, xlsx import, print doc. |
| `sorgente/47-budget.js` | XML import: `estraiFatturaXml` (+TipoDocumento, testoLibero), `xmlDaP7m`, `testiFattureDaFile`, `cantierePerFattura`, `budget-importa-xml`. |
| `sorgente/44-presenze.js` | `cantiereDaCella`, `nomeCantiereCanonico`, `eCantiereInElenco`, `valoriUsati` ordering, cell marking. |
| `sorgente/30-ui.js` | `dialogo()` backdrop rule; `tabella()` auto id. |
| `sorgente/43-clienti.js` | `eliminaCliente`, Elimina button in `dialogoCliente`. |
| `sorgente/31-navigazione.js` | `MENU` order (Rimanenze added, Fornitori under Clienti). |
| `sorgente/10-utilita.js` | `leggiNumero` thousands fix. |
| `sorgente/99-avvio.js` | SW registration (https only). |
| `strumenti/sw.js` | NEW — service worker (NOT in `sorgente/`, or costruisci.py would inline it). |
| `strumenti/pubblica.py` | Publishes `index.html` + `sw.js`, patches main's `.gitignore`. |

---

## ❌ Failed Attempts

### Matching presenze hours by exact cantiere name
- **What:** first version of `oreCantiere` compared `normalizzaTesto(cella.cantiere)===normalizzaTesto(c.nome)`.
- **Why it failed:** real presenze contain locations ("piancastagnaio"), not cantiere names; ~90% of cells never matched → Rimanenze would have proposed almost nothing. Replaced by `cantiereDaCella`. Lesson (again): test against the real data file, not synthetic data.

### Parsing xlsx numbers with `leggiNumero`
- **What:** xlsx raw value "0.004" went through the Italian parser → 4.
- **Fix:** raw xlsx numbers parsed with a dot-decimal regex first (`num` in `magazzinoDaGriglia`); `leggiNumero` itself also fixed for leading "0.".

### Reviewer-suggested pagination fix `disp-y`
- **What:** a reviewer proposed replacing `disp-y*0` with `disp-y` in `impagina`'s list branch.
- **Why wrong:** `disp` already subtracts `y` → double subtraction. Used `H-y-TOL` instead. Also: a `//` comment inserted mid-line in these one-line functions commented out the rest of the line (SyntaxError) — use `/* */`.

### sw.js not published
- **What:** `pubblica.py` added `sw.js` but main's `.gitignore` is `*` + whitelist → silently ignored. Fixed by appending `!sw.js`.

---

## ✅ Working Solutions

- **Verify with real data in memory**: open `http://localhost:8765/Gestionale%20Pavimass.html` (build with `python3 strumenti/costruisci.py`), then in console `window.salvaStato=()=>{}; stato=normalizzaStato(datiIniziali()); render();` — exercises every view with the company data without persisting. Then loop routes and check `#contenuto` for "ha avuto un errore".
- **Real reference files** for Rimanenze: `~/Lavoro/pavimass/rimanenze/2025/` (xlsx + two PDFs of what the accountant receives). The server only serves the project folder: copy a file in temporarily (and delete it) to fetch it from the page.
- **Test p7m**: `openssl cms -sign -binary -nodetach [-stream] -in f.xml -signer c.pem -inkey k.pem -outform DER|PEM`.

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
Preview: `.claude/launch.json` config "gestionale" (python http.server 8765).

---

## ➡️ Next Steps

1. Ask the owner to try on the published app: Rimanenze 2025 (import his xlsx, "Compila dai dati", Esporta), XML/ZIP/p7m import from his invoicing software, and offline opening of the installed app on iPhone.
2. If Rimanenze lavori/fatture numbers look wrong, inspect `cantiereDaCella` on his real presenze (ambiguous comuni like Arezzo) and consider letting him pin a località→cantiere mapping.
3. Owner's open question answered: keep his external invoicing software (SdI sending, legal storage) and import XML here — do not turn this app into an e-invoicing tool.
4. Still-standing items from earlier handoffs: libro presenze print repro if he reports it again; optional "N non segnalati" hint for silenced documents.

---

## ⚠️ Gotchas / Traps

- **Never `git switch main`** in the working folder (empties it). Publish only via `strumenti/pubblica.py`.
- Rebuild `index.html` and commit it with every `sorgente/` change (memory rule), then publish and push `sorgenti`.
- Source lines are extremely long one-liners: edit with exact-string Python replacements; never `//` comments mid-line.
- Every edit to an existing `60-dati.js` catalog entry needs a migration in `20-stato.js`; new top-level keys just go in `datiIniziali` (normalizzaStato fills them).
- The SW caches the app on the published site: if the owner ever sees an old version, it is network-first so a reload online fixes it; cache name is `gestionale`.
- Local Browser pane: never leave a service worker registered on localhost (it would serve stale builds in later tests).

---

## 💬 Notes

- The owner writes in Italian; commit messages/comments Italian, this file English.
- The owner explicitly allowed using Sonnet sub-agents when useful; 3 parallel read-only reviewers worked well for the whole-code review (verify every finding — one suggested fix was wrong).
