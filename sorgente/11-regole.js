// Regole trasversali del dominio: funzioni pure, senza DOM e senza stato globale.
// Ricevono tutto per argomento e sono verificabili con autoverifica().

const STATI_DOC={
  valido:{etichetta:'Valido',icona:'ok',ordine:5},
  pianificare:{etichetta:'Da pianificare',icona:'calendario',ordine:3},
  scadenza:{etichetta:'In scadenza',icona:'attenzione',ordine:2},
  scaduto:{etichetta:'Scaduto',icona:'errore',ordine:0},
  mancante:{etichetta:'Mancante',icona:'blocco',ordine:1},
  riferimento:{etichetta:'Senza scadenza',icona:'file',ordine:6},
};
const SOGLIE_PREDEFINITE={scadenza:60,pianificare:90,durcAvviso:30};

// Scadenza effettiva di un documento: la data scritta prevale sempre; se manca e il tipo
// ha una validità tipica, si stima dalla data di emissione e si marca come stimata.
function scadenzaEffettiva(doc,tipo){
  if(!doc) return {data:null,stimata:false};
  if(doc.senzaScadenza) return {data:null,stimata:false,nessuna:true};
  if(doc.dataScadenza) return {data:doc.dataScadenza,stimata:false};
  if(tipo&&tipo.validitaMesi&&doc.dataEmissione) return {data:aggiungiMesi(doc.dataEmissione,tipo.validitaMesi),stimata:true};
  if(tipo&&tipo.validitaGiorni&&doc.dataEmissione) return {data:aggiungiGiorni(doc.dataEmissione,tipo.validitaGiorni),stimata:true};
  return {data:null,stimata:false};
}
// Stato di un documento rispetto a oggi (mezzanotte locale). Soglie configurabili.
function statoDocumento(doc,tipo,oggiIso,soglie){
  soglie=Object.assign({},SOGLIE_PREDEFINITE,soglie||{});
  oggiIso=oggiIso||oggi();
  if(!doc) return {stato:'mancante',giorni:null,data:null,stimata:false};
  const s=scadenzaEffettiva(doc,tipo);
  if(!s.data) return {stato:'riferimento',giorni:null,data:null,stimata:false};
  const g=giorniTra(oggiIso,s.data);
  let stato='valido';
  if(g<0) stato='scaduto';
  else if(g<=soglie.scadenza) stato='scadenza';
  else if(g<=soglie.pianificare) stato='pianificare';
  return {stato,giorni:g,data:s.data,stimata:s.stimata};
}
// Fra più documenti dello stesso tipo conta il migliore (il più recente/valido).
function migliorDocumento(docs,tipo,oggiIso,soglie){
  let best=null,bestInfo=null;
  for(const d of docs){
    const info=statoDocumento(d,tipo,oggiIso,soglie);
    if(!best||confrontoStato(info,bestInfo)>0){best=d;bestInfo=info}
  }
  return best?{doc:best,info:bestInfo}:null;
}
function confrontoStato(a,b){
  const ord={scaduto:0,mancante:0,riferimento:1,scadenza:2,pianificare:3,valido:4};
  if(ord[a.stato]!==ord[b.stato]) return ord[a.stato]-ord[b.stato];
  return (a.giorni||0)-(b.giorni||0);
}

// Quali tipi di documento sono richiesti a una persona, dato il suo profilo.
// obbligatorio: 'si' | 'no' | 'extraUE' | 'preposto' | 'rls' | 'rspp' | 'ple' | 'ponteggi' | 'antincendio' | 'primoSoccorso' | 'ruolo'
function tipoApplicabile(tipo,persona){
  if(!tipo||tipo.ambito!=='persona') return false;
  const q=persona.qualifiche||[];
  const dipendente=!persona.tipo||persona.tipo==='dipendente'||persona.tipo==='amministrativo';
  // UNILAV e consegna DPI riguardano i lavoratori subordinati, non soci e legale rappresentante;
  // il corso rischio alto non si chiede a chi è RSPP datore di lavoro (ha il corso RSPP).
  if((tipo.id==='unilav'||tipo.id==='consegna_dpi'||tipo.id==='busta_paga')&&!dipendente) return false;
  if((tipo.id==='rischio_alto_16'||tipo.id==='aggiornamento_rischio_alto')&&q.includes('rspp')) return false;
  switch(tipo.obbligatorio){
    case 'si': return true;
    case 'no': return false;
    case 'extraUE': return persona.extraUE===true||(!!persona.nazionalita&&!PAESI_UE.has(normalizzaTesto(persona.nazionalita)));
    case 'preposto': return q.includes('preposto');
    case 'rls': return q.includes('rls');
    case 'rspp': return q.includes('rspp');
    case 'antincendio': return q.includes('antincendio');
    case 'primoSoccorso': return q.includes('primoSoccorso');
    case 'ple': return q.includes('ple');
    case 'ponteggi': return q.includes('ponteggi');
    case 'ruolo': return q.includes('preposto')||q.includes('antincendio')||q.includes('primoSoccorso');
    default: return false;
  }
}
const PAESI_UE=new Set(['italia','francia','germania','spagna','portogallo','austria','belgio','bulgaria','cipro','croazia','danimarca','estonia','finlandia','grecia','irlanda','lettonia','lituania','lussemburgo','malta','paesi bassi','olanda','polonia','repubblica ceca','romania','slovacchia','slovenia','svezia','ungheria'].map(normalizzaTesto));

