// ---------------------------------------------------------------------
// DATI INIZIALI dell'applicazione: solo cataloghi generali (tipi di documento, modelli di
// dichiarazione, lavorazioni). I dati di una ditta stanno fuori, in azienda/ (vedi README).
// Sono facili da aggiornare: sono tutti qui. Dove un dato manca resta null: l'interfaccia mostra [DA COMPILARE].
// datiIniziali(true) restituisce solo la struttura (usata da normalizzaStato per integrare i campi nuovi).
// ---------------------------------------------------------------------
function datiIniziali(soloStruttura){
  const s={
    versioneSchema:VERSIONE_SCHEMA,
    azienda:{
      ragioneSociale:'',piva:null,cf:null,formaGiuridica:null,dataCostituzione:null,capitaleSociale:null,
      indirizzo:{via:null,cap:null,comune:null,provincia:null,frazione:null},
      pec:null,email:null,sito:null,telefono:null,cellulare:null,fax:null,
      rea:null,codiceSdi:null,ateco:null,inail:null,inps:null,cassaEdile:null,
      patenteCrediti:{codice:null,dataRilascio:null},
      attivita:null,
      banca:null,iban:null,condizioniPagamento:null,notePreventivo:null,
      legaleRappresentanteId:null,rsppId:null,rlsId:null,rlsEletto:null,
      medicoCompetente:{nome:null,telefono:null,email:null,professionistaId:null},
      consulenteSicurezza:{nome:null,indirizzo:null,professionistaId:null},
      immagini:{},
      logoId:null,firmaTimbroId:null,timbroId:null,firmaId:null,
      cartaIntestata:{righe:[]},
    },
    persone:[],tipiDocumento:[],documenti:[],file:[],clienti:[],professionisti:[],lavorazioni:[],cantieri:[],pos:[],
    modelli:{dichiarazioni:[],posTesto:null,posMacchine:null,posDpiDotazione:null},
    presenze:{},bustePaga:[],regoleBuste:[],listino:[],preventivi:[],movimenti:[],generati:[],cestino:[],
    mezzi:[],fornitori:[],bonifici:[],
    impostazioni:{nomeUtente:'',dispositivo:'',tema:'sistema',ultimoBackup:null,modificheDopoBackup:0,ultimaModifica:null,soglie:Object.assign({},SOGLIE_PREDEFINITE),densita:'normale',festivitaLocali:[],arrotondamento:'aziendale',compressioneImmagini:true,obiettivoKb:300,avvisaPdfMb:2,creato:new Date().toISOString()},
  };
  s.lavorazioni=LAVORAZIONI_INIZIALI.map(l=>Object.assign({},l));
  s.tipiDocumento=TIPI_DOCUMENTO_INIZIALI.map(t=>Object.assign({},t));
  s.modelli.dichiarazioni=MODELLI_DICHIARAZIONI_INIZIALI.map(d=>Object.assign({},d));
  if(soloStruttura){
    s.azienda=Object.fromEntries(Object.entries(s.azienda).map(([k,v])=>[k,v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).map(kk=>[kk,null])):null]));
    s.azienda.indirizzo={via:null,cap:null,comune:null,provincia:null,frazione:null};
    s.azienda.cartaIntestata={righe:[]};
    s.tipiDocumento=[];s.modelli.dichiarazioni=[];s.lavorazioni=[];
    return s;
  }
  // I dati veri dell'azienda stanno fuori dall'applicazione, in azienda/ (vedi README): se quel file
  // è stato incluso nella costruzione, la prima apertura parte già compilata; altrimenti
  // l'applicazione parte vuota e i dati si inseriscono a mano o si ripristinano da un backup.
  if(typeof datiAzienda==='function') datiAzienda(s);
  return s;
}

