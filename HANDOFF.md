# Handoff — Gestionale (Pavimass)

> Generated on 2026-10-23 09:52 — resume in a new Claude Code session.

---

## 🎯 Goal

Single-file HTML business app for Pavimass (sources in `sorgente/`, built by `strumenti/costruisci.py`, published on GitHub Pages). Sessions 09–21/10/2026: full redesign (approved via a simulation in `template/sim/`, gitignored), then making every screen match the simulation, then a series of owner requests (bilanci, signing, sharing, update notifications, numbered versions). **Talk to the owner (Edoardo) in Italian.** He uses the app as a Safari web app added to the Dock on his Mac (earlier he used Chrome).

---

## 📍 Current State

Everything is committed on `sorgenti` (HEAD `1b743ec "Versione 1.2"`), pushed, and **published as version 1.2** (`main` at `01d43e9`). Working tree clean. autoverifica 39/39; `controlla_funzioni.py 7bd0141` reports only 3 intentionally removed items (`menu-altro`, `riquadroAzioni`, `riquadroSemaforo`).

**Working (verified in the built-in browser on a localhost test archive):**
- Redesign: new design system in `01-stile.css` (old class names kept, old colour tokens are aliases), shell in `02-guscio.html`, Geist fonts embedded. All sections restyled as in the simulation, except the Fine anno icon (owner's choice).
- New sections: Versamenti (F24, Cassa Edile, bonifici; `59-versamenti.js`) and Fine anno, with three tabs: ISA (`59-isa.js`), Rimanenze, and **Bilanci e verbali** (`59-bilanci.js`, `stato.bilanci[anno]={bilancio,verbale,ricevuta,altri[],note}`).
- Vehicle document type `mezzo_verbale` («Verbale / multa»): the `pavimass/verbali` folder holds car fines, not company minutes.
- **Firma** button on every PDF or image of a document. It opens the existing assistant (`57-assistente.js`); «Aggiungi al documento» attaches the signed copy. Workers' signatures are also listed in Documenti → Modelli → Carta intestata e firme.
- Optional note when accepting or flagging a busta difference (`verifica.nota`).
- Switching tabs on the same page doesn't re-animate or reset scroll (`render()` compares section + h1; class `cambio-linguetta`).
- `legaleRappresentante()` (`20-stato.js`) falls back to the active person with `tipo==='legale_rappresentante'` when Impostazioni has none selected.
- «Condividi buste» (operaio → Buste paga, and Documenti → Buste paga → Per operaio): choose months or «Condividi tutte».
- **Documenti → Prepara un invio** (`51-invio.js`):
  - choose document types and people (or the workers of a cantiere);
  - organise one folder per operaio or one per tipo;
  - output: «Salva in una cartella…» (`showDirectoryPicker`, Chrome only), ZIP download, or share ZIP.
- Sharing (`condividiFile` in `51-esporta.js`):
  - shares `{files}` only. A title or text made Safari add a second item, which looked like two identical PDFs.
  - on Chrome/Edge for Mac it opens a drag/download/save-to-folder window instead, because Chrome passes a file path, not the file.
  - if the share sheet is refused (activation lost), a «Pronto da condividere» dialog asks for a second tap.
- **Updates and versions:**
  - `VERSIONE_APP` is a content hash and `NUMERO_VERSIONE` is the human number (1.0, 1.1…).
  - `pubblica.py` writes `versione.json` to `main` and records versions in `strumenti/versioni.json`.
  - the app checks on start, every 30 min and on focus, then shows a notice, a dot on Impostazioni, and Impostazioni → Aggiornamenti (versions + changelog + «Aggiorna ora»).
- `sw.js` fetches pages with `cache:'no-cache'`, because GitHub Pages sets `max-age=600` and Safari kept serving the stale page.
- Native Mac title bar: all `theme-color` was removed in 1.2.

**Not verified by the owner yet:**
- Safari sharing now pastes ONE PDF. Earlier failures were a stale cached page; the owner had to clear Safari's cache once to get the update system.
- The title bar is native after updating to 1.2. If the Dock app keeps the old colour, he must re-add it from Safari with File → Aggiungi al Dock, after a backup.
- «Prepara un invio» and «Salva in una cartella» with real files.
- Pacchetto committenza (inside the cantiere): the owner hasn't tried it yet.
- Print layouts (stampe) were deliberately untouched; the owner wants to review them later.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `sorgente/01-stile.css` | Design system; new components under marker `/* ═══ componenti del nuovo disegno ═══ */`; print section untouched |
| `sorgente/31-navigazione.js` | MENU, `render()` (tab-switch stillness), palette shortcuts, `contatoriMenu` (incl. update dot), themes |
| `sorgente/32-aggiornamenti.js` | Update check, «Aggiorna ora», Impostazioni → Aggiornamenti |
| `sorgente/41-operai.js` | Operai list/scheda, Scadenzario (flat table with bars) |
| `sorgente/45-documenti.js` | Documenti tabs, document panel, Firma button, buste (smistamento, confronto, condividi buste), modelli, firme persone |
| `sorgente/51-esporta.js` | `condividiOScarica`/`condividiFile`, `chromeSuMac`, `finestraFileDaPortare`, `salvaInCartella`, pacchetto committenza |
| `sorgente/51-invio.js` | «Prepara un invio» |
| `sorgente/59-bilanci.js`, `59-isa.js`, `59-versamenti.js` | Fine anno tabs, Versamenti |
| `sorgente/48-impostazioni.js` | Impostazioni tabs (azienda, backup bento, peso, tipi, preferenze, esportazioni, aggiornamenti, sistema) |
| `strumenti/costruisci.py` | Build; replaces `__VERSIONE_APP__` (hash) and `__NUMERO_VERSIONE__` (from `versioni.json`) |
| `strumenti/pubblica.py` | Bumps version if there are new commits, builds, publishes `index.html`+`sw.js`+`versione.json` to `main`, commits «Versione x.y» on the working branch |
| `strumenti/versioni.json` | Version history (newest first, with commit + changelog) |
| `strumenti/sw.js` | Service worker (network first, pages with no-cache) |
| `template/prova-condividi.html` | Local share test page (gitignored), served at `http://localhost:8767/template/prova-condividi.html` |

---

## ❌ Failed Attempts

### Sharing with Web Share on Chrome for Mac
- **What:** `navigator.share({files})` from Chrome on macOS.
- **Why it failed:** Chrome hands apps the temp-file **path** as text (`…/Chrome/Profile 1/WebShare/share-…/x.pdf`), and its share menu has no WhatsApp. Can't be fixed from a web page → Mac Chrome gets the drag/download/save window; real sharing needs Safari.

### Passing `title`/`text` with shared files
- **What:** `navigator.share({files,title,text})`.
- **Why it failed:** WebKit (WKShareSheet.mm) adds the title as a separate item when there is no text/url → pasted as a second element that looks like a duplicate PDF. Fixed: `{files}` only.

### Assuming the owner had the new version
- **What:** after publishing, asked him to test; he kept reporting the old bug.
- **Why it failed:** GitHub Pages `max-age=600` + service worker fetching through HTTP cache → stale page. Diagnosed by checking whether a newer feature («Prepara un invio») was visible. Now: no-cache fetch in `sw.js` + update notification. **When he says a just-published fix "doesn't work", first check which version he is running (Impostazioni → Aggiornamenti).**

### Coloured title bar
- **What:** set `theme-color` to the background colour to "hide" the purple Dock title bar.
- **Why it failed:** the owner wants the **native** grey macOS bar, no colour at all. Removed every `theme-color` (1.2). Don't add it back.

### Progress dialog in a hidden browser pane
- `dialogoAvanzamento().aggiorna()` waits for a repaint; when the preview pane is hidden, scripts that use it hang. Test `fileInvio()` without `prog`. This is not a real bug.

---

## ✅ Working Solutions

- **Share-sheet activation:** a share sheet or folder picker must open right after the click. Open `showDirectoryPicker` first, then read the files. For the share sheet, catch `NotAllowedError` and ask for a second tap in a dialog (dialog button `fn` runs synchronously inside the click).
- **Multiple files without share:** one ZIP (`creaZip` in `22-backup.js` accepts Blobs) instead of several downloads.
- **Diagnosing Safari issues:** a standalone test page in `template/` served by the local preview server and opened by the owner in Safari isolates browser vs app behaviour.
- **File references:** any new state field that points to files must be added to `riferimentiFile()` in `21-archivio.js` (otherwise `cestinaFileOrfani` trashes them), and to the label switch in `pesoArchivio`.
- **New document types / state keys:** add them to `datiIniziali()` in `60-dati.js`; `normalizzaStato` adds them to existing archives automatically (no migration needed).

---

## 🔧 Dependencies & Setup

```bash
python3 strumenti/costruisci.py            # Gestionale Pavimass.html (with company data, for local tests)
python3 strumenti/costruisci.py --vuoto    # index.html (no data) — always rebuild + commit together with sources
cat sorgente/[0-9]*.js > "$TMPDIR/t.js" && node --check "$TMPDIR/t.js"
python3 strumenti/controlla_funzioni.py 7bd0141   # only the 3 known removals are expected
python3 strumenti/pubblica.py              # ASK THE OWNER FIRST; bumps version, publishes main, commits «Versione x.y»
git push origin sorgenti
```
Preview: `.claude/launch.json` → "gestionale" on port **8767** (8765 belongs to the owner's other program «Programma SDARM» — never touch it), "simulazione" on 8766.

To verify a publish: poll `https://edobirla.github.io/gestione-ditte/versione.json` with an `until` loop (no long `sleep`; the harness blocks it).

---

## ➡️ Next Steps

1. Ask the owner whether, after updating to **1.2** (Impostazioni → Aggiornamenti), Safari sharing pastes a single PDF and the title bar is native. If the bar is still coloured, explain how to re-add the app to the Dock: backup first, then File → Aggiungi al Dock from the same URL.
2. Have him try «Documenti → Prepara un invio». «Salva in una cartella» exists only in Chrome; in Safari he gets the ZIP and the share. Adjust the folder and file naming if he wants.
3. Have him try the pacchetto committenza in a cantiere (tab Pagamenti / pacchetto).
4. Review the print layouts with him (they still use the pre-redesign look on purpose).
5. Older backlog (see `handoff-history/HANDOFF-2026-10-08.md` and `-10-05.md`):
   - payslips archived before 08/10 have the wrong net and duplicated pages, so they should be re-uploaded;
   - a configurable busta tolerance;
   - July print check;
   - "Compila il mese" on mobile;
   - offline use on iPhone.
6. Future, informational only: multi-company support (consorzio, immobiliare). The idea is in `ARCHITETTURA.md` §7; build it only when he asks.

---

## ⚠️ Gotchas / Traps

- **Ask before publishing**, every time. Each publish becomes a numbered version, and its commit messages become the user-visible «Novità», so write them in plain Italian and never include real names or figures. The repo and site are public.
- Never put real payslip figures or names in code comments either.
- Never `git switch main` in the project folder; publish only with `pubblica.py`, then `git push origin sorgenti`.
- Never change `NOME_DB='GestionalePavimass'`; never tell the owner to "remove website data" in Safari: that deletes his archive. «Sviluppo → Svuota la cache» is safe.
- Data lives in the browser (IndexedDB) per origin. Moving between browsers means backup → ripristina.
- **Local testing:** a fresh origin gets seeded by whichever file opens first. `preview_start` opens `/` = `index.html` → **empty archive**. Always navigate to a 404 page (e.g. `/vuota.html`), `indexedDB.deleteDatabase('GestionalePavimass')`, then open `Gestionale Pavimass.html`. Delete the test DB when done.
- `pavimass/` is the company's real archive: read only. Test copies go in `template/` (gitignored) and get deleted.
- Rendering: `html```…`` escapes strings; raw concatenated HTML must be wrapped with `grezzo()`. Actions: `AZIONI['nome']` + `data-azione`; `data-cambio` for change events.
- The 32-aggiornamenti check runs only on https (published app); locally, stub `appPubblicata=()=>true` and drop a temporary `versione.json` in the project root to test it, then delete that file.

---

## 💬 Notes

- The owner checks things himself and reports tersely ("non funziona", "2 pdf uguali"). When something fails, find out which version and which button he used before changing code.
- He prefers seeing it working over explanations; keep replies short, in Italian, and say clearly what is published and what isn't.
- Memory files in `~/.claude/projects/-Users-edoardo-Desktop-Claude-code-programma-pavimass/memory/` (`gestionale-pavimass-redesign.md` etc.) hold the same key facts.
