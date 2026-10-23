# Handoff — Gestionale (Pavimass)

> Generated on 2026-10-23 18:30 — resume in a new Claude Code session.

---

## 🎯 Goal

Single-file HTML business app for Pavimass (sources in `sorgente/`, built by `strumenti/costruisci.py`, published on GitHub Pages, used by the owner as a Safari web app on Mac). On 23/10/2026 the session went from version 1.3 to **1.22**: cantiere editing, PSC auto-fill, a new POS, nomine/dichiarazioni generated already signed, real PDFs made by the app, pacchetto committenza, and signing documents. **Talk to the owner (Edoardo) in Italian, short replies.**

**Top priority now: the signature must be of maximum quality when the signed document is PRINTED.** The owner says it still looks bad. Do not ask him questions about it; investigate and fix.

---

## 📍 Current State

Everything is committed on `sorgenti` (HEAD `92c0ad8 "Versione 1.22"`), pushed, and published as **1.22**. The working tree is clean, apart from this file. autoverifica passes 42/42. `controlla_funzioni.py 7bd0141` reports only the known removals: `menu-altro`, `riquadroAzioni`, `riquadroSemaforo`, `stileStampaPerHtml`.

**Signing pipeline (state after 1.20–1.22):**
- Assistant «Firma» (`57-assistente.js`):
  - pdf.js renders the page for the preview (`paginaPdfJs`);
  - `pdfFirmato(file,r)` tries `pdfFirmatoOriginale` for PDFs or `pdfFirmatoDaFoto` for photos;
  - fallback: raster at scale 4.2, JPEG 0.95.
- `sorgente/54-pdf-firma.js`, `pdfFirmatoOriginale`:
  - copies the original PDF objects byte-for-byte;
  - adds a `/Stamp` annotation (`/F 4` = print flag) whose appearance Form XObject draws the overlay;
  - the overlay comes from `disegnoOggettiPdf`: Helvetica text, white cover rects, signature images as RGB+SMask Flate.
- `firmaNitida(im,latoPt)` (1.22) upscales small signature images to 600 dpi of their placed size (max 8x, max 3000 px). It smooths the alpha with a box blur and an S-curve, so outer edges are crisp. Inner colour edges (black stroke over the coloured logo, the windows) stay soft, because the source is tiny.
- `riparaMascherePdf` (`54-pdf.js`, 1.21) runs on every PDF upload in `acquisisciFile`. It fixes SMask images saved as DCT RGB (UPDF does this); otherwise Safari doesn't draw those signatures.
- `comprimiPdf` («Riduci») now skips SMask/Mask/ImageMask images.
- `immagineAziendaDaFile` (`45-documenti.js`) keeps PNGs as-is up to 3 MB; others are capped at 2400 px. Before, everything was capped at 900 px.
- `firmaSenzaSfondo` (`21-archivio.js`) is used for people's signatures taken from a photo. It works at 2000 px and gives a soft edge (before: 900 px with a hard threshold).

**Root cause of bad quality found so far:** the company «Timbro e firma» image stored in the owner's app is only **298×206 px** (same as `pavimass/logo/Firme/pavimass.png`). People's signatures in `pavimass/logo/Firme/` are 140–900 px.
- A high-res rebuild was made: `template/timbro-e-firma-alta-risoluzione.png`, 2200×1533, gitignored. It combines the logo from `pavimass/logo/Pavimass/400dpiLogoCropped.png`, stretched horizontally ×1.107 like the original, with the stroke upscaled via blur and threshold.
- The owner was told to load it in Impostazioni → Firme e timbro. **Unknown whether he did.** The last signed file on his Desktop (`~/Desktop/Assegnazione lavori dal consorzio - firmato.pdf`, 17:55) still used the 298 px image.
- He says that inside the app it looks "abbastanza bene, non benissimo", and that it is bad **when saved and printed**.