const LAVORAZIONI_INIZIALI=[
  {id:1,nome:'Massetti (alleggeriti/tradizionali in cls cellulare, sabbia e cemento, premiscelati)',breve:'Massetti',copertina:'MASSETTI',um:'mq',descrizioneOpera:'Posa in opera di massetti alleggeriti in cls cellulare, massetti tradizionali in sabbia e cemento, premiscelati e autolivellanti.'},
  {id:2,nome:'Posa pavimenti in gres/ceramica/marmo/pietra/travertino/cotto',breve:'Pavimenti in gres/ceramica/pietra',copertina:'PAVIMENTI',um:'mq',descrizioneOpera:'Posa in opera di pavimenti interni ed esterni in gres porcellanato, marmo, pietra, travertino, cotto etc'},
  {id:3,nome:'Posa pavimenti in legno',breve:'Pavimenti in legno',copertina:'PAVIMENTI IN LEGNO',um:'mq',descrizioneOpera:'Posa in opera di pavimenti in legno con collante o flottante prefinito'},
  {id:4,nome:'Pavimento galleggiante',breve:'Pavimento galleggiante',copertina:'PAVIMENTO GALLEGGIANTE',um:'mq',descrizioneOpera:'Posa dei quadrotti in cls di un pavimento galleggiante da posizionarsi su appositi supporti.'},
  {id:5,nome:'Posa rivestimenti (muri e scale)',breve:'Rivestimenti',copertina:'RIVESTIMENTI',um:'mq',descrizioneOpera:'Posa in opera di rivestimenti muri e scale'},
  {id:6,nome:'Battiscopa in gres/marmo/travertino/pietra/legno',breve:'Battiscopa',copertina:'BATTISCOPA',um:'ml',descrizioneOpera:'Posa in opera di battiscopa in gres, marmo, travertino, pietra e legno'},
  {id:7,nome:'Impermeabilizzazioni (guaine bituminose e liquide)',breve:'Impermeabilizzazioni',copertina:'IMPERMEABILIZZAZIONI',um:'mq',descrizioneOpera:'Posa in opera di impermeabilizzazioni con guaine bituminose e liquide'},
];
const QUALIFICHE={preposto:'Preposto',rls:'RLS',rspp:'RSPP',antincendio:'Addetto antincendio',primoSoccorso:'Addetto primo soccorso',ple:'Abilitazione PLE',ponteggi:'Montaggio ponteggi (PiMUS)',datoreLavoro:'Datore di lavoro',gru:'Abilitazione gru'};
const TIPI_PERSONA={socio:'Socio',dipendente:'Dipendente',amministrativo:'Amministrativo',legale_rappresentante:'Legale Rappresentante'};
const RUOLI_CLIENTE={committente:'Committente',affidataria:'Impresa affidataria',fornitore:'Fornitore',subappaltatore:'Subappaltatore'};
const RUOLI_PROFESSIONISTA={progettista:'Progettista',direttoreLavori:'Direttore dei lavori',cse:'Coordinatore per la sicurezza in esecuzione (CSE)',csp:'Coordinatore per la sicurezza in progettazione (CSP)',rspp:'RSPP',medicoCompetente:'Medico competente',consulenteSicurezza:'Consulente sicurezza'};
const STATI_CANTIERE={preventivo:'In preventivo',attivo:'Attivo',sospeso:'Sospeso',chiuso:'Chiuso',archiviato:'Archiviato'};
const STATI_CLIENTE={potenziale:'Potenziale',attivo:'Attivo',dormiente:'Dormiente',chiuso:'Chiuso'};
const CATEGORIE_MOVIMENTO={materiali:'Materiali',subappalto:'Subappalto',trasporti:'Trasporti',noleggi:'Noleggi',spese_generali:'Spese generali',manodopera:'Manodopera',altro:'Altro'};
// Durate che si scelgono su un singolo documento: la scadenza si calcola dalla data di emissione.
// Non si applica a tutto: molti documenti hanno la scadenza stampata sopra e lì si scrive a mano.
const DURATE_DOCUMENTO=[{v:12,t:'1 anno'},{v:24,t:'2 anni'},{v:36,t:'3 anni'},{v:60,t:'5 anni'},{v:120,t:'10 anni'},{v:6,t:'6 mesi'}];
const CATEGORIE_TIPO_DOC={identita:'Identità',malattia:'Malattia',contratto:'Contratto',sanitario:'Sanitario',formazione:'Formazione',nomina:'Nomina',impresa:'Impresa',sicurezza:'Sicurezza',amministrativo:'Amministrativo',cantiere:'Cantiere',mezzo:'Mezzo'};

