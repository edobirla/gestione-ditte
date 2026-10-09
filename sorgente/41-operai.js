// ---------------------------------------------------------------------
// OPERAI: elenco, scheda persona, documenti, scadenzario complessivo.
// Qui vivono anche gli aiuti condivisi sulle scadenze (usati da dashboard, cantieri, pacchetto).
// ---------------------------------------------------------------------
// Un documento scaduto che in cantiere non viene chiesto (es. la tessera sanitaria) si può
// "tacere": lo stato resta quello vero, ma non conta più fra le cose da sistemare e non
// colora di rosso la scheda. È diverso da "senza scadenza": la data resta scritta e visibile.
function infoDocumento(doc){
  const info=statoDocumento(doc,tipoDoc(doc.tipoId),oggi(),soglie());
  if(doc&&doc.avvisoTaciuto&&['scaduto','scadenza','pianificare'].includes(info.stato)) info.silenziato=true;
  return info;
}
function documentoCritico(info){return !!info&&(info.stato==='scaduto'||info.stato==='scadenza')&&!info.silenziato}
function documentiPersona(pid){return stato.documenti.filter(d=>d.soggettoTipo==='persona'&&d.soggettoId===pid)}
function documentiAzienda(){return stato.documenti.filter(d=>d.soggettoTipo==='azienda')}
function idoneita(p){
  const r=idoneitaPersona(p,documentiPersona(p.id),stato.tipiDocumento.filter(t=>t.ambito==='persona'&&t.bloccaIdoneita),oggi(),soglie());
  // documenti richiesti ma non bloccanti (checklist): mancanti/scaduti segnalati a parte
  const nonBloccanti=idoneitaPersona(p,documentiPersona(p.id),stato.tipiDocumento.filter(t=>t.ambito==='persona'&&!t.bloccaIdoneita&&t.obbligatorio!=='no'),oggi(),soglie());
  // gli avvisi non bloccanti saltano i documenti che l'utente ha scelto di non farsi segnalare
  r.avvisi=nonBloccanti.dettagli.filter(x=>x.stato==='mancante'||(x.stato==='scaduto'&&!(x.doc&&x.doc.avvisoTaciuto))).map(x=>x.stato==='mancante'?`${x.nome}: mancante`:`${x.tipo.nome} scaduto il ${fData(x.info.data)}`);
  r.dettagliTutti=[...r.dettagli,...nonBloccanti.dettagli];
  return r;
}
function nomeSoggettoDoc(d){
  if(d.soggettoTipo==='azienda') return stato.azienda.ragioneSociale;
  if(d.soggettoTipo==='persona') return nomePersona(persona(d.soggettoId))||'[persona eliminata]';
  if(d.soggettoTipo==='cantiere') return 'Cantiere '+nomeCantiere(d.soggettoId);
  if(d.soggettoTipo==='cliente') return nomeCliente(d.soggettoId);
  if(d.soggettoTipo==='mezzo') return 'Mezzo '+nomeMezzo(perId('mezzi',d.soggettoId));
  return '';
}
function hrefSoggettoDoc(d){return d.soggettoTipo==='persona'?'#/operai/'+d.soggettoId:d.soggettoTipo==='cantiere'?'#/cantieri/'+d.soggettoId:d.soggettoTipo==='cliente'?'#/clienti/'+d.soggettoId:d.soggettoTipo==='mezzo'?'#/mezzi/'+d.soggettoId:'#/impostazioni'}
// Riepilogo scadenze su tutte le persone attive (che vanno in cantiere) e sull'azienda
function riepilogoScadenze(){
  const righe=[];const mancanti=[];
  const oggiIso=oggi();
  for(const p of stato.persone.filter(p=>p.attivo)){
    const idn=idoneita(p);
    for(const det of idn.dettagliTutti){
      if(det.stato==='mancante'&&p.inCantiere!==false) mancanti.push({persona:p,tipo:det.tipo,nome:det.nome,bloccante:!!det.tipo.bloccaIdoneita});
    }
    for(const d of documentiPersona(p.id)){
      const info=infoDocumento(d);
      righe.push({doc:d,info,soggetto:nomePersona(p),persona:p,tipo:tipoDoc(d.tipoId)});
    }
  }
  for(const d of documentiAzienda()){righe.push({doc:d,info:infoDocumento(d),soggetto:stato.azienda.ragioneSociale,persona:null,tipo:tipoDoc(d.tipoId)})}
  for(const m of stato.mezzi){for(const d of documentiDi('mezzo',m.id)){righe.push({doc:d,info:infoDocumento(d),soggetto:'Mezzo '+nomeMezzo(m),persona:null,tipo:tipoDoc(d.tipoId)})}}
  const conData=righe.filter(r=>r.info.data);
  // Un documento facoltativo (es. tessera sanitaria) non deve creare allarmi: resta comunque
  // visibile con il suo stato reale accanto al documento, nella scheda del soggetto.
  const richiesto=r=>(!r.tipo||r.tipo.obbligatorio!=='no')&&!r.info.silenziato;
  const s=soglie();
  return {
    righe,mancanti,
    scaduti:conData.filter(r=>r.info.stato==='scaduto'&&richiesto(r)),
    entro60:conData.filter(r=>r.info.stato==='scadenza'&&richiesto(r)),
    entro90:conData.filter(r=>r.info.stato==='pianificare'&&richiesto(r)),
    validi:conData.filter(r=>r.info.stato==='valido'),
    senzaScadenza:righe.filter(r=>!r.info.data),
    soglie:s,oggi:oggiIso,
  };
}
function documentoPiuCritico(p){
  const docs=documentiPersona(p.id).map(d=>({d,info:infoDocumento(d)}));
  const idn=idoneita(p);
  const manc=idn.dettagliTutti.find(x=>x.stato==='mancante');
  const ord=['scaduto','scadenza','pianificare','valido','riferimento'];
  const rango=x=>x.info.silenziato?ord.indexOf('riferimento'):ord.indexOf(x.info.stato);
  docs.sort((a,b)=>rango(a)-rango(b)||(a.info.giorni||0)-(b.info.giorni||0));
  const peggio=docs[0];
  if(manc&&manc.tipo.bloccaIdoneita&&(!peggio||peggio.info.stato!=='scaduto')) return {stato:'mancante',testo:manc.nome+': mancante'};
  if(!peggio) return manc?{stato:'mancante',testo:manc.nome+': mancante'}:{stato:'riferimento',testo:'Nessun documento'};
  const t=tipoDoc(peggio.d.tipoId);
  return {stato:peggio.info.silenziato?'riferimento':peggio.info.stato,testo:(t?t.nome:'')+(peggio.info.data?' · '+fData(peggio.info.data):''),info:peggio.info,doc:peggio.d};
}