**Not verified by the owner:** Safari behaviour of everything from 1.18 onward:
- real PDFs and «Scarica PDF»;
- signing;
- the pacchetto ZIP.

He also still has to check the POS noise/vibration bands against his own assessment and fill in the CCNL field in Impostazioni.

---

## 📁 Relevant Files

| File | Role / Status |
|------|--------------|
| `sorgente/54-pdf-firma.js` | `disegnoOggettiPdf`, `firmaNitida`, `pdfFirmatoOriginale` (annotation approach), `pdfFirmatoDaFoto` |
| `sorgente/57-assistente.js` | Signing assistant UI; `pdfFirmato`, `telaDelFoglio`, «Salva firmato nel documento» → `sostituisciFileDocumento` |
| `sorgente/54-pdf.js` | Own PDF parser `analizzaPdf`, `comprimiPdf`, `riparaMascherePdf`, `riscriviPdfConImmagini` (supports `{dict,grezzo}` replacements) |
| `sorgente/54-pdf-crea.js` | `pdfDaPagine`: DOM → vector PDF for generated documents (nomine, POS, dichiarazioni). **Signature images are embedded at source size here, without `firmaNitida`.** |
| `sorgente/54-pdfjs.js` | Embedded pdf.js 3.11.174 loader, `paginaPdfJs`, `pdfDaImmagini`, `unisciInPdf` |
| `sorgente/50-stampa.js` | Print templates; `firmaPersona`, `{{IMG:firmaTimbro}}` placeholders; «Scarica PDF» in preview |
| `sorgente/21-archivio.js` | `acquisisciFile` (repairs masks on upload), `firmaSenzaSfondo`, `comprimiImmagine` |
| `sorgente/45-documenti.js` | Document panel, `immagineAzienda`/`immagineAziendaDaFile`, Firme e timbro settings |
| `strumenti/costruisci.py` | Build; `/*LIBGZ:name*/` embeds `sorgente/lib/*` gzip+base64 |
| `template/timbro-e-firma-alta-risoluzione.png` | High-res company stamp+signature for the owner (gitignored, private) |

---

## ❌ Failed Attempts

### Rasterizing the whole page to sign (before 1.20)
- **What:** the page was rendered to a canvas, the overlay composed on it, then saved as JPEG.
- **Why it failed:** text and lines got blurred. Replaced by the lossless copy plus annotation.

### Blaming «Riduci» for the vanished Consorzio signature
- **What:** I assumed `comprimiPdf` had broken it.
- **Why it failed:** on that file `comprimiPdf` changed nothing (images under 40 KB). The real cause was UPDF writing the SMask as an RGB JPEG. Two synthetic tests also failed to reproduce a «Riduci» problem; the mask skip was kept as a precaution.

### Expecting the high-res stamp to fix it by itself
- **What:** I produced the 2200 px stamp, then published `firmaNitida` (1.22).
- **Why it failed:** the owner re-signed and still says it's terrible. Either he didn't replace the image, or printing degrades it further. **Check the print path, not just on-screen rendering.**

---

## ✅ Working Solutions

- **Test procedure:**
  1. Navigate to `http://localhost:8767/vuota.html` and run `indexedDB.deleteDatabase('GestionalePavimass')`.
  2. Open `/index.html` (empty build, current code). `Gestionale Pavimass.html` is the full build and may contain OLD code unless rebuilt without `--vuoto`.
  3. Delete the test DB at the end.
- **Getting blobs out of the browser:** run `scratchpad/ricevi.py <dir>` (POST receiver on port 8799) and `fetch('http://localhost:8799/name.pdf',{method:'POST',body:blob})`. If the scratchpad is gone, recreate it as a tiny `http.server` that writes the POST body to a file.
- **Apple rendering check:** the Swift snippet `pk.swift` draws a PDF page region with PDFKit (same engine as Safari and Anteprima) at any scale:
  - command: `swiftc -O pk.swift -o pk`, then `./pk file.pdf pageIndex scale x y w h out.png`;
  - it uses `PDFPage.draw(with:.mediaBox,to:CGContext)`.
