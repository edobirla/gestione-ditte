# Architettura — Gestionale Pavimass

*Documento di progetto, scritto prima del codice. Spiega le scelte, le alternative scartate e i rischi.*

## 1. Cosa si sta costruendo

Un solo file, `Gestionale Pavimass.html`, che si apre con doppio clic da `file://` su Mac, iPhone e iPad. Dentro ci sono interfaccia, logica, immagini, il testo integrale del modello POS e i dati reali dell'azienda. Non chiede la rete, non installa nulla, non ha un passo di compilazione. I documenti (PDF, scansioni) vivono nel database del browser, non in cartelle.

## 2. Le decisioni sui problemi difficili (capitolo 3 del brief)

### 2.1 Dove vivono i documenti → IndexedDB, due archivi separati

- **Archivio `dati`**: un unico record JSON con tutte le anagrafiche, i cantieri, le presenze, ecc. Pesa poche centinaia di KB e si riscrive per intero a ogni modifica (in coda, con ritardo di 300 ms per accorpare le modifiche rapide). Riscrivere un record piccolo è più semplice e più sicuro di aggiornamenti parziali.
- **Archivio `file`**: un record per documento, chiave = impronta SHA-256 del contenuto. La deduplica è automatica: lo stesso file caricato due volte produce la stessa chiave. Le anagrafiche tengono solo i metadati (nome, peso, tipo, impronta). Salvare un'anagrafica non tocca mai i documenti.
- **Memoria**: i blob si leggono dal database solo quando servono (anteprima, backup, pacchetto). Elenco e ricerca lavorano sui metadati. Con 300 documenti la memoria resta quella dei metadati.
- **Compressione immagini**: `canvas` nativo. Le foto si ridimensionano a max 2000 px sul lato lungo e si ricomprimono in JPEG scendendo di qualità finché il risultato è sotto 300 KB, restando leggibili. Si mostrano prima e dopo, e si può tenere l'originale per il singolo file. I PDF si archiviano come sono (nessuna libreria per ricomprimerli); sopra i 2 MB si avvisa.
- **Spazio**: pannello con totale, ripartizione per soggetto e tipo, i dieci file più pesanti e le azioni (ricomprimi, sostituisci, elimina). All'avvio si chiede `navigator.storage.persist()` per impedire al browser di svuotare l'archivio; se il browser rifiuta o se lo spazio finisce (`QuotaExceededError`), l'applicazione lo dice e indica il backup.

*Scartato*: File System Access API (solo Chrome, non funziona in Safari né su iOS); `localStorage` (limite 5–10 MB, sincrono, inadatto ai blob); dati incorporati nel file HTML stesso (impossibile riscrivere il file da cui si è aperti).

### 2.2 Salvataggio, backup, trasferimento

- Ogni modifica passa da una sola funzione (`esegui`) che aggiorna lo stato, lo salva e registra un'istantanea per annulla/ripristina. Non esiste un pulsante "salva".
- **Backup = un file `.zip`** con `dati.json` + una cartella `documenti/` con i file veri, nominati con l'impronta. È uno ZIP normale: si apre anche a mano, senza l'applicazione, e questo è un piano di emergenza in più. Lo scrivo io in JavaScript (metodo STORE, CRC32): niente librerie. Nome: `Backup Pavimass 03-09-26.zip`.
- **Spia backup**: lo stato ricorda data dell'ultimo backup e contatore di modifiche successive. Un puntino nella barra, non un avviso modale.
- **Migrazioni**: lo stato ha `versioneSchema`. Al caricamento e al ripristino si applicano in sequenza le funzioni `migrazioni[n]` e poi `normalizza()` fonde lo stato con quello predefinito, così i campi nati dopo esistono sempre. Un backup vecchio non rompe nulla.
- **Condivisione**: il backup completo pesa decine di MB e non passa via mail; l'applicazione lo dice e propone AirDrop, iCloud Drive, WhatsApp, oppure un backup "solo dati" di pochi KB. Il **rientro** del lavoro del collaboratore avviene con la "fusione": si carica il suo backup, l'applicazione mostra cosa cambierebbe (elementi nuovi, modificati, in conflitto) e applica solo quello che l'utente approva. Prima di ogni ripristino o fusione si crea un'istantanea automatica.

### 2.3 La stampa → impaginazione fatta dall'applicazione