// Catalogo tipi di documento. obbligatorio: vedi tipoApplicabile() nelle REGOLE.
// bloccaIdoneita: se mancante/scaduto impedisce l'ingresso in cantiere; gli altri obbligatori entrano solo nella checklist.
const TIPI_DOCUMENTO_INIZIALI=[
  {id:'cessazione',nome:'Cessazione del rapporto',ambito:'persona',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'contratto',note:'Lettera di licenziamento o di dimissioni, o comunicazione di fine rapporto.',sinonimi:['licenziamento','dimissioni','lettera di dimissioni','cessazione','fine rapporto','unilav cessazione']},
  // periodo: il documento copre un intervallo (dal/al) e non scade mai; annuale: ce n'è uno per anno
  {id:'certificato_malattia',nome:'Certificato medico di malattia',ambito:'persona',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'malattia',periodo:true,note:'Copre i giorni di assenza per malattia: si registra dal primo all\'ultimo giorno.',sinonimi:['certificato di malattia','certificato medico','malattia','prognosi','inps malattia']},
  {id:'cu',nome:'CU (Certificazione Unica)',ambito:'persona',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'amministrativo',annuale:true,note:'Una per ogni anno d\'imposta.',sinonimi:['cu','certificazione unica','cud']},
  {id:'carta_identita',nome:'Carta d\'Identità',ambito:'persona',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:true,categoria:'identita',note:'Validità dalla data sul documento. In alternativa il passaporto.',sinonimi:['documento identità','documento di identità','carta identità','ci','documento']},
  {id:'passaporto',nome:'Passaporto',ambito:'persona',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:true,categoria:'identita',note:'In alternativa alla carta d\'identità.',sinonimi:['passaporto']},
  {id:'permesso_soggiorno',nome:'Permesso di Soggiorno',ambito:'persona',validitaMesi:null,obbligatorio:'extraUE',bloccaIdoneita:true,categoria:'identita',note:'Solo per cittadini extra UE. Validità dalla data sul documento.',sinonimi:['permesso di soggiorno','permesso soggiorno','pds','ricevuta questura']},
  {id:'tessera_cf',nome:'Tessera Codice Fiscale',ambito:'persona',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'identita',sinonimi:['codice fiscale','tessera sanitaria']},
  {id:'unilav',nome:'UNILAV (comunicazione di assunzione)',ambito:'persona',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:true,categoria:'contratto',sinonimi:['unilav','comunicazione di assunzione','comunicazione obbligatoria','contratto di assunzione','contratto']},
  {id:'visita_medica',nome:'Visita Medica / Idoneità Sanitaria',ambito:'persona',validitaMesi:12,obbligatorio:'si',bloccaIdoneita:true,categoria:'sanitario',sinonimi:['visita medica','visitra medica','idoneità sanitaria','idoneita sanitaria','certificato medico competente','giudizio di idoneità','sorveglianza sanitaria']},
  {id:'rischio_alto_16',nome:'Corso Sicurezza Rischio Alto 16h',ambito:'persona',validitaMesi:60,obbligatorio:'si',bloccaIdoneita:true,categoria:'formazione',sinonimi:['rischio alto','formazione generale e specifica','formazione generale','formazione specifica','corso sicurezza','sicurezza','accordo stato regioni','16h','16 ore']},
  {id:'aggiornamento_rischio_alto',nome:'Aggiornamento Rischio Alto 6h',ambito:'persona',validitaMesi:60,obbligatorio:'no',bloccaIdoneita:false,categoria:'formazione',note:'Rinnova il corso rischio alto: vale come alternativa al corso 16h.',sinonimi:['aggiornamento rischio alto','aggiornamento sicurezza','6h','6 ore']},
  {id:'corso_preposto',nome:'Corso Preposto',ambito:'persona',validitaMesi:24,obbligatorio:'preposto',bloccaIdoneita:true,categoria:'formazione',sinonimi:['preposto','corso preposto']},
  {id:'corso_rls',nome:'Corso / Aggiornamento RLS',ambito:'persona',validitaMesi:12,obbligatorio:'rls',bloccaIdoneita:true,categoria:'formazione',sinonimi:['rls','aggiornamento rls','corso rls','elezione rls']},
  {id:'primo_soccorso',nome:'Primo Soccorso 16h',ambito:'persona',validitaMesi:36,obbligatorio:'si',bloccaIdoneita:false,categoria:'formazione',sinonimi:['primo soccorso','pronto soccorso','ps','p.s.']},
  {id:'antincendio_2',nome:'Antincendio Livello 2',ambito:'persona',validitaMesi:60,obbligatorio:'si',bloccaIdoneita:false,categoria:'formazione',sinonimi:['antincendio','prevenzione incendi','livello 2','rischio medio']},
  {id:'rspp_datore',nome:'RSPP Datore di Lavoro',ambito:'persona',validitaMesi:60,obbligatorio:'rspp',bloccaIdoneita:true,categoria:'formazione',sinonimi:['rspp','aggiornamento rspp','datore di lavoro']},
  {id:'ple',nome:'Abilitazione PLE',ambito:'persona',validitaMesi:60,obbligatorio:'ple',bloccaIdoneita:false,categoria:'formazione',note:'Se usa piattaforme elevabili.',sinonimi:['ple','piattaforme elevabili','piattaforma']},
  {id:'pimus',nome:'Addetto montaggio ponteggi (PiMUS)',ambito:'persona',validitaMesi:48,obbligatorio:'ponteggi',bloccaIdoneita:false,categoria:'formazione',note:'Se monta ponteggi.',sinonimi:['pimus','ponteggi','ponteggiatore','montaggio ponteggi']},
  {id:'consegna_dpi',nome:'Consegna DPI',ambito:'persona',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'sicurezza',sinonimi:['dpi','consegna dpi','verbale consegna dpi']},
  {id:'nomina_persona',nome:'Nomina Preposto / Antincendio / Primo Soccorso',ambito:'persona',validitaMesi:null,obbligatorio:'ruolo',bloccaIdoneita:false,categoria:'nomina',sinonimi:['nomina','nomina preposto','nomina antincendio','nomina primo soccorso','designazione']},
  {id:'busta_paga',nome:'Busta Paga',ambito:'persona',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'amministrativo',sinonimi:['busta paga','cedolino','lul']},
  {id:'altro_persona',nome:'Altro documento personale',ambito:'persona',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'amministrativo',sinonimi:[]},
  {id:'durc',nome:'DURC',ambito:'azienda',validitaMesi:null,validitaGiorni:120,obbligatorio:'si',bloccaIdoneita:false,categoria:'impresa',note:'Validità 120 giorni dall\'emissione.',sinonimi:['durc','regolarità contributiva','documento unico di regolarità contributiva']},
  {id:'visura',nome:'Visura Camerale',ambito:'azienda',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'impresa',note:'Nessuna scadenza, ma le committenze la vogliono recente (6 mesi).',recenteMesi:6,sinonimi:['visura','visura camerale','visura cciaa','camera di commercio']},
  {id:'cciaa',nome:'Certificato Iscrizione CCIAA',ambito:'azienda',validitaMesi:null,obbligatorio:'richiesta',bloccaIdoneita:false,categoria:'impresa',note:'Come la visura: a richiesta.',recenteMesi:6,sinonimi:['cciaa','certificato camera di commercio','iscrizione cciaa']},
  {id:'patente_crediti',nome:'Patente a Crediti',ambito:'azienda',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'impresa',note:'Nessuna scadenza: si verifica il saldo punti.',sinonimi:['patente a crediti','patente crediti','patente edilizia','soa']},
  {id:'dvr',nome:'DVR',ambito:'azienda',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'sicurezza',sinonimi:['dvr','valutazione dei rischi','documento di valutazione dei rischi']},
  {id:'nomina_rspp',nome:'Nomina RSPP',ambito:'azienda',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'nomina',sinonimi:['nomina rspp']},
  {id:'nomina_medico',nome:'Nomina Medico Competente',ambito:'azienda',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'nomina',sinonimi:['nomina medico','nomina medico competente','medico competente']},
  {id:'organico_ccnl',nome:'Organico Medio e CCNL',ambito:'azienda',validitaMesi:null,obbligatorio:'richiesta',bloccaIdoneita:false,categoria:'impresa',sinonimi:['organico medio','ccnl','dichiarazione organico']},
  {id:'verifica_funi',nome:'Verifica periodica funi e catene',ambito:'azienda',validitaMesi:null,obbligatorio:'attrezzatura',bloccaIdoneita:false,categoria:'sicurezza',note:'Se usate, secondo normativa.',sinonimi:['funi','catene','verifica funi']},
  {id:'polizza',nome:'Polizza assicurativa (RCT/RCO)',ambito:'azienda',validitaMesi:12,obbligatorio:'richiesta',bloccaIdoneita:false,categoria:'impresa',sinonimi:['polizza','assicurazione','rct','rco']},
  {id:'altro_azienda',nome:'Altro documento aziendale',ambito:'azienda',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'amministrativo',sinonimi:[]},
  {id:'psc',nome:'PSC',ambito:'cantiere',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'cantiere',sinonimi:['psc','piano di sicurezza e coordinamento']},
  {id:'pos',nome:'POS',ambito:'cantiere',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'cantiere',sinonimi:['pos','piano operativo di sicurezza']},
  {id:'denuncia_apertura',nome:'Denuncia apertura cantiere',ambito:'cantiere',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'cantiere',sinonimi:['apertura cantiere','denuncia','notifica preliminare']},
  {id:'dichiarazione',nome:'Dichiarazione / autocertificazione',ambito:'cantiere',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'cantiere',sinonimi:['dichiarazione','autocertificazione']},
  {id:'altro_cantiere',nome:'Altro documento di cantiere',ambito:'cantiere',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'cantiere',sinonimi:[]},
  {id:'mezzo_assicurazione',nome:'Assicurazione',ambito:'mezzo',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'mezzo',sinonimi:['assicurazione','rca','polizza mezzo']},
  {id:'mezzo_revisione',nome:'Revisione',ambito:'mezzo',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'mezzo',sinonimi:['revisione','revisione periodica']},
  {id:'mezzo_bollo',nome:'Bollo',ambito:'mezzo',validitaMesi:12,obbligatorio:'si',bloccaIdoneita:false,categoria:'mezzo',sinonimi:['bollo','tassa automobilistica']},
  {id:'mezzo_libretto',nome:'Libretto di circolazione',ambito:'mezzo',validitaMesi:null,obbligatorio:'si',bloccaIdoneita:false,categoria:'mezzo',sinonimi:['libretto','carta di circolazione']},
  {id:'altro_mezzo',nome:'Altro documento del mezzo',ambito:'mezzo',validitaMesi:null,obbligatorio:'no',bloccaIdoneita:false,categoria:'mezzo',sinonimi:[]},
];