// Documento "d'identità" richiesto: basta uno fra carta d'identità e passaporto.
const GRUPPI_ALTERNATIVI=[['carta_identita','passaporto'],['rischio_alto_16','aggiornamento_rischio_alto']];
function gruppoAlternativo(tipoId){return GRUPPI_ALTERNATIVI.find(g=>g.includes(tipoId))||null}

// Idoneità al cantiere: nessun documento obbligatorio scaduto o mancante fra quelli applicabili.
function idoneitaPersona(persona,documentiPersona,tipi,oggiIso,soglie){
  const dettagli=[];const motivi=[];
  const visti=new Set();
  for(const tipo of tipi){
    if(!tipoApplicabile(tipo,persona)) continue;
    const gruppo=gruppoAlternativo(tipo.id);
    const chiaveGruppo=gruppo?gruppo.join('|'):tipo.id;
    if(visti.has(chiaveGruppo)) continue; visti.add(chiaveGruppo);
    const tipiGruppo=gruppo?tipi.filter(t=>gruppo.includes(t.id)):[tipo];
    let best=null;
    for(const t of tipiGruppo){
      const docs=documentiPersona.filter(d=>d.tipoId===t.id);
      const m=migliorDocumento(docs,t,oggiIso,soglie);
      if(m&&(!best||confrontoStato(m.info,best.info)>0)) best={...m,tipo:t};
    }
    const nome=gruppo?tipiGruppo.map(t=>t.nome).join(' o '):tipo.nome;
    if(!best){dettagli.push({tipo,nome,stato:'mancante',doc:null,info:null});motivi.push(`${nome}: mancante`);continue}
    dettagli.push({tipo:best.tipo,nome,stato:best.info.stato,doc:best.doc,info:best.info});
    if(best.info.stato==='scaduto') motivi.push(`${best.tipo.nome} scaduto il ${fData(best.info.data)}`);
  }
  return {idonea:motivi.length===0,motivi,dettagli};
}

// Stato peggiore fra i documenti di un soggetto (per colorare la riga in elenco)
function statoPeggiore(stati){
  const ord=['scaduto','mancante','scadenza','pianificare','valido','riferimento'];
  for(const s of ord) if(stati.includes(s)) return s;
  return 'riferimento';
}