// ---- elenco ----
VISTE.operai=function(r){
  if(r.query.nuovo){setTimeout(()=>{dialogoPersona(null)},0);history.replaceState(null,'','#/operai')}
  if(r.id==='scadenzario') return vistaScadenzario(r);
  if(r.id) return vistaPersona(r.id,r);
  const filtro=ui.filtri.operai||{stato:'attivi',cerca:''};
  let persone=stato.persone.slice();
  if(filtro.stato==='attivi') persone=persone.filter(p=>p.attivo);
  if(filtro.stato==='cessati') persone=persone.filter(p=>!p.attivo);
  if(filtro.cerca){const q=normalizzaTesto(filtro.cerca);persone=persone.filter(p=>normalizzaTesto(nomePersona(p)+' '+(p.mansione||'')+' '+(p.cf||'')).includes(q))}
  const oggiD=new Date();const km=chiaveMese(oggiD.getFullYear(),oggiD.getMonth()+1);const mm=meseP(oggiD.getFullYear(),oggiD.getMonth()+1);
  const righe=persone.map(p=>{const idn=p.inCantiere!==false?idoneita(p):null;const crit=documentoPiuCritico(p);const pros=prossimaScadenza(p);const ore=mm&&mm.persone[p.id]?calcolaMesePersona(mm.persone[p.id],p).oreGriglia:null;return {p,idn,crit,pros,ore}});
  const sc=riepilogoScadenze();
  const gruppi=[['legale_rappresentante','Legale rappresentante'],['socio','Soci'],['dipendente','Dipendenti'],['amministrativo','Amministrativi']];
  const altri=righe.filter(r=>!gruppi.some(g=>g[0]===r.p.tipo));
  const riga=r=>html`<tr class="cliccabile" data-azione="vai" data-href="operai/${r.p.id}">
    <td><span class="chi">${avatar(r.p,'medio')}<span><b>${nomePersona(r.p)}</b><span>${r.p.mansione||TIPI_PERSONA[r.p.tipo]||''}${r.p.attivo?'':' · cessato'}</span></span></span></td>
    <td>${r.idn?(r.idn.idonea?html`<span class="pillola ${r.idn.avvisi.length?'scadenza':'valido'}" title="${r.idn.avvisi.join('; ')}"><span class="punto-stato ${r.idn.avvisi.length?'scadenza':'valido'}"></span>${r.idn.avvisi.length?'Idoneo, manca '+r.idn.avvisi.length:'Idoneo'}</span>`:html`<span class="pillola scaduto" title="${r.idn.motivi.join('; ')}"><span class="punto-stato scaduto"></span>Bloccato</span><br><span class="piccolo silenzioso">${tronca(r.idn.motivi[0],44)}</span>`):html`<span class="piccolo silenzioso">non va in cantiere</span>`}</td>
    <td class="nascondi-telefono">${r.pros?html`<div class="scad-cella"><span class="piccolo">${r.pros.nome} · <span class="${r.pros.info.stato==='scaduto'?'bad-t':r.pros.info.stato==='scadenza'?'warn-t':'silenzioso'}">${quandoScade(r.pros.info)}</span></span>${r.pros.fr!=null?html`<div class="traccia"><i class="${r.pros.info.stato==='scaduto'?'tardi':r.pros.info.stato==='scadenza'?'presto':''}" style="width:${Math.max(3,r.pros.fr*100)}%"></i></div>`:''}</div>`:html`<span class="silenzioso">—</span>`}</td>
    <td class="num nascondi-telefono">${r.ore!=null?fOre(r.ore)+' h':html`<span class="silenzioso">—</span>`}</td>
    <td class="num nascondi-telefono">${testoRetribuzione(r.p)}</td>
    <td class="nascondi-telefono silenzioso">${r.p.dataAssunzione?fData(r.p.dataAssunzione):''}</td></tr>`;
  const corpo=[...gruppi.map(([t,tit])=>[tit,righe.filter(r=>r.p.tipo===t)]),['Altri',altri]].filter(g=>g[1].length).map(([tit,rr])=>html`<tr class="gruppo-riga"><td colspan="6">${tit}</td></tr>${rr.map(riga)}`);
  return html`<div class="testata"><div><div class="occhiello">Squadra</div><h1>Operai</h1><p class="sotto">${plurale(stato.persone.filter(p=>p.attivo).length,'persona attiva','persone attive')} · <b>${plurale(sc.scaduti.length,'documento scaduto','documenti scaduti')}</b> · ${sc.entro60.length} in scadenza · ${plurale(sc.mancanti.filter(m=>m.bloccante).length,'mancante bloccante','mancanti bloccanti')}</p></div>
    <div class="azioni"><a class="pulsante" href="#/operai/scadenzario">${icona('scudo','piccola')}Scadenzario</a><button class="pulsante" data-azione="persona-da-documento" title="Carica l'UNILAV (o un altro PDF con i dati scritti) e compilo l'anagrafica">${icona('magia','piccola')}Da UNILAV</button><button class="pulsante primario" data-azione="persona-nuova">Nuova persona<span class="manopola">${icona('piu','piccola')}</span></button></div></div>
  <div class="strumenti-tabella"><input type="search" placeholder="Nome, mansione, codice fiscale" value="${filtro.cerca}" data-cambio="filtro-operai" data-campo="cerca" aria-label="Cerca persone"><div class="gruppo-pulsanti">${['attivi','tutti','cessati'].map(s=>html`<button class="pulsante ${filtro.stato===s?'attivo':''}" data-azione="filtro-operai-stato" data-valore="${s}">${capitalizza(s)}</button>`)}</div>${pulsanteCancellaFiltri(!!filtro.cerca||filtro.stato!=='attivi','filtro-operai-reset')}<span class="conteggio">${plurale(righe.length,'persona','persone')}</span></div>
  ${righe.length?html`<div class="guscio"><div class="scheda scheda-tabella"><table class="tabella elenco-persone"><thead><tr><th>Persona</th><th>Al cantiere</th><th class="nascondi-telefono">Prossima scadenza</th><th class="num nascondi-telefono">Ore ${nomeMese(oggiD.getMonth()+1)}</th><th class="num nascondi-telefono">Retribuzione</th><th class="nascondi-telefono">Assunto</th></tr></thead><tbody>${corpo}</tbody></table></div></div>`
  :vuoto({icona:'operai',titolo:filtro.stato==='cessati'?'Nessuna persona cessata':'Nessuna persona',testo:filtro.stato==='cessati'?'Quando chiudi un rapporto, la persona e i suoi documenti finiscono qui.':'Aggiungi le persone dell\'azienda per seguire documenti, scadenze e presenze.',azione:filtro.stato==='cessati'?null:{testo:'Nuova persona',azione:'persona-nuova'}})}`;
};
// la scadenza più vicina (o già passata) fra i documenti in vigore della persona
function prossimaScadenza(p){
  const xs=documentiPersona(p.id).filter(d=>!documentoSuperato(d)).map(d=>({d,info:infoDocumento(d),t:tipoDoc(d.tipoId)})).filter(x=>x.info.data&&!x.info.silenziato&&!(x.t&&(x.t.periodo||x.t.annuale))).sort((a,b)=>a.info.giorni-b.info.giorni);
  const x=xs[0];if(!x)return null;
  return {nome:x.t?x.t.nome:'Documento',info:x.info,fr:frazioneDoc(x.d,x.info),doc:x.d};
}
// quanto manca alla scadenza, come frazione del periodo di validità (1 = appena emesso, 0 = scaduto)
function frazioneDoc(d,info){if(!info.data||!d.dataEmissione)return null;const tot=giorniTra(d.dataEmissione,info.data),rim=giorniTra(oggi(),info.data);return tot>0?Math.max(0,Math.min(1,rim/tot)):null}
function quandoScade(info){if(!info.data)return '';const g=info.giorni;return g<0?'scaduto da '+plurale(-g,'giorno','giorni'):g===0?'scade oggi':g>90?'tra '+Math.round(g/30.4)+' mesi':'tra '+plurale(g,'giorno','giorni')}
const ICONA_CATEGORIA={identita:'carta-id',contratto:'contratto',sanitario:'sanitario',malattia:'sanitario',formazione:'attestato',nomina:'firma',sicurezza:'scudo',amministrativo:'documenti',impresa:'azienda',cantiere:'cantieri',mezzo:'mezzo'};
function testoRetribuzione(p){const r=p.retribuzione||{};const parti=[];if(r.tariffaOraria)parti.push(fNum(r.tariffaOraria,r.tariffaOraria%1?2:0)+' €/h');if(r.importoFisso)parti.push(fEuroInt(r.importoFisso)+'/mese');return parti.length?grezzo(parti.map(h).join(' + ')):daCompilare('da definire')}
AZIONI['filtro-operai']=(d,t)=>{ui.filtri.operai=Object.assign({stato:'attivi',cerca:''},ui.filtri.operai,{[d.campo]:t.value});render();setTimeout(()=>{const i=el('.strumenti-tabella input[type=search]');if(i&&d.campo==='cerca'){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
document.addEventListener('input',debounce(e=>{const t=e.target;if(t.matches&&t.matches('[data-cambio="filtro-operai"]')){AZIONI['filtro-operai']({campo:t.dataset.campo},t)}},250));
AZIONI['filtro-operai-stato']=d=>{ui.filtri.operai=Object.assign({stato:'attivi',cerca:''},ui.filtri.operai,{stato:d.valore});render()};
AZIONI['filtro-operai-reset']=()=>{ui.filtri.operai={stato:'attivi',cerca:''};render()};
AZIONI['persona-nuova']=()=>dialogoPersona(null);
// ---- anagrafica ricavata da un documento (UNILAV, o qualsiasi PDF con i dati scritti) ----
// L'UNILAV è il caso buono: è un modulo con "etichetta: valore", e la sezione del lavoratore è
// separata da quella del datore di lavoro (che ha gli stessi nomi di campo, e senza distinguerle si
// finirebbe per registrare l'impresa stessa come persona).
function daCodiceFiscale(cf){
  const MESI={A:1,B:2,C:3,D:4,E:5,H:6,L:7,M:8,P:9,R:10,S:11,T:12};
  if(!cf||!validaCodiceFiscale(cf).ok) return null;
  cf=cf.toUpperCase();
  const dec=(x)=>x.replace(/[LMNPQRSTUV]/g,c=>String('LMNPQRSTUV'.indexOf(c)));
  const anno=+dec(cf.slice(6,8)),mese=MESI[cf[8]],giorno=+dec(cf.slice(9,11));
  if(!mese||!giorno) return null;
  const donna=giorno>40;const g=donna?giorno-40:giorno;
  const secolo=anno>(new Date().getFullYear()%100)?1900:2000;
  return {dataNascita:(secolo+anno)+'-'+pad2(mese)+'-'+pad2(g),sesso:donna?'F':'M'};
}
function anagraficaDaTesto(testo){
  const t=testo.replace(/\r/g,'');
  const eUnilav=/unilav|comunicazione\s+obbligatoria/i.test(t);
  // nell'UNILAV si guarda solo da "Lavoratore" in poi, altrimenti si prende il datore di lavoro
  const zona=eUnilav?t.slice(Math.max(0,t.search(/\bLavoratore\b/))):t;
  const campo=(...etichette)=>{
    for(const e of etichette){
      const re=new RegExp(e+'\\s*[:\\.]?\\s*([^\\n]{1,90})','i');
      const m=re.exec(zona);
      if(m){const v=m[1].trim().replace(/\s{2,}/g,' ');if(v&&!/^[:\-–]/.test(v))return v}
    }
    return null;
  };
  const data=(x)=>{const m=x&&/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(x);return m?interpretaData(m[0]):null};
  let cf=campo('codice\\s*fiscale','codice\\s*f');
  if(cf) cf=(cf.match(/[A-Z0-9]{16}/i)||[cf])[0].toUpperCase();
  if(!cf||!validaCodiceFiscale(cf).ok){const m=zona.match(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/);if(m&&validaCodiceFiscale(m[0]).ok)cf=m[0]}
  const capM=/\bCAP[^\n:]{0,20}:\s*(\d{5})\b/i.exec(zona);
  const cap=capM?capM[1]:null;
  const comune=campo('comune\\s+di\\s+domicilio','comune\\s+di\\s+residenza','comune'),via=campo('indirizzo\\s+di\\s+domicilio','indirizzo\\s+di\\s+residenza','indirizzo');
  const dalCf=daCodiceFiscale(cf);
  const out={
    cognome:campo('cognome'),nome:campo('^nome','\\bnome\\b'),cf:cf||null,
    dataNascita:data(campo('data\\s+di\\s+nascita','nato\\s+il','nata\\s+il'))||(dalCf?dalCf.dataNascita:null),
    luogoNascita:campo('comune\\s+o\\s+in\\s+alternativa\\s+stato\\s+straniero\\s+di\\s+nascita','luogo\\s+di\\s+nascita','comune\\s+di\\s+nascita','nato\\s+a','nata\\s+a'),
    nazionalita:campo('cittadinanza','nazionalit'),
    residenza:[via,[cap,comune&&capitalizzaNome(comune)].filter(Boolean).join(' ')].filter(Boolean).join(', ')||campo('residenza')||null,
    mansione:campo('qualifica\\s+professionale[^:]*','qualifica'),
    dataAssunzione:data(campo('data\\s+inizio\\s+rapporto')),
  };
  if(out.cognome) out.cognome=capitalizzaNome(out.cognome);
  if(out.nome) out.nome=capitalizzaNome(out.nome);
  if(out.luogoNascita) out.luogoNascita=capitalizzaNome(out.luogoNascita);
  if(out.nazionalita) out.nazionalita=capitalizzaNome(out.nazionalita);
  if(out.mansione) out.mansione=capitalizzaNome(out.mansione);
  const scadPermesso=data(campo('scadenza\\s+titolo\\s+di\\s+soggiorno'));
  return {dati:out,eUnilav,scadenzaPermesso:scadPermesso,trovati:Object.entries(out).filter(([k,v])=>v).map(([k])=>k)};
}
function capitalizzaNome(x){return String(x||'').toLowerCase().replace(/(^|[\s'\-])([a-zà-ù])/g,(m,a,b)=>a+b.toUpperCase())}
AZIONI['persona-da-documento']=async d=>{
  const fs=await scegliFile({multipli:false});
  if(!fs.length) return;
  const f=fs[0];
  if(!ePdf(f.type,f.name)) return informa('Serve un documento con il testo dentro','Da una fotografia o da una scansione l’applicazione non sa leggere le lettere: servirebbe un riconoscimento del testo che non ha.\n\nFunziona con l’UNILAV e con i PDF scaricati (non fotografati). Con la carta d’identità in fotografia, compila a mano: i campi sono gli stessi.');
  const prog=dialogoAvanzamento('Lettura del documento',{testo:'Leggo «'+f.name+'»…'});
  let testo=''; try{ testo=(await estraiTestoPdf(f)).testo }catch(e){ prog.chiudi(); return segnalaErrore(e,'Non sono riuscito a leggere il PDF') }
  prog.chiudi();
  if(!testo||testo.replace(/\s/g,'').length<40) return informa('Niente testo in questo PDF','Sembra una scansione: le lettere sono un’immagine, non testo. Compila a mano oppure usa il PDF originale scaricato.');
  const r=anagraficaDaTesto(testo);
  if(!r.dati.cognome&&!r.dati.cf) return informa('Non ho riconosciuto un’anagrafica','In questo documento non ho trovato né un cognome né un codice fiscale validi.');
  const esistente=r.dati.cf?stato.persone.find(x=>x.cf&&x.cf.toUpperCase()===r.dati.cf):null;
  const conferma_=await dialogo({titolo:'Dati letti da «'+f.name+'»',corpo:html`<p class="piccolo secondario">${r.eUnilav?'Riconosciuto come UNILAV: ho letto la sezione del lavoratore, non quella del datore di lavoro.':'Letto come modulo con etichette.'} Controlla e correggi nella scheda che si apre: niente viene salvato finché non premi Salva.</p>
    <table class="tabella densa"><tbody>${Object.entries({Cognome:r.dati.cognome,Nome:r.dati.nome,'Codice fiscale':r.dati.cf,'Data di nascita':r.dati.dataNascita?fData(r.dati.dataNascita):null,'Luogo di nascita':r.dati.luogoNascita,'Cittadinanza':r.dati.nazionalita,'Residenza':r.dati.residenza,'Mansione':r.dati.mansione,'Assunzione':r.dati.dataAssunzione?fData(r.dati.dataAssunzione):null}).map(([k,v])=>html`<tr><td>${k}</td><td>${v?html`<b>${v}</b>`:html`<span class="silenzioso">non trovato</span>`}</td></tr>`)}</tbody></table>
    ${esistente?html`<div class="avviso-inline attenzione mt-s">${icona('attenzione')}<div class="corpo">Questo codice fiscale è già di <b>${nomePersona(esistente)}</b>: aggiorno la sua scheda invece di crearne una nuova.</div></div>`:''}
    ${r.scadenzaPermesso?html`<p class="piccolo secondario mt-s">Il documento indica un permesso di soggiorno in scadenza il ${fData(r.scadenzaPermesso)}: registralo fra i documenti della persona.</p>`:''}`,
    pulsanti:[{testo:'Annulla',valore:false},{testo:esistente?'Aggiorna la scheda':'Apri la scheda compilata',classe:'primario',primario:true,valore:true}]});
  if(!conferma_) return;
  const base=esistente?Object.assign({},esistente):{attivo:true,inLibroPresenze:true,sezionePresenze:'dipendenti',inCantiere:true,qualifiche:[],retribuzione:{tipo:'oraria'},tipo:'dipendente'};
  for(const [k,v] of Object.entries(r.dati)) if(v) base[k]=v;
  const pid=await dialogoPersona(esistente?base:Object.assign(base,{id:undefined}));
  if(!pid||!r.eUnilav) return;
  // L'UNILAV appena letto è anche il documento che va in archivio: lo si salva subito fra i
  // documenti della persona, così non va ricaricato una seconda volta a mano.
  await salvaUnilavFraDocumenti(pid,f,r.dati.dataAssunzione||null);
};
async function salvaUnilavFraDocumenti(pid,file,dataAssunzione){
  const esiti=await acquisisciConAnteprima([new File([file],nomeFileProposto('unilav',file.name)||file.name,{type:file.type})]);
  if(!esiti||!esiti.length) return;
  const fileId=esiti[0].rec.id;
  // se lo stesso file è già allegato a un UNILAV di questa persona, non si duplica niente
  const giaLi=stato.documenti.find(d=>d.soggettoTipo==='persona'&&d.soggettoId===pid&&d.tipoId==='unilav'&&(d.file||[]).includes(fileId));
  if(giaLi){avviso('UNILAV già presente fra i documenti');return}
  const id=nuovoId('d');
  esegui('Salvato UNILAV fra i documenti',s=>{
    // un UNILAV precedente ancora valido viene marcato come sostituito da questo
    for(const v of s.documenti) if(v.soggettoTipo==='persona'&&v.soggettoId===pid&&v.tipoId==='unilav'&&!v.sostituitoDa) v.sostituitoDa=id;
    s.documenti.push({id,soggettoTipo:'persona',soggettoId:pid,tipoId:'unilav',titolo:'',dataEmissione:dataAssunzione,dataScadenza:null,dataFine:null,anno:null,durata:'',senzaScadenza:true,verificato:false,note:'Caricato da: '+file.name,file:[fileId],creato:new Date().toISOString()});
  });
}
AZIONI['persona-modifica']=d=>dialogoPersona(persona(d.id));
// Quando qualcuno cessa serve la carta che lo dice (licenziamento o dimissioni): si carica qui e
// finisce fra i suoi documenti. Da quel momento la sua documentazione non ingombra più l'archivio,
// ma non si perde: si rivede con "Mostra archiviati".
AZIONI['persona-cessa']=async d=>{
  const p=persona(d.id);
  let fileNuovo=null;
  const testoZona=()=>html`${icona('carica')}${fileNuovo?fileNuovo.name:'Trascina qui la lettera o clicca per sceglierla'}`;
  const v=await dialogoModulo('Cessa '+nomePersona(p),[
    {nome:'dataCessazione',etichetta:'Data di cessazione',tipo:'data',obbligatorio:true},
    {nome:'motivo',etichetta:'Per',tipo:'select',vuoto:false,obbligatorio:true,opzioni:[{v:'dimissioni',t:'Dimissioni'},{v:'licenziamento',t:'Licenziamento'},{v:'fine',t:'Fine del contratto a termine'},{v:'pensione',t:'Pensionamento'},{v:'altro',t:'Altro'}]},
    {nome:'note',etichetta:'Note',tipo:'textarea',largo:true},
  ],{dataCessazione:oggi(),motivo:'dimissioni'},{ok:'Cessa',
    intro:html`<p class="piccolo secondario">Non risulterà più attiva: sparisce da nuove assegnazioni in cantiere, dalle presenze future e dallo scadenzario. I suoi documenti restano tutti, ma vengono archiviati: nell'elenco Documenti si rivedono con «Mostra archiviati».</p>`,
    coda:html`<div class="sezione-titolo">Lettera di dimissioni o licenziamento</div><div class="zona-drop" id="dlg-cess-drop" data-drop-locale>${testoZona()}</div><p class="piccolo secondario">Facoltativa, ma è la carta che serve se la chiedono.</p>`,
    alMontaggio:v2=>{
      const zona=v2.querySelector('#dlg-cess-drop');
      const rinfresca=()=>{zona.innerHTML=String(testoZona())};
      zona.addEventListener('click',async()=>{const fs=await scegliFile({multipli:false});if(fs.length){fileNuovo=fs[0];rinfresca()}});
      zona.addEventListener('dragover',e=>{e.preventDefault();zona.classList.add('sopra');if(e.dataTransfer)e.dataTransfer.dropEffect='copy'});
      zona.addEventListener('dragleave',()=>zona.classList.remove('sopra'));
      zona.addEventListener('drop',async e=>{e.preventDefault();e.stopPropagation();zona.classList.remove('sopra');const fs=await fileDaDrop(e.dataTransfer);if(fs.length){fileNuovo=fs[0];rinfresca()}});
    }});
  if(!v) return;
  const MOTIVI={dimissioni:'Dimissioni',licenziamento:'Licenziamento',fine:'Fine del contratto a termine',pensione:'Pensionamento',altro:'Cessazione'};
  let fileId=null;
  if(fileNuovo){ try{ const es=await acquisisciFile(fileNuovo,{}); fileId=es.rec.id; }catch(e){ segnalaErrore(e,'Lettera non archiviata') } }
  esegui('Cessato '+nomePersona(p),s=>{
    const x=s.persone.find(x=>x.id===p.id);x.attivo=false;x.dataCessazione=v.dataCessazione;
    if(v.note)x.note=(x.note?x.note+'\n':'')+MOTIVI[v.motivo]+' il '+fData(v.dataCessazione)+': '+v.note;
    if(fileId||v.motivo){
      s.documenti.push({id:nuovoId('d'),soggettoTipo:'persona',soggettoId:p.id,tipoId:'cessazione',titolo:MOTIVI[v.motivo],
        dataEmissione:v.dataCessazione,dataScadenza:null,dataFine:null,anno:null,senzaScadenza:true,
        file:fileId?[fileId]:[],note:v.note||'',creato:new Date().toISOString()});
    }
  });
  avviso(nomePersona(p)+' cessata il '+fData(v.dataCessazione)+'. I suoi documenti sono archiviati.');
};
AZIONI['persona-riattiva']=async d=>{
  const p=persona(d.id);
  if(!(await conferma('Riattivare '+nomePersona(p)+'? Torna attiva e assegnabile ai cantieri.')))return;
  esegui('Riattivato '+nomePersona(p),s=>{const x=s.persone.find(x=>x.id===p.id);x.attivo=true;x.dataCessazione=null});
};

// ---- scheda persona ----
function vistaPersona(id,r){
  const p=persona(id); if(!p) return html`<div class="vuoto">${icona('attenzione')}<h3>Persona non trovata</h3><a class="pulsante" href="#/operai">Torna all'elenco</a></div>`;
  const idn=p.inCantiere!==false?idoneita(p):null;
  const ling=linguettaAttiva('persona:'+p.id,'panoramica');
  const docs=documentiPersona(p.id);
  const nDocCritici=docs.filter(d=>!documentoSuperato(d)&&documentoCritico(infoDocumento(d))).length+(idn?idn.dettagliTutti.filter(x=>x.stato==='mancante').length:0);
  const cantieriAperti=stato.cantieri.filter(c=>(c.stato==='attivo'||c.stato==='sospeso')&&((c.operai||[]).includes(p.id)||c.prepostoId===p.id));
  const nBuste=stato.bustePaga.filter(b=>b.personaId===p.id).length;
  return html`<div class="testata-persona">
    <button class="foto-persona-bottone" data-azione="persona-foto-menu" data-id="${p.id}" aria-label="Foto di ${nomePersona(p)}" title="${p.fotoImg?'Cambia o ritaglia la foto':'Aggiungi una foto'}">${p.fotoImg?html`<img src="${p.fotoImg}" alt="Foto di ${nomePersona(p)}" class="foto-persona">`:html`<span class="foto-persona placeholder ${coloreDa(p.id)}">${iniziali(nomePersona(p))}</span>`}</button>
    <div class="nome-persona"><div class="occhiello">${[p.mansione,TIPI_PERSONA[p.tipo]].filter(Boolean).join(' · ')}${(p.qualifiche||[]).length?' · '+p.qualifiche.map(q=>QUALIFICHE[q]||q).join(', '):''}</div><h1>${nomePersona(p)}</h1>
      <div class="chip-persona">${idn?(idn.idonea?html`<span class="pillola ${idn.avvisi.length?'scadenza':'valido'}"><span class="punto-stato ${idn.avvisi.length?'scadenza':'valido'}"></span>Idoneo al cantiere</span>`:html`<span class="pillola scaduto"><span class="punto-stato scaduto"></span>Non può entrare in cantiere</span>`):html`<span class="pillola">Non va in cantiere</span>`}
      ${p.dataAssunzione?html`<span class="pillola">Dal ${fData(p.dataAssunzione)}</span>`:''}${p.attivo?'':html`<span class="pillola scaduto">Cessato il ${fData(p.dataCessazione)}</span>`}
      ${cantieriAperti.map(c=>html`<a class="cantiere-tag ${coloreCantiere(c)}" href="#/cantieri/${c.id}">${c.nome}</a>`)}</div></div>
    <div class="azioni"><button class="pulsante" data-azione="persona-modifica" data-id="${p.id}">${icona('modifica','piccola')}Modifica</button>${p.attivo?html`<button class="pulsante discreto pericolo" data-azione="persona-cessa" data-id="${p.id}">Cessa</button>`:html`<button class="pulsante" data-azione="persona-riattiva" data-id="${p.id}">${icona('aggiorna','piccola')}Riattiva</button>`}<button class="pulsante primario" data-azione="documento-nuovo" data-soggetto-tipo="persona" data-soggetto-id="${p.id}" data-drop-soggetto="persona:${p.id}" title="Puoi anche trascinare qui le scansioni">Aggiungi documento<span class="manopola">${icona('piu','piccola')}</span></button></div></div>
  ${idn&&!idn.idonea?html`<div class="avviso-inline critico">${icona('blocco')}<div class="corpo"><b>Non può entrare in cantiere:</b> ${idn.motivi.join('; ')}</div></div>`:''}
  ${idn&&idn.avvisi.length?html`<div class="avviso-inline attenzione">${icona('attenzione')}<div class="corpo"><b>Da regolarizzare</b> (richiesti dalle committenze, non bloccanti): ${idn.avvisi.join('; ')}</div></div>`:''}
  ${linguette('persona:'+p.id,[{id:'panoramica',testo:'Panoramica'},{id:'documenti',testo:'Documenti',contatore:nDocCritici||docs.filter(d=>!documentoSuperato(d)).length||null,critico:nDocCritici>0},{id:'buste',testo:'Buste paga',contatore:nBuste||null},{id:'ore',testo:'Presenze'},{id:'cantieri',testo:'Cantieri',contatore:cantieriAperti.length||null},{id:'anagrafica',testo:'Anagrafica'},{id:'retribuzione',testo:'Retribuzione'}],ling)}
  ${ling==='panoramica'?schedaPanoramicaPersona(p,idn):ling==='documenti'?schedaDocumentiPersona(p,idn):ling==='anagrafica'?schedaAnagrafica(p):ling==='buste'?schedaBustePersona(p):ling==='ore'?schedaOrePersona(p):ling==='cantieri'?schedaCantieriPersona(p):schedaRetribuzione(p)}`;
}
// riga di un documento: icona, nome, dettaglio, barra della scadenza, data, freccia
function rigaDocumento(r){
  const t=r.tipo;const d=r.d;const info=r.info;const fr=d?frazioneDoc(d,info):null;
  const manca=!d;const file=d?(d.file||[]).length:0;
  const sotto=manca?'manca: '+(r.motivo||'da caricare'):[d.titolo,d.ente,t&&t.periodo&&d.dataFine?'dal '+fData(d.dataEmissione)+' al '+fData(d.dataFine):'',t&&t.annuale?'anno '+(d.anno||'?'):'',file?'':'nessun file allegato'].filter(Boolean).join(' · ')||(file===1?'1 file':file+' file');
  const tag=manca?html`<span class="pillola scaduto">manca</span>`:info.data&&!(t&&(t.periodo||t.annuale))?html`<span class="pillola ${info.silenziato?'neutro':info.stato==='scaduto'?'scaduto':info.stato==='scadenza'?'scadenza':'valido'}" title="${quandoScade(info)}">${fData(info.data)}</span>`:html`<span class="pillola neutro">${t&&t.annuale?'annuale':t&&t.periodo?'periodo':'non scade'}</span>`;
  return html`<li ${manca?html`data-azione="documento-nuovo" data-soggetto-tipo="persona" data-soggetto-id="${r.pid}" data-tipo-id="${t?t.id:''}"`:html`data-azione="doc-apri" data-id="${d.id}"`}><span class="icona-doc ${manca?'vuota':''}">${icona(manca?'piu':ICONA_CATEGORIA[(t&&t.categoria)||'amministrativo']||'documenti','piccola')}</span><div class="testo-doc"><b>${t?t.nome:'[tipo?]'}</b><span class="${manca||!file?'bad-t':''}">${sotto}</span></div><div class="barra-doc">${fr!=null?html`<div class="traccia"><i class="${info.stato==='scaduto'?'tardi':info.stato==='scadenza'?'presto':''}" style="width:${Math.max(3,fr*100)}%"></i></div>`:''}</div><div class="data-doc">${tag}</div>${icona('destra','piccola va')}</li>`;
}
function schedaPanoramicaPersona(p,idn){
  const docs=documentiPersona(p.id).filter(d=>!documentoSuperato(d)).map(d=>({d,info:infoDocumento(d),tipo:tipoDoc(d.tipoId),pid:p.id}));
  const manc=(idn?idn.dettagliTutti.filter(x=>x.stato==='mancante'):[]).map(x=>({tipo:x.tipo,info:{},pid:p.id,motivo:x.tipo&&x.tipo.bloccaIdoneita?'blocca il cantiere':'richiesto'}));
  const occhio=[...manc,...docs.filter(x=>x.info.data&&!x.info.silenziato).sort((a,b)=>a.info.giorni-b.info.giorni)].slice(0,6);
  // ultimi sei mesi: ore in presenze e netto della busta (con il confronto)
  const d=new Date();const mesi=[];for(let i=5;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);const anno=x.getFullYear(),mese=x.getMonth()+1;const mp=(meseP(anno,mese)||{persone:{}}).persone[p.id];const calc=mp?calcolaMesePersona(mp,p):null;const b=stato.bustePaga.find(y=>y.personaId===p.id&&y.anno===anno&&y.mese===mese);mesi.push({anno,mese,ore:calc?calc.oreGriglia:0,imp:calc?calc.importo:null,b,c:b?confrontoBusta(b):null})}
  const mx=Math.max(...mesi.map(m=>m.ore),1);const r=p.retribuzione||{};
  return html`<div class="bento">
    <div class="guscio c-7"><div class="scheda"><div class="intesta"><h2>Da tenere d’occhio</h2><a class="vai" data-azione="linguetta-persona" data-id="${p.id}" data-valore="documenti">Tutti i documenti ${icona('destra','piccola')}</a></div>
      ${occhio.length?html`<ul class="righe-doc">${occhio.map(rigaDocumento)}</ul>`:html`<p class="secondario piccolo">Nessuna scadenza in vista e nessun documento mancante.</p>`}</div></div>
    <div class="guscio c-5"><div class="scheda"><div class="intesta"><h2>Dati principali</h2><a class="vai" data-azione="persona-modifica" data-id="${p.id}">Modifica</a></div>
      <dl class="dati-doc"><dt>Codice fiscale</dt><dd class="mono">${valoreODaCompilare(p.cf)}</dd><dt>Nato</dt><dd>${[p.dataNascita?fData(p.dataNascita):'',p.luogoNascita].filter(Boolean).join(' · ')||daCompilare()}</dd><dt>Telefono</dt><dd>${p.telefono?contattoCliccabile('tel',p.telefono):daCompilare()}</dd><dt>Mansione</dt><dd>${valoreODaCompilare(p.mansione)}</dd><dt>Retribuzione</dt><dd>${testoRetribuzione(p)}</dd><dt>Firma</dt><dd>${p.firmaImg?html`<span class="pillola valido">${icona('ok','piccola')}caricata</span>`:html`<a href="#" data-azione="persona-firma" data-id="${p.id}">Carica da una foto</a>`}</dd></dl></div></div>
    <div class="guscio c-12"><div class="scheda"><div class="intesta"><h2>Ore e netto, ultimi sei mesi</h2><span class="piccolo silenzioso">la busta paga contro le presenze</span><a class="vai" data-azione="linguetta-persona" data-id="${p.id}" data-valore="buste">Buste paga ${icona('destra','piccola')}</a></div>
      <div class="sei-mesi">${mesi.map(m=>html`<a class="mese-col" href="#/presenze/${chiaveMese(m.anno,m.mese)}"><span class="colonna-ore"><i style="height:${m.ore?Math.max(6,m.ore/mx*100):3}%"></i></span><span class="riga stretta" style="justify-content:space-between"><b>${NOMI_MESI_BREVI[m.mese-1]}</b><span class="silenzioso">${fOre(m.ore)||0} h</span></span><span class="piccolo">${m.b&&m.b.netto!=null?html`${fEuro(m.b.netto,0)} ${m.c&&m.c.scarto&&!(m.b.verifica&&m.b.verifica.stato==='accettata')?html`<span class="pillola scadenza" title="Differenza con il tuo importo">${m.c.diffEuro!=null?(m.c.diffEuro>0?'+':'')+fNum(m.c.diffEuro,0):'≠'}</span>`:icona('ok','piccola ok-t')}`:m.imp!=null?html`<span class="silenzioso">busta da caricare</span>`:html`<span class="silenzioso">—</span>`}</span></a>`)}</div></div></div>
  </div>`;
}
AZIONI['linguetta-persona']=d=>{ui.filtri['ling:persona:'+d.id]=d.valore;render();window.scrollTo({top:0,behavior:'smooth'})};
function schedaDocumentiPersona(p,idn){
  const q=normalizzaTesto(ui.filtri.docPersona||'');
  const mostraRinnovati=!!ui.filtri.docPersonaArchiviati;
  const tutti=documentiPersona(p.id);
  const rinnovati=tutti.filter(d=>documentoSuperato(d)).length;
  let docs=(mostraRinnovati?tutti:tutti.filter(d=>!documentoSuperato(d))).map(d=>({d,info:infoDocumento(d),tipo:tipoDoc(d.tipoId),pid:p.id}));
  if(q) docs=docs.filter(r=>normalizzaTesto([r.tipo&&r.tipo.nome,r.d.titolo,r.d.note,r.d.ente,r.d.anno,r.d.dataEmissione&&fData(r.d.dataEmissione),r.info.data&&fData(r.info.data)].filter(Boolean).join(' ')).includes(q));
  const mancanti=(idn?idn.dettagliTutti.filter(x=>x.stato==='mancante'):[]).filter(x=>!q||normalizzaTesto(x.nome).includes(q)).map(x=>({tipo:x.tipo,info:{},pid:p.id,motivo:x.tipo&&x.tipo.bloccaIdoneita?'blocca il cantiere':'richiesto'}));
  const ord=['scaduto','scadenza','pianificare','valido','riferimento'];
  docs.sort((a,b)=>ord.indexOf(a.info.stato)-ord.indexOf(b.info.stato)||(a.info.giorni||0)-(b.info.giorni||0));
  // per argomento, chiuso quello che è a posto: si trova tutto senza scorrere
  const gruppi=new Map();
  for(const r of [...mancanti,...docs]){const c=(r.tipo&&r.tipo.categoria)||'amministrativo';if(!gruppi.has(c))gruppi.set(c,[]);gruppi.get(c).push(r)}
  const chiavi=Array.from(gruppi.keys()).sort((a,b)=>{const ia=ORDINE_CATEGORIE_DOC.indexOf(a),ib=ORDINE_CATEGORIE_DOC.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)});
  const problemi=rr=>rr.filter(r=>!r.d||documentoCritico(r.info)).length;
  return html`<div class="strumenti-tabella"><input type="search" placeholder="Cerca fra i documenti di ${nomePersona(p)}" value="${ui.filtri.docPersona||''}" data-cambio="filtro-doc-persona" aria-label="Cerca documenti">${rinnovati?html`<label class="spunta piccolo" title="Documenti sostituiti da un rinnovo più recente dello stesso tipo"><input type="checkbox" data-cambio="filtro-doc-persona-archiviati" ${mostraRinnovati?'checked':''}> Mostra rinnovati (${rinnovati})</label>`:''}<span class="spazio"></span><button class="pulsante" data-azione="documento-nuovo" data-soggetto-tipo="persona" data-soggetto-id="${p.id}">${icona('carica','piccola')}Carica</button></div>
  <div class="zona-drop piccola mb" data-azione="documento-nuovo" data-soggetto-tipo="persona" data-soggetto-id="${p.id}" data-drop-soggetto="persona:${p.id}">${icona('carica')}<div><b>Trascina qui un file di ${p.nome||nomePersona(p)}</b><br><span>PDF o foto: riconosco il tipo dal nome e dal testo, leggo le date e lo assegno a ${p.nome||nomePersona(p)}.</span></div></div>
  ${gruppi.size?html`<div class="guscio"><div class="scheda">${chiavi.map(c=>{const rr=gruppi.get(c);const pb=problemi(rr);return html`<details class="gruppo-doc" ${pb||q||gruppi.size<=2?'open':''}><summary>${icona('destra','piccola freccia')}<b>${CATEGORIE_TIPO_DOC[c]||c}</b><span class="pillola neutro">${rr.length}</span>${pb?html`<span class="pillola scadenza">${pb} da sistemare</span>`:''}</summary><ul class="righe-doc">${rr.map(rigaDocumento)}</ul></details>`})}</div></div>`
  :html`<div class="vuoto">${icona('documenti')}<h3>${q?'Nessun documento trovato':'Nessun documento'}</h3><p>${q?'Prova con un altro termine di ricerca.':'Trascina qui sopra le scansioni, o usa «Carica».'}</p></div>`}`;
}
AZIONI['filtro-doc-persona']=(d,t)=>{ui.filtri.docPersona=t.value;render();setTimeout(()=>{const i=el('[data-cambio="filtro-doc-persona"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)};
AZIONI['filtro-doc-persona-archiviati']=(d,t)=>{ui.filtri.docPersonaArchiviati=t.checked;render()};
document.addEventListener('input',debounce(e=>{const t=e.target;if(t.matches&&t.matches('[data-cambio="filtro-doc-persona"]'))AZIONI['filtro-doc-persona']({},t)},250));

function schedaAnagrafica(p){
  const cfv=p.cf?validaCodiceFiscale(p.cf):null;
  const v=(x,fmt)=>valoreODaCompilare(x,fmt);
  const scheda=(tit,corpo,az)=>html`<div class="guscio c-6"><div class="scheda"><div class="intesta"><h2>${tit}</h2>${az||''}</div>${corpo}</div></div>`;
  const modifica=html`<a class="vai" data-azione="persona-modifica" data-id="${p.id}">Modifica</a>`;
  return html`<div class="bento">
  ${scheda('Dati anagrafici',html`<dl class="dati-doc"><dt>Cognome</dt><dd>${v(p.cognome)}</dd><dt>Nome</dt><dd>${v(p.nome)}</dd><dt>Codice fiscale</dt><dd class="mono">${v(p.cf)} ${cfv&&!cfv.ok?html`<span class="da-compilare piccolo">${cfv.errore}</span>`:''}</dd><dt>Nato il</dt><dd>${v(p.dataNascita,fData)}</dd><dt>A</dt><dd>${v(p.luogoNascita)}</dd><dt>Nazionalità</dt><dd>${v(p.nazionalita)}</dd><dt>Residenza</dt><dd>${v(p.residenza)}</dd></dl>`,modifica)}
  ${scheda('Contatti e rapporto di lavoro',html`<dl class="dati-doc"><dt>Telefono</dt><dd>${p.telefono?contattoCliccabile('tel',p.telefono):daCompilare()}</dd><dt>Email</dt><dd>${p.email?contattoCliccabile('mail',p.email):daCompilare()}</dd><dt>Tipo</dt><dd>${v(TIPI_PERSONA[p.tipo])}</dd><dt>Mansione</dt><dd>${v(p.mansione)}</dd><dt>Assunzione</dt><dd>${v(p.dataAssunzione,fData)}</dd><dt>Cessazione</dt><dd>${p.dataCessazione?fData(p.dataCessazione):p.attivo?'in forza':daCompilare()}</dd><dt>Qualifiche</dt><dd>${(p.qualifiche||[]).length?p.qualifiche.map(q=>html`<span class="etichetta-tag">${QUALIFICHE[q]||q}</span> `):html`<span class="silenzioso">nessuna</span>`}</dd></dl>`,modifica)}
  ${scheda('Presenze e cantiere',html`<dl class="dati-doc"><dt>Libro presenze</dt><dd>${p.inLibroPresenze?html`sì, sezione ${p.sezionePresenze}${p.soloTrasferte?' (solo riga trasferte)':''}`:'no'}</dd><dt>Va in cantiere</dt><dd>${p.inCantiere!==false?'sì':'no'}</dd><dt>Festività pagate</dt><dd>${p.festivitaPagate?'sì':'no'}</dd></dl>`,modifica)}
  ${scheda('Firma',p.firmaImg?html`<div class="riquadro-firma"><img src="${p.firmaImg}" alt="Firma di ${nomePersona(p)}"></div>`:html`<p class="secondario piccolo">Nessuna firma. Fotografa la firma su un foglio bianco: l'app toglie lo sfondo e la usa nelle nomine che questa persona deve firmare per accettazione.</p>`,html`<span class="spazio"></span><button class="pulsante piccolo" data-azione="persona-firma" data-id="${p.id}">${icona('fotocamera','piccola')}${p.firmaImg?'Sostituisci':'Carica da una foto'}</button>${p.firmaImg?html`<button class="pulsante piccolo discreto pericolo" data-azione="persona-firma-togli" data-id="${p.id}">Togli</button>`:''}`)}
  ${p.note?html`<div class="guscio c-12"><div class="scheda"><div class="intesta"><h2>Note</h2></div><p>${p.note}</p></div></div>`:''}
  </div>`;
}
// Firma da foto: si sceglie la soglia guardando l'anteprima, perché la carta fotografata non è mai
// bianca allo stesso modo (ombra, foglio giallino, scansione chiara).
AZIONI['persona-foto-togli']=async d=>{const p=persona(d.id);if(!(await conferma('Togliere la foto di '+nomePersona(p)+'?',{pericolo:true})))return;esegui('Tolta la foto di '+nomePersona(p),s=>{s.persone.find(x=>x.id===d.id).fotoImg=null})};
AZIONI['persona-foto']=async d=>{
  const p=persona(d.id);
  const fs=await scegliFile({multipli:false,accetta:'image/*'});
  if(!fs.length) return;
  let img,originale; try{ originale=await comprimiImmagine(fs[0],{maxLato:1200,obiettivo:200*1024}); img=await caricaImmagine(originale.blob); }
  catch(e){ return segnalaErrore(e,'Non sono riuscito a leggere «'+fs[0].name+'»: se è una foto HEIC dell\'iPhone riesportala in JPG'); }
  const dataUrl=await ritagliaFoto(img,nomePersona(p));
  if(!dataUrl) return;
  const orig=await leggiComeDataUrl(originale.blob);
  esegui('Foto di '+nomePersona(p),s=>{const x=s.persone.find(x=>x.id===d.id);x.fotoImg=dataUrl;x.fotoOrig=orig});
};
// Ritaglio di nuovo la foto già caricata: la inquadratura si aggiusta senza ricercare il file.
AZIONI['persona-foto-ritaglia']=async d=>{
  const p=persona(d.id);
  const sorgente=p.fotoOrig||p.fotoImg;
  if(!sorgente) return;
  const img=await caricaImmagine(await (await fetch(sorgente)).blob());
  const dataUrl=await ritagliaFoto(img,nomePersona(p));
  if(!dataUrl) return;
  esegui('Ritagliata la foto di '+nomePersona(p),s=>{s.persone.find(x=>x.id===d.id).fotoImg=dataUrl});
};
// Click sulla foto grande nella scheda: senza foto va dritto a scegliere il file, con la foto
// già presente chiede cosa fare (come si tocca la foto profilo su WhatsApp).
AZIONI['persona-foto-menu']=async d=>{
  const p=persona(d.id);
  if(!p.fotoImg) return AZIONI['persona-foto'](d);
  const scelta=await dialogo({titolo:'Foto di '+nomePersona(p),corpo:html`<div class="riga" style="justify-content:center"><img src="${p.fotoImg}" alt="Foto di ${nomePersona(p)}" class="foto-persona" style="width:180px;height:180px"></div>`,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Togli',classe:'pericolo',sinistra:true,valore:'togli'},{testo:'Ritaglia',valore:'ritaglia'},{testo:'Cambia foto',classe:'primario',primario:true,valore:'cambia'}]});
  if(scelta==='cambia') return AZIONI['persona-foto'](d);
  if(scelta==='ritaglia') return AZIONI['persona-foto-ritaglia'](d);
  if(scelta==='togli') return AZIONI['persona-foto-togli'](d);
};
// Il ritaglio si fa a mano: la faccia non sta quasi mai al centro della foto, e un ritaglio
// automatico centrato taglia le teste. Si trascina l'immagine e si ingrandisce finché il
// riquadro (quadrato con angoli stondati, com'è mostrata la foto grande nella scheda) va bene.
function ritagliaFoto(img,nome){
  const LATO=320;
  let scala=1,ox=0,oy=0;
  const corpo=html`<p class="piccolo secondario">Trascina la foto per spostarla e usa la barra (o la rotella) per ingrandirla. Quello che vedi nel riquadro è quello che si vedrà.</p>
    <div class="ritaglio-foto"><canvas id="rf-tela" width="${LATO}" height="${LATO}"></canvas></div>
    <div class="riga mt-s"><span class="piccolo secondario">Ingrandimento</span><input type="range" id="rf-zoom" min="100" max="400" value="100" style="flex:1"></div>`;
  return dialogo({titolo:'Foto di '+nome,corpo,senzaFocus:true,valoreEscape:null,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Usa questa foto',classe:'primario',primario:true,fn:v=>v.querySelector('#rf-tela').toDataURL('image/jpeg',0.85)}],
    alMontaggio:v=>{
      const tela=v.querySelector('#rf-tela'),ctx=tela.getContext('2d'),zoom=v.querySelector('#rf-zoom');
      const base=Math.max(LATO/img.width,LATO/img.height); // la foto copre sempre tutto il quadrato
      ox=(LATO-img.width*base)/2;oy=(LATO-img.height*base)/2;
      const limita=()=>{const w=img.width*base*scala,hh=img.height*base*scala;ox=Math.min(0,Math.max(LATO-w,ox));oy=Math.min(0,Math.max(LATO-hh,oy))};
      const disegna=()=>{limita();ctx.fillStyle='#fff';ctx.fillRect(0,0,LATO,LATO);ctx.drawImage(img,ox,oy,img.width*base*scala,img.height*base*scala)};
      disegna();
      zoom.addEventListener('input',()=>{const nuovo=+zoom.value/100;const c=LATO/2;ox=c-(c-ox)*(nuovo/scala);oy=c-(c-oy)*(nuovo/scala);scala=nuovo;disegna()});
      let trascina=null;
      tela.addEventListener('pointerdown',e=>{trascina={x:e.clientX-ox,y:e.clientY-oy};tela.setPointerCapture(e.pointerId)});
      tela.addEventListener('pointermove',e=>{if(!trascina)return;ox=e.clientX-trascina.x;oy=e.clientY-trascina.y;disegna()});
      const fine=()=>trascina=null;tela.addEventListener('pointerup',fine);tela.addEventListener('pointercancel',fine);
      tela.addEventListener('wheel',e=>{e.preventDefault();const nuovo=Math.min(4,Math.max(1,scala*(e.deltaY<0?1.1:1/1.1)));const c=LATO/2;ox=c-(c-ox)*(nuovo/scala);oy=c-(c-oy)*(nuovo/scala);scala=nuovo;zoom.value=Math.round(nuovo*100);disegna()},{passive:false});
    }});
}
AZIONI['persona-firma-togli']=async d=>{const p=persona(d.id);if(!(await conferma('Togliere la firma di '+nomePersona(p)+'?',{pericolo:true})))return;esegui('Tolta la firma di '+nomePersona(p),s=>{s.persone.find(x=>x.id===d.id).firmaImg=null})};
AZIONI['persona-firma']=async d=>{
  const p=persona(d.id);
  const fs=await scegliFile({multipli:false,accetta:'image/*'});
  if(!fs.length) return;
  let soglia=SOGLIA_FIRMA,ultima=null;
  const ris=await dialogo({titolo:'Firma di '+nomePersona(p),largo:true,
    corpo:html`<p class="piccolo secondario">Lo sfondo del foglio diventa trasparente: resta solo il tratto della penna. Se sparisce troppo alza la soglia, se resta il grigio del foglio abbassala.</p>
      <div class="campo"><span class="etichetta-campo">Soglia dello sfondo</span><input type="range" id="fr-soglia" min="120" max="245" value="${SOGLIA_FIRMA}"> <span id="fr-val">${SOGLIA_FIRMA}</span></div>
      <div class="riquadro-firma mt" style="min-height:120px"><img id="fr-ant" alt="Anteprima della firma"></div>
      <p class="piccolo da-compilare" id="fr-errore"></p>`,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Salva la firma',classe:'primario',primario:true,fn:()=>ultima}],
    alMontaggio:v=>{
      const sl=v.querySelector('#fr-soglia'),val=v.querySelector('#fr-val'),ant=v.querySelector('#fr-ant'),err=v.querySelector('#fr-errore');
      const aggiorna=async()=>{val.textContent=sl.value;try{ultima=await firmaSenzaSfondo(fs[0],+sl.value);ant.src=ultima;err.textContent=''}catch(e){ultima=null;ant.removeAttribute('src');err.textContent=e.message}};
      sl.addEventListener('input',debounce(aggiorna,120));
      aggiorna();
    }});
  if(!ris) return;
  esegui('Firma di '+nomePersona(p),s=>{s.persone.find(x=>x.id===d.id).firmaImg=ris});
};
function schedaBustePersona(p){
  const buste=stato.bustePaga.filter(b=>b.personaId===p.id);
  const anni=unici([...buste.map(b=>b.anno),new Date().getFullYear()]).sort((a,b)=>b-a);
  const oggiD=new Date();
  return html`<div class="strumenti-tabella"><span class="secondario piccolo">Clicca un mese per vedere la busta. Un mese rosso ha ore in presenze ma nessuna busta.</span><span class="spazio"></span><a class="pulsante" href="#/documenti/buste?persona=${p.id}">${icona('busta-paga','piccola')}Smistamento buste</a></div>
  ${anni.map(anno=>html`<div class="guscio mb"><div class="scheda"><div class="intesta"><h2>${anno}</h2><span class="piccolo silenzioso">${plurale(buste.filter(b=>b.anno===anno).length,'busta','buste')}</span></div><div class="mesi-12">${Array.from({length:12},(_,i)=>i+1).map(m=>{const b=buste.find(x=>x.anno===anno&&x.mese===m);const futuro=anno>oggiD.getFullYear()||(anno===oggiD.getFullYear()&&m>oggiD.getMonth());const lavorato=!!(meseP(anno,m)&&meseP(anno,m).persone[p.id]);const c=b?confrontoBusta(b):null;return html`<div class="mese-cella ${b?'presente':futuro?'futuro':lavorato?'mancante':'vuota'}" ${b?html`data-azione="busta-apri" data-id="${b.id}"`:''} title="${b?'Busta paga':futuro?'':lavorato?'Mese lavorato senza busta paga':'Nessuna busta'}"><b>${NOMI_MESI_BREVI[m-1]}</b><span>${b?(b.netto!=null?fEuro(b.netto,0):'busta'):lavorato&&!futuro?'manca':''}</span>${c&&c.scarto&&!(b.verifica&&b.verifica.stato==='accettata')?html`<i class="segno-scarto" title="Il netto non torna con le presenze"></i>`:''}</div>`})}</div></div></div>`)}`;
}
function schedaOrePersona(p){
  const oggiD=new Date();const righe=[];
  for(let i=0;i<12;i++){const d=new Date(oggiD.getFullYear(),oggiD.getMonth()-i,1);const anno=d.getFullYear(),mese=d.getMonth()+1;const m=meseP(anno,mese);const mp=m&&m.persone[p.id];const calc=mp?calcolaMesePersona(mp,p):null;righe.push({anno,mese,mp,calc})}
  const anno=oggiD.getFullYear();const mesiAnno=Object.keys(stato.presenze).filter(k=>k.startsWith(anno+'-')).map(k=>stato.presenze[k].persone[p.id]).filter(Boolean);
  let fe=0,pe=0;for(const mp of mesiAnno)for(const c of Object.values(mp.giorni||{})){const v=valoreCella(c);if(v==='FE')fe++;if(v==='PE')pe+=8}
  const ult=righe.find(x=>x.calc);
  return html`<div class="griglia quattro mb"><div class="indicatore" style="cursor:default"><span class="etichetta">${ult?fMeseAnno(ult.anno,ult.mese):'Ultimo mese'} · ore</span><span class="valore md">${ult?fOre(ult.calc.oreGriglia):'—'}</span></div><div class="indicatore" style="cursor:default"><span class="etichetta">Importo</span><span class="valore md">${ult?fEuro(ult.calc.importo,0):'—'}</span></div><div class="indicatore" style="cursor:default"><span class="etichetta">Ferie nel ${anno}</span><span class="valore md">${fe} <span class="piccolo silenzioso">/ ${CODICI_ASSENZA.FE.massimaleGiorniAnno} giorni</span></span></div><div class="indicatore" style="cursor:default"><span class="etichetta">Permessi nel ${anno}</span><span class="valore md">${pe} <span class="piccolo silenzioso">/ ${CODICI_ASSENZA.PE.massimaleOreAnno} h</span></span></div></div>
  <div class="guscio"><div class="scheda"><div class="intesta"><h2>Ultimi dodici mesi</h2><span class="spazio"></span><button class="pulsante piccolo" data-azione="presenze-compila" data-k="${chiaveMese(oggiD.getFullYear(),oggiD.getMonth()+1)}" data-pid="${p.id}">${icona('tastiera','piccola')}Compila il mese di ${p.nome||''}</button></div>${tabella({righe,href:r=>'#/presenze/'+chiaveMese(r.anno,r.mese),colonne:[
    {chiave:'mese',titolo:'Mese',principale:true,formatta:r=>html`<b>${fMeseAnno(r.anno,r.mese)}</b>`},
    {chiave:'ore',titolo:'Ore',num:true,formatta:r=>r.calc?fOre(r.calc.oreGriglia):html`<span class="silenzioso">—</span>`},
    {chiave:'assenze',titolo:'Assenze',formatta:r=>r.calc?Object.entries(r.calc.perCodice).map(([c,n])=>html`<span class="etichetta-tag" title="${CODICI_ASSENZA[c]?CODICI_ASSENZA[c].nome:c}">${c} ${n}</span> `):''},
    {chiave:'importo',titolo:'Importo',num:true,formatta:r=>r.calc?html`${fEuro(r.calc.importo,0)}`:html`<span class="silenzioso">—</span>`},
    {chiave:'foglio',titolo:'Foglio ore',formatta:r=>r.mp&&r.mp.foglioOreId?html`<button class="pulsante piccolo" data-azione="file-apri" data-id="${r.mp.foglioOreId}">${icona('immagine','piccola')}Vedi</button>`:html`<span class="silenzioso">—</span>`},
  ]})}</div></div>`;
}
function schedaCantieriPersona(p){
  const cs=stato.cantieri.filter(c=>(c.operai||[]).includes(p.id)||c.prepostoId===p.id);
  return html`<div class="scheda"><h3>Cantieri</h3>${cs.length?tabella({righe:cs,href:c=>'#/cantieri/'+c.id,colonne:[{chiave:'nome',titolo:'Cantiere',principale:true,formatta:c=>html`<b>${c.nome}</b>${c.prepostoId===p.id?html` <span class="etichetta-tag">preposto</span>`:''}`},{chiave:'periodo',titolo:'Periodo',formatta:c=>c.dataInizio?fData(c.dataInizio)+' → '+(c.dataFine?fData(c.dataFine):'…'):(c.periodoTesto||'')},{chiave:'aff',titolo:'Impresa affidataria',formatta:c=>nomeCliente(c.affidatariaId)},{chiave:'stato',titolo:'Stato',formatta:c=>STATI_CANTIERE[c.stato]||c.stato}]}):html`<p class="secondario">Non è assegnato a nessun cantiere.</p>`}</div>`;
}
function schedaRetribuzione(p){
  const r=p.retribuzione||{};
  const mesi=Object.keys(stato.presenze).sort().reverse().filter(k=>stato.presenze[k].persone[p.id]).slice(0,24);
  const righe=mesi.map(k=>{const {anno,mese}=daChiaveMese(k);const mp=stato.presenze[k].persone[p.id];const calc=calcolaMesePersona(mp,p);return {k,anno,mese,calc,mp}});
  return html`<div class="griglia due"><div class="scheda"><h3>Retribuzione <span class="azioni"><button class="pulsante piccolo" data-azione="persona-modifica" data-id="${p.id}">${icona('modifica')}Modifica</button></span></h3>
    <div class="campi"><div class="campo"><span class="etichetta-campo">Tipo</span><div>${{oraria:'Oraria',fissa:'Fissa mensile',mista:'Oraria + fisso'}[r.tipo]||daCompilare()}</div></div><div class="campo"><span class="etichetta-campo">Tariffa oraria</span><div>${r.tariffaOraria?fNum(r.tariffaOraria,2)+' €/h':html`<span class="silenzioso">—</span>`}</div></div><div class="campo"><span class="etichetta-campo">Importo fisso</span><div>${r.importoFisso?fEuro(r.importoFisso)+'/mese':html`<span class="silenzioso">—</span>`}</div></div></div>
    <p class="piccolo secondario mt">Importo mensile = arrotondamento aziendale (ore in griglia × tariffa + aggiustamenti + fisso). L'arrotondamento è a multipli di 10: resto 0–3 per difetto, 4–9 per eccesso.</p></div>
  <div class="scheda"><h3>Storico importi mensili</h3>${righe.length?html`${graficoBarre(righe.slice().reverse().map(x=>({etichetta:NOMI_MESI_BREVI[x.mese-1]+' '+String(x.anno).slice(2),valore:x.calc.importo||0})),{formatta:v=>fNum(v,0),altezza:180})}${tabella({righe,colonne:[{chiave:'k',titolo:'Mese',principale:true,formatta:x=>html`<a href="#/presenze/${x.k}">${fMeseAnno(x.anno,x.mese)}</a>`},{chiave:'ore',titolo:'Ore',num:true,formatta:x=>fOre(x.calc.oreGriglia)},{chiave:'imp',titolo:'Importo',num:true,formatta:x=>fEuro(x.calc.importo,0)}]})}`:html`<p class="secondario">Nessun mese registrato.</p>`}</div></div>`;
}
// ---- dialogo persona ----
function dialogoPersona(p){
  const nuovo=!p||!p.id; p=p||{attivo:true,inLibroPresenze:true,sezionePresenze:'dipendenti',inCantiere:true,qualifiche:[],retribuzione:{tipo:'oraria'}};
  const campi=[
    {nome:'cognome',etichetta:'Cognome',obbligatorio:true},{nome:'nome',etichetta:'Nome',obbligatorio:true},
    {nome:'tipo',etichetta:'Tipo',tipo:'select',vuoto:false,opzioni:Object.entries(TIPI_PERSONA).map(([v,t])=>({v,t}))},{nome:'mansione',etichetta:'Mansione'},
    {nome:'cf',etichetta:'Codice fiscale',maiuscolo:true,valida:validatoreCF},{nome:'dataNascita',etichetta:'Data di nascita',tipo:'data'},{nome:'luogoNascita',etichetta:'Luogo di nascita'},{nome:'nazionalita',etichetta:'Nazionalità',aiuto:'Serve per sapere se occorre il permesso di soggiorno'},
    {nome:'residenza',etichetta:'Residenza',largo:true},{nome:'telefono',etichetta:'Telefono',tipo:'tel'},{nome:'email',etichetta:'Email',tipo:'email',valida:validatoreEmail},
    {nome:'dataAssunzione',etichetta:'Data assunzione',tipo:'data'},{nome:'dataCessazione',etichetta:'Data cessazione',tipo:'data'},
    {nome:'qualifiche',etichetta:'Qualifiche',tipo:'chip',largo:true,opzioni:Object.entries(QUALIFICHE).map(([v,t])=>({v,t}))},
    {nome:'retribuzione.tipo',etichetta:'Retribuzione',tipo:'select',vuoto:false,opzioni:[{v:'oraria',t:'Oraria'},{v:'fissa',t:'Fissa mensile'},{v:'mista',t:'Oraria + fisso mensile'}]},
    {nome:'retribuzione.tariffaOraria',etichetta:'Tariffa oraria',tipo:'euro'},{nome:'retribuzione.importoFisso',etichetta:'Importo fisso mensile',tipo:'euro'},
    {nome:'attivo',tipo:'spunta',testo:'In forza (attivo)'},{nome:'inCantiere',tipo:'spunta',testo:'Va in cantiere (calcola idoneità)'},{nome:'inLibroPresenze',tipo:'spunta',testo:'Compare nel libro presenze'},
    {nome:'festivitaPagate',tipo:'spunta',testo:'Festività pagate',aiuto:'Le festività cadute in giorno feriale (FS) si aggiungono all\'importo del mese; si può togliere una singola festività dal riepilogo del mese.'},
  ];
  if(!nuovo) campi.push(
    {nome:'sezionePresenze',etichetta:'Sezione presenze',tipo:'select',vuoto:false,opzioni:[{v:'soci',t:'Soci'},{v:'dipendenti',t:'Dipendenti'}]},{nome:'soloTrasferte',tipo:'spunta',testo:'Solo riga trasferte (niente ore)'},
    {nome:'note',etichetta:'Note',tipo:'textarea',largo:true},
  );
  const val=clona(p);
  return dialogoModulo(nuovo?'Nuova persona':'Modifica '+nomePersona(p),campi,val,{validaTutto:v=>{if(v.dataAssunzione&&v.dataCessazione&&v.dataCessazione<v.dataAssunzione)return 'La cessazione non può precedere l\'assunzione';return null},pulsantiExtra:nuovo?[]:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{
    const a=stato.azienda;
    if(p.id===a.legaleRappresentanteId||p.id===a.rsppId||p.id===a.rlsId){avviso('È il Legale Rappresentante, RSPP o RLS: cambialo prima nei Dati aziendali (Impostazioni)',{tipo:'errore'});return false}
    if(!(await conferma('Eliminare definitivamente '+nomePersona(p)+'? Vengono cancellati anche i suoi documenti, le buste paga e le presenze registrate. Non si può annullare.',{pericolo:true,ok:'Elimina'})))return false;
    esegui('Eliminata '+nomePersona(p),s=>{
      s.persone=s.persone.filter(x=>x.id!==p.id);
      s.documenti=s.documenti.filter(d=>!(d.soggettoTipo==='persona'&&d.soggettoId===p.id));
      s.bustePaga=s.bustePaga.filter(b=>b.personaId!==p.id);
      s.regoleBuste=(s.regoleBuste||[]).filter(r=>r.personaId!==p.id);
      for(const k of Object.keys(s.presenze||{})) delete s.presenze[k].persone[p.id];
      cestinaFileOrfani(s);
    });
    vai('operai');
    return null;
  }}]}).then(v=>{
    if(!v) return;
    // lo schema orario non si modifica più a mano: resta quello già salvato, se c'era
    delete v.schemaOrarioAttivo;delete v.schemaOrario;
    if(v.dataCessazione) v.attivo=false;
    if(nuovo){const id=nuovoId('p');esegui('Aggiunta '+v.cognome+' '+v.nome,s=>{s.persone.push(Object.assign({id,fotoId:null,firmaId:null},v))});vai('operai/'+id);return id}
    esegui('Modificata '+nomePersona(p),s=>{const x=s.persone.find(x=>x.id===p.id);Object.assign(x,v)});
    return p.id;
  });
}

// ---- scadenzario complessivo ----
function vistaScadenzario(r){
  const sc=riepilogoScadenze();
  const conData=sc.righe.filter(x=>x.info.data).sort((a,b)=>a.info.data<b.info.data?-1:1);
  const filtro=ui.filtri.scadenzario||'tutti';
  const visibili=filtro==='tutti'?conData:filtro==='critici'?conData.filter(x=>['scaduto','scadenza','pianificare'].includes(x.info.stato)):conData.filter(x=>x.info.stato===filtro);
  const barra=x=>{const fr=frazioneDoc(x.doc,x.info);return fr!=null?html`<div class="traccia"><i class="${x.info.stato==='scaduto'?'tardi':x.info.stato==='scadenza'?'presto':''}" style="width:${Math.max(3,fr*100)}%"></i></div>`:''};
  const chi=x=>x.doc.soggettoTipo==='persona'&&persona(x.doc.soggettoId)?html`<span class="chi">${avatar(persona(x.doc.soggettoId),'mini')}<span>${x.soggetto}</span></span>`:x.soggetto;
  const nomeDoc=x=>html`<b>${x.tipo?x.tipo.nome:'Documento'}</b>${x.doc.titolo?html` <span class="piccolo silenzioso">${x.doc.titolo}</span>`:''}${(x.doc.file||[]).length?'':html` <span class="pillola scaduto">senza file</span>`}`;
  return html`<div class="testata"><div><div class="occhiello">Squadra</div><h1>Scadenzario</h1><p class="sotto">Tutti i documenti con una scadenza, dal più urgente. Clicca una riga per aprirlo, rinnovarlo o sostituirlo.</p></div>
  <div class="azioni"><button class="pulsante" data-azione="stampa-scadenzario">${icona('stampa','piccola')}Stampa</button><button class="pulsante" data-azione="esporta-scadenzario-md">${icona('scarica','piccola')}Markdown</button><button class="pulsante" data-azione="esporta-scadenzario-csv">${icona('scarica','piccola')}CSV</button></div></div>
  <div class="griglia quattro mb">
    <div class="indicatore critico" data-azione="filtro-scadenzario" data-valore="scaduto"><span class="etichetta">${icona('errore')}Scaduti</span><span class="valore">${sc.scaduti.length}</span></div>
    <div class="indicatore critico" data-azione="filtro-scadenzario" data-valore="mancanti"><span class="etichetta">${icona('blocco')}Mancanti</span><span class="valore">${sc.mancanti.length}</span><span class="nota">${sc.mancanti.filter(m=>m.bloccante).length} bloccanti</span></div>
    <div class="indicatore attenzione" data-azione="filtro-scadenzario" data-valore="scadenza"><span class="etichetta">${icona('attenzione')}Entro ${sc.soglie.scadenza} giorni</span><span class="valore">${sc.entro60.length}</span></div>
    <div class="indicatore" data-azione="filtro-scadenzario" data-valore="pianificare"><span class="etichetta">${icona('calendario')}Entro ${sc.soglie.pianificare} giorni</span><span class="valore">${sc.entro90.length}</span></div>
  </div>
  <div class="strumenti-tabella"><div class="gruppo-pulsanti">${[['tutti','Tutti'],['critici','Da fare'],['scaduto','Scaduti'],['scadenza','In scadenza'],['pianificare','Da pianificare'],['valido','Validi'],['mancanti','Mancanti']].map(([v,t])=>html`<button class="pulsante piccolo ${filtro===v?'attivo':''}" data-azione="filtro-scadenzario" data-valore="${v}">${t}</button>`)}</div><span class="conteggio">${filtro==='mancanti'?plurale(sc.mancanti.length,'documento mancante','documenti mancanti'):plurale(visibili.length,'scadenza','scadenze')}</span></div>
  ${sc.mancanti.length&&(filtro==='tutti'||filtro==='mancanti')?html`<div class="guscio mb"><div class="scheda scheda-tabella"><div class="card-h"><h2>${icona('blocco')}Documenti mancanti</h2></div><table class="tabella"><thead><tr><th>Documento</th><th>Di chi</th><th>Effetto</th></tr></thead><tbody>${sc.mancanti.map(m=>html`<tr class="cliccabile" data-azione="vai" data-href="operai/${m.persona.id}/documenti"><td><b>${m.nome}</b></td><td><span class="chi">${avatar(m.persona,'mini')}<span>${nomePersona(m.persona)}</span></span></td><td>${m.bloccante?html`<span class="pillola scaduto">${icona('blocco')}Blocca l'ingresso in cantiere</span>`:html`<span class="pillola pianificare">${icona('info')}Richiesto dalle committenze</span>`}</td></tr>`)}</tbody></table></div></div>`:''}
  ${filtro!=='mancanti'?(visibili.length?html`<div class="guscio"><div class="scheda scheda-tabella"><table class="tabella"><thead><tr><th>Documento</th><th>Di chi</th><th class="num">Scadenza</th><th class="nascondi-telefono" style="width:180px"></th><th>Stato</th></tr></thead><tbody>${visibili.map(x=>html`<tr class="cliccabile riga-${x.info.stato}" data-azione="doc-apri" data-id="${x.doc.id}"><td>${nomeDoc(x)}</td><td>${chi(x)}</td><td class="num"><b class="${x.info.stimata?'stimata':''}">${fData(x.info.data)}${x.info.stimata?' ~':''}</b><br><span class="piccolo silenzioso">${quandoScade(x.info)}</span></td><td class="nascondi-telefono">${barra(x)}</td><td>${pillolaDocumento(x.info,{breve:true})}</td></tr>`)}</tbody></table></div></div>`:html`<div class="vuoto">${icona('ok')}<h3>Niente in questo filtro</h3></div>`):''}
  ${filtro==='tutti'&&sc.senzaScadenza.length?html`<details class="gruppo-doc mt"><summary>Senza scadenza (riferimento) <span class="pillola neutro">${sc.senzaScadenza.length}</span></summary><div class="scheda scheda-tabella"><table class="tabella"><tbody>${sc.senzaScadenza.map(x=>html`<tr class="cliccabile" data-azione="doc-apri" data-id="${x.doc.id}"><td>${nomeDoc(x)}</td><td>${chi(x)}</td><td class="num silenzioso">${x.doc.dataEmissione?fData(x.doc.dataEmissione):'—'}</td></tr>`)}</tbody></table></div></details>`:''}`;
}
AZIONI['filtro-scadenzario']=d=>{ui.filtri.scadenzario=ui.filtri.scadenzario===d.valore?'tutti':d.valore;render()};
