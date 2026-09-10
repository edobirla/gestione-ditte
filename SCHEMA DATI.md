# Schema dati — Gestionale Pavimass
*Versione schema: 3 · generato il 03/09/2026*

Questo file è generato dalla funzione `documentazioneSchema()` (sezione BACKUP del codice) a partire dai dati iniziali. La stessa documentazione, aggiornata ai dati vivi, si ottiene da **Impostazioni → Esportazioni → Schema dati**.

Il backup è uno ZIP con:
- `manifesto.json`: versione dello schema, data, numero di documenti.
- `dati.json`: l'intero stato applicativo (questo documento ne descrive la forma).
- `documenti/<impronta>.<estensione>`: i file veri. L'impronta è lo SHA-256 del contenuto ed è la chiave in `dati.json → file[].hash`.
- `indice documenti.txt`: elenco impronta → nome originale.

Convenzioni: date `AAAA-MM-GG`; importi in euro (numeri, **sempre imponibile**); le relazioni sono per `id`.
Un backup con versione precedente viene migrato all'apertura (`migrazioni` nel codice, sezione STATO): i campi mancanti vengono integrati con i valori predefiniti.

## Collezioni

| Chiave | Contenuto | Esempio (primo elemento) |
|---|---|---|
| `azienda` | anagrafica Pavimass, figure di sicurezza, immagini | vedi sotto |
| `persone[]` | operai, soci, amministrativi | vedi sotto |
| `tipiDocumento[]` | catalogo tipi con validità e obbligatorietà | vedi sotto |
| `documenti[]` | documenti di persona/azienda/cantiere: date, file allegati | vedi sotto |
| `file[]` | metadati dei blob (hash, nome, peso, cestinato) | vedi sotto |
| `clienti[]`, `professionisti[]` | anagrafiche | |
| `lavorazioni[]` | le sette lavorazioni | |
| `cantieri[]` | cantieri con figure, squadra, PSC, denuncia, invii, diario | |
| `pos[]` | POS generati (dati congelati per la ristampa identica) | |
| `modelli` | dichiarazioni (testo con segnaposto), testo POS personalizzato | |
| `presenze` | oggetto `{"AAAA-MM": {persone: {personaId: {giorni:{"1":{ore|codice,cantiere,committente}}, aggiustamenti, importoForzato, importoManuale, foglioOreId, note}}}}` | |
| `bustePaga[]`, `regoleBuste[]` | buste per persona/anno/mese; regole apprese nome file → persona | |
| `listino[]`, `preventivi[]` | listino e preventivi con righe | |
| `movimenti[]` | entrate/uscite/note di credito con quote per cantiere | |
| `generati[]` | storico dei documenti generati (HTML congelato) | |
| `impostazioni` | preferenze, soglie, backup, chiave API (solo locale) | |
| `cestino[]` | elementi eliminati recuperabili | |

### azienda
```json
{
  "ragioneSociale": "PAVIMASS S.R.L.",
  "piva": "02188850511",
  "cf": "02188850511",
  "formaGiuridica": "Società a Responsabilità Limitata",
  "dataCostituzione": "2014-05-29",
  "capitaleSociale": "€ 10.000,00 i.v.",
  "indirizzo": {
    "via": "Via G. Natta, 221",
    "cap": "52010",
    "comune": "Subbiano",
    "provincia": "AR",
    "frazione": "Castelnuovo"
  },
  "pec": "pavimasssrl@pec.it",
  "email": "info@pavimass.it",
  "sito": "www.pavimass.it",
  "telefono": "0575 48549",
  "cellulare": "334 8661519",
  "fax": "0575 042321",
  "rea": "AR-168277",
  "codiceSdi": "WP7SE2Q",
  "ateco": "43.33.00",
  "inail": "19548392",
  "inps": "0504900998",
  "cassaEdile": "Falea 08700",
  "patenteCrediti": {
    "codice": "PAC-BI-027-DW",
    "dataRilascio": "2024-10-24"
  },
  "attivita": "Pavimentazioni, rivestimenti, massetti, impermeabilizzazioni",
  "legaleRappresentanteId": "p_ovidiu",
  "rsppId": "p_ovidiu",
  "rlsId": "p_edvalt",
  "rlsEletto": "2024-10-07",
  "medicoCompetente": {
    "nome": "Dott. Mario Martinelli",
    "telefono": "3474502772",
    "email": "martinellimario55@gmail.com",
    "professionistaId": "pr_martinelli"
  },
  "consulenteSicurezza": {
    "nome": "Studio Tecnico Boncompagni Ghezzi",
    "indirizzo": "Via Calamandrei 185, 52100 Arezzo (AR)",
    "professionistaId": "pr_boncompagni"
  },
  "cartaIntestata": {
    "righe": [
      "Sede Legale e Amministrativa:",
      "Via G. Natta, 221 - Subbiano 52010 (AR)  P.I./C.F. 02188850511",
      "Tel. 0575 48549 – Fax: 0575 042321 - Cell.: 334 8661519",
      "info@pavimass.it - www.pavimass.it - Nr. R.E.A. 168277 – Codice SDI: WP7SE2Q",
      "Registro Imprese di Arezzo n. 02188850511 - Capitale Sociale € 10.000,00 i.v."
    ]
  }
}
```
Le immagini (logo, firme, timbro) sono incorporate nel codice (`IMMAGINI`) e non fanno parte dei dati; `azienda.immagini` contiene solo gli eventuali `fileId` di sostituzione.