- Test copies of company files go in `template/` and are deleted afterwards; `pavimass/` is read-only.

---

## 🔧 Dependencies & Setup

```bash
python3 strumenti/costruisci.py --vuoto    # index.html (no data) — always rebuild + commit together with sources
python3 strumenti/costruisci.py            # Gestionale Pavimass.html with company data (local tests only)
python3 strumenti/controlla_funzioni.py 7bd0141
python3 strumenti/pubblica.py              # ASK THE OWNER FIRST
git push origin sorgenti
```
In the browser console: `await autoverifica()` → expect 42/42. Preview server "gestionale" is on port **8767**. Never touch 8765, which belongs to «Programma SDARM».

---

## ➡️ Next Steps

1. **Make the printed signature maximum quality (top priority, don't ask the owner).**
   - Reproduce the print path. Sign a test PDF with a small and a large signature, then print to PDF from Safari's/Anteprima's viewer (PDFKit) and from the app's own print preview. Inspect the printed output at 600 dpi. Check whether the Stamp annotation is rasterized or downsampled when printing or re-saving. His Desktop file had been re-saved by another program, and all images turned into Flate/ICC.
   - Consider **flattening** the signature into the page content instead of an annotation:
     - new page content = Form XObject wrapping the original content streams plus the original Resources, followed by the signature Form;
     - this avoids viewer and print annotation handling, and the signature can't be moved or deleted.
   - Consider **vectorizing signatures**: trace the stroke alpha into PDF paths (marching squares plus curve smoothing). The stroke is then infinitely sharp; the coloured logo can stay as a high-res image or be traced too. This is the only way to get "perfect" quality from a 298 px source.
   - Apply `firmaNitida` (or vector signatures) in `pdfDaPagine` (`54-pdf-crea.js`) too. Generated nomine, POS and dichiarazioni embed signatures at source size (e.g. 434×262 px for about 100 pt). Do the same for HTML print (`50-stampa.js` images).
   - Make the app warn in Impostazioni → Firme e timbro when a signature or stamp image is too small (for example under 1000 px on its long side).
   - Check whether the owner has uploaded `template/timbro-e-firma-alta-risoluzione.png`. If not, remind him in one line.
2. Ask him to confirm on Safari:
   - real PDFs and «Scarica PDF»;
   - the pacchetto ZIP;
   - «Salva firmato nel documento» marking documents as signed.
3. Still open from before:
   - the POS noise/vibration bands must be checked against his own noise assessment;
   - the CCNL field in Impostazioni must be filled in;
   - the print layout review;
   - the older backlog in `handoff-history/HANDOFF-2026-10-23.md`.

---

## ⚠️ Gotchas / Traps

- **Ask before publishing**, every time. Commit messages become the user-visible «Novità»: write plain Italian, with no real names or figures. The repo and site are **public**, and so is this file, so never commit signature images or company data.
- Never `git switch main`; publish only with `pubblica.py`, then `git push origin sorgenti`.
- Never change `NOME_DB='GestionalePavimass'`; never tell the owner to remove Safari website data.
- `AZIONI['file-firma']` resolves only when the dialog closes, so don't `await` it in tests.
- `analizzaPdf` gives `o.dict` as the first 4000 chars, which includes raw stream bytes. Use `dizionarioVero()` when rewriting a dict.
- Every change to `sorgente/*.js` must be rebuilt (`--vuoto`) and committed together with `index.html`.

---

## 💬 Notes

- The owner judges by eye and reports tersely ("qualità pessima", "terribile"). Show before/after crops when possible.
- Signature sources on disk (read-only):
  - `pavimass/logo/Firme/*.png` (small);
  - `pavimass/diverse/firme/*.png` (around 800–900 px, black and white, including a 584 px B/W «timbro e firma»);
  - `pavimass/logo/Pavimass/400dpiLogo*.png` (high-res logo).
