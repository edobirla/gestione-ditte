// ---------------------------------------------------------------------
// DATI INIZIALI — i dati reali di Pavimass S.R.L. (fotografia al 02/07/2026).
// Sono facili da aggiornare: sono tutti qui. Dove un dato manca resta null: l'interfaccia mostra [DA COMPILARE].
// datiIniziali(true) restituisce solo la struttura (usata da normalizzaStato per integrare i campi nuovi).
// ---------------------------------------------------------------------
function datiIniziali(soloStruttura){
  const s={
    versioneSchema:VERSIONE_SCHEMA,
    azienda:{
      ragioneSociale:'PAVIMASS S.R.L.',piva:'02188850511',cf:'02188850511',formaGiuridica:'Società a Responsabilità Limitata',dataCostituzione:'2014-05-29',capitaleSociale:'€ 10.000,00 i.v.',
      indirizzo:{via:'Via G. Natta, 221',cap:'52010',comune:'Subbiano',provincia:'AR',frazione:'Castelnuovo'},
      pec:'pavimasssrl@pec.it',email:'info@pavimass.it',sito:'www.pavimass.it',telefono:'0575 48549',cellulare:'334 8661519',fax:'0575 042321',
      rea:'AR-168277',codiceSdi:'WP7SE2Q',ateco:'43.33.00',inail:'19548392',inps:'0504900998',cassaEdile:'Falea 08700',
      patenteCrediti:{codice:'PAC-BI-027-DW',dataRilascio:'2024-10-24'},
      attivita:'Pavimentazioni, rivestimenti, massetti, impermeabilizzazioni',
      banca:'Banca MPS',iban:'IT72G0103071640000000976514',condizioniPagamento:'Bonifico Bancario',notePreventivo:'Lavori in economia: 35 €/ora',
      legaleRappresentanteId:'p_ovidiu',rsppId:'p_ovidiu',rlsId:'p_edvalt',rlsEletto:'2024-10-07',
      medicoCompetente:{nome:'Dott. Mario Martinelli',telefono:'3474502772',email:'martinellimario55@gmail.com',professionistaId:'pr_martinelli'},
      consulenteSicurezza:{nome:'Studio Tecnico Boncompagni Ghezzi',indirizzo:'Via Calamandrei 185, 52100 Arezzo (AR)',professionistaId:'pr_boncompagni'},
      immagini:{logo:'incorporato',firmaTimbro:'incorporato',firmaLegale:'incorporato',firmaRspp:'incorporato'},
      logoId:null,firmaTimbroId:null,timbroId:null,firmaId:null,
      cartaIntestata:{righe:['Sede Legale e Amministrativa:','Via G. Natta, 221 - Subbiano 52010 (AR)  P.I./C.F. 02188850511','Tel. 0575 48549 – Fax: 0575 042321 - Cell.: 334 8661519','info@pavimass.it - www.pavimass.it - Nr. R.E.A. 168277 – Codice SDI: WP7SE2Q','Registro Imprese di Arezzo n. 02188850511 - Capitale Sociale € 10.000,00 i.v.']},
    },
    persone:[],tipiDocumento:[],documenti:[],file:[],clienti:[],professionisti:[],lavorazioni:[],cantieri:[],pos:[],
    modelli:{dichiarazioni:[],posTesto:null,posMacchine:null,posDpiDotazione:null},
    presenze:{},bustePaga:[],regoleBuste:[],listino:[],preventivi:[],movimenti:[],generati:[],cestino:[],
    mezzi:[],fornitori:[],bonifici:[],
    impostazioni:{nomeUtente:'Edoardo Birla',dispositivo:'',tema:'sistema',ultimoBackup:null,modificheDopoBackup:0,ultimaModifica:null,soglie:Object.assign({},SOGLIE_PREDEFINITE),densita:'normale',festivitaLocali:[],arrotondamento:'aziendale',compressioneImmagini:true,obiettivoKb:300,avvisaPdfMb:2,creato:new Date().toISOString()},
  };
  s.lavorazioni=LAVORAZIONI_PAVIMASS.map(l=>Object.assign({},l));
  s.tipiDocumento=TIPI_DOCUMENTO_INIZIALI.map(t=>Object.assign({},t));
  s.modelli.dichiarazioni=MODELLI_DICHIARAZIONI_INIZIALI.map(d=>Object.assign({},d));
  if(soloStruttura){
    s.azienda=Object.fromEntries(Object.entries(s.azienda).map(([k,v])=>[k,v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).map(kk=>[kk,null])):null]));
    s.azienda.indirizzo={via:null,cap:null,comune:null,provincia:null,frazione:null};
    s.azienda.cartaIntestata={righe:[]};
    s.tipiDocumento=[];s.modelli.dichiarazioni=[];s.lavorazioni=[];
    return s;
  }
  // ---- persone ----
  const P=(o)=>Object.assign({id:null,cognome:'',nome:'',tipo:'dipendente',mansione:'',cf:null,dataNascita:null,luogoNascita:null,nazionalita:null,residenza:null,telefono:null,email:null,dataAssunzione:null,dataCessazione:null,attivo:true,qualifiche:[],retribuzione:{tipo:'oraria',tariffaOraria:null,importoFisso:null},schemaOrario:null,inLibroPresenze:true,sezionePresenze:'dipendenti',soloTrasferte:false,inCantiere:true,fotoId:null,firmaId:null,firmaImg:null,firmaIncorporata:null,note:''},o);
  s.persone=[
    P({id:'p_ovidiu',cognome:'Birla',nome:'Costel Ovidiu',tipo:'legale_rappresentante',mansione:'Legale Rappresentante',cf:'BRLCTL76L04Z129C',dataNascita:'1976-07-04',luogoNascita:'Romania',nazionalita:'Romania',residenza:'Loc. Marcena 32/B, 52100 Arezzo (AR)',qualifiche:['rspp','datoreLavoro'],retribuzione:{tipo:'fissa',tariffaOraria:null,importoFisso:5000},sezionePresenze:'soci',soloTrasferte:true,firmaIncorporata:'firmaLegale',note:'Socio e Legale Rappresentante, RSPP e datore di lavoro. Nel libro presenze si compila solo la riga trasferte (località toscane, mai Subbiano).'}),
    P({id:'p_edvalt',cognome:'Gostima',nome:'Edvalt',tipo:'dipendente',mansione:'Piastrellista',cf:'GSTDLT83T17Z100X',dataNascita:'1983-12-17',luogoNascita:'Albania',nazionalita:'Albania',qualifiche:['rls','preposto','antincendio','primoSoccorso'],retribuzione:{tipo:'oraria',tariffaOraria:17,importoFisso:null},firmaIncorporata:'firmaRls',note:'Unico preposto qualificato dell\'azienda. RLS eletto il 07/10/2024.'}),
    P({id:'p_marian',cognome:'Raciula',nome:'Marian',tipo:'dipendente',mansione:'Operaio',cf:null,dataNascita:'1973-07-11',luogoNascita:'Romania',nazionalita:'Romania',qualifiche:['antincendio','primoSoccorso'],retribuzione:{tipo:'oraria',tariffaOraria:15,importoFisso:null},note:'Va fra i dipendenti, non fra i soci, anche se in vecchi fogli compariva fra i soci.'}),
    P({id:'p_ibra',cognome:'Diop',nome:'Ibra',tipo:'dipendente',mansione:'Pavimentatore',cf:'DPIBRI93C24Z343L',dataNascita:'1993-03-24',luogoNascita:'Senegal',nazionalita:'Senegal',qualifiche:[],retribuzione:{tipo:'oraria',tariffaOraria:11,importoFisso:null},note:'Tariffa corretta a 11 €/h (inizialmente comunicata 10).'}),
    P({id:'p_ebrima',cognome:'Jallow',nome:'Ebrima',tipo:'dipendente',mansione:'Operaio',cf:null,dataNascita:'1991-05-15',luogoNascita:'Gambia',nazionalita:'Gambia',qualifiche:[],retribuzione:{tipo:'oraria',tariffaOraria:10,importoFisso:null}}),
    P({id:'p_sajid',cognome:'Sajid',nome:'Muhammad',tipo:'dipendente',mansione:'Operaio',cf:'SJDMMM94A01Z236O',dataNascita:'1994-01-01',luogoNascita:'Pakistan',nazionalita:'Pakistan',qualifiche:[],retribuzione:{tipo:'oraria',tariffaOraria:null,importoFisso:null},inLibroPresenze:false,note:'In ingresso: ha solo la ricevuta della questura per il rinnovo del permesso di soggiorno (Terni, pratica 26TR003835 del 09/06/2026). Retribuzione da definire.'}),
    P({id:'p_elena',cognome:'Birla',nome:'Elena',tipo:'amministrativo',mansione:'Amministrazione',cf:null,qualifiche:[],retribuzione:{tipo:'fissa',tariffaOraria:null,importoFisso:3000},inCantiere:false,note:'Non ha foglio ore: nel libro presenze va sempre a 8 ore su tutti i giorni lavorativi, importo fisso.'}),
    P({id:'p_edoardo',cognome:'Birla',nome:'Edoardo',tipo:'dipendente',mansione:'Amministrazione e cantiere',cf:'BRLDRD02B06A390S',dataNascita:'2002-02-06',luogoNascita:'Arezzo',nazionalita:'Italia',dataAssunzione:'2024-09-02',qualifiche:[],retribuzione:{tipo:'mista',tariffaOraria:10,importoFisso:1000},schemaOrario:{lun:8,mar:8,mer:0,gio:0,ven:4},note:'10 €/h sulle ore della sua scheda + fisso 1.000 €/mese. Aggiustamenti mensili con sigle (brc, mt, mac): contano solo gli importi.'}),
    P({id:'p_alexey',cognome:'Vasilyev',nome:'Alexey',tipo:'dipendente',mansione:'Operaio',attivo:false,dataCessazione:'2026-07-31',inLibroPresenze:false,qualifiche:[],note:'Cessato: uscito dall\'organico, escluso dal libro presenze da agosto 2026.'}),
    P({id:'p_saleh',cognome:'Saleh',nome:'Mohamed',tipo:'dipendente',mansione:'Operaio',attivo:false,inLibroPresenze:false,inCantiere:false,qualifiche:[],note:'Presente solo nel libro presenze di giugno 2026 (importato dall\'Excel). Dati anagrafici non disponibili.'}),
    P({id:'p_ahmed',cognome:'Mohamed',nome:'Ahmed',tipo:'dipendente',mansione:'Operaio',attivo:false,inLibroPresenze:false,inCantiere:false,qualifiche:[],note:'Presente solo nel libro presenze di giugno 2026 (importato dall\'Excel). Dati anagrafici non disponibili.'}),
  ];
  // ---- documenti reali (senza file: i file si allegano con il caricamento iniziale) ----
  const D=(o)=>Object.assign({id:nuovoId('d'),soggettoTipo:'persona',soggettoId:null,tipoId:null,titolo:'',dataEmissione:null,dataScadenza:null,senzaScadenza:false,file:[],verificato:false,note:'',creato:'2026-07-02T00:00:00.000Z'},o);
  s.documenti=[
    D({id:'d_durc',soggettoTipo:'azienda',soggettoId:'azienda',tipoId:'durc',dataEmissione:'2026-05-11',dataScadenza:'2026-09-08',verificato:true}),
    D({id:'d_visura',soggettoTipo:'azienda',soggettoId:'azienda',tipoId:'visura',titolo:'Visura camerale 06/2026',note:'Emessa a giugno 2026 (giorno non indicato). Le committenze la vogliono recente: entro 6 mesi.'}),
    D({id:'d_patente',soggettoTipo:'azienda',soggettoId:'azienda',tipoId:'patente_crediti',dataEmissione:'2024-10-24',senzaScadenza:true,titolo:'Patente a crediti PAC-BI-027-DW',verificato:true}),
    D({id:'d_nomina_rspp',soggettoTipo:'azienda',soggettoId:'azienda',tipoId:'nomina_rspp',senzaScadenza:true}),
    D({id:'d_nomina_medico',soggettoTipo:'azienda',soggettoId:'azienda',tipoId:'nomina_medico',senzaScadenza:true}),
    ...['principale','chimico','incendio','rumore','stress','vibrazioni'].map(k=>D({id:'d_dvr_'+k,soggettoTipo:'azienda',soggettoId:'azienda',tipoId:'dvr',titolo:'DVR '+k,senzaScadenza:true})),
    // Birla Costel Ovidiu
    D({id:'d_ov_rspp',soggettoId:'p_ovidiu',tipoId:'rspp_datore',titolo:'Aggiornamento RSPP',dataEmissione:'2021-10-29',note:'Scadenza stimata a 5 anni: verificare sull\'attestato.'}),
    D({id:'d_ov_visita',soggettoId:'p_ovidiu',tipoId:'visita_medica',dataEmissione:'2026-07-01',dataScadenza:'2027-06-30'}),
    D({id:'d_ov_ci',soggettoId:'p_ovidiu',tipoId:'carta_identita',note:'Da verificare: data di scadenza da leggere sulla scansione.'}),
    // Diop Ibra
    D({id:'d_ib_visita',soggettoId:'p_ibra',tipoId:'visita_medica',dataEmissione:'2026-07-01',dataScadenza:'2027-06-30'}),
    D({id:'d_ib_ra',soggettoId:'p_ibra',tipoId:'rischio_alto_16',dataEmissione:'2025-01-16',dataScadenza:'2030-01-16'}),
    D({id:'d_ib_unilav',soggettoId:'p_ibra',tipoId:'unilav',dataEmissione:'2025-04-28',senzaScadenza:true}),
    D({id:'d_ib_ci',soggettoId:'p_ibra',tipoId:'carta_identita',titolo:'Documento d\'identità (scansione)',note:'Da verificare: data di scadenza da leggere sulla scansione.'}),
    // Gostima Edvalt
    D({id:'d_ed_visita',soggettoId:'p_edvalt',tipoId:'visita_medica',dataEmissione:'2026-07-01',dataScadenza:'2027-06-30'}),
    D({id:'d_ed_ra',soggettoId:'p_edvalt',tipoId:'rischio_alto_16',dataEmissione:'2021-09-14',note:'Scadenza stimata a 5 anni (~14/09/2026): in scadenza, programmare l\'aggiornamento 6h.'}),
    D({id:'d_ed_preposto',soggettoId:'p_edvalt',tipoId:'corso_preposto',dataEmissione:'2025-10-20',dataScadenza:'2027-10-20'}),
    D({id:'d_ed_antinc',soggettoId:'p_edvalt',tipoId:'antincendio_2',dataEmissione:'2022-11-09',dataScadenza:'2027-11-09'}),
    D({id:'d_ed_rls',soggettoId:'p_edvalt',tipoId:'corso_rls',titolo:'Aggiornamento RLS',dataEmissione:'2024-10-08',dataScadenza:'2025-10-08'}),
    D({id:'d_ed_ps',soggettoId:'p_edvalt',tipoId:'primo_soccorso',dataEmissione:'2024-09-20',dataScadenza:'2027-09-20'}),
    D({id:'d_ed_nom_prep',soggettoId:'p_edvalt',tipoId:'nomina_persona',titolo:'Nomina Preposto',senzaScadenza:true}),
    D({id:'d_ed_nom_ant',soggettoId:'p_edvalt',tipoId:'nomina_persona',titolo:'Nomina Addetto Antincendio e Primo Soccorso',senzaScadenza:true}),
    D({id:'d_ed_unilav',soggettoId:'p_edvalt',tipoId:'unilav',senzaScadenza:true}),
    D({id:'d_ed_ci',soggettoId:'p_edvalt',tipoId:'carta_identita',titolo:'Documento d\'identità (scansione)',note:'Da verificare: data di scadenza da leggere sulla scansione.'}),
    // Jallow Ebrima
    D({id:'d_eb_visita',soggettoId:'p_ebrima',tipoId:'visita_medica',dataEmissione:'2026-07-01',dataScadenza:'2027-06-30'}),
    D({id:'d_eb_ra',soggettoId:'p_ebrima',tipoId:'rischio_alto_16',dataEmissione:'2024-09-04',dataScadenza:'2029-09-04'}),
    D({id:'d_eb_unilav',soggettoId:'p_ebrima',tipoId:'unilav',titolo:'UNILAV tempo indeterminato',senzaScadenza:true}),
    D({id:'d_eb_ci',soggettoId:'p_ebrima',tipoId:'carta_identita',titolo:'Documento d\'identità (scansione)',note:'Da verificare: data di scadenza da leggere sulla scansione.'}),
    // Raciula Marian
    D({id:'d_ma_visita',soggettoId:'p_marian',tipoId:'visita_medica',dataEmissione:'2026-07-01',dataScadenza:'2027-06-30'}),
    D({id:'d_ma_ra',soggettoId:'p_marian',tipoId:'rischio_alto_16',dataEmissione:'2024-09-04',dataScadenza:'2029-09-04'}),
    D({id:'d_ma_antinc',soggettoId:'p_marian',tipoId:'antincendio_2',dataEmissione:'2022-11-09',dataScadenza:'2027-11-09'}),
    D({id:'d_ma_ps',soggettoId:'p_marian',tipoId:'primo_soccorso',dataEmissione:'2024-09-20',dataScadenza:'2027-09-20'}),
    D({id:'d_ma_nom_ant',soggettoId:'p_marian',tipoId:'nomina_persona',titolo:'Nomina Addetto Antincendio e Primo Soccorso',senzaScadenza:true}),
    D({id:'d_ma_unilav',soggettoId:'p_marian',tipoId:'unilav',dataEmissione:'2025-04-03',senzaScadenza:true}),
    D({id:'d_ma_ci',soggettoId:'p_marian',tipoId:'carta_identita',titolo:'Documento d\'identità (scansione)',note:'Da verificare: data di scadenza da leggere sulla scansione.'}),
    // Sajid Muhammad
    D({id:'d_sa_ps',soggettoId:'p_sajid',tipoId:'permesso_soggiorno',titolo:'Ricevuta Questura rinnovo permesso di soggiorno — Terni, pratica 26TR003835',dataEmissione:'2026-06-09',note:'Ricevuta della questura (richiesta asilo). Da verificare: non è il permesso definitivo.'}),
  ];
  // ---- clienti ----
  const C=(o)=>Object.assign({id:null,ragioneSociale:'',ruoli:[],piva:null,cf:null,indirizzo:{via:null,cap:null,comune:null,provincia:null},telefono:null,email:null,pec:null,sito:null,referenti:[],condizioniPagamento:null,valutazione:null,stato:'attivo',interazioni:[],documenti:[],note:''},o);
  s.clienti=[
    C({id:'cl_lidl',ragioneSociale:'LIDL ITALIA s.r.l.',ruoli:['committente'],piva:'02275030233',indirizzo:{via:'Via Augusto Ruffo 36',cap:'37040',comune:'Arcole',provincia:'VR'},telefono:'0587 259390'}),
    C({id:'cl_lgc',ragioneSociale:'LGC SRL',ruoli:['affidataria'],piva:'02498190517',indirizzo:{via:'Via Giacomo Leopardi 31/B',cap:'52025',comune:'Montevarchi',provincia:'AR'},telefono:'353 4759487',pec:'lgc@arubapec.it',note:'General contractor (ditta esecutrice) nel cantiere Lidl Arezzo.'}),
    C({id:'cl_lam',ragioneSociale:'Lam Ambiente s.r.l.',ruoli:['affidataria'],indirizzo:{via:'Via Nazionale 55',cap:'52010',comune:'Chiusi della Verna',provincia:'AR'}}),
    C({id:'cl_fabbri',ragioneSociale:'Fabbri Services Srl',ruoli:['affidataria']}),
    C({id:'cl_pecorelli',ragioneSociale:'Pecorelli',ruoli:['committente'],indirizzo:{comune:'Anghiari',provincia:'AR'}}),
    C({id:'cl_disma',ragioneSociale:'Disma',ruoli:['committente'],indirizzo:{comune:'Levane',provincia:'AR'}}),
    C({id:'cl_guidelli',ragioneSociale:'Guidelli Giuliano',ruoli:['committente'],indirizzo:{via:'Loc. Olmo 138',cap:'52100',comune:'Arezzo',provincia:'AR'}}),
  ];
  // ---- professionisti ----
  const PR=(o)=>Object.assign({id:null,titolo:'',nome:'',ruoli:[],indirizzo:{via:null,cap:null,comune:null,provincia:null},telefoni:[],email:null,pec:null,cf:null,note:''},o);
  s.professionisti=[
    PR({id:'pr_romeo',titolo:'Arch.',nome:'Pietro Romeo',ruoli:['progettista'],indirizzo:{via:'Via Fra Bartolomeo 124',cap:'59100',comune:'Prato',provincia:'PO'},telefoni:['348 3349132'],email:'pietroromeo@archiworldpec.it'}),
    PR({id:'pr_nieddu',titolo:'Ing.',nome:'Maria Antonietta Nieddu',ruoli:['direttoreLavori'],indirizzo:{via:'Via E. Bosso 6',cap:'56121',comune:'Pisa',provincia:'PI'},telefoni:['377 6610282'],email:'integra.mn@outlook.it'}),
    PR({id:'pr_manetti',titolo:'Geom.',nome:'Lorenzo Manetti',ruoli:['cse','csp'],indirizzo:{via:'Via Firenze 27',cap:'59100',comune:'Prato',provincia:'PO'},telefoni:['338 4542403','0574 572644'],email:'geo.manetti1@gmail.com',cf:'MNTLNZ78H10D612N'}),
    PR({id:'pr_morelli',titolo:'Arch.',nome:'Bruno Morelli',ruoli:['progettista','direttoreLavori'],indirizzo:{via:'Via della Magnanina 23',cap:'52100',comune:'Arezzo',provincia:'AR'}}),
    PR({id:'pr_ciabattini',titolo:'Ing.',nome:'Stefano Ciabattini',ruoli:['cse','csp'],indirizzo:{via:'Via Nazario Sauro 5/a',cap:'52100',comune:'Arezzo',provincia:'AR'}}),
    PR({id:'pr_martinelli',titolo:'Dott.',nome:'Mario Martinelli',ruoli:['medicoCompetente'],telefoni:['3474502772'],email:'martinellimario55@gmail.com'}),
    PR({id:'pr_boncompagni',titolo:'',nome:'Studio Tecnico Boncompagni Ghezzi',ruoli:['consulenteSicurezza'],indirizzo:{via:'Via Calamandrei 185',cap:'52100',comune:'Arezzo',provincia:'AR'}}),
  ];
  // ---- cantieri ----
  const CA=(o)=>Object.assign({id:null,nome:'',anno:2026,stato:'attivo',descrizione:'',indirizzo:{via:null,comune:null,provincia:null,cap:null},committenteId:null,affidatariaId:null,progettistaId:null,direttoreLavoriId:null,cseId:null,cspId:null,dataInizio:null,dataFine:null,periodoTesto:null,lavorazioni:[],uominiGiorno:null,orari:null,prepostoId:null,operai:[],importoContratto:null,psc:{data:null,redattore:null,prescrizioni:null,fileId:null,periodoTesto:null},denuncia:{data:null,dal:null,al:null,importoComplessivo:null,importoPavimass:null,fileId:null},documentiProdotti:[],checklistExtra:[],invii:[],note:'',diario:[],creato:'2026-07-02T00:00:00.000Z'},o);
  s.cantieri=[
    CA({id:'ca_lidl',nome:'Lidl Arezzo',stato:'chiuso',descrizione:'Posa pavimenti e massetti presso punto vendita Lidl. Realizzazione di edificio ad uso commerciale.',indirizzo:{via:'Via del Gavardello angolo Viale Amendola',comune:'Arezzo',provincia:'AR',cap:'52100'},committenteId:'cl_lidl',affidatariaId:'cl_lgc',progettistaId:'pr_romeo',direttoreLavoriId:'pr_nieddu',cseId:'pr_manetti',cspId:'pr_manetti',dataInizio:'2026-06-25',dataFine:'2026-08-15',lavorazioni:[2,1],uominiGiorno:4,orari:'lun-ven 08:00–12:00 / 13:00–17:00',prepostoId:'p_edvalt',operai:['p_edvalt','p_ibra','p_marian','p_ebrima'],importoContratto:30000,
      denuncia:{data:'2026-08-10',dal:'2026-08-10',al:'2026-09-15',importoComplessivo:4500000,importoPavimass:30000,fileId:null},
      documentiProdotti:[{id:'dp_lidl_pos4',tipo:'POS',titolo:'POS revisione 4',revisione:4,dataEmissione:'2026-06-17',data:'2026-07-06',fileId:null,note:'POS_Lidl-Arezzo_Pavimass_2026-06_v4.docx — revisione del 06/07/2026: aggiunti gli orari di lavoro.'},{id:'dp_lidl_denuncia',tipo:'Denuncia apertura cantiere',titolo:'Apertura Cantiere - Denuncia USL',data:'2026-08-10',fileId:null,note:'Apertura Cantiere Lidl Arezzo 10-08-26.pdf'}],
      diario:[{data:'2026-06-17',testo:'Emesso POS revisione iniziale.'},{data:'2026-07-06',testo:'POS revisione 4: aggiunti orari di lavoro lun-ven 08:00–12:00 / 13:00–17:00.'},{data:'2026-08-10',testo:'Denuncia di apertura cantiere (periodo 10/08 → 15/09/2026).'}]}),
    CA({id:'ca_guidelli',nome:'Guidelli Sant\'Anastasio',stato:'chiuso',descrizione:'Manutenzione straordinaria e ristrutturazione di fabbricato civile abitazione. Lavorazioni Pavimass: posa pavimenti e rivestimenti.',indirizzo:{via:'Loc. Sant\'Anastasio',comune:'Arezzo',provincia:'AR',cap:'52100'},committenteId:'cl_guidelli',affidatariaId:'cl_lam',progettistaId:'pr_morelli',direttoreLavoriId:'pr_morelli',cseId:'pr_ciabattini',cspId:'pr_ciabattini',dataInizio:'2026-06-26',dataFine:'2026-07-04',lavorazioni:[2,5],uominiGiorno:5,prepostoId:'p_edvalt',operai:['p_edvalt','p_marian','p_ebrima','p_ibra'],
      psc:{data:null,periodoTesto:'Novembre 2022',redattore:null,prescrizioni:null,fileId:null},
      documentiProdotti:[{id:'dp_gui_pos8',tipo:'POS',titolo:'POS revisione 8',revisione:8,data:'2026-06-25',fileId:null,note:'POS_Guidelli-SantAnastasio_Pavimass_2026-06_v8.pdf'}]}),
    CA({id:'ca_prada',nome:'Prada Piancastagnaio',stato:'attivo',descrizione:'Opere edili relative alla realizzazione del nuovo stabilimento PRADA di Piancastagnaio.',indirizzo:{comune:'Piancastagnaio',provincia:'SI'},affidatariaId:'cl_fabbri',documentiProdotti:[{id:'dp_prada_fisc',tipo:'Dichiarazione',titolo:'Dichiarazione sostitutiva regolarità fiscale (subappalto)',data:'2026-06-17',fileId:null,note:'All 7_Dichiarazione Regolarità fiscale sub pavimass.pdf'}]}),
    CA({id:'ca_pignone',nome:'Fabbri Services Nuovo Pignone',stato:'attivo',descrizione:'Posa pavimenti in gres, PVC, linoleum e moquette; rivestimento scale in linoleum e PVC; rivestimento bagni in gres, presso Nuovo Pignone.',indirizzo:{via:'Via Felice Matteucci 2',comune:'Firenze',provincia:'FI'},affidatariaId:'cl_fabbri',documentiProdotti:[{id:'dp_pignone_posa',tipo:'Dichiarazione',titolo:'Dichiarazione di corretta posa',data:'2026-07-06',fileId:null,note:'Dichiarazione Corretta Posa Pavimass NuovoPignone.pdf'}]}),
    CA({id:'ca_anghiari',nome:'Anghiari',stato:'chiuso',indirizzo:{comune:'Anghiari',provincia:'AR'},affidatariaId:'cl_pecorelli',periodoTesto:'luglio 2026'}),
    CA({id:'ca_levane',nome:'Levane',stato:'attivo',indirizzo:{comune:'Levane',provincia:'AR'},affidatariaId:'cl_disma',periodoTesto:'da luglio 2026'}),
    CA({id:'ca_olmo',nome:'Olmo',stato:'chiuso',indirizzo:{comune:'Arezzo',provincia:'AR'},affidatariaId:'cl_lam',periodoTesto:'luglio 2026'}),
  ];
  // ---- listino: sette categorie, voci tipo dai capitolati reali, prezzi volutamente vuoti ----
  const V=(cat,codice,descrizione,um,estesa)=>({id:'l_'+codice.toLowerCase().replace(/[^a-z0-9]+/g,'_'),codice,categoriaId:cat,descrizione,descrizioneEstesa:estesa||'',um,prezzoPosa:null,prezzoFornituraPosa:null,note:''});
  s.listino=[
    V(1,'MAS.01','Massetto tradizionale in sabbia e cemento sp. 6 cm','mq','Realizzazione di massetto comune in conglomerato cementizio, spessore 6 cm, tirato a regolo per la posa di pavimenti.'),
    V(1,'MAS.02','Massetto tradizionale con rete sp. 10 cm','mq','Realizzazione di massetto comune con rete elettrosaldata, spessore 10 cm.'),
    V(1,'MAS.03','Massetto alleggerito in cls cellulare','mq','Massetto alleggerito in calcestruzzo cellulare, per riempimenti e isolamento.'),
    V(1,'MAS.04','Massetto premiscelato autolivellante','mq','Massetto premiscelato autolivellante per sottofondi di pavimenti.'),
    V(1,'MAS.05','Massetto per le pendenze fino a 6 cm','mq','Formazione di pendenze e riempimenti in massetto, spessore fino a 6 cm.'),
    V(1,'MAS.06','Massetto per rettifica gradini scale interne','mq','Esecuzione di massetti di rettifica su gradini di scale interne, escluso legname di armatura.'),
    V(2,'PAV.01','Posa di pavimento in gres porcellanato','mq','Posa in opera di pavimento in gres porcellanato con collante, secondo le geometrie di progetto, compresa stuccatura.'),
    V(2,'PAV.02','Posa di pavimento in marmo / pietra / travertino','mq','Posa in opera di pavimento in lastre di marmo, pietra o travertino con collante o malta.'),
    V(2,'PAV.03','Posa di pavimento in cotto','mq','Posa in opera di pavimento in cotto.'),
    V(2,'PAV.04','Posa di pavimento in gres grandi formati (oltre 60x60)','mq','Posa in opera di pavimento in gres porcellanato di grande formato con doppia spalmatura.'),
    V(3,'LEG.01','Posa di pavimento in legno incollato','mq','Posa in opera di pavimento in legno prefinito con collante.'),
    V(3,'LEG.02','Posa di pavimento in legno flottante','mq','Posa in opera di pavimento in legno prefinito flottante su materassino.'),
    V(4,'GAL.01','Posa di pavimento galleggiante su supporti','mq','Posa di quadrotti di pavimento galleggiante su appositi supporti regolabili, per coperture piane e terrazzi.'),
    V(5,'RIV.01','Posa di rivestimento in gres porcellanato','mq','Posa in opera di rivestimento in gres porcellanato a parete, secondo le geometrie di progetto, compresa stuccatura.'),
    V(5,'RIV.02','Posa di rivestimento scale (alzate e pedate)','ml','Posa in opera di rivestimento di scale in gres, marmo o pietra.'),
    V(5,'RIV.03','Posa di mosaico','mq','Posa in opera di mosaico su rete a parete o a pavimento.'),
    V(6,'BAT.01','Posa di zoccolino battiscopa in gres','ml','Posa di zoccolino battiscopa in gres porcellanato con collante e stuccatura.'),
    V(6,'BAT.02','Posa di battiscopa in marmo / travertino / pietra','ml','Posa di battiscopa in marmo, travertino o pietra.'),
    V(6,'BAT.03','Posa di battiscopa in legno','ml','Posa di battiscopa in legno con collante e fissaggio meccanico.'),
    V(7,'IMP.01','Impermeabilizzazione con guaina bituminosa','mq','Impermeabilizzazione di balconi, terrazzi e marciapiedi con guaina bituminosa posata a caldo.'),
    V(7,'IMP.02','Impermeabilizzazione con guaina liquida','mq','Impermeabilizzazione con guaina liquida spalmabile in due mani.'),
    V(7,'IMP.03','Fornitura e posa di foglio in sughero sp. 3 mm','mq','Fornitura e posa in opera di foglio di sughero, spessore 3 mm, come strato di desolidarizzazione.'),
    V(7,'VAR.01','Trasporto e movimentazione materiali al piano','a corpo','Trasporto e movimentazione dei materiali al piano di posa.'),
    V(7,'VAR.02','Pulizia finale e lavaggio pavimenti','mq','Pulizia finale con lavaggio acido dei pavimenti posati.'),
  ];
  // ---- presenze reali 2026 (da Excel) ----
  s.presenze=clona(PRESENZE_INIZIALI);
  // ---- mezzi, fornitori, bonifici: dati d'esempio, da sostituire con quelli reali ----
  s.mezzi=[
    {id:'mz1',targa:'AB123CD',tipo:'Furgone',marca:'Fiat',modello:'Ducato',anno:2019,assegnatoA:null,note:'Esempio: sostituire con il parco mezzi reale.'},
    {id:'mz2',targa:'EF456GH',tipo:'Autocarro',marca:'Iveco',modello:'Daily',anno:2021,assegnatoA:null,note:'Esempio: sostituire con il parco mezzi reale.'},
  ];
  s.fornitori=[
    {id:'fr1',ragioneSociale:'Esempio Materiali Edili S.r.l.',cosaFornisce:'Materiali edili e massetti',piva:null,telefono:null,email:null,note:'Dato d\'esempio: da sostituire con l\'elenco reale dei fornitori.'},
    {id:'fr2',ragioneSociale:'Esempio Noleggi S.r.l.',cosaFornisce:'Noleggio attrezzature e mezzi',piva:null,telefono:null,email:null,note:'Dato d\'esempio: da sostituire con l\'elenco reale dei fornitori.'},
  ];
  s.bonifici=[];
  return s;
}

const LAVORAZIONI_PAVIMASS=[
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
const CATEGORIE_TIPO_DOC={identita:'Identità',contratto:'Contratto',sanitario:'Sanitario',formazione:'Formazione',nomina:'Nomina',impresa:'Impresa',sicurezza:'Sicurezza',amministrativo:'Amministrativo',cantiere:'Cantiere',mezzo:'Mezzo'};

// Catalogo tipi di documento. obbligatorio: vedi tipoApplicabile() nelle REGOLE.
// bloccaIdoneita: se mancante/scaduto impedisce l'ingresso in cantiere; gli altri obbligatori entrano solo nella checklist.
const TIPI_DOCUMENTO_INIZIALI=[
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