Il browser non sa mettere una carta intestata su ogni pagina, numerare "Pagina N di M" in modo affidabile, né evitare tabelle spezzate male. Quindi **le pagine le costruisce l'applicazione**: il documento viene reso in blocchi, misurato nel DOM, e distribuito in `div` da 210×297 mm con margini interni. Le tabelle si spezzano per righe ripetendo l'intestazione, un titolo non resta mai solo in fondo, ogni pagina ha la sua intestazione e il suo piè con la numerazione. L'anteprima a schermo *è* la stessa impaginazione, quindi è fedele. In stampa `@page { margin: 0 }` elimina data, ora, titolo e URL che il browser scriverebbe nei margini; i margini bianchi sono quelli interni alle pagine. Il tema scuro non tocca mai il contenitore di stampa. Il libro presenze usa `@page { size: A4 landscape }` inserito al volo.

*Scartato*: contatori CSS di pagina (non supportati da Safari e da Chrome fuori dai margin box), `position: fixed` per la carta intestata (funziona ma non consente numerazione N di M né controllo delle rotture).

### 2.4 Far uscire i file → ZIP e XLSX scritti a mano

- **ZIP**: scrittore minimale (STORE) usato per backup, pacchetto committenza e XLSX.
- **XLSX**: è uno ZIP di XML. Genero `[Content_Types].xml`, `workbook.xml`, `styles.xml`, un `sheetN.xml` per mese con stringhe in linea, celle unite, larghezze e formule `SUM`. Excel e Numbers lo aprono senza avvisi.
- **Lettura**: per PSC (PDF) e per gli Excel dei clienti serve decomprimere DEFLATE. Uso `DecompressionStream` nativo dove c'è, con un `inflate` in JavaScript come riserva, così il comportamento è identico fra dieci anni.
- **iPhone/iPad**: `navigator.share({files})` apre il foglio di condivisione di sistema; dove non c'è si scarica e lo si spiega.

### 2.5 Caricamento iniziale → proposte, mai automatismi

Drag & drop di cartelle (`webkitGetAsEntry`) o selezione multipla. Un classificatore su percorso e nome propone soggetto, tipo e date (`AA.MM.GG`, `AA.MM`), con un punteggio di fiducia. Le righe incerte stanno in cima e l'utente conferma prima che qualcosa entri. La deduplica per impronta rende la procedura ripetibile.

### 2.6 Buste paga → regole apprese dalle correzioni

Ogni nome di file viene scomposto in segni (parole, numeri). Se l'utente corregge l'operaio proposto, l'applicazione salva la coppia *segno → persona* e la usa la volta dopo. Anno e mese si leggono da tutte le forme comuni (`2026-07`, `07.2026`, `luglio 2026`, `0726`). Nessun file resta senza destinazione: i non riconosciuti finiscono in "da assegnare".

### 2.7 Foglio ore → trascrizione, non promesse

Senza rete non si legge la grafia: lo dico nell'interfaccia. La postazione di trascrizione mette la foto (zoom e spostamento) accanto alla griglia e si compila tutta da tastiera. L'incolla di dati strutturati passa sempre da un'anteprima delle differenze. La lettura assistita con chiave API esiste solo se l'utente inserisce una chiave, è spenta di default, chiama la rete solo su richiesta esplicita e il risultato passa dalla stessa anteprima.

### 2.8 POS → contenuto, non file

Il testo del modello `POS_Pavimass_Template_v4.docx` è stato travasato con uno script che legge l'XML del documento e produce blocchi (paragrafi, elenchi, tabelle con celle unite e sfondi, immagini). Il testo entra parola per parola. Le parti che dipendono dal cantiere (copertina, revisioni, anagrafica, figure, squadra, fasi, emergenze, formazione, firme, date) sono segnaposto che l'applicazione riempie dai dati. Le schede delle otto lavorazioni e le venti schede macchina sono etichettate con le lavorazioni a cui appartengono: includere una lavorazione porta dentro le sue schede, escluderla le toglie ovunque, comprese descrizione dell'opera, copertina e fasi. Le immagini EMF del modello (pittogrammi DPI) sono state convertite in PNG estraendone la bitmap incorporata.

### 2.9 Pacchetto committenza

Schermata di revisione obbligatoria con ogni voce, soggetto, file, scadenza e stato. Gli scaduti sono esclusi salvo forzatura motivata; UNILAV mancante o permesso di soggiorno scaduto bloccano l'operaio. Le dichiarazioni si compilano dai modelli con i segnaposto e si impaginano con carta intestata, firma e timbro. Lo ZIP ha cartelle numerate e un indice; l'invio resta nello storico del cantiere con l'elenco esatto di cosa conteneva e cosa mancava.

## 3. Tecnologie del browser usate e perché