### persone[0]
```json
{
  "id": "p_ovidiu",
  "cognome": "Birla",
  "nome": "Costel Ovidiu",
  "tipo": "legale_rappresentante",
  "mansione": "Legale Rappresentante",
  "cf": "BRLCTL76L04Z129C",
  "dataNascita": "1976-07-04",
  "luogoNascita": "Romania",
  "nazionalita": "Romania",
  "residenza": "Loc. Marcena 32/B, 52100 Arezzo (AR)",
  "telefono": null,
  "email": null,
  "dataAssunzione": null,
  "dataCessazione": null,
  "attivo": true,
  "qualifiche": [
    "rspp"
  ],
  "retribuzione": {
    "tipo": "fissa",
    "tariffaOraria": null,
    "importoFisso": 5000
  },
  "schemaOrario": null,
  "inLibroPresenze": true,
  "sezionePresenze": "soci",
  "soloTrasferte": true,
  "inCantiere": true,
  "fotoId": null,
  "firmaId": null,
  "firmaIncorporata": "firmaLegale",
  "note": "Socio e Legale Rappresentante, RSPP e datore di lavoro. Nel libro presenze si compila solo la riga trasferte (località toscane, mai Subbiano)."
}
```
`tipo` vale `dipendente`, `socio`, `legale_rappresentante`, `amministrativo`. `qualifiche[]` fra `preposto`, `rls`, `rspp`, `antincendio`, `primo_soccorso`, `ple`, `ponteggi`. `retribuzione.tipo` vale `oraria` (tariffaOraria) o `fissa` (importoFisso).

### tipiDocumento[0]
```json
{
  "id": "carta_identita",
  "nome": "Carta d'Identità",
  "ambito": "persona",
  "validitaMesi": null,
  "obbligatorio": "si",
  "bloccaIdoneita": true,
  "categoria": "identita",
  "note": "Validità dalla data sul documento. In alternativa il passaporto.",
  "sinonimi": [
    "documento identità"
  ]
}
```
`obbligatorio` vale: `si`, `no`, `extraUE`, `preposto`, `rls`, `rspp`, `antincendio`, `primoSoccorso`, `ple`, `ponteggi`, `ruolo`. `bloccaIdoneita` distingue i documenti che rendono un operaio non idoneo al cantiere da quelli che sono solo voci di checklist.

### documenti[0]
```json
{
  "id": "d_durc",
  "soggettoTipo": "azienda",
  "soggettoId": "azienda",
  "tipoId": "durc",
  "titolo": "",
  "dataEmissione": "2026-05-11",
  "dataScadenza": "2026-09-08",
  "senzaScadenza": false,
  "file": [],
  "verificato": true,
  "note": "",
  "creato": "2026-07-02T00:00:00.000Z"
}
```
`soggettoTipo` vale `persona`, `azienda`, `cantiere`, `cliente`. Se `dataScadenza` manca e il tipo ha `validitaMesi`, la scadenza è stimata da `dataEmissione`. `file[]` contiene gli `id` dei record in `file[]`.

### file[0]
```json
{
  "id": "f_…",
  "hash": "<sha-256 del contenuto>",
  "nome": "26.07.01 ibra.pdf",
  "mime": "application/pdf",
  "dimensione": 2035879,
  "dimensioneOriginale": 2035879,
  "compresso": false,
  "larghezza": null,
  "altezza": null,
  "creato": "2026-09-03T11:11:30.060Z",
  "cestinato": null
}
```
Il contenuto binario sta nell'IndexedDB (archivio `file`, chiave = `hash`) e nel backup in `documenti/<hash>.<estensione>`. Due file identici condividono lo stesso hash e occupano spazio una volta sola. `cestinato` è la data ISO di eliminazione: dopo 30 giorni il blob viene rimosso.

