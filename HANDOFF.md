# Handoff — Gestionale (Pavimass)

> Generated on 2026-10-08 — resume in a new Claude Code session.

---

## 🎯 Goal

Single-file HTML business app for Pavimass (sources in `sorgente/`, built by `strumenti/costruisci.py`). This session: fix payslip splitting from the accountant's monthly TeamSystem PDF, and let the owner compare each payslip's net against the amount he entered in Presenze, accepting the difference or flagging it for review.

---

## 📍 Current State

All committed on `sorgenti`, pushed, and **published** to GitHub Pages (`main` at `5d23b21`).

**Working (verified in the built-in browser with real PDFs, autoverifica 39/39):**
- Splitting a monthly PDF (`smistaBustaPdf`, `sorgente/45-documenti.js`): identical pages are skipped (the PDF always contains the whole set twice), pages are grouped by the name printed on them, and each person gets a PDF with only their own pages.
- `leggiTotaliBusta`: net read right after "REPARTO <code>"; gross = total earnings whose difference with deductions equals that net (deductions can be negative, e.g. an IRPEF refund); several payslips per person ("Aggiuntivo" + main) → net, gross and hours are summed. Checked on Jan/Apr/Jul/Sep 2026. Owner confirmed the September nets are correct.
- `confrontoBusta` compares net vs `calcolaMesePersona().importo` **and** hours. It counts as a deviation from 1 € or more than 0.5 h.
- New table "Buste contro presenze" at the top of Documenti → Buste paga (`vistaControlloBuste`): month selector; per person it shows net, own amount, difference, hours and status. Buttons «Va bene così» / «Da rivedere» (`busta-verifica` with `data-tabella` = don't open the panel), «Cambia» to undo. Clicking a row opens the payslip panel, which shows the same comparison table. When empty, the table shows an explanatory line.
- The split queue has a "Netto / tuo importo" column with the difference before archiving; while a queue exists it takes full width.

**Not verified:** the owner's real archive (his payslips archived before today still have the wrong net + doubled pages — he should delete and re-upload them). The owner had said "non lo vedo" before the always-visible fix; not yet confirmed he sees it now.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `sorgente/45-documenti.js` | All payslip code: `smistaBustaPdf`, `leggiTotaliBusta`, `confrontoBusta`, `piuMeno`, `vistaControlloBuste`, `bloccoConfrontoBusta`, `busta-verifica` |
| `index.html` | Built with `--vuoto`, tracked, published by `strumenti/pubblica.py` |
| `~/Lavoro/pavimass/operai/buste paga/2026/9 settembre.pdf` | Real September PDF (outside repo). Jan–Jul are also under `pavimass/operai/buste paga/2026/` in the project (served at `/pavimass/...`) |

---

## ❌ Failed Attempts

### Old net heuristic ("pair before IRPEF lorda repeated twice")
- **What:** net = competenze − trattenute taken from the pair 5 numbers before a repeated value.
- **Why it failed:** wrong on most payslips (e.g. 26,73 € instead of 2.853 €). The earlier memory note claiming it was verified on two payslips was wrong; it has been corrected.

### Joining split digits with a broad regex
- **What:** joining "lone digit + space + number" everywhere.
- **Why it failed:** "REPARTO 1 2.853,00" became "12.853,00". Fixed: join only when the rest is `\d{1,2},\d{2}` (the split only happens under 1000 €).

### `href="#"` link on the table name
- Replaced with a clickable `<tr class="cliccabile" data-azione="busta-apri">`, following the convention used elsewhere in the app. (The panel slides in with an animation, so take screenshots after a short wait.)

---

## ✅ Working Solutions

- **TeamSystem text quirk:** each text run has its first glyph split off ("R EPARTO", "5 4,80" = 54,80). Amounts ≥ 1000 are not split.
- **Net = 0** (e.g. Jallow Sep: only holiday pay from Cassa Edile) is not printed → stays empty ("netto da scrivere").
- **"Aggiuntivo" hours must be summed:** Diop 32+104, Gostima 32+144, Raciula 48+128 = full month.
- **Inspecting a PDF:** in the browser console, `await estraiTestoPdf(await (await fetch('/path')).blob())`; pypdf is available in python3 (do not use `-I`, it hides user site-packages).
- **Testing without polluting data:** stub `window.dialogoModulo`, set `stato.persone=datiIniziali().persone` in memory; any `esegui` persists to the localhost test IndexedDB → clean it up afterwards (it was empty: 0 persone/buste/mesi).

---

## 🔧 Dependencies & Setup

```bash
python3 strumenti/costruisci.py            # Gestionale Pavimass.html (with company data)
python3 strumenti/costruisci.py --vuoto    # index.html (no data) — always rebuild + commit with source
cat sorgente/[0-9]*.js > /tmp/all.js && node --check /tmp/all.js
python3 strumenti/controlla_funzioni.py HEAD
python3 strumenti/pubblica.py              # publishes main; then: git push origin sorgenti
```
Preview: `.claude/launch.json` "gestionale" (port 8765); use `?v=N` to bust the cache.

---

## ➡️ Next Steps

1. Confirm with the owner that he now sees "Buste contro presenze" and the queue column; tell him to delete and re-upload payslips archived before 08/10.
2. Ask whether pages 3+5 for Birla Edoardo (Sep) should stay merged: his main payslip contains residual holidays/permits, 13th month and bonus, so it is not a monthly "Aggiuntivo". Owner confirmed the totals but did not comment on the merge.
3. Possibly a configurable tolerance (now 1 € / 0.5 h) if he finds it too strict.
4. Previous backlog (from `handoff-history/HANDOFF-2026-10-05.md`): July print check, 2-page workers, "Compila il mese" on mobile, Rimanenze 2025 trial, offline on iPhone, località→cantiere pinning.

---

## ⚠️ Gotchas / Traps

- **Never put real payslip figures or names in code comments or commit messages**: the repo/site is published. This session's comments were rewritten with invented examples, and a commit message was amended before push.
- `ponytail:` ceiling: the REPARTO code is assumed to be a single digit; codes like 10/11 would need position-based reading.
- Never `git switch main` in the project folder; use `pubblica.py`.
- `pavimass/` is the company's real synced archive: read only. Put temporary test copies in `template/` (gitignored) and delete them afterwards.

---

## 💬 Notes

- The owner checks the result himself: give him the numbers to check (as done for the September nets) rather than asserting they are correct.
