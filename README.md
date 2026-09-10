# Gestionale Pavimass

Gestionale interno di **Pavimass S.R.L.** (imprese edili: pavimenti, rivestimenti, massetti,
impermeabilizzazioni). Anagrafiche, scadenze documentali, cantieri, presenze e libro presenze,
POS, preventivi, budget, mezzi, fornitori, bonifici, buste paga.

Non è un prodotto: è lo strumento di lavoro di un'azienda sola, con dentro i suoi dati e le sue
regole.

## Com'è fatto

Un solo file: **`Gestionale Pavimass.html`**. Si apre con un doppio clic e funziona.

- nessuna installazione, nessun server, **nessuna chiamata di rete**;
- nessuna libreria esterna: impaginazione di stampa A4, lettura dei PDF, lettura e scrittura degli
  ZIP e degli XLSX sono scritte a mano dentro il file;
- i dati stanno nell'archivio del browser (IndexedDB) del dispositivo, e si spostano da un
  dispositivo all'altro con il backup ZIP.

Per l'uso quotidiano: **[LEGGIMI.md](LEGGIMI.md)**.
Per capire com'è costruito: **[ARCHITETTURA.md](ARCHITETTURA.md)** e
**[SCHEMA DATI.md](SCHEMA%20DATI.md)**.

## I due rami del repository

- **`sorgenti`** (questo): il codice, gli strumenti, la documentazione. È il ramo su cui si lavora.
- **`main`**: solo `index.html`, l'applicazione pronta senza i dati di nessuna ditta. È quello che
  GitHub Pages pubblica e da cui l'applicazione si installa sul telefono e sul computer.

Per pubblicare una versione nuova:

```bash
python3 strumenti/pubblica.py
```

Costruisce l'applicazione senza dati, controlla che dentro non sia finito nessun codice fiscale o
IBAN, e aggiorna `main`. **Non cambiare ramo a mano** per farlo: `git switch main` svuoterebbe la
cartella di lavoro, perché su `main` non esiste nient'altro che `index.html`.

## I dati non stanno nel programma

L'applicazione non contiene i dati di nessuna ditta. Una ditta si configura da dentro
(Impostazioni → Azienda) oppure si ripristina un backup.

Chi lo usa per la propria azienda può tenere i dati di partenza in una cartella `azienda/`
accanto a `sorgente/` (non versionata): se c'è, viene inclusa nella costruzione e la prima
apertura parte già compilata.

```bash
python3 strumenti/costruisci.py            # Gestionale Pavimass.html   — include azienda/ se c'è
python3 strumenti/costruisci.py --vuoto    # index.html — mai nessun dato dentro, con manifesto e icone
```

Il file da dare a chiunque altro è quello costruito con `--vuoto`: è anche quello che si pubblica.

## Come si lavora al codice

Il file unico non si modifica a mano: si modificano i pezzi in `sorgente/` e si ricostruisce con il
comando qui sopra.

I pezzi sono numerati e vengono uniti in quest'ordine (`sorgente/00-mappa.txt` è la mappa):
stile, guscio HTML, utilità, regole di dominio, stato e archivio, interfaccia, poi una sezione per
ogni parte dell'applicazione, infine i dati iniziali e l'avvio.

Per provare le modifiche serve un server locale (il browser non dà accesso a IndexedDB ai file
aperti da disco in tutti i casi):

```bash
python3 -m http.server 8765
```

e poi `http://localhost:8765/Gestionale%20Pavimass.html`.

Nella console del browser, `autoverifica()` esegue 39 controlli sulle regole di calcolo
(arrotondamenti aziendali, festività, validità dei documenti, idoneità, presenze). **Devono essere
tutti verdi prima di considerare finita una modifica.**

## Regole del progetto

- **Mai inventare un dato.** Quello che manca si scrive `[DA COMPILARE]` in rosso, sui documenti
  come a schermo.
- **Deve essere chiaro a chi non l'ha mai usato**, sia a vedersi sia a usarsi.
- Le stampe seguono i modelli veri dell'azienda, non versioni inventate.
- Ogni modifica al formato dei dati passa da una migrazione (`migrazioni` in `sorgente/20-stato.js`).

## Cosa non c'è in questo repository

Niente che riguardi una ditta in particolare:

- `azienda/` — i dati di partenza di una ditta (anagrafica, persone, cantieri, logo, firme) e gli
  strumenti che li hanno ricavati dai file dell'azienda;
- `pavimass/` — un archivio documentale vero;
- `template/` — i documenti di riferimento da cui sono ricavate le stampe;
- i file `.html` costruiti, che sono un prodotto della costruzione (e possono contenere i dati di
  una ditta).

Il nome del database nel browser (`GestionalePavimass`) non va cambiato: è la chiave con cui il
browser conserva l'archivio, e cambiandolo i dati già salvati diventerebbero irraggiungibili.