### clienti[0]
```json
{
  "id": "cl_lidl",
  "ragioneSociale": "LIDL ITALIA s.r.l.",
  "ruoli": [
    "committente"
  ],
  "piva": "02275030233",
  "cf": null,
  "indirizzo": {
    "via": "Via Augusto Ruffo 36",
    "cap": "37040",
    "comune": "Arcole",
    "provincia": "VR"
  },
  "telefono": "0587 259390",
  "email": null,
  "pec": null,
  "sito": null,
  "referenti": [],
  "condizioniPagamento": null,
  "valutazione": null,
  "stato": "attivo",
  "interazioni": [],
  "documenti": [],
  "note": ""
}
```
`ruoli[]` fra `committente`, `affidataria`, `fornitore`, `subappaltatore`. `professionisti[]` ha la stessa forma con `ruolo` (progettista, direttore_lavori, cse, csp, medico, consulente…), `titolo`, `studio`.

### cantieri[0]
```json
{
  "id": "ca_lidl",
  "nome": "Lidl Arezzo",
  "anno": 2026,
  "stato": "chiuso",
  "descrizione": "Posa pavimenti e massetti presso punto vendita Lidl. Realizzazione di edificio ad uso commerciale.",
  "indirizzo": {
    "via": "Via del Gavardello angolo Viale Amendola",
    "comune": "Arezzo",
    "provincia": "AR",
    "cap": "52100"
  },
  "committenteId": "cl_lidl",
  "affidatariaId": "cl_lgc",
  "progettistaId": "pr_romeo",
  "direttoreLavoriId": "pr_nieddu",
  "cseId": "pr_manetti",
  "cspId": "pr_manetti",
  "dataInizio": "2026-06-25",
  "dataFine": "2026-08-15",
  "periodoTesto": null,
  "lavorazioni": [
    2
  ],
  "uominiGiorno": 4,
  "orari": "lun-ven 08:00–12:00 / 13:00–17:00",
  "prepostoId": "p_edvalt",
  "operai": [
    "p_edvalt"
  ],
  "importoContratto": 30000,
  "psc": {
    "data": null,
    "redattore": null,
    "prescrizioni": null,
    "fileId": null,
    "periodoTesto": null
  },
  "denuncia": {
    "data": "2026-08-10",
    "dal": "2026-08-10",
    "al": "2026-09-15",
    "importoComplessivo": 4500000,
    "importoPavimass": 30000,
    "fileId": null
  },
  "documentiProdotti": [
    {
      "id": "dp_lidl_pos4",
      "tipo": "POS",
      "titolo": "POS revisione 4",
      "revisione": 4,
      "dataEmissione": "2026-06-17",
      "data": "2026-07-06",
      "fileId": null,
      "note": "POS_Lidl-Arezzo_Pavimass_2026-06_v4.docx — revisione del 06/07/2026: aggiunti gli orari di lavoro."
    }
  ],
  "checklistExtra": [],
  "invii": [],
  "note": "",
  "diario": [
    {
      "data": "2026-06-17",
      "testo": "Emesso POS revisione iniziale."
    }
  ],
  "creato": "2026-07-02T00:00:00.000Z"
}
```
`stato` vale `preventivo`, `attivo`, `sospeso`, `chiuso`. `lavorazioni[]` contiene i numeri delle lavorazioni Pavimass (1–7). `invii[]` registra ogni pacchetto committenza generato (data, destinatario, contenuto, mancanti, forzati, peso, nomeFile).

### movimenti[0]
```json
{
  "id": "m_…",
  "tipo": "entrata",
  "data": "2026-07-31",
  "numero": "12/2026",
  "controparteId": "cl_lgc",
  "descrizione": "SAL 1 Lidl Arezzo",
  "imponibile": 15000,
  "iva": 22,
  "categoria": null,
  "quote": [
    { "cantiereId": "ca_lidl", "importo": 15000 }
  ],
  "daVerificare": false,
  "pagato": false,
  "dataPagamento": null,
  "fileId": null,
  "note": ""
}
```
`tipo` vale `entrata`, `uscita`, `nota_credito`. `quote[]` ripartisce l'imponibile fra cantieri; la somma deve coincidere con `imponibile`. `categoria` (solo uscite): materiali, subappalto, trasporti, noleggi, spese_generali, manodopera, altro. `daVerificare` segna una fattura la cui attribuzione al cantiere non è certa.