// ---------------------------------------------------------------------
// Presenze: calcolo del mese di una persona
// mese = {giorni:{ '1':{ore:8|codice:'FE', cantiere, committente} }, aggiustamenti:[{sigla,importo}], importoForzato, importoManuale, note}
// persona.retribuzione = {tipo:'oraria'|'fissa'|'mista', tariffaOraria, importoFisso}
// ---------------------------------------------------------------------
const CODICI_ASSENZA={M:{nome:'Malattia'},I:{nome:'Infortunio'},PE:{nome:'Permesso',massimaleOreAnno:88},FS:{nome:'Festività'},FE:{nome:'Ferie',massimaleGiorniAnno:20},AS:{nome:'Assenza'},CI:{nome:'Cassa integrazione'}};
function valoreCella(c){ if(c==null) return null; if(typeof c==='number') return c; if(typeof c==='string'){const s=c.trim().toUpperCase(); if(CODICI_ASSENZA[s]) return s; const n=leggiNumero(s); return n} if(typeof c==='object'){ if(c.codice) return c.codice; if(c.ore!=null) return +c.ore; } return null; }
function calcolaMesePersona(mese,persona){
  const giorni=(mese&&mese.giorni)||{};
  let oreGriglia=0;const perCodice={};let giorniLavorati=0;
  for(const g of Object.keys(giorni)){
    const v=valoreCella(giorni[g]);
    if(typeof v==='number'){oreGriglia+=v;if(v>0)giorniLavorati++}
    else if(typeof v==='string'){perCodice[v]=(perCodice[v]||0)+1}
  }
  const r=persona&&persona.retribuzione||{};
  const tariffa=+r.tariffaOraria||0; const fisso=+r.importoFisso||0;
  const aggiustamenti=somma((mese&&mese.aggiustamenti)||[],a=>+a.importo||0);
  const importoBase=tariffa*oreGriglia;
  const importoCalcolato=arrotondaAziendale(importoBase+aggiustamenti+fisso);
  const importo=(mese&&mese.importoForzato&&mese.importoManuale!=null)?+mese.importoManuale:importoCalcolato;
  return {oreGriglia,giorniLavorati,perCodice,tariffa,fisso,aggiustamenti,importoBase,importoCalcolato,importo};
}
// Ore da scrivere in un giorno per una persona: 8 salvo schema orario personale
function oreStandardGiorno(persona,iso){
  const d=daIso(iso); if(!d) return 8;
  const s=persona&&persona.schemaOrario;
  if(s){const k=['dom','lun','mar','mer','gio','ven','sab'][d.getDay()];const v=s[k];return v==null?0:+v}
  return 8;
}
// Massimali annui (PE 88 ore, FE 20 giorni): riceve tutti i mesi dell'anno di una persona
function controllaMassimali(mesiAnno){
  let oreFE=0,gFE=0,orePE=0,gPE=0;
  for(const m of mesiAnno){for(const g of Object.keys(m.giorni||{})){const v=valoreCella(m.giorni[g]);if(v==='FE'){gFE++;oreFE+=8}if(v==='PE'){gPE++;orePE+=8}}}
  const avvisi=[];
  if(gFE>CODICI_ASSENZA.FE.massimaleGiorniAnno) avvisi.push(`Ferie: ${gFE} giorni nell'anno, oltre il massimale di ${CODICI_ASSENZA.FE.massimaleGiorniAnno}`);
  if(orePE>CODICI_ASSENZA.PE.massimaleOreAnno) avvisi.push(`Permessi: ${orePE} ore nell'anno, oltre il massimale di ${CODICI_ASSENZA.PE.massimaleOreAnno}`);
  return {giorniFerie:gFE,orePermessi:orePE,avvisi};
}

// ---------------------------------------------------------------------
// Economia di cantiere e cliente
// ---------------------------------------------------------------------
function quoteMovimentoPerCantiere(m){
  if(m.quote&&m.quote.length) return m.quote;
  if(m.cantiereId) return [{cantiereId:m.cantiereId,importo:+m.imponibile||0}];
  return [];
}
function importoConSegno(m){const v=+m.imponibile||0;return m.tipo==='nota_credito'?-v:v}
function economiaCantiere(cantiereId,movimenti){
  let entrate=0,uscite=0,note=0;const collegati=[];
  for(const m of movimenti){
    for(const q of quoteMovimentoPerCantiere(m)){
      if(q.cantiereId!==cantiereId) continue;
      const imp=+q.importo||0;
      if(m.tipo==='entrata') entrate+=imp;
      else if(m.tipo==='uscita') uscite+=imp;
      else if(m.tipo==='nota_credito'){ if(m.notaSu==='uscita') uscite-=imp; else {entrate-=imp;note+=imp} }
      collegati.push({movimento:m,quota:imp});
    }
  }
  const margine=entrate-uscite;
  return {entrate,uscite,margine,marginePct:entrate>0?margine/entrate*100:null,noteCredito:note,collegati};
}
function checkQuote(m){
  if(!m.quote||!m.quote.length) return {ok:true,differenza:0};
  const tot=somma(m.quote,q=>+q.importo||0);
  const diff=arrotonda2((+m.imponibile||0)-tot);
  return {ok:Math.abs(diff)<0.005,differenza:diff};
}
function giorniPagamento(m){ if(!m.dataIncasso||!m.data) return null; return giorniTra(m.data,m.dataIncasso); }