// Modelli di dichiarazione. I segnaposto {{...}} si riempiono dai dati del cantiere selezionato.
// Segnaposto disponibili: azienda.ragioneSociale, azienda.sede, azienda.piva, azienda.cf, azienda.pec, azienda.telefono, azienda.inail, azienda.rea,
// legale.nome, legale.natoA, legale.natoIl, legale.residenza, legale.cf, cantiere.nome, cantiere.descrizione, cantiere.indirizzo, cantiere.comune, cantiere.cap,
// committente.nome, committente.indirizzo, affidataria.nome, affidataria.indirizzo, cse.nome, oggi, operai.elenco (elenco puntato), operai.tabella (tabella), luogoData
const MODELLI_DICHIARAZIONI_INIZIALI=[
  {id:'antimafia',nome:'Autocertificazione comunicazione antimafia (D.Lgs 159/2011)',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante',testo:
`# DICHIARAZIONE SOSTITUTIVA DI CERTIFICAZIONE
## (art. 46 D.P.R. 28 dicembre 2000, n. 445)
### Autocertificazione della comunicazione antimafia ai sensi dell'art. 89 del D.Lgs. 6 settembre 2011, n. 159

Il sottoscritto {{legale.nome}}, nato a {{legale.natoA}} il {{legale.natoIl}}, residente in {{legale.residenza}}, codice fiscale {{legale.cf}}, in qualità di Legale Rappresentante della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}},

consapevole delle sanzioni penali richiamate dall'art. 76 del D.P.R. 445/2000 in caso di dichiarazioni mendaci e della decadenza dei benefici eventualmente conseguenti al provvedimento emanato sulla base di dichiarazioni non veritiere, di cui all'art. 75 del richiamato D.P.R. 445/2000, ai sensi e per gli effetti dell'art. 46 del citato D.P.R. 445/2000, sotto la propria responsabilità, con riferimento ai lavori di {{cantiere.descrizione}} presso il cantiere {{cantiere.nome}}, {{cantiere.indirizzo}}, committente {{committente.nome}}, impresa affidataria {{affidataria.nome}},

**DICHIARA**

- che nei propri confronti e nei confronti dei soggetti indicati all'art. 85 del D.Lgs. 159/2011 non sussistono le cause di divieto, di decadenza o di sospensione di cui all'art. 67 del medesimo decreto;
- di essere a conoscenza che la presente dichiarazione è resa ai fini della comunicazione antimafia di cui all'art. 89 del D.Lgs. 159/2011;
- di impegnarsi a comunicare tempestivamente ogni variazione dei dati dichiarati.

{{luogoData}}`},
  {id:'requisiti_art16',nome:'Dichiarazione possesso requisiti tecnico-professionali (art. 16 e All. XVII D.Lgs 81/08)',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante',testo:
`# DICHIARAZIONE SOSTITUTIVA DELL'ATTO DI NOTORIETÀ
## (artt. 46 e 47 D.P.R. 28 dicembre 2000, n. 445)
### Possesso dei requisiti di idoneità tecnico-professionale — art. 26 e Allegato XVII del D.Lgs. 9 aprile 2008, n. 81

Il sottoscritto {{legale.nome}}, nato a {{legale.natoA}} il {{legale.natoIl}}, codice fiscale {{legale.cf}}, in qualità di Legale Rappresentante e Datore di Lavoro della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}}, codice ditta INAIL {{azienda.inail}},

con riferimento al cantiere {{cantiere.nome}}, {{cantiere.indirizzo}} — committente {{committente.nome}} — impresa affidataria {{affidataria.nome}},

consapevole delle responsabilità penali previste dall'art. 76 del D.P.R. 445/2000 in caso di dichiarazioni mendaci,

**DICHIARA**

- che l'impresa è iscritta alla Camera di Commercio, Industria, Artigianato e Agricoltura di Arezzo al n. REA {{azienda.rea}}, con oggetto sociale inerente alla tipologia dei lavori da eseguire;
- di aver effettuato la valutazione dei rischi di cui all'art. 17, comma 1, lettera a) del D.Lgs. 81/2008 e di aver redatto il Documento di Valutazione dei Rischi, depositato presso la sede dell'impresa;
- di aver nominato il Responsabile del Servizio di Prevenzione e Protezione, il Medico Competente e gli addetti alla gestione delle emergenze, e che è stato eletto il Rappresentante dei Lavoratori per la Sicurezza;
- che i lavoratori impiegati in cantiere sono in possesso dell'idoneità sanitaria alla mansione e hanno ricevuto la formazione, l'informazione e l'addestramento previsti dagli artt. 36 e 37 del D.Lgs. 81/2008;
- che ai lavoratori sono stati consegnati i dispositivi di protezione individuale necessari;
- di essere in regola con gli obblighi contributivi e assicurativi (DURC in corso di validità);
- di non essere oggetto di provvedimenti di sospensione o interdittivi di cui all'art. 14 del D.Lgs. 81/2008;
- che il personale che opererà in cantiere è il seguente:

{{operai.elenco}}

{{luogoData}}`},
  {id:'art14',nome:'Dichiarazione art. 14 e Allegato XVII D.Lgs 81/08',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante',testo:
`# DICHIARAZIONE SOSTITUTIVA DELL'ATTO DI NOTORIETÀ
## (art. 47 D.P.R. 28 dicembre 2000, n. 445) — art. 14 e Allegato XVII del D.Lgs. 81/2008

Il sottoscritto {{legale.nome}}, nato a {{legale.natoA}} il {{legale.natoIl}}, codice fiscale {{legale.cf}}, Legale Rappresentante della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}},

in relazione ai lavori presso il cantiere {{cantiere.nome}}, {{cantiere.indirizzo}}, committente {{committente.nome}},

consapevole delle responsabilità penali previste dall'art. 76 del D.P.R. 445/2000 in caso di dichiarazioni mendaci,

**DICHIARA**

- che l'impresa non è destinataria di provvedimenti di sospensione dell'attività imprenditoriale ai sensi dell'art. 14 del D.Lgs. 81/2008;
- che l'impresa applica ai propri dipendenti il contratto collettivo nazionale di lavoro del settore edile e che l'organico medio annuo è distinto per qualifica secondo quanto risulta dalla documentazione depositata in sede;
- che i lavoratori sono regolarmente assunti e che le comunicazioni obbligatorie di assunzione (UNILAV) sono a disposizione;
- che l'impresa è in possesso della documentazione prevista dall'Allegato XVII del D.Lgs. 81/2008, disponibile presso la sede e in cantiere a richiesta.

{{luogoData}}`},
  {id:'art97',nome:'Autocertificazione art. 97 D.Lgs 81/08 (solo con subappaltatori)',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante',soloConSubappalto:true,testo:
`# AUTOCERTIFICAZIONE AI SENSI DELL'ART. 97 DEL D.LGS. 81/2008
## (art. 47 D.P.R. 28 dicembre 2000, n. 445)

Il sottoscritto {{legale.nome}}, nato a {{legale.natoA}} il {{legale.natoIl}}, codice fiscale {{legale.cf}}, Legale Rappresentante della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}},

in relazione ai lavori presso il cantiere {{cantiere.nome}}, {{cantiere.indirizzo}}, committente {{committente.nome}},

**DICHIARA**

- di aver verificato l'idoneità tecnico-professionale delle imprese esecutrici e dei lavoratori autonomi in subappalto, secondo le modalità dell'Allegato XVII del D.Lgs. 81/2008;
- di aver verificato la congruenza dei piani operativi di sicurezza delle imprese esecutrici in subappalto rispetto al proprio, prima della trasmissione al coordinatore per l'esecuzione;
- di coordinare gli interventi di cui agli artt. 95 e 96 del D.Lgs. 81/2008 e di vigilare sulla sicurezza dei lavori affidati.

{{luogoData}}`},
  {id:'art3c8',nome:'Dichiarazione art. 3 comma 8 D.Lgs 494/96',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante',testo:
`# DICHIARAZIONE AI SENSI DELL'ART. 3 COMMA 8 DEL D.LGS. 494/96
## (ora art. 90, comma 9, D.Lgs. 81/2008) — resa ai sensi degli artt. 46 e 47 del D.P.R. 445/2000

Il sottoscritto {{legale.nome}}, nato a {{legale.natoA}} il {{legale.natoIl}}, codice fiscale {{legale.cf}}, Legale Rappresentante della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}}, codice ditta INAIL {{azienda.inail}},

in relazione ai lavori presso il cantiere {{cantiere.nome}}, {{cantiere.indirizzo}}, committente {{committente.nome}},

**DICHIARA**

- che l'organico medio annuo dell'impresa, distinto per qualifica, è quello risultante dalla documentazione depositata presso la sede;
- che il contratto collettivo applicato ai lavoratori dipendenti è il CCNL del settore edile;
- di essere in regola con i versamenti contributivi, previdenziali e assicurativi (INPS, INAIL, Cassa Edile), come attestato dal DURC in corso di validità;
- che i lavoratori che opereranno in cantiere sono i seguenti:

{{operai.elenco}}

{{luogoData}}`},
  {id:'deposito_dvr',nome:'Dichiarazione di deposito del DVR in sede',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Datore di Lavoro',testo:
`# DICHIARAZIONE DI DEPOSITO DEL DOCUMENTO DI VALUTAZIONE DEI RISCHI

Il sottoscritto {{legale.nome}}, nato a {{legale.natoA}} il {{legale.natoIl}}, codice fiscale {{legale.cf}}, in qualità di Datore di Lavoro della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}},

**DICHIARA**

che il Documento di Valutazione dei Rischi, redatto ai sensi degli artt. 17 e 28 del D.Lgs. 81/2008, è depositato in forma completa presso la sede dell'impresa in {{azienda.sede}}, dove è consultabile a richiesta degli organi di vigilanza e del coordinatore per l'esecuzione dei lavori.

Si allega alla presente la prima pagina del documento, sottoscritta.

La presente dichiarazione è resa con riferimento al cantiere {{cantiere.nome}}, {{cantiere.indirizzo}}.

{{luogoData}}`},
  {id:'soggetti_coinvolti',nome:'Modulo "Soggetti coinvolti"',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante',testo:
`# SOGGETTI COINVOLTI — IMPRESA ESECUTRICE

**Cantiere:** {{cantiere.nome}} — {{cantiere.indirizzo}}
**Committente:** {{committente.nome}}
**Impresa affidataria:** {{affidataria.nome}}
**Coordinatore per la sicurezza in esecuzione:** {{cse.nome}}

## Impresa esecutrice
| Campo | Dato |
|---|---|
| Ragione sociale | {{azienda.ragioneSociale}} |
| Sede legale | {{azienda.sede}} |
| P.IVA / C.F. | {{azienda.piva}} |
| Telefono | {{azienda.telefono}} |
| PEC | {{azienda.pec}} |
| Codice ditta INAIL | {{azienda.inail}} |
| Legale Rappresentante e Datore di Lavoro | {{legale.nome}} |
| RSPP | {{rspp.nome}} |
| RLS | {{rls.nome}} |
| Medico competente | {{medico.nome}} |
| Preposto di cantiere | {{preposto.nome}} |
| Lavorazioni | {{cantiere.lavorazioni}} |

## Lavoratori presenti in cantiere
{{operai.tabella}}

{{luogoData}}`},
  {id:'elenco_dipendenti',nome:'Elenco dei dipendenti presenti in cantiere',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante',testo:
`# ELENCO DEL PERSONALE PRESENTE IN CANTIERE

**Cantiere:** {{cantiere.nome}} — {{cantiere.indirizzo}}
**Committente:** {{committente.nome}} — **Impresa affidataria:** {{affidataria.nome}}

Il sottoscritto {{legale.nome}}, Legale Rappresentante della {{azienda.ragioneSociale}}, P.IVA {{azienda.piva}}, dichiara che il personale dipendente che opererà nel cantiere in oggetto è il seguente:

{{operai.tabella}}

Tutti i lavoratori sopra elencati sono regolarmente assunti, in possesso dell'idoneità sanitaria alla mansione e della formazione prevista dal D.Lgs. 81/2008.

{{luogoData}}`},
  {id:'nomina_preposto_cantiere',nome:'Nomina Preposto di cantiere',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Datore di Lavoro',testo:
`# NOMINA DEL PREPOSTO DI CANTIERE
## (artt. 2, 18 e 19 del D.Lgs. 9 aprile 2008, n. 81)

Il sottoscritto {{legale.nome}}, in qualità di Datore di Lavoro della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}},

**NOMINA**

il Sig. {{preposto.nome}}, nato il {{preposto.natoIl}}, codice fiscale {{preposto.cf}}, **Preposto** per il cantiere {{cantiere.nome}}, {{cantiere.indirizzo}}, con i compiti previsti dall'art. 19 del D.Lgs. 81/2008: sovrintendere e vigilare sull'osservanza da parte dei lavoratori degli obblighi di legge e delle disposizioni aziendali in materia di salute e sicurezza, verificare l'uso dei dispositivi di protezione individuale, richiedere l'osservanza delle misure per il controllo delle situazioni di rischio in caso di emergenza, segnalare tempestivamente al datore di lavoro le deficienze dei mezzi e delle attrezzature e ogni condizione di pericolo.

Il preposto ha frequentato il corso di formazione previsto dall'art. 37 del D.Lgs. 81/2008 (attestato del {{preposto.corsoData}}).

{{luogoData}}

{{preposto.accettazione}}`},
  {id:'nomina_antincendio_cantiere',nome:'Nomina Addetto antincendio di cantiere',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Datore di Lavoro',testo:
`# NOMINA DELL'ADDETTO ALLA PREVENZIONE INCENDI, LOTTA ANTINCENDIO E GESTIONE DELLE EMERGENZE
## (artt. 18, 43 e 46 del D.Lgs. 81/2008 — D.M. 2 settembre 2021)

Il sottoscritto {{legale.nome}}, in qualità di Datore di Lavoro della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}},

**NOMINA**

{{addettiAntincendio.elenco}}

addetti alla prevenzione incendi, lotta antincendio e gestione delle emergenze per il cantiere {{cantiere.nome}}, {{cantiere.indirizzo}}. Gli addetti hanno frequentato il corso di formazione previsto dalla normativa vigente.

{{luogoData}}

{{addettiAntincendio.accettazione}}`},
  {id:'nomina_primo_soccorso_cantiere',nome:'Nomina Addetto primo soccorso di cantiere',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Datore di Lavoro',testo:
`# NOMINA DELL'ADDETTO AL PRIMO SOCCORSO
## (artt. 18 e 45 del D.Lgs. 81/2008 — D.M. 15 luglio 2003, n. 388)

Il sottoscritto {{legale.nome}}, in qualità di Datore di Lavoro della società {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA / C.F. {{azienda.piva}},

**NOMINA**

{{addettiPrimoSoccorso.elenco}}

addetti al primo soccorso per il cantiere {{cantiere.nome}}, {{cantiere.indirizzo}}. Gli addetti hanno frequentato il corso di formazione previsto dal D.M. 388/2003.

{{luogoData}}

{{addettiPrimoSoccorso.accettazione}}`},
  {id:'regolarita_fiscale',nome:'Dichiarazione sostitutiva regolarità fiscale (subappalto)',cartaIntestata:false,firma:true,timbro:true,firmatario:'Firma',testo:
`# Dichiarazione sostitutiva in merito alla regolarità fiscale
## ai sensi dell'art. 46, c. 1, lettera p del D.P.R. 28 dicembre 2000 n. 445 e art. 4 comma 14-bis Legge 12 luglio 2011 n. 106

Il sottoscritto {{legale.nome}} nato a {{legale.natoA}} il {{legale.natoIl}} residente a {{legale.residenza}} codice fiscale {{legale.cf}}, in qualità di rappresentante legale della società {{azienda.ragioneSociale}} con sede a {{azienda.sede}} telefono {{azienda.telefono}} codice fiscale {{azienda.cf}} partita Iva {{azienda.piva}}

consapevole delle sanzioni penali richiamate dall'art. 76 del DPR 445/2000 in caso di dichiarazioni mendaci e della decadenza dei benefici eventualmente conseguenti al provvedimento emanato sulla base di dichiarazioni non veritiere, di cui all'art. 75 del richiamato DPR 445/2000 ai sensi e per gli effetti dell'art. 46 del citato DPR 445/2000, sotto la propria responsabilità per le opere edili relative a {{cantiere.descrizione}}

**DICHIARA**

- di essere in regola con gli obblighi concernenti le dichiarazioni in materia di imposte e tasse e con i conseguenti adempimenti;
- di non aver commesso violazioni, definitivamente accertate, rispetto agli obblighi relativi al pagamento delle imposte e tasse;
- di aver correttamente corrisposto alle maestranze impiegate nei lavori succitati, i trattamenti retributivi, comprese le quote di trattamento di fine rapporto, nonché i contributi previdenziali e i premi assicurativi dovuti in relazione al periodo di esecuzione dei lavori e/o servizi oggetto di subappalto;
- di aver applicato, nei confronti dei lavoratori impiegati nel subappalto citato, condizioni non inferiori a quelle risultanti dai Contratti Collettivi di Lavoro della categoria e della zona.

{{luogoData}}

*Allegare fotocopia di un documento di identità in corso di validità*`},
  {id:'corretta_posa',nome:'Dichiarazione di corretta posa (fine lavori)',cartaIntestata:true,firma:true,timbro:true,firmatario:'Il Legale Rappresentante',testo:
`# Dichiarazione sostitutiva di certificazione
## (art. 46 D.P.R. 28 dicembre 2000, n. 445)

Il sottoscritto Sig. {{legale.nome}}, nato in {{legale.natoA}} il {{legale.natoIl}}, in qualità di Legale Rappresentante della {{azienda.ragioneSociale}}, con sede legale in {{azienda.sede}}, P.IVA/C.F. n. {{azienda.piva}}, ai sensi e per gli effetti degli articoli 46 e 47 del D.P.R. 28 dicembre 2000, n. 445, consapevole delle responsabilità penali previste dall'art. 76 del medesimo decreto in caso di dichiarazioni mendaci,

**DICHIARA**

che i lavori eseguiti per conto della società {{affidataria.nome}}, presso il cantiere sito in {{cantiere.indirizzo}} ({{cantiere.nome}}), sono stati realizzati a regola d'arte, nel rispetto delle vigenti norme tecniche di settore e delle prescrizioni contrattuali. In particolare, sono state eseguite le seguenti lavorazioni:

{{cantiere.lavorazioniElenco}}

La presente dichiarazione viene rilasciata ai sensi e per gli effetti di quanto previsto dalla normativa vigente in materia di dichiarazioni sostitutive di certificazione, per gli usi consentiti dalla legge.

{{luogoData}}`},
];