### preventivi[0]
```json
{
  "id": "pv_…",
  "numero": 1,
  "anno": 2026,
  "data": "2026-09-03",
  "clienteId": "cl_lgc",
  "cantiereId": "ca_lidl",
  "oggetto": "Posa pavimenti e massetti punto vendita Lidl",
  "stato": "bozza",
  "validitaGiorni": 30,
  "righe": [
    {
      "id": "r_…",
      "codice": "Z.A.02.007",
      "descrizione": "POSA DI PAVIMENTO IN GRES PORCELLANATO",
      "descrizioneEstesa": "Posa in opera secondo le geometrie di progetto",
      "um": "mq",
      "quantita": 10105.91,
      "prezzo": 22.5,
      "tipoPrezzo": "posa",
      "esclusa": false,
      "note": ""
    }
  ],
  "scontoPct": 5,
  "condizioni": "Pagamento 60 gg d.f.f.m.",
  "note": ""
}
```
`stato` vale `bozza`, `inviato`, `accettato`, `rifiutato`, `scaduto`. Una riga con `prezzo` nullo è "da quotare" e non entra nei totali; `esclusa` segna le voci di sola fornitura non offerte. `listino[]` ha `codice`, `descrizione`, `um`, `categoria`, `prezzoPosa`, `prezzoFornitura` (vuoti finché non compilati).

### presenze (un mese)
```json
{
  "2026-01": {
    "persone": {
      "p_ovidiu": {
        "giorni": {
          "2": {
            "trasferta": "arezzo"
          },
          "5": {
            "trasferta": "perugia"
          }
        },
        "aggiustamenti": [],
        "importoForzato": true,
        "importoManuale": 5000,
        "note": "Importato dal libro presenze Excel 2026"
      }
    }
  }
}
```
Per un operaio la cella giorno è `{ore, cantiere, committente}` oppure `{codice}`. Codici di assenza: M malattia, I infortunio, PE permesso (max 88 ore/anno), FS festività (solo in giorno feriale), FE ferie (max 20 giorni/anno), AS assenza, CI cassa integrazione. Mai ore di sabato e domenica.
Importo mensile = arrotondaAziendale(ore in griglia × tariffaOraria + Σ aggiustamenti + importoFisso); arrotondamento a multipli di 10 con resto 0–3 per difetto, 4–9 per eccesso. `importoForzato` + `importoManuale` sostituiscono il calcolo. `foglioOreId` è il `fileId` della foto del foglio ore scritto a mano. Le ore nel fine settimana non sono in griglia (celle bloccate): eventuale lavoro extra si registra come `aggiustamenti` in euro, non in ore.

### bustePaga[0]
```json
{
  "id": "b_…",
  "personaId": "p_ibra",
  "anno": 2026,
  "mese": 7,
  "fileId": "f_…",
  "netto": null,
  "note": ""
}
```
`regoleBuste[]`: `{schema, personaId}` dove `schema` è la parte del nome file che identifica la persona, appresa alla prima conferma.

### impostazioni
```json
{
  "nomeUtente": "Edoardo Birla",
  "dispositivo": "",
  "tema": "sistema",
  "ultimoBackup": null,
  "modificheDopoBackup": 0,
  "ultimaModifica": null,
  "soglie": {
    "scadenza": 60,
    "pianificare": 90,
    "durcAvviso": 30
  },
  "densita": "normale",
  "festivitaLocali": [],
  "arrotondamento": "aziendale",
  "modelloApi": "",
  "compressioneImmagini": true,
  "obiettivoKb": 300,
  "avvisaPdfMb": 2,
  "creato": "2026-09-03T11:19:35.529Z"
}
```
La chiave API opzionale (`chiaveApi`) è salvata solo qui, nell'IndexedDB locale, e **non entra mai nel backup**. Senza chiave la funzione di lettura assistita del foglio ore non esiste nell'interfaccia.

## Migrazioni

| Versione | Cosa è cambiato |
|---|---|
| 1 | Prima struttura. |
| 2 | `tipiDocumento[].bloccaIdoneita`, `documenti[].ente`, `cantieri[].invii`. |
| 3 | `modelli.posMacchine` (mappa lavorazione → schede macchine), `regoleBuste[]`, `impostazioni.avvisaPdfMb`. |

Aprire un backup di versione inferiore applica in sequenza le migrazioni mancanti e poi `normalizzaStato`, che integra ogni campo assente con il valore predefinito. Un backup di versione superiore viene rifiutato con un messaggio chiaro.