// ---------------------------------------------------------------------
// Autoverifica delle regole (eseguibile da Impostazioni → Verifica regole, o dalla console)
// ---------------------------------------------------------------------
function autoverifica(){
  const esiti=[];
  const t=(nome,cond)=>esiti.push({nome,ok:!!cond});
  t('arrotondamento 1425→1430',arrotondaAziendale(1425)===1430);
  t('arrotondamento 901→900',arrotondaAziendale(901)===900);
  t('arrotondamento 2442→2440',arrotondaAziendale(2442)===2440);
  t('arrotondamento 2443→2440',arrotondaAziendale(2443)===2440);
  t('arrotondamento 2444→2450',arrotondaAziendale(2444)===2450);
  t('arrotondamento 0→0',arrotondaAziendale(0)===0);
  t('pasqua 2026 = 05/04',pasqua(2026)==='2026-04-05');
  t('pasquetta 2026 = 06/04',festivitaAnno(2026).has('2026-04-06'));
  t('pasqua 2024 = 31/03',pasqua(2024)==='2024-03-31');
  t('1 gen 2026 festivo feriale',eFestivo('2026-01-01')&&!eLavorativo('2026-01-01'));
  t('sabato non lavorativo',!eLavorativo('2026-09-05'));
  t('giorni lavorativi gen 2026 = 20',giorniLavorativiMese(2026,1).length===20);
  t('giorni lavorativi ago 2026 = 21',giorniLavorativiMese(2026,8).length===21);
  t('CF valido',validaCodiceFiscale('RSSMRA85M01H501Q').ok);
  t('CF errato',!validaCodiceFiscale('RSSMRA85M01H501X').ok);
  t('PIVA valida',validaPartitaIva('01234567897').ok);
  t('PIVA errata',!validaPartitaIva('01234567898').ok);
  t('fEuro',fEuro(1234.5)==='1.234,50 €');
  t('fNum negativo',fNum(-1234.567)==='-1.234,57');
  t('leggiNumero it',leggiNumero('1.234,50')===1234.5);
  t('leggiNumero en',leggiNumero('1234.50')===1234.5);
  t('fData',fData('2026-09-03')==='03/09/2026');
  t('interpretaData AA.MM.GG',interpretaData('26.07.01')==='2026-07-01');
  t('interpretaData AA.MM',interpretaData('24.10')==='2024-10-01');
  t('aggiungiMesi fine mese',aggiungiMesi('2026-01-31',1)==='2026-02-28');
  const tipoVis={id:'visita',ambito:'persona',validitaMesi:12,obbligatorio:'si',nome:'Visita'};
  t('stato scaduto',statoDocumento({dataScadenza:'2026-01-01'},tipoVis,'2026-09-03').stato==='scaduto');
  t('stato in scadenza',statoDocumento({dataScadenza:'2026-10-01'},tipoVis,'2026-09-03').stato==='scadenza');
  t('stato da pianificare',statoDocumento({dataScadenza:'2026-11-20'},tipoVis,'2026-09-03').stato==='pianificare');
  t('stato valido',statoDocumento({dataScadenza:'2027-06-30'},tipoVis,'2026-09-03').stato==='valido');
  t('scadenza stimata',statoDocumento({dataEmissione:'2026-07-01'},tipoVis,'2026-09-03').stimata===true&&statoDocumento({dataEmissione:'2026-07-01'},tipoVis,'2026-09-03').data==='2027-07-01');
  t('data scritta prevale',statoDocumento({dataEmissione:'2026-07-01',dataScadenza:'2027-06-30'},tipoVis).stimata===false);
  const persona={qualifiche:['rls'],nazionalita:'Albania',retribuzione:{tipo:'oraria',tariffaOraria:17}};
  const idon=idoneitaPersona(persona,[{tipoId:'visita',dataScadenza:'2027-06-30'}],[tipoVis,{id:'rls',ambito:'persona',obbligatorio:'rls',nome:'RLS',validitaMesi:12}],'2026-09-03');
  t('idoneità: RLS mancante blocca',idon.idonea===false&&idon.motivi[0].includes('RLS'));
  t('extraUE applicabile',tipoApplicabile({ambito:'persona',obbligatorio:'extraUE'},persona)===true);
  t('extraUE non applicabile a Romania',tipoApplicabile({ambito:'persona',obbligatorio:'extraUE'},{nazionalita:'Romania'})===false);
  const mese={giorni:{'1':{ore:8},'2':{ore:8},'3':{codice:'FE'},'4':{ore:8}},aggiustamenti:[{sigla:'brc',importo:15}]};
  const calc=calcolaMesePersona(mese,persona);
  t('presenze ore griglia 24',calc.oreGriglia===24);
  t('presenze importo 24*17+15=423→420',calc.importo===420);
  t('presenze ferie contate',calc.perCodice.FE===1);
  const eco=economiaCantiere('c1',[{tipo:'entrata',imponibile:1000,quote:[{cantiereId:'c1',importo:600},{cantiereId:'c2',importo:400}]},{tipo:'uscita',imponibile:200,cantiereId:'c1'},{tipo:'nota_credito',imponibile:50,cantiereId:'c1'}]);
  t('economia cantiere margine 350',eco.margine===350);
  t('checkQuote differenza',checkQuote({imponibile:100,quote:[{importo:60},{importo:30}]}).differenza===10);
  return esiti;
}