| Tecnologia | Uso | Perché | Alternativa scartata |
|---|---|---|---|
| IndexedDB | dati e documenti | unica memoria grande, asincrona, disponibile su `file://` in Safari e Chrome | localStorage, File System Access |
| `navigator.storage.persist` | anti-svuotamento | chiede al browser di non cancellare l'archivio | — |
| Canvas 2D | compressione immagini | nativo, nessuna libreria | librerie di compressione |
| `crypto.subtle` + SHA-256 in JS di riserva | deduplica | impronta stabile del contenuto | nome file (inaffidabile) |
| Blob URL + `<iframe>` | anteprima PDF | nativo su Mac; su iOS mostra solo la prima pagina, quindi lì si apre a schermo intero | pdf.js (libreria esterna) |
| `DecompressionStream` + inflate JS | lettura PDF/XLSX | nativo dove c'è, riserva ovunque | librerie zip |
| `navigator.share` | condivisione su iOS | foglio di sistema | — |
| SVG inline | icone e grafici | disegnati, senza font o librerie | librerie grafici |
| `matchMedia(prefers-color-scheme)` | tema | segue il sistema, con interruttore a tre stati | — |

Niente framework: il file deve restare leggibile e modificabile senza strumenti. Il rendering è a funzioni che producono HTML da stringhe, sempre attraverso `h()` che mette in sicurezza ogni valore. Gli eventi sono delegati con attributi `data-azione`.

## 4. Schema dati (sintesi; il dettaglio è in `SCHEMA DATI.md`)

Lo stato è un unico oggetto con: `azienda`, `persone`, `tipiDocumento`, `documenti`, `file` (metadati), `clienti`, `professionisti`, `cantieri`, `pos`, `modelli`, `presenze` (per `anno-mese`, poi per persona, poi per giorno), `bustePaga`, `regoleBuste`, `listino`, `preventivi`, `movimenti`, `impostazioni`, `cestino`, `generati`. Le relazioni sono per id. Le date sono stringhe `AAAA-MM-GG`; gli importi numeri in euro. Le regole trasversali (stato documento, scadenza stimata, idoneità, giorni lavorativi, arrotondamento aziendale, formattazione, validazioni) sono funzioni pure nella sezione "Regole" del file, senza accesso al DOM.

## 5. Struttura del file

Una mappa in cima elenca le sezioni con un marcatore cercabile (`═══ SEZIONE n`): stile → guscio HTML → utilità e regole → stato e persistenza → archivio file → backup e migrazioni → componenti UI → navigazione e ricerca → moduli (uno per voce di menu) → impaginazione e stampa → esportazioni → POS e dichiarazioni → dati iniziali → immagini → avvio. I dati reali di partenza stanno in `datiIniziali()`, il testo del POS nella costante `POS_TESTO`, le immagini in `IMMAGINI`.

### 5.1 Come si ricostruisce il file

`Gestionale Pavimass.html` è la concatenazione ordinata dei file in `sorgente/` (`00-mappa.txt`, `01-stile.css`, `02-guscio.html`, poi i `.js` in ordine numerico), fatta da `strumenti/costruisci.py`. Si può modificare direttamente il file HTML consegnato (è leggibile, con gli stessi marcatori di sezione) oppure i file in `sorgente/` e rilanciare lo script: le due strade sono equivalenti, ma non vanno mescolate senza riallineare. Gli altri script in `strumenti/` rigenerano i blocchi derivati da materiale esterno: `estrai_pos.py` (testo del POS dal modello Word → `POS_TESTO`), `immagini.py` (logo e firme → `IMMAGINI`), `presenze_iniziali.py` (libro presenze Excel 2026 → `PRESENZE_INIZIALI`).

## 6. Rischi che vedo

1. **Svuotamento dell'archivio da parte di Safari**: su iOS Safari può cancellare i dati dei siti non usati da tempo. `persist()` riduce il rischio ma non lo azzera; per questo il backup è manuale, visibile e incoraggiato. Sul Mac il rischio è basso.
2. **Origine `file://`**: in Chrome tutti i file locali condividono la stessa origine; due copie dell'applicazione sulla stessa macchina vedono lo stesso archivio. È documentato nel LEGGIMI. In Safari l'origine è per file.
3. **Anteprima PDF su iPad**: l'`iframe` mostra una sola pagina; l'apertura a schermo intero risolve, ma è un passaggio in più.
4. **Peso del file HTML**: le immagini del modello POS e il logo aggiungono circa 1,2 MB; il file resta sotto i 3 MB e si apre in un secondo.
5. **Impaginazione JS**: misurare il DOM è preciso ma dipende dai font di sistema; i documenti usano font di sistema dichiarati con riserva, e l'anteprima mostra esattamente ciò che si stampa.
6. **Lettura del PSC**: senza librerie, l'estrazione del testo dai PDF copre i casi comuni (Flate, ToUnicode). Per le scansioni senza testo si chiedono i dati: è previsto e detto.
7. **Dimensione del codice**: fra 12 e 18 mila righe. La mappa delle sezioni e i nomi in italiano sono la difesa; le modifiche vanno fatte per sezione.
