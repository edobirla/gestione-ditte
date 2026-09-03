# Gestionale Pavimass — Leggimi

Un solo file, **`Gestionale Pavimass.html`**. Dentro c'è tutto: anagrafiche, scadenze, cantieri, presenze, documenti, POS, preventivi, budget.

## Come si apre

- **Mac**: doppio clic sul file. Si apre in Safari o Chrome. Nessuna installazione, nessuna rete.
- **iPhone / iPad**: copia il file nell'app **File** (iCloud Drive o "Sul mio iPhone") e toccalo: si apre in Safari. Per averlo sempre a portata di mano, da Safari usa Condividi → Aggiungi alla schermata Home.
- Non aprirlo in una finestra privata: la navigazione privata non conserva i dati.

I dati vivono nell'archivio del browser (IndexedDB) del dispositivo su cui lo apri. **Ogni dispositivo ha il suo archivio**: per passare i dati da un dispositivo all'altro si usa il backup.

In Chrome tutti i file aperti da disco condividono lo stesso archivio: se tieni due copie del file sullo stesso Mac, vedranno gli stessi dati. In Safari l'archivio è legato al singolo file.

## Il backup (fallo)

L'applicazione salva da sola ogni modifica. Il backup serve per due cose: avere una copia fuori dal browser e portare i dati su un altro dispositivo.

1. **Impostazioni → Backup → Backup completo.** Esce un file `Backup Pavimass gg-mm-aa.zip` con tutti i dati e tutti i documenti.
2. Conservalo fuori dal computer (iCloud Drive, una chiavetta, un disco esterno).
3. La spia in alto a destra dice quando hai fatto l'ultimo backup e quante modifiche ci sono state dopo. Diventa rossa dopo tre giorni.

Lo ZIP è un archivio normale: se un giorno l'applicazione non si aprisse, i documenti sono dentro `documenti/` e l'elenco con i nomi veri è in `indice documenti.txt`. I dati sono in `dati.json`, descritto in `SCHEMA DATI.md`.

Il backup **solo dati** (pochi KB) contiene tutto tranne i file dei documenti: utile per passare rapidamente anagrafiche e presenze.

## Ripristinare un backup

**Impostazioni → Backup → Ripristina da backup**, scegli lo ZIP. Sostituisce tutto quello che c'è; prima viene salvata un'istantanea dell'archivio attuale, recuperabile dalla stessa pagina. Un backup fatto con una versione precedente dell'applicazione viene adeguato da solo.

## Condividere l'archivio con un collaboratore

1. Fai un backup completo e passaglielo. Pesa decine di MB: non passa via mail. Usa AirDrop, iCloud Drive, WhatsApp o una chiavetta.
2. Il collaboratore apre lo stesso `Gestionale Pavimass.html` sul suo dispositivo e fa **Ripristina da backup**.
3. Quando ha finito, fa a sua volta un backup e te lo rimanda.
4. Tu usi **Impostazioni → Backup → Fondi un backup**: vedi ogni elemento nuovo o modificato e scegli cosa accettare. Niente viene sovrascritto senza il tuo sì.

## Se l'archivio diventa pesante

- **Documenti → Peso** mostra quanto occupa l'archivio, la ripartizione e i dieci file più pesanti.
- Le foto e le scansioni in ingresso vengono compresse da sole sotto i 300 KB (regolabile in Impostazioni → Preferenze). Per un singolo file puoi tenere l'originale.
- I PDF non si possono ricomprimere: sopra i 2 MB l'applicazione avvisa. Rifai la scansione a 150–200 dpi in bianco e nero, oppure fotografa il documento, e usa **Sostituisci**.
- Lo stesso file caricato due volte occupa spazio una volta sola.
- I file eliminati restano nel cestino 30 giorni, poi lo spazio si libera.
- Se il browser dice che lo spazio è finito, fai un backup, alleggerisci i file più pesanti, e ricarica.

## Caricare i documenti esistenti

**Documenti → Caricamento cartelle**: trascina le cartelle degli operai (con le sottocartelle) o scegli una cartella. L'applicazione propone per ogni file la persona, il tipo di documento e la data letta dal nome (`26.07.01` = 1 luglio 2026); le righe incerte stanno in cima. Controlla, correggi, applica. Rilanciare la procedura non crea doppioni.

Nell'uso quotidiano basta trascinare un file sulla finestra, o sulla scheda della persona o del cantiere.

## Stampare

Ogni documento (scadenzario, dichiarazioni, preventivi, POS, libro presenze, checklist) si vede prima in anteprima, con carta intestata e numerazione su ogni pagina, poi si stampa con **Stampa / Salva PDF**. Nella finestra di stampa scegli "Salva come PDF". Su iPad e iPhone: Condividi → Stampa, oppure Condividi → Salva su File.

## File prodotti

- Libro presenze per il commercialista: **Presenze → Uscite → Excel** (un foglio per mese più la legenda dei codici).
- Pacchetto per la committenza: dal cantiere, **Pacchetto committenza** → revisione → ZIP con cartelle numerate e indice.
- Testi per gli altri strumenti (scadenzario, schede cantiere, indice cantieri, riepilogo presenze, checklist, schema dati): **Impostazioni → Esportazioni**.

Su iPhone e iPad i file si mandano direttamente per mail o WhatsApp dal foglio di condivisione; dove non è disponibile, il file finisce in File → Download.

## Lettura assistita del foglio ore (facoltativa, spenta)

È l'unica funzione che usa la rete e non esiste finché non inserisci una chiave in **Impostazioni → Lettura assistita**. Con la chiave, nella trascrizione del foglio ore compare il pulsante **Leggi con AI**: invia la foto del foglio al servizio scelto e riempie la griglia con le proposte, tutte segnate come incerte, da controllare sulla foto prima di applicare. La chiave resta nel browser del dispositivo e non entra mai nel backup. Senza chiave nessun dato esce dal dispositivo.

## Tasti utili

- `⌘K` (o `Ctrl K`): ricerca globale — persone, cantieri, clienti, documenti, buste paga, preventivi, movimenti e azioni.
- `⌘Z` / `⇧⌘Z`: annulla e ripristina l'ultima modifica.
- Nelle presenze: frecce per muoversi, digita per inserire, Invio conferma e scende, Tab conferma e va a destra, ⇧+frecce seleziona un intervallo, Canc svuota.
- Da 1 a 9: vai alla sezione (con nessun campo attivo).

## Per chi dovrà modificare il codice

Il file HTML contiene, in cima, una mappa delle sezioni; ogni sezione è marcata con `SEZIONE` e un nome. Le regole di dominio sono funzioni pure nella sezione REGOLE, verificabili da Impostazioni → Sistema → Verifica regole. I dati reali di partenza stanno in `datiIniziali()`. Il testo del POS (`POS_TESTO`) e le immagini (`IMMAGINI`) sono blocchi generati dagli script in `strumenti/`, che si rilanciano se il modello Word o il logo cambiano. `ARCHITETTURA.md` spiega le scelte.
