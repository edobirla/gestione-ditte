// ---------------------------------------------------------------------
// VERSAMENTI: F24 e Cassa Edile mese per mese, con i bonifici dentro.
// F24: si paga entro il 16 del mese (anno/mese = mese della scadenza). Cassa Edile: anno/mese = mese di
// riferimento, si paga entro la fine del mese dopo. Ogni versamento tiene il suo file nell'archivio:
// è lo stesso PDF che la committenza chiede ogni mese per pagare il SAL.
// I PDF delle quietanze a volte hanno il testo (si leggono), a volte sono scansioni (si scrive a mano).
// ---------------------------------------------------------------------
const TIPI_VERSAMENTO={f24:'F24',cassaEdile:'Cassa Edile'};
function scadenzaVersamento(v){return v.tipo==='f24'?v.anno+'-'+pad2(v.mese)+'-16':(()=>{const s=meseSuccessivo(v.anno,v.mese);return s.anno+'-'+pad2(s.mese)+'-'+pad2(giorniNelMese(s.anno,s.mese))})()}
function versamentoDi(tipo,anno,mese){return stato.versamenti.find(v=>v.tipo===tipo&&v.anno===anno&&v.mese===mese)}
// stato di una casella del calendario: pagato, da pagare a breve, scaduto da poco, non caricato, futuro
function statoCasella(tipo,anno,mese){
  const v=versamentoDi(tipo,anno,mese);if(v)return {stato:'ok',v};
  const sc=scadenzaVersamento({tipo,anno,mese});const gg=giorniTra(oggi(),sc);
  if(gg<0)return {stato:-gg<=45?'tardi':'manca',scadenza:sc};
  return {stato:gg<=20?'presto':'futuro',scadenza:sc};
}
// usato da Oggi: le scadenze vicine, solo se la sezione è in uso (almeno un versamento caricato)
function scadenzeVersamenti(){
  if(!stato.versamenti.length) return [];
  const d=new Date();const out=[];const anno=d.getFullYear(),mese=d.getMonth()+1;const prec=mesePrecedente(anno,mese);
  for(const [tipo,a,m] of [['f24',anno,mese],['cassaEdile',prec.anno,prec.mese]]){
    const c=statoCasella(tipo,a,m);if(c.stato!=='presto'&&c.stato!=='tardi')continue;
    const gg=giorniTra(oggi(),c.scadenza);
    out.push({p:c.stato==='tardi'?0:1,livello:c.stato==='tardi'?'scaduto':'scadenza',testo:tipo==='f24'?`F24 di ${nomeMese(m)}: ${c.stato==='tardi'?'scaduto il 16, carica la quietanza':'da pagare entro il 16'}`:`Cassa Edile di ${nomeMese(m)}: ${c.stato==='tardi'?'scaduta, carica la distinta':'da pagare entro il '+fData(c.scadenza)}`,sotto:c.stato==='tardi'?'':(gg===0?'scade oggi':'mancano '+plurale(gg,'giorno','giorni')),href:'versamenti'});
  }
  return out;
}
VISTE.versamenti=function(r){
  const t=r.id||'mesi';
  const prossime=scadenzeVersamenti();
  const testa=html`<div class="testata"><div><div class="occhiello">Amministrazione</div><h1>Versamenti</h1><p class="sotto">F24, Cassa Edile e stipendi, mese per mese.${prossime.length?html` <b>${plurale(prossime.length,'scadenza','scadenze')}</b> nei prossimi giorni.`:''}</p></div>
    <div class="azioni">${t==='bonifici'?html`<button class="pulsante" data-azione="bonifico-nuovo">${icona('piu','piccola')}Nuovo bonifico</button>`:''}<button class="pulsante primario" data-azione="versamenti-carica">Carica F24 o Cassa Edile<span class="manopola">${icona('carica','piccola')}</span></button></div></div>
  ${linguetteRotta('versamenti',[{id:'mesi',testo:'Mese per mese'},{id:'f24',testo:'F24',contatore:stato.versamenti.filter(v=>v.tipo==='f24').length||null},{id:'cassa',testo:'Cassa Edile',contatore:stato.versamenti.filter(v=>v.tipo==='cassaEdile').length||null},{id:'bonifici',testo:'Bonifici',contatore:stato.bonifici.length||null}],t)}`;
  if(t==='bonifici') return html`${testa}${contenutoBonifici(r)}`;
  if(t==='f24'||t==='cassa') return html`${testa}${elencoVersamenti(t==='f24'?'f24':'cassaEdile')}`;
  // mese per mese
  const anno=+(r.query.anno||ui.filtri.versamentiAnno||new Date().getFullYear());
  const anni=unici([new Date().getFullYear(),...stato.versamenti.map(v=>v.anno)]).sort((a,b)=>b-a);
  const etichetta={ok:'pagato',presto:'da pagare',tardi:'scaduto',manca:'non caricato',futuro:''};
  const cella=(tipo,m)=>{const c=statoCasella(tipo,anno,m);return html`<button class="casella-v ${c.stato}" ${c.v?html`data-azione="versamento-apri" data-id="${c.v.id}"`:c.stato==='futuro'?'disabled':html`data-azione="versamenti-carica"`} title="${c.v?'Apri':'Scadenza '+fData(c.scadenza)}"><b>${c.v?(c.v.importo===0&&c.v.voci&&c.v.voci.credito?'Compensato':c.v.importo!=null?fEuro(c.v.importo,0):'importo da scrivere'):c.stato==='futuro'?'':tipo==='f24'?'F24':'Cassa Edile'}</b><span>${c.v?(c.v.dataPagamento?'pagato il '+fDataBreve(c.v.dataPagamento):'pagato'):etichetta[c.stato]+(c.stato==='presto'?' entro il '+fDataBreve(c.scadenza):'')}</span></button>`};
  const buste=m=>{const n=stato.bustePaga.filter(b=>b.anno===anno&&b.mese===m).length;const lav=meseP(anno,m)?Object.keys(meseP(anno,m).persone).length:0;const fut=anno*100+m>new Date().getFullYear()*100+new Date().getMonth()+1;return html`<a class="casella-v ${n?'ok':fut||!lav?'futuro':'manca'}" href="#/documenti/buste"><b>${n?plurale(n,'busta','buste'):fut?'':'—'}</b><span>${n?'archiviate':lav&&!fut?'da caricare':''}</span></a>`};
  // stipendi: i bonifici fatti nel mese dopo a persone dell'anagrafica
  const nomi=new Set(stato.persone.map(p=>normalizzaTesto(nomePersona(p))));
  const stip=m=>{const s=meseSuccessivo(anno,m);const k=s.anno+'-'+pad2(s.mese);const bb=stato.bonifici.filter(b=>(b.data||'').startsWith(k)&&(nomi.has(normalizzaTesto(b.controparte))||/stipend|retribuz/i.test(b.causale||'')));return html`<a class="casella-v ${bb.length?'ok':'futuro'}" href="#/versamenti/bonifici"><b>${bb.length?fEuro(somma(bb,b=>+b.importo||0),0):''}</b><span>${bb.length?plurale(bb.length,'bonifico','bonifici'):''}</span></a>`};
  return html`${testa}
  <div class="zona-drop piccola mb" data-azione="versamenti-carica" data-drop-versamenti>${icona('carica')}<div><b>Trascina qui F24 quietanzati e distinte della Cassa Edile</b><br><span>Anche tanti insieme: riconosco di che documento si tratta, leggo mese e importo quando il PDF ha il testo. Le scansioni le completi tu.</span></div></div>
  <div class="riga mb-s"><span class="spazio"></span><select data-cambio="versamenti-anno" aria-label="Anno">${anni.map(a=>html`<option value="${a}" ${a===anno?'selected':''}>${a}</option>`)}</select></div>
  <div class="scheda"><div class="griglia-versamenti"><span></span><span class="tv">F24 · entro il 16</span><span class="tv">Cassa Edile · entro fine mese dopo</span><span class="tv">Buste paga</span><span class="tv">Stipendi pagati</span>
    ${NOMI_MESI.map((nm,i)=>html`<span class="mv">${capitalizza(nm)}</span>${cella('f24',i+1)}${cella('cassaEdile',i+1)}${buste(i+1)}${stip(i+1)}`)}</div></div>
  <p class="piccolo silenzioso mt-s">Le caselle gialle sono le prossime scadenze (compaiono anche in Oggi). Una casella pagata apre il documento; una vuota apre il caricamento.</p>`;
};
// linguette che cambiano la rotta (così si può tornare indietro e mandare il collegamento)
function linguetteRotta(sez,voci,attiva){return html`<div class="linguette" role="tablist">${voci.map(v=>html`<a role="tab" class="${v.id===attiva?'attiva':''}" href="#/${sez}${v.id===voci[0].id?'':'/'+v.id}" aria-selected="${v.id===attiva}">${v.testo}${v.contatore!=null?html`<span class="contatore ${v.critico?'critico':''}">${v.contatore}</span>`:''}</a>`)}</div>`}
AZIONI['versamenti-anno']=(d,t)=>{ui.filtri.versamentiAnno=t.value;render()};
function elencoVersamenti(tipo){
  const vv=stato.versamenti.filter(v=>v.tipo===tipo).sort((a,b)=>(b.anno*100+b.mese)-(a.anno*100+a.mese));
  if(!vv.length) return vuoto({icona:'bonifici',titolo:tipo==='f24'?'Nessun F24 caricato':'Nessuna distinta della Cassa Edile',testo:'Trascina qui i PDF: li riconosco da solo e li metto al loro mese. Finiscono anche nei pacchetti dei cantieri.',azione:{testo:'Carica',azione:'versamenti-carica'}});
  return tabella({id:'vers-'+tipo,righe:vv,onRiga:v=>apriVersamento(v.id),colonne:tipo==='f24'?[
    {chiave:'m',titolo:'Mese',principale:true,valore:v=>v.anno*100+v.mese,formatta:v=>html`<b>${fMeseAnno(v.anno,v.mese)}</b>`},
    {chiave:'p',titolo:'Pagato il',valore:v=>v.dataPagamento||'',formatta:v=>v.dataPagamento?fData(v.dataPagamento):html`<span class="silenzioso">—</span>`},
    {chiave:'inps',titolo:'INPS',num:true,valore:v=>(v.voci||{}).inps||0,formatta:v=>v.voci&&v.voci.inps!=null?fEuro(v.voci.inps):''},
    {chiave:'er',titolo:'Erario',num:true,valore:v=>(v.voci||{}).erario||0,formatta:v=>v.voci&&v.voci.erario!=null?fEuro(v.voci.erario):''},
    {chiave:'al',titolo:'Altro',num:true,valore:v=>(v.voci||{}).altro||0,formatta:v=>v.voci&&v.voci.altro?fEuro(v.voci.altro):''},
    {chiave:'tot',titolo:'Saldo',num:true,valore:v=>+v.importo||0,formatta:v=>html`<b>${fEuro(v.importo)}</b>${v.voci&&v.voci.credito?html`<br><span class="piccolo silenzioso">${fEuro(v.voci.credito)} compensati</span>`:''}`},
    {chiave:'f',titolo:'',formatta:v=>v.fileId?icona('pdf','piccola'):''}]:[
    {chiave:'m',titolo:'Mese di riferimento',principale:true,valore:v=>v.anno*100+v.mese,formatta:v=>html`<b>${fMeseAnno(v.anno,v.mese)}</b>`},
    {chiave:'s',titolo:'Scadenza',formatta:v=>fData(scadenzaVersamento(v))},
    {chiave:'p',titolo:'Pagato il',valore:v=>v.dataPagamento||'',formatta:v=>v.dataPagamento?fData(v.dataPagamento):html`<span class="silenzioso">—</span>`},
    {chiave:'tot',titolo:'Importo',num:true,valore:v=>+v.importo||0,formatta:v=>html`<b>${fEuro(v.importo)}</b>`},
    {chiave:'f',titolo:'',formatta:v=>v.fileId?icona('pdf','piccola'):''}]});
}
// ---- lettura dei PDF ----
// F24: la pagina «Quietanza di versamento» elenca le righe come «SEZIONE codice … a debito a credito».
async function leggiVersamento(file){
  const out={file,tipo:null,anno:null,mese:null,dataPagamento:null,importo:null,voci:null,trovato:[]};
  let testo='';try{if(ePdf(file.type,file.name))testo=(await estraiTestoPdf(file)).testo||''}catch(e){}
  const T=testo.toUpperCase();
  if(/DELEGA IRREVOCABILE|MODELLO DI PAGAMENTO|QUIETANZA DI VERSAMENTO|SALDO FINALE/.test(T)){out.tipo='f24';out.trovato.push('è un F24')}
  else if(/CASSA EDILE|EDILCASSA|F\.?\s?A\.?\s?L\.?\s?E\.?\s?A/.test(T)){out.tipo='cassaEdile';out.trovato.push('è una distinta della Cassa Edile')}
  else if(/f\s?24/i.test(file.name)) out.tipo='f24'; else if(/cassa|falea|edil/i.test(file.name)) out.tipo='cassaEdile';
  // data di pagamento dal nome del file: «0716» = 16 luglio (l'anno è quello corrente, o il precedente se il mese è nel futuro)
  const mm=/^(\d{2})(\d{2})(?!\d)/.exec(file.name);
  // l'anno: scritto nel nome o nel percorso (cartella «2025»), oppure la data stampata dalla banca, oppure l'anno in corso
  const annoDa=(/(20\d{2})/.exec(file.name)||/(?:^|\/)(20\d{2})(?:\/|$)/.exec(file.percorso||'')||/\d{2}\/\d{2}\/(20\d{2})/.exec(testo)||[])[1];
  if(mm&&+mm[1]>=1&&+mm[1]<=12&&+mm[2]>=1&&+mm[2]<=31){const d=new Date();let a=d.getFullYear();if(+mm[1]>d.getMonth()+1)a--;if(annoDa)a=+annoDa;out.dataPagamento=a+'-'+mm[1]+'-'+mm[2];out.trovato.push('pagato il '+fData(out.dataPagamento)+' (dal nome del file)')}
  if(out.tipo==='f24'){
    if(out.dataPagamento){out.anno=+out.dataPagamento.slice(0,4);out.mese=+out.dataPagamento.slice(5,7)}
    const sez={erario:'erario',inps:'inps',regioni:'altro',imu:'altro',inail:'altro',altri:'altro'};const voci={inps:0,erario:0,altro:0};let righe=0,debito=0,credito=0;
    for(const r of testo.split(/\r?\n/)){const x=/^\s*(ERARIO|INPS|REGIONI|IMU|INAIL|ALTRI)\b.*?(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})\s*$/i.exec(r);if(!x)continue;righe++;const de=leggiNumero(x[2])||0,cr=leggiNumero(x[3])||0;debito+=de;credito+=cr;voci[sez[x[1].toLowerCase()]]+=de-cr}
    // saldo = a debito − compensato con i crediti (può essere zero: tutto compensato)
    if(righe){out.voci={inps:arrotonda2(voci.inps),erario:arrotonda2(voci.erario),altro:arrotonda2(voci.altro),debito:arrotonda2(debito),credito:arrotonda2(credito)};out.importo=arrotonda2(debito-credito);out.trovato.push(`saldo ${fEuro(out.importo)}`+(credito?` (${fEuro(debito)} a debito, ${fEuro(credito)} compensati)`:'')+` da ${plurale(righe,'riga','righe')} della quietanza`)}
  }
  if(out.tipo==='cassaEdile'&&testo){
    const imp=/IMPORTO DEL VERSAMENTO[\s\S]{0,200}?(\d{1,3}(?:\.?\d{3})*,\d{2})/i.exec(testo)||/(\d{1,3}(?:\.?\d{3})*,\d{2})/.exec(testo);
    if(imp){out.importo=leggiNumero(imp[1]);out.trovato.push('importo '+fEuro(out.importo))}
    const per=/\b(0[1-9]|1[0-2])\s?(20\d{2})/.exec(testo.replace(/IT\d{2}[\sA-Z0-9]+/g,''));
    if(per){out.mese=+per[1];out.anno=+per[2];out.trovato.push('riferito a '+fMeseAnno(out.anno,out.mese))}
  }
  return out;
}
function arrotonda2(n){return Math.round(n*100)/100}
AZIONI['versamenti-carica']=async()=>{const fs=await scegliFile({accetta:'.pdf,image/*'});if(fs.length)caricaVersamenti(fs)};
// uno o tanti file: si leggono tutti, poi una tabella da controllare e si archiviano insieme
async function caricaVersamenti(files){
  const prog=dialogoAvanzamento('Lettura dei versamenti',{testo:'Leggo i PDF…'});
  const letti=[];
  for(let i=0;i<files.length;i++){await prog.aggiorna(i,files.length,files[i].name);letti.push(await leggiVersamento(files[i]))}
  prog.chiudi();
  const anni=unici([new Date().getFullYear()-1,new Date().getFullYear(),...letti.map(x=>x.anno).filter(Boolean)]).sort();
  const corpo=html`<p class="secondario piccolo">Controlla tipo, mese e importo: quello che ho trovato è già scritto. ${letti.some(x=>x.importo==null)?'Le scansioni senza testo vanno completate a mano.':''}</p>
  <div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>File</th><th>Tipo</th><th>Mese</th><th>Anno</th><th>Pagato il</th><th class="num">Importo</th></tr></thead><tbody>${letti.map((x,i)=>html`<tr data-i="${i}"><td><b class="taglia" style="display:block;max-width:180px" title="${x.file.name}">${x.file.name}</b><span class="piccolo silenzioso">${x.trovato.join(' · ')||'niente di leggibile: completa tu'}</span></td>
    <td><select data-c="tipo">${Object.entries(TIPI_VERSAMENTO).map(([v,t])=>html`<option value="${v}" ${x.tipo===v?'selected':''}>${t}</option>`)}</select></td>
    <td><select data-c="mese">${NOMI_MESI.map((n,k)=>html`<option value="${k+1}" ${x.mese===k+1?'selected':''}>${capitalizza(n)}</option>`)}</select></td>
    <td><select data-c="anno">${anni.map(a=>html`<option value="${a}" ${(x.anno||new Date().getFullYear())===a?'selected':''}>${a}</option>`)}</select></td>
    <td><input type="date" data-c="dataPagamento" value="${x.dataPagamento||''}"></td>
    <td><input type="text" inputmode="decimal" data-c="importo" class="num-input" style="width:110px" value="${x.importo!=null?fNum(x.importo,2):''}" placeholder="da scrivere"></td></tr>`)}</tbody></table></div>
  <p class="piccolo silenzioso mt-s">F24: il mese è quello della scadenza (il 16). Cassa Edile: il mese a cui si riferisce la distinta.</p>`;
  const v=await dialogo({titolo:plurale(letti.length,'versamento da archiviare','versamenti da archiviare'),largo:true,corpo,pulsanti:[{testo:'Annulla',valore:null},{testo:'Archivia',classe:'primario',primario:true,fn:vel=>tutti('tbody tr',vel).map(tr=>{const g=c=>tr.querySelector(`[data-c="${c}"]`).value;return {i:+tr.dataset.i,tipo:g('tipo'),mese:+g('mese'),anno:+g('anno'),dataPagamento:g('dataPagamento')||null,importo:leggiNumero(g('importo'))}})}]});
  if(!v) return;
  const doppi=v.filter(x=>versamentoDi(x.tipo,x.anno,x.mese));
  if(doppi.length&&!(await conferma(`${doppi.map(x=>TIPI_VERSAMENTO[x.tipo]+' di '+fMeseAnno(x.anno,x.mese)).join(', ')}: c'è già un versamento per quel mese. Lo sostituisco con quello nuovo? (il vecchio file resta nel cestino 30 giorni)`,{ok:'Sostituisci'})))return;
  const esiti=await acquisisciConAnteprima(v.map(x=>letti[x.i].file));if(!esiti)return;
  esegui(plurale(v.length,'versamento archiviato','versamenti archiviati'),s=>{
    v.forEach((x,k)=>{s.versamenti=s.versamenti.filter(y=>!(y.tipo===x.tipo&&y.anno===x.anno&&y.mese===x.mese));s.versamenti.push({id:nuovoId('ve'),tipo:x.tipo,anno:x.anno,mese:x.mese,dataPagamento:x.dataPagamento,importo:x.importo,voci:letti[x.i].voci||null,fileId:esiti[k].rec.id,creato:new Date().toISOString()})});
    cestinaFileOrfani(s);
  });
}
async function apriVersamento(id){
  const v=perId('versamenti',id);if(!v)return;const m=v.fileId&&fileMeta(v.fileId);
  const corpo=html`<dl class="dati-doc"><dt>Tipo</dt><dd>${TIPI_VERSAMENTO[v.tipo]}</dd><dt>${v.tipo==='f24'?'Mese':'Riferito a'}</dt><dd>${fMeseAnno(v.anno,v.mese)}</dd><dt>Scadenza</dt><dd>${fData(scadenzaVersamento(v))}</dd><dt>Pagato il</dt><dd>${v.dataPagamento?fData(v.dataPagamento):daCompilare()}</dd><dt>Importo</dt><dd><b>${v.importo!=null?fEuro(v.importo):daCompilare()}</b></dd>
    ${v.voci?html`${v.voci.credito?html`<dt>A debito</dt><dd>${fEuro(v.voci.debito)}</dd><dt>Compensato</dt><dd>${fEuro(v.voci.credito)}</dd>`:''}<dt>INPS</dt><dd>${fEuro(v.voci.inps)}</dd><dt>Erario</dt><dd>${fEuro(v.voci.erario)}</dd>${v.voci.altro?html`<dt>Altro</dt><dd>${fEuro(v.voci.altro)}</dd>`:''}`:''}${v.note?html`<dt>Note</dt><dd>${v.note}</dd>`:''}</dl>
    ${m?html`<div class="sezione-titolo">File</div><ul class="file-doc"><li>${icona('pdf','piccola')}<span class="nome-file">${m.nome}</span><span class="piccolo silenzioso">${fPeso(m.dimensione)}</span><button class="pulsante discreto icona piccolo" data-azione="file-scarica" data-id="${m.id}" title="Scarica">${icona('scarica','piccola')}</button><button class="pulsante discreto icona piccolo" data-azione="file-condividi" data-id="${m.id}" title="Condividi">${icona('condividi','piccola')}</button></li></ul>`:''}`;
  apriPannello({titolo:TIPI_VERSAMENTO[v.tipo]+' · '+fMeseAnno(v.anno,v.mese),largo:!!m,affiancato:!!m,corpo,anteprima:m?'anteprima-doc':null,piede:html`<button class="pulsante primario" data-azione="versamento-modifica" data-id="${v.id}">${icona('modifica','piccola')}Modifica</button><span class="spazio"></span><button class="pulsante discreto pericolo" data-azione="versamento-elimina" data-id="${v.id}">${icona('elimina','piccola')}Elimina</button>`});
  if(m){const a=await htmlAnteprimaFile(m.id);const c=el('#anteprima-doc');if(c)c.innerHTML=a}
}
AZIONI['versamento-apri']=d=>apriVersamento(d.id);
AZIONI['versamento-modifica']=async d=>{const v=perId('versamenti',d.id);const r=await dialogoModulo('Modifica versamento',[{nome:'tipo',etichetta:'Tipo',tipo:'select',vuoto:false,opzioni:Object.entries(TIPI_VERSAMENTO).map(([v,t])=>({v,t}))},{nome:'mese',etichetta:'Mese',tipo:'select',vuoto:false,opzioni:NOMI_MESI.map((n,i)=>({v:i+1,t:capitalizza(n)}))},{nome:'anno',etichetta:'Anno',tipo:'numero',decimali:0,obbligatorio:true},{nome:'dataPagamento',etichetta:'Pagato il',tipo:'data'},{nome:'importo',etichetta:'Importo',tipo:'euro'},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}],v);if(!r)return;esegui('Modificato versamento',s=>{const x=s.versamenti.find(y=>y.id===d.id);Object.assign(x,r,{mese:+r.mese})});apriVersamento(d.id)};
AZIONI['versamento-elimina']=async d=>{const v=perId('versamenti',d.id);if(!(await conferma(`Eliminare ${TIPI_VERSAMENTO[v.tipo]} di ${fMeseAnno(v.anno,v.mese)}? Il file resta nel cestino 30 giorni.`,{pericolo:true,ok:'Elimina'})))return;chiudiPannello();esegui('Eliminato versamento',s=>{s.versamenti=s.versamenti.filter(x=>x.id!==d.id);cestinaFileOrfani(s)})};
