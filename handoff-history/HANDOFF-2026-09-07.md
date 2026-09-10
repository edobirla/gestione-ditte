# Handoff — Gestionale Pavimass

> Generated on 2026-09-07 — resume in a new Claude Code session.

---

## 🎯 Goal

Single-file construction-company management app for Pavimass S.R.L. (Edoardo Birla, owner). Everything lives in `Gestionale Pavimass.html`, built from `sorgente/*.css|html|js` via `python3 strumenti/costruisci.py`. No external dependencies, no CDN, no network calls, no build step at runtime. IndexedDB storage, hand-written print/ZIP/PDF-text-extraction engines.

Edoardo uses the app daily now. This is **Fase 3**: a punch-list of bugs and corrections from real usage, gathered in a single brain-dump message on 2026-09-07 after Fase 2 (a ~29-item feature request, all implemented and committed — see `git log` and the project memory file). He has NOT yet said "fai tutto, non fermarti" for this list — treat this as a fresh backlog to triage/confirm scope with him where noted, not a blank check to rewrite everything.

---

## 📍 Current State

**Working and committed (Fase 1 + Fase 2, ~30 commits, all passing `autoverifica()` — 39/39 checks):**
Everything described in the project memory file `gestionale-pavimass-stato-consegna.md` (auto-loaded memory — read it first, it has full detail on architecture and what Fase 1/2 covered: Mezzi/Fornitori/Bonifici sections, busta-paga PDF splitting, FatturaPA XML import, XLSX in-place compiler, external-document assistant, drag&drop rewrite, libro presenze redesign, dashboard redesign, etc.)

**Broken / wrong / needs redoing (this session's brain dump, 2026-09-07 — see Next Steps for detail):**
- Libro presenze print layout does NOT match Edoardo's real reference template (now saved in `template/Scheda Ore Mensile.pdf`) — wrong columns, wrong colors, and he says not all days show (needs re-verification).
- Preventivo print output must match Pavimass's real invoicing-software template (now saved in `template/Prev. n.4-26-P del 25-06-26 (Isola Castelluccio Condominio).pdf`) — current output does not.
- **Assistente documento esterno is reported as non-functional** ("doesn't let me pick images or PDFs") — likely cause identified below, needs a real-device fix+retest.
- **Drag&drop still broken on Chrome** despite the Fase 2 rewrite — needs live diagnosis with Edoardo.
- A genuinely useful feature ("compila operaio per operaio") was accidentally deleted in Fase 2 batch 3 along with the AI-reading feature it was bundled with — needs to be restored (minus the AI part, which he did want gone).
- Dichiarazioni model editor exposes `{{cantiere.nome}}`-style placeholders to a non-technical user — he calls this a violation of "la regola principale del programma" (must be intuitive to someone who's never used it). This is a design problem, not a one-line fix.
- Several smaller UX corrections (list below) — mostly small, well-located fixes.

**Not started:** everything in this handoff's Next Steps is new work from the 2026-09-07 brain dump, not yet touched this session.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `template/Scheda Ore Mensile.pdf` | **Edoardo's real reference for the libro presenze layout.** Read it in full before touching `docLibroPresenze()`. |
| `template/Prev. n.4-26-P del 25-06-26 (Isola Castelluccio Condominio).pdf` | **Edoardo's real preventivo output** (from his current invoicing software). This is the exact visual target for `docPreventivo()`/`stampaPreventivo()`. |
| `sorgente/50-stampa.js` | Print engine. `docLibroPresenze(anno,mese)` and the preventivo print function live here — both need a structural redesign, not a tweak. |
| `sorgente/44-presenze.js` | Presenze grid + Strumenti dialog (`AZIONI['presenze-strumenti']`, line ~203) + the deleted Trascrizione feature (was here before commit `65fe9d7`, see Failed Attempts). |
| `sorgente/45-documenti.js` | Documenti archive, `dialogoDocumento` (edit dialog, ~line 122), `apriDocumento` (side panel, ~line 57), `AZIONI['assistente-documento-esterno']`/`apriAssistenteDocumento` (~line 264, suspected bug), `vistaArchivio`'s peso column (~line 33). |
| `sorgente/42-cantieri.js` | Cantieri list (`VISTE.cantieri`, ~line 63) — filter bar has no search input, unlike every other section. Also `checklistCantiere()` (~line 23) — the function that decides which documents are "required" per cantiere, needs to respect a committenza-specific list when one exists. |
| `sorgente/53-fornitori.js` | `dialogoFornitore` — needs a CF field alongside P.IVA. |
| `sorgente/55-bonifici.js` | `dialogoBonifico`/`apriAssistenteBonifico` (whichever it's called) — needs auto-extraction from the uploaded "distinta" PDF, or a UX simplification if that's not reliable. |
| `sorgente/51-esporta.js` | `vistaPacchetto`/`AZIONI['pacchetto-genera']` (~line 142) — **already does most of what Edoardo asked** (omits missing docs, records them, lets you exclude rows via checkbox). The one real gap: a hard `blocchi` check (UNILAV/permesso di soggiorno) disables the whole "Genera" button. Read this function fully before assuming it needs a rewrite — it probably just needs Edoardo to confirm what he actually hit. |
| `sorgente/41-operai.js` | `schedaAnagrafica`/persona scheda — needs a firma (signature) upload field with auto background removal. |
| `sorgente/21-archivio.js` | `comprimiImmagine`/`caricaImmagine`/`canvasABlob` — the canvas primitives to reuse for signature background removal (simple luminance threshold, no ML needed). |
| `sorgente/46-preventivi.js` | `apriCompilatoreExcel` (Fase 2's in-place XLSX filler) — Edoardo's new framing suggests he actually wants extraction-into-Pavimass's-own-template instead (see Next Steps #6). Don't delete the in-place filler yet — clarify first, it may still be useful as a secondary option. |

---

## ❌ Failed Attempts / Known-Wrong Decisions

### Libro presenze redesign (Fase 2, commit `cee04c6`)
- **What:** Rewrote `docLibroPresenze()` to show all days with weekend/festivo color tinting, "creative freedom" on colors (used brand purple/orange).
- **Why it's wrong:** Edoardo already had a specific reference (`template/Scheda Ore Mensile.pdf`, only shared with me in this session, but he says he sent me the same content before) — his exact words: "il libretto delle presenze non è assolutamente come quello che ti ho mandato". The real template has 4 columns (Giorno / Committente / Località Trasferta / Ore Ordinarie), not the 3-column merged layout I built. It uses a black table header + blue accent (matching the app's own `--blu` token) + light cream/gray info boxes, not the lavender/orange tinting I invented. It has separate "NOME E COGNOME" / "QUALIFICA-RUOLO" boxes at the top (one sheet per person), and a "NOTE" + "IMPORTO TOTALE" box pair at the bottom.
- **Also reported:** "non si vedono tutti i giorni" (not all days show) even after my fix. I verified programmatically in-browser that all days render for a fresh month — but that was before this redesign. Re-verify from scratch against the new template, don't assume the old fix still applies once the structure changes.

### Presenze batch-3 cleanup (commit `65fe9d7`)
- **What:** Removed "Trascrizione" (`AZIONI['presenze-trascrizione']`, `apriTrascrizione`, `leggiTrascrizione`) and "Incolla dati" (`AZIONI['presenze-incolla']`) together, because they were bundled with the AI foglio-ore-reading feature Edoardo explicitly asked to remove.
- **Why it's wrong:** "Trascrizione" was actually TWO things bundled in one dialog: (a) a genuinely useful **per-worker, full-month, keyboard-driven table** (Enter = down, Tab = right, ⌘D = copy from row above, ⌘↓ = fill down to end of month, `?` = mark uncertain) for filling one operaio's whole month in one sitting, and (b) an optional "Leggi con AI" button + photo upload, shown only if `stato.impostazioni.chiaveApi` was set. I deleted the whole dialog instead of just removing (b). Edoardo confirmed: "hai tolto una funzione che mi piaceva, quella di compilare operaio per operaio, rimettila com'era" (you removed a feature I liked, the fill-worker-by-worker one, put it back like it was).
- **Fix:** restore `apriTrascrizione`/`leggiTrascrizione`/the "Trascrizione" button, but strip out `#tr-carica` (photo upload), `#tr-ai` (AI button), and `leggiFoglioConAi` — keep only the manual keyboard-driven table. The full old code is visible via `git show 65fe9d7 -- sorgente/44-presenze.js` (look at the `-` lines). Also remove the `foglioOreId` references inside it since that field's photo-upload purpose is gone.

### Assistente documento esterno (commit `d7c3a24`) — suspected root cause, unconfirmed
- **What:** Built with `scegliFile({multipli:false,accetta:'image/*'})` — deliberately scoped to images only (a real PDF-page renderer was judged out of scope for this session).
- **Why Edoardo says "doesn't let me choose images or PDFs":** I could never test the real native-OS file-picker click path in this sandboxed environment (`scegliFile` opens a real hidden `<input type=file>.click()`, which headless browser tools can't drive) — I only ever tested the core compositing logic by calling `apriAssistenteDocumento(file)` directly with a synthetic File object, bypassing the button and picker entirely. **This path was never actually verified end-to-end.**
- **Most likely explanation:** he tried it on a PDF (the realistic case — "documento di un'altra azienda" arrives by email as a PDF far more often than as a photo), and `accept="image/*"` silently excludes/grays out PDFs in the OS picker with zero explanation in the UI — from his side that looks exactly like "the button doesn't do anything." The "doesn't let me choose images either" part is less explained — needs him to describe exactly what happens: does any dialog/window open at all when he clicks the button? What file type did he try?
- **Next step:** ask Edoardo precisely what he clicked and what file type, before changing code. If confirmed as the PDF case, either (a) show a clear message when scope doesn't cover PDFs, or (b) extend scope to PDFs (needs rendering a PDF page to canvas first — a real PDF renderer, previously scoped out as too large; reconsider only if this turns out to be the actual blocker).

### Drag&drop rewrite (commit `0dcf780`)
- **What:** Consolidated 3 overlapping listeners into one window-level `dragover`/`drop` pair with `trovaZonaDrop()`.
- **Status:** Still reported broken on Chrome. I have never been able to test real OS-level drag&drop in this environment (computer-use tools refuse to drive drag gestures across a real browser here) — the previous "fix" was verified only via synthetic `DataTransfer`+`File` drop events dispatched in JS, which proved the *handler logic* is correct but says nothing about real browser drag event sequencing/timing on Chrome specifically. **This needs Edoardo, live, describing exactly what he sees**: does the drop zone highlight at all while dragging? Does anything happen on drop (error in console)? Which Chrome version/OS?

---

## ✅ Working Solutions (keep these, don't re-litigate)

- **Pacchetto committenza already does most of what was re-requested.** Before rewriting `pacchetto-genera`, read it in full (`sorgente/51-esporta.js` lines 142–200ish): it already omits non-includible docs from the ZIP, records what's missing in `00 Indice.txt` and in the invio history, and lets the user manually exclude any row via checkbox (`data-pacchetto-escludi`). The only real gap is the hard `blocchi` check for missing/expired UNILAV or permesso di soggiorno on assigned workers, which disables "Genera" entirely (a deliberate compliance gate, not a bug). Confirm with Edoardo whether he hit specifically that gate before assuming a rewrite is needed.
- **File dedup by content hash** (`salvaFile` in `21-archivio.js`) already prevents identical files from being stored twice. What's missing is a different thing: warning when a NEW (different-content) document of a type that already exists for that soggetto is being added — see Next Steps #12.
- Everything else listed as "done" in the project memory file — don't re-implement, verify first if Edoardo reports something as broken (he may be testing an old cached build; always confirm `python3 strumenti/costruisci.py` was rerun and the browser hard-refreshed with a new `?v=N` before assuming a code bug).

---

## 🔧 Dependencies & Setup

```bash
# Rebuild the single-file app from sorgente/
python3 strumenti/costruisci.py

# Local dev server for browser testing (Claude_Browser MCP tools, not file://)
# .claude/launch.json already has a "gestionale" config: python3 -m http.server 8765
# Open http://localhost:8765/Gestionale%20Pavimass.html?v=N (bump N to bust cache)
```

No package manager, no dependencies to install. `autoverifica()` in the browser console runs 39 self-checks — must stay green after every change.

---

## ➡️ Next Steps

Ordered roughly by how much Edoardo's language signals frustration/priority, not by ease. **Confirm scope on the ambiguous ones (marked ⚠️) before building — this list came from one unstructured brain-dump message, not a spec.**

1. **Assistente documento esterno "does nothing"** — ask Edoardo exactly what he clicked and what file type he tried (see Failed Attempts above for the leading hypothesis). Fix based on his answer.
2. **Drag&drop still broken on Chrome** — ask Edoardo for exact repro (does the zone highlight? any console error? Chrome version?). This cannot be diagnosed further from code alone.
3. **Restore "compila operaio per operaio"** (the Trascrizione dialog minus AI/photo) — see Failed Attempts above, this one has a clear, low-risk fix (`git show 65fe9d7` has the exact code to restore).
4. **Libro presenze: full redesign to match `template/Scheda Ore Mensile.pdf`.** Read the PDF, rebuild `docLibroPresenze()` in `50-stampa.js`: 4 columns (Giorno/Committente/Località Trasferta/Ore Ordinarie), separate name/qualifica header boxes, black table header + blue accent, NOTE + IMPORTO TOTALE boxes at bottom. Then, on top of that structure: weekend filigrana (⚠️ find what watermark pattern already exists in the app's own CSS/UI first — Edoardo says "tipo quella che vedo in app", implying there's already one somewhere, likely in the interactive presenze grid's CSS for weekend cells — search `01-stile.css` for existing diagonal-stripe/watermark patterns before inventing a new one), and full-row color highlight for ferie/festività/malattia rows (not just a tint — a solid/strong row color). Re-verify "all days show" from scratch once the new structure is in place.
5. **Preventivo: full redesign to match `template/Prev. n.4-26-P...pdf`.** This is Pavimass's actual current invoicing-software output. Rebuild the preventivo print function in `50-stampa.js` to match: header (logo top-left + address, "Preventivo" box with Numero/Data/PIVA/CF, Intestatario/Destinazione box top-right, Condizioni pagamento + Banca box), table (Descrizione/Q.TA'/U.M./Prezzo/Importo/C.IVA columns), footer (Imponibili/Imposte/Totale documento box, blue accent, firma per accettazione). All Pavimass preventivi should look like this — "falli tutti uguali, con lo stesso template."
6. ⚠️ **Preventivi: extract capitolato voci from an uploaded client Excel/PDF directly into the new standard Pavimass template**, instead of (or in addition to?) the in-place XLSX filler built in Fase 2. This is a change of direction from what he asked last time ("compila quello che carico" → now "estrai le voci e mettile nel nostro modello"). Confirm with Edoardo: does he still want the in-place filler as a fallback for when a client insists on their own file back, or should it be replaced entirely by extract-into-Pavimass-template? Either way, this needs: reading an uploaded client .xlsx/PDF, identifying rows that look like capitolato line items (description/qty/UM/maybe price), and populating them as `righe` in a new Pavimass preventivo using the redesigned template from #5.
7. ⚠️ **Dichiarazioni model editor is too technical** ("cantiere.nome, preposto.nome... che roba è?"). Edoardo frames this as the app's core design principle: intuitive to a first-time user, both visually and functionally. The `{{segnaposto}}` curly-brace system (in `dialogoModello`, `sorgente/45-documenti.js`) needs rethinking — e.g. a field-picker UI (click "Nome del cantiere" from a list, it inserts the right token invisibly) instead of asking the user to type/understand `{{cantiere.nome}}` syntax at all. This is a design problem worth thinking through carefully, not a quick patch — possibly worth a dedicated planning pass before touching code.
8. **Cantieri list needs a search bar.** Every other section (Operai, Documenti, Budget, Bonifici, Fornitori) has a free-text `<input type="search">` in its filter bar; Cantieri only has stato/anno/comune dropdowns. Add one in `sorgente/42-cantieri.js`'s `barra` (~line 78), filtering by nome/comune/client name, following the exact pattern used in `filtro-operai` or `filtro-archivio`.
9. **Documenti: remove the "Peso" column** from the archivio table (`sorgente/45-documenti.js:33`, `vistaArchivio`'s `colonne` array). Note: the "Peso archivio" settings page (moved to Impostazioni in Fase 2) is a different thing and should stay — he's specifically talking about the per-row peso column in the documents list.
10. **Remove the "Verificato" checkbox** — from `dialogoDocumento`'s campi (`sorgente/45-documenti.js` ~line 142) and its display in both `apriDocumento`'s panel (~line 66) and anywhere else it's shown. Leave the `verificato` field in the data model alone (don't migrate/strip existing data, just stop surfacing it in the UI) unless a full audit shows it's trivial to remove everywhere.
11. **Hide the "drag files here" drop zone in the document side panel when a file is already attached.** In `apriDocumento` (`sorgente/45-documenti.js` ~line 74), the `<div class="zona-drop" data-azione="doc-aggiungi-file"...>` is currently unconditional — wrap it in `if(!files.length)` or similarly only show it when there's nothing attached yet (or always show a smaller "add another file" affordance instead — ask Edoardo which he prefers if unsure).
12. **Warn on likely-duplicate documents.** When adding a new document via `dialogoDocumento` for a soggetto+tipoId that already has a valid (non-scaduto) document on file, show a confirmation ("Esiste già una Carta d'Identità per [nome]: aggiungerne un'altra?") instead of silently allowing it. This is different from the existing hash-based file dedup — it's about the same *type* of document being added twice, e.g. as a mistaken re-upload instead of an edit/renewal.
13. **Fornitori: add a Codice Fiscale field** alongside P.IVA in `dialogoFornitore` (`sorgente/53-fornitori.js`) — for cases where the fornitore is a private individual (e.g. the landlord for the capannone rent), not a company.
14. ⚠️ **Bonifici: auto-extract importo/destinatario/data from the uploaded "distinta"** instead of requiring manual entry every time — Edoardo explicitly said "io carico sempre le distinte, non voglio ricompilare sempre tutto a mano." He also offered an explicit fallback: "o sennò lasciare che sia un archivio di bonifici" (or else just make it a pure upload archive, no fields at all). Try extraction first (extend the same PDF-text-scan pattern used for document-expiry-date extraction in `45-documenti.js`'s `estraiDataDaTesto`/`proponiDateDaFile` — look for amount/IBAN/date patterns near labels like "importo", "beneficiario", "data valuta"), but if his real bank's distinta format doesn't extract reliably, fall back to his stated alternative rather than fighting a brittle parser.
15. **Pacchetto committenza should respect a committenza-specific document list** when one has been provided via `checklist-lista-incolla`/`checklist-lista-carica`, instead of always requiring the full standard set. Currently `checklistCantiere()` (`sorgente/42-cantieri.js` ~line 23) always includes ALL persona/azienda-required doc types regardless of what a specific committenza actually asked for; the pasted/uploaded list only *adds* extra custom items, it never *restricts* the standard ones. Needs a way to mark "this cantiere has a received requirements list" and filter the checklist output against it. Non-trivial — think through the data model change carefully (e.g. a `committenzaListaRicevuta: [tipoId,...]` field on the cantiere, set by `checklist-lista-incolla`/`carica`, and `checklistCantiere()` skips standard items not in that list when it's present) before implementing.
16. **"Compila" on assegnazione/antincendio/preposto-style dichiarazioni should place the assigned worker's own signature.** Depends on #17.
17. **Add a firma (signature) field to each persona's scheda**, uploaded from a photo, with **automatic background removal** — Edoardo wants this so the signature composites cleanly onto documents. This does NOT need AI/ML: a simple canvas luminance threshold (make near-white/near-background pixels transparent) is standard and already buildable with the existing `caricaImmagine`/canvas primitives in `21-archivio.js` (same pattern as `comprimiImmagine`). Store as a PNG with alpha channel (`fotoId`/`firmaId` fields already exist on persona per the data model — check if `firmaId` is already meant for this and just unused, or needs a new field).
18. **Presenze Strumenti: reduce to only "Riempi il mese" and "Copia da una persona all'altra."** ⚠️ Edoardo's exact words: "lascia solo compila tutto il mese e copia da un altro operaio" — this implies removing "Compila un intervallo di giorni" (blocco), "Copia il mese precedente" (copiaMese), and "Svuota il mese di una persona" (svuota) from the `presenze-strumenti` dialog (`sorgente/44-presenze.js` ~line 203). Before deleting "Svuota", note it may be redundant with the grid's own multi-select-delete (already documented in `presenze-aiuto`: select a range + Canc). Confirm he's fine losing "copiaMese" and "blocco" specifically — they're real functionality, not obviously mistakes, so a quick confirmation avoids re-adding them next session.

---

## ⚠️ Gotchas / Traps

- **Never guess at Edoardo's reference templates — check `template/` first.** He drops reference files there (`Scheda Ore Mensile.pdf`, the real preventivo PDF). Read them fully before redesigning anything print-related again; last time I redesigned the libro presenze "with creative freedom" when a real reference existed and it was rejected outright.
- **This sandboxed browser environment cannot test real native file pickers or real OS-level drag&drop.** Two of the top bugs on this list (assistente documento esterno, drag&drop) fall exactly into this gap. Don't re-attempt indirect JS-injection "verification" and call it done — be explicit that these need Edoardo's live testing, and ask precise diagnostic questions (exact click, exact file type, console errors) rather than shipping another blind fix.
- **`pavimass/` folder is the real company archive, gitignored, never touch.**
- **`template/` folder is untracked reference material** (not part of the app) — don't commit it into the app's git history as if it were source; it's for reading, not shipping. (It currently shows as untracked in `git status` — leave it untracked unless Edoardo asks otherwise.)
- **Local git identity is auto-detected** (commits print a warning about it). Not fixed because never explicitly requested — don't fix it unless asked.
- Always rebuild (`python3 strumenti/costruisci.py`) and hard-refresh with a bumped `?v=N` before concluding something is "still broken" — several past reports turned out to be stale cached builds.
- `autoverifica()` must stay 39/39 green after every change — run it in the browser console before considering anything done.

---

## 💬 Notes

- Edoardo has NOT yet said "fai tutto, non fermarti" for this Fase 3 list (unlike Fase 2, where that explicit instruction was given). Given several items are marked ⚠️ (ambiguous or a stated behavior change from Fase 2), it's reasonable to ask 2-4 clarifying questions up front in the next session rather than assuming full autonomy — especially items #6 (preventivo extraction direction), #15 (checklist filtering design), and #18 (which Strumenti to actually remove).
- The "intuitive above all" principle from item #7 is worth internalizing for ALL future work on this app, not just the dichiarazioni editor — Edoardo explicitly called it "la regola principale del programma."
- Proposals from the `pavimass/` real-archive analysis (assicurazioni aziendali, banca/finanziamenti, visure camerali, DVR aziendale, dossier subappaltatori, cause legali, rifiuti/Albo Gestori, scadenzario fiscale) were presented to Edoardo at the end of the last session but not yet discussed/prioritized — worth circling back to once this punch-list settles down.
