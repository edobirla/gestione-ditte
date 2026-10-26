// ---------------------------------------------------------------------
// COMMERCIALISTA: il pacchetto di fine mese, con le stesse cartelle che l'azienda tiene sul disco:
//   «9 fatture attive n 4/» e «9 fatture passive n 30/» con gli XML, «9 settembre/» con i PDF.
// Le fatture arrivano dallo ZIP scaricato dal portale (filtrato dal primo all'ultimo del mese) o da
// XML singoli: attive e passive si dividono da sole con la partita IVA dell'azienda, il mese lo
// sceglie chi carica (è quello del filtro sul portale, non si indovina dalle date).
// Prima nota e liquidazione IVA (da SimplyFatt) si caricano qui perché non stanno altrove; tutto il
// resto si prende da dove è già (Versamenti, Bonifici, Documenti): niente si carica due volte.
// stato.fatture[] = {id, fileId, mese:'AAAA-MM', tipo:'attiva'|'passiva', numero, data, tipoDocumento,
//                    controparte, piva, imponibile, imposta, totale, allegati}
// stato.commercialista['AAAA-MM'] = {primaNota:fileId, iva:fileId, altri:[fileId], esclusi:[fileId],
//                    preparato:ISO, inviato:ISO, contenuto:[percorsi nel pacchetto]}
// ---------------------------------------------------------------------
const POSTI_COMMERCIALISTA=[['primaNota','Prima nota'],['iva','Liquidazione IVA']];
// Documenti dell'archivio che vanno al commercialista se sono datati nel mese (in attesa dell'elenco
// completo dell'azienda): polizze, bolli e verbali dei mezzi, verbali e SAL dei cantieri.
const TIPI_DOC_COMMERCIALISTA=['polizza','mezzo_assicurazione','mezzo_bollo','mezzo_verbale','verbale_cantiere','sal_cantiere'];
const TIPI_FATTURA={TD01:'Fattura',TD02:'Acconto su fattura',TD03:'Acconto su parcella',TD04:'Nota di credito',TD05:'Nota di debito',TD06:'Parcella',TD16:'Integrazione reverse charge',TD17:'Autofattura servizi dall’estero',TD18:'Integrazione beni intra UE',TD19:'Integrazione beni art. 17 c. 2',TD20:'Autofattura di regolarizzazione',TD21:'Autofattura per splafonamento',TD22:'Estrazione da deposito IVA',TD23:'Estrazione da deposito IVA con versamento',TD24:'Fattura differita',TD25:'Fattura differita (triangolare)',TD26:'Cessione di beni ammortizzabili',TD27:'Autoconsumo o cessione gratuita',TD28:'Acquisto da San Marino'};
const MODI_PAGAMENTO={MP01:'Contanti',MP02:'Assegno',MP03:'Assegno circolare',MP05:'Bonifico',MP07:'Bollettino bancario',MP08:'Carta di pagamento',MP09:'RID',MP12:'RIBA',MP16:'Domiciliazione bancaria',MP19:'SEPA Direct Debit',MP21:'SEPA Direct Debit B2B',MP23:'PagoPA'};
const NATURE_IVA={N1:'Esclusa art. 15',N2:'Non soggetta',N3:'Non imponibile',N4:'Esente',N5:'Regime del margine',N6:'Inversione contabile',N7:'IVA assolta in altro Stato UE'};
function naturaIva(n){return n?(NATURE_IVA[n.slice(0,2)]||n)+' ('+n+')':''}

// ---- lettura dell'XML FatturaPA: tutto quello che serve a mostrarla per intero ----
// Si cammina per figli diretti con il nome locale: i tag sono senza namespace tranne la radice, e un
// selettore per discendenti confonderebbe per esempio la Data del documento con quella dei DDT.
function leggiFatturaXml(testo){
  const doc=new DOMParser().parseFromString(testo,'application/xml');
  const radice=doc.documentElement;
  if(doc.querySelector('parsererror')||!radice||radice.localName!=='FatturaElettronica') throw new Error('non è una fattura elettronica');
  const figli=(els,nome)=>els.flatMap(e=>Array.from(e.children).filter(c=>c.localName===nome));
  const tutti=(el,perc)=>el?perc.split('/').reduce((a,nome)=>figli(a,nome),[el]):[];
  const uno=(el,perc)=>tutti(el,perc)[0]||null;
  const t=(el,perc)=>{const e=uno(el,perc);return e?e.textContent.trim():''};
  const n=(el,perc)=>{const v=parseFloat(t(el,perc));return isNaN(v)?null:v};
  const soggetto=el=>({
    nome:t(el,'DatiAnagrafici/Anagrafica/Denominazione')||[t(el,'DatiAnagrafici/Anagrafica/Nome'),t(el,'DatiAnagrafici/Anagrafica/Cognome')].filter(Boolean).join(' '),
    paese:t(el,'DatiAnagrafici/IdFiscaleIVA/IdPaese'),piva:t(el,'DatiAnagrafici/IdFiscaleIVA/IdCodice'),cf:t(el,'DatiAnagrafici/CodiceFiscale'),
    via:[t(el,'Sede/Indirizzo'),t(el,'Sede/NumeroCivico')].filter(Boolean).join(' '),cap:t(el,'Sede/CAP'),comune:t(el,'Sede/Comune'),provincia:t(el,'Sede/Provincia'),nazione:t(el,'Sede/Nazione'),
    email:t(el,'Contatti/Email'),telefono:t(el,'Contatti/Telefono'),rea:[t(el,'IscrizioneREA/Ufficio'),t(el,'IscrizioneREA/NumeroREA')].filter(Boolean).join('-')});
  const testa=uno(radice,'FatturaElettronicaHeader');
  const corpi=tutti(radice,'FatturaElettronicaBody');
  if(!testa||!corpi.length) throw new Error('fattura senza intestazione o senza corpo');
  const cedente=soggetto(uno(testa,'CedentePrestatore')),cessionario=soggetto(uno(testa,'CessionarioCommittente'));
  const documenti=corpi.map(b=>{
    const dg=uno(b,'DatiGenerali/DatiGeneraliDocumento');
    const rif=(perc,num,data)=>tutti(b,'DatiGenerali/'+perc).map(e=>({numero:t(e,num),data:t(e,data)})).filter(x=>x.numero||x.data);
    const riepilogo=tutti(b,'DatiBeniServizi/DatiRiepilogo').map(r=>({aliquota:n(r,'AliquotaIVA'),natura:t(r,'Natura'),imponibile:n(r,'ImponibileImporto')||0,imposta:n(r,'Imposta')||0,esigibilita:t(r,'EsigibilitaIVA'),norma:t(r,'RiferimentoNormativo')}));
    const imponibile=arrotonda2(somma(riepilogo,r=>r.imponibile)),imposta=arrotonda2(somma(riepilogo,r=>r.imposta));
    const totale=n(dg,'ImportoTotaleDocumento');
    return {
      tipoDocumento:t(dg,'TipoDocumento'),divisa:t(dg,'Divisa')||'EUR',data:t(dg,'Data'),numero:t(dg,'Numero'),
      causale:tutti(dg,'Causale').map(e=>e.textContent.trim()).join(' '),
      ritenute:tutti(dg,'DatiRitenuta').map(e=>({tipo:t(e,'TipoRitenuta'),importo:n(e,'ImportoRitenuta')||0,aliquota:n(e,'AliquotaRitenuta')})),
      bollo:n(dg,'DatiBollo/ImportoBollo'),
      casse:tutti(dg,'DatiCassaPrevidenziale').map(e=>({tipo:t(e,'TipoCassa'),importo:n(e,'ImportoContributoCassa')||0})),
      ordini:rif('DatiOrdineAcquisto','IdDocumento','Data'),contratti:rif('DatiContratto','IdDocumento','Data'),
      ddt:rif('DatiDDT','NumeroDDT','DataDDT'),collegate:rif('DatiFattureCollegate','IdDocumento','Data'),
      linee:tutti(b,'DatiBeniServizi/DettaglioLinee').map(l=>({codice:t(l,'CodiceArticolo/CodiceValore'),descrizione:t(l,'Descrizione'),quantita:n(l,'Quantita'),um:t(l,'UnitaMisura'),prezzo:n(l,'PrezzoUnitario'),
        sconti:tutti(l,'ScontoMaggiorazione').map(s=>({tipo:t(s,'Tipo'),percentuale:n(s,'Percentuale'),importo:n(s,'Importo')})),totale:n(l,'PrezzoTotale'),aliquota:n(l,'AliquotaIVA'),natura:t(l,'Natura')})),
      riepilogo,imponibile,imposta,totale:totale!=null?totale:arrotonda2(imponibile+imposta),
      pagamenti:tutti(b,'DatiPagamento').flatMap(p=>tutti(p,'DettaglioPagamento').map(d=>({condizioni:t(p,'CondizioniPagamento'),modalita:t(d,'ModalitaPagamento'),scadenza:t(d,'DataScadenzaPagamento'),importo:n(d,'ImportoPagamento'),iban:t(d,'IBAN'),istituto:t(d,'IstitutoFinanziario'),beneficiario:t(d,'Beneficiario')}))),
      allegati:tutti(b,'Allegati').map(a=>({nome:t(a,'NomeAttachment'),formato:t(a,'FormatoAttachment'),descrizione:t(a,'DescrizioneAttachment'),dati:t(a,'Attachment')}))
    };
  });
  return {cedente,cessionario,documenti};
}
// Attiva se l'abbiamo emessa noi, passiva se è intestata a noi; altrimenti non è dell'azienda.
function versoFattura(f,piva){const p=String(piva||'').replace(/\D/g,'');if(!p)return null;if(f.cedente.piva.replace(/\D/g,'')===p)return 'attiva';if(f.cessionario.piva.replace(/\D/g,'')===p||f.cessionario.cf.replace(/\D/g,'')===p)return 'passiva';return null}
// Nome della cartella come nelle cartelle dell'azienda: «9 fatture attive n 4»
function cartellaFatture(mese,tipo,n){return `${+mese.slice(5)} fatture ${tipo==='attiva'?'attive':'passive'} n ${n}`}
// Numeri delle fatture emesse che mancano nella sequenza dell'anno (solo dove il numero è leggibile)
function numeriMancanti(numeri){const v=unici(numeri.map(x=>parseInt(String(x).replace(/^\D+/,''),10)).filter(x=>x>0)).sort((a,b)=>a-b);const out=[];for(let i=1;i<v.length;i++)for(let k=v[i-1]+1;k<v[i]&&out.length<20;k++)out.push(k);return out}

// ---- dati del mese ----
function meseCommercialista(k){return (stato.commercialista||{})[k]||{}}
function fattureMese(k,tipo){return (stato.fatture||[]).filter(f=>f.mese===k&&(!tipo||f.tipo===tipo)).sort((a,b)=>(a.data||'')<(b.data||'')?-1:(a.data||'')>(b.data||'')?1:String(a.numero).localeCompare(String(b.numero),'it',{numeric:true}))}
// Quello che entra nella cartella dei documenti dalle altre sezioni: F24 con scadenza nel mese,
// Cassa Edile pagata nel mese, bonifici del mese, documenti datati nel mese dei tipi scelti.
function documentiAltreSezioni(k){
  const [a,m]=k.split('-').map(Number);const nel=iso=>(iso||'').startsWith(k);const out=[];
  const metti=(fileId,fonte,href,data)=>{if(fileId&&fileMeta(fileId)&&!out.some(x=>x.fileId===fileId))out.push({fileId,fonte,href,data})};
  for(const v of stato.versamenti||[]){
    if(v.tipo==='f24'?v.anno===a&&v.mese===m:nel(v.dataPagamento)||(!v.dataPagamento&&nel(scadenzaVersamento(v)))) metti(v.fileId,'Versamenti',v.tipo==='f24'?'versamenti/f24':'versamenti/cassa',v.dataPagamento||scadenzaVersamento(v));
  }
  for(const b of stato.bonifici||[]) if(nel(b.data)) metti(b.fileId,'Bonifici','versamenti/bonifici',b.data);
  for(const d of stato.documenti) if(TIPI_DOC_COMMERCIALISTA.includes(d.tipoId)&&nel(d.dataEmissione)) for(const f of d.file||[]) metti(f,'Documenti','documenti?doc='+d.id,d.dataEmissione);
  return out.sort((x,y)=>(x.data||'')<(y.data||'')?-1:1);
}
// Tutti i file della cartella documenti, con il nome che avranno nel pacchetto
function documentiMese(k){
  const c=meseCommercialista(k);const esclusi=new Set(c.esclusi||[]);
  const propri=[...POSTI_COMMERCIALISTA.map(([p,t])=>c[p]?{fileId:c[p],fonte:t,posto:p}:null).filter(Boolean),...(c.altri||[]).filter(fileMeta).map(id=>({fileId:id,fonte:'Caricato qui',posto:'altri'}))];
  return [...propri,...documentiAltreSezioni(k)].filter(x=>fileMeta(x.fileId)).map(x=>Object.assign(x,{incluso:!esclusi.has(x.fileId),nome:nomeChiaroFile(x.fileId)}));
}
function mesiCommercialista(){
  const d=new Date();const out=new Set();for(let i=0;i<13;i++){const x=new Date(d.getFullYear(),d.getMonth()-i,1);out.add(chiaveMese(x.getFullYear(),x.getMonth()+1))}
  for(const f of stato.fatture||[])out.add(f.mese);for(const k of Object.keys(stato.commercialista||{}))out.add(k);
  return [...out].sort().reverse();
}
function meseScelto(r){const p=mesePrecedente(new Date().getFullYear(),new Date().getMonth()+1);return r.id&&/^\d{4}-\d\d$/.test(r.id)?r.id:ui.filtri.commercialista||chiaveMese(p.anno,p.mese)}

VISTE.commercialista=function(r){
  const k=meseScelto(r);const [a,m]=k.split('-').map(Number);ui.filtri.commercialista=k;
  const att=fattureMese(k,'attiva'),pas=fattureMese(k,'passiva'),docs=documentiMese(k),c=meseCommercialista(k);
  const mancaPosto=POSTI_COMMERCIALISTA.filter(([p])=>!c[p]);
  const buchi=numeriMancanti((stato.fatture||[]).filter(f=>f.tipo==='attiva'&&f.mese.slice(0,4)===String(a)&&f.tipoDocumento!=='TD04').map(f=>f.numero));
  const note=fattureMese(k).filter(f=>f.tipoDocumento==='TD04').length;
  const tot=ff=>somma(ff,f=>(f.tipoDocumento==='TD04'?-1:1)*(+f.totale||0));
  const riquadro=(titolo,valore,sotto,cls)=>html`<div class="scheda"><div class="occhiello">${titolo}</div><div class="grande-numero ${cls||''}">${valore}</div><div class="piccolo silenzioso">${sotto}</div></div>`;
  const tabFatture=(ff,tipo)=>ff.length?html`<div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>Numero</th><th>Data</th><th>${tipo==='attiva'?'Cliente':'Fornitore'}</th><th>Documento</th><th class="num">Imponibile</th><th class="num">Totale</th><th></th></tr></thead><tbody>
    ${ff.map(f=>html`<tr class="cliccabile" data-azione="fattura-apri" data-id="${f.id}" title="Apri la fattura"><td><b>${f.numero}</b></td><td>${fData(f.data)}</td><td class="taglia" style="max-width:260px">${f.controparte}</td><td>${f.tipoDocumento==='TD01'?'':html`<span class="pillola ${f.tipoDocumento==='TD04'?'scadenza':'neutro'}">${TIPI_FATTURA[f.tipoDocumento]||f.tipoDocumento}</span>`}${f.allegati?html` <span title="Con il PDF del ${tipo==='attiva'?'programma di fatturazione':'fornitore'}">${icona('pdf','piccola')}</span>`:''}</td><td class="num">${fEuro(f.imponibile)}</td><td class="num"><b>${fEuro(f.totale)}</b></td><td><button class="pulsante piccolo discreto icona" data-azione="fattura-togli" data-id="${f.id}" title="Togli dal mese">${icona('chiudi','piccola')}</button></td></tr>`)}
  </tbody></table></div>`:html`<p class="piccolo silenzioso">Nessuna fattura ${tipo==='attiva'?'emessa':'ricevuta'} caricata per ${nomeMese(m)}.</p>`;
  const cellaPosto=(p,t)=>{const id=c[p];return html`<li><span class="spazio"><b>${t}</b><br><span class="piccolo silenzioso">${id?nomeChiaroFile(id):'da SimplyFatt · non ancora caricata'}</span></span>${id?html`<button class="pulsante piccolo" data-azione="file-apri" data-id="${id}">${icona('pdf','piccola')}Apri</button><button class="pulsante piccolo discreto icona" data-azione="comm-togli" data-mese="${k}" data-posto="${p}" data-id="${id}" title="Togli">${icona('chiudi','piccola')}</button>`:html`<button class="pulsante piccolo" data-azione="comm-carica" data-mese="${k}" data-posto="${p}">${icona('carica','piccola')}Carica</button>`}</li>`};
  const altre=docs.filter(x=>!x.posto);
  return html`<div class="testata"><div><div class="occhiello">Amministrazione</div><h1>Commercialista</h1><p class="sotto">Ogni mese fatture attive e passive in XML e i documenti in PDF, nelle cartelle di sempre e pronti da mandare.</p></div>
    <div class="azioni"><button class="pulsante" data-azione="fatture-carica">${icona('carica','piccola')}Carica fatture</button><button class="pulsante primario" data-azione="comm-pacchetto" data-mese="${k}">Prepara pacchetto<span class="manopola">${icona('pacchetto','piccola')}</span></button></div></div>
  <div class="strumenti-tabella"><select data-cambio="comm-mese" aria-label="Mese">${mesiCommercialista().map(x=>html`<option value="${x}" ${x===k?'selected':''}>${fMeseAnno(+x.slice(0,4),+x.slice(5))}</option>`)}</select>
    ${c.inviato?html`<span class="pillola valido">${icona('ok','piccola')}mandato il ${fData(c.inviato.slice(0,10))}</span>`:c.preparato?html`<span class="pillola scadenza">pacchetto preparato il ${fData(c.preparato.slice(0,10))}, non segnato come mandato</span>`:''}
    <span class="spazio"></span>${c.preparato?html`<button class="pulsante piccolo discreto" data-azione="comm-inviato" data-mese="${k}">${c.inviato?'Non ancora mandato':'Segna come mandato'}</button>`:''}</div>
  ${buchi.length?html`<div class="avviso-inline attenzione">${icona('attenzione')}<div class="corpo">Fatture emesse del ${a}: nella numerazione mancano i numeri <b>${buchi.join(', ')}</b>. Forse non sono ancora state caricate.</div></div>`:''}
  <div class="griglia tre mb">
    ${riquadro('Fatture attive',att.length,att.length?fEuro(tot(att))+' totale documenti':'nessuna')}
    ${riquadro('Fatture passive',pas.length,pas.length?fEuro(tot(pas))+' totale documenti'+(note?' · '+plurale(note,'nota di credito','note di credito'):''):'nessuna')}
    ${riquadro('Documenti',docs.filter(x=>x.incluso).length,mancaPosto.length?'manca '+mancaPosto.map(([,t])=>t.toLowerCase()).join(' e '):'prima nota e IVA ci sono',mancaPosto.length?'warn-t':'')}
  </div>
  <div class="zona-drop piccola mb" data-azione="fatture-carica" data-drop-fatture>${icona('carica')}<div><b>Trascina qui lo ZIP delle fatture scaricato dal portale</b><br><span>O gli XML (anche firmati .p7m). Divido io attive e passive; il mese lo scegli tu, come il filtro sul portale.</span></div></div>
  <div class="sezione-titolo">${cartellaFatture(k,'attiva',att.length)}</div>${tabFatture(att,'attiva')}
  <div class="sezione-titolo">${cartellaFatture(k,'passiva',pas.length)}</div>${tabFatture(pas,'passiva')}
  <div class="sezione-titolo">${m} ${nomeMese(m)} · documenti</div>
  <div class="scheda" data-drop-commdoc="${k}"><ul class="elenco-piatto">${POSTI_COMMERCIALISTA.map(([p,t])=>cellaPosto(p,t))}</ul>
    <div class="sezione-titolo">Dalle altre sezioni</div>
    ${altre.length?html`<ul class="elenco-piatto">${altre.map(x=>html`<li><label class="riga stretta spazio"><input type="checkbox" data-cambio="comm-includi" data-mese="${k}" data-id="${x.fileId}" ${x.incluso?'checked':''}><span class="spazio"><b>${x.nome}</b><br><span class="piccolo silenzioso">da <a href="#/${x.href}">${x.fonte}</a></span></span></label><button class="pulsante piccolo discreto" data-azione="file-apri" data-id="${x.fileId}">Apri</button></li>`)}</ul>`:html`<p class="piccolo silenzioso">Niente per ${nomeMese(m)}: F24, Cassa Edile, bonifici, polizze e verbali compaiono qui da soli quando li carichi nelle loro sezioni.</p>`}
    <div class="sezione-titolo">Altri file</div>
    <ul class="elenco-piatto">${docs.filter(x=>x.posto==='altri').map(x=>html`<li><span class="spazio"><b>${x.nome}</b></span><button class="pulsante piccolo discreto" data-azione="file-apri" data-id="${x.fileId}">Apri</button><button class="pulsante piccolo discreto icona" data-azione="comm-togli" data-mese="${k}" data-posto="altri" data-id="${x.fileId}" title="Togli">${icona('chiudi','piccola')}</button></li>`)}</ul>
    <button class="pulsante piccolo discreto mt-s" data-azione="comm-carica" data-mese="${k}" data-posto="altri">${icona('piu','piccola')}Aggiungi file che non stanno in altre sezioni</button>
    <p class="piccolo silenzioso mt-s">Puoi trascinare i PDF su questo riquadro: prima nota e IVA le riconosco dal nome.</p></div>`;
};
AZIONI['comm-mese']=(d,t)=>vai('commercialista/'+t.value);
AZIONI['comm-includi']=(d,t)=>esegui(t.checked?'Incluso nel pacchetto':'Escluso dal pacchetto',s=>{const c=assicuraMeseComm(s,d.mese);c.esclusi=(c.esclusi||[]).filter(x=>x!==d.id);if(!t.checked)c.esclusi.push(d.id)},{silenzioso:true});
function assicuraMeseComm(s,k){s.commercialista=s.commercialista||{};return s.commercialista[k]=s.commercialista[k]||{altri:[],esclusi:[]}}
function postoDaNome(nome){const n=normalizzaTesto(nome);return /prima nota/.test(n)?'primaNota':/(^| )(iva|liquidazione|liq)( |$)/.test(n)?'iva':'altri'}
async function caricaDocumentiComm(k,files,posto){
  const esiti=[];for(const f of files){const e=await acquisisciFile(f,{});esiti.push([posto||postoDaNome(f.name),e.rec.id])}
  esegui('Caricati '+plurale(esiti.length,'documento','documenti')+' per il commercialista',s=>{const c=assicuraMeseComm(s,k);c.altri=c.altri||[];for(const [p,id] of esiti){if(p==='altri'){if(!c.altri.includes(id))c.altri.push(id)}else{if(c[p]&&c[p]!==id&&!c.altri.includes(c[p]))c.altri.push(c[p]);c[p]=id}}});
}
AZIONI['comm-carica']=async d=>{const fs=await scegliFile({multipli:d.posto==='altri',accetta:'.pdf,image/*,.xlsx,.xls,.csv,.doc,.docx'});if(fs.length)await caricaDocumentiComm(d.mese,fs,d.posto)};
AZIONI['comm-togli']=async d=>{if(!(await conferma('Togliere questo file dal mese? Finisce nel cestino per 30 giorni.',{pericolo:true,ok:'Togli'})))return;esegui('Tolto dal mese',s=>{const c=assicuraMeseComm(s,d.mese);if(d.posto==='altri')c.altri=(c.altri||[]).filter(x=>x!==d.id);else c[d.posto]=null;cestinaFileOrfani(s)})};
AZIONI['comm-inviato']=d=>esegui('Mese segnato come '+(meseCommercialista(d.mese).inviato?'non mandato':'mandato'),s=>{const c=assicuraMeseComm(s,d.mese);c.inviato=c.inviato?null:new Date().toISOString()});

// ---- caricamento delle fatture ----
async function fileFattureDa(files){ // → [{nome,bytes,testo|errore}]
  const out=[];const aggiungi=(nome,u8)=>{try{out.push({nome,bytes:u8,testo:/\.p7m$/i.test(nome)?xmlDaP7m(u8):new TextDecoder().decode(u8)})}catch(e){out.push({nome,errore:e.message})}};
  for(const f of files){
    if(/\.zip$/i.test(f.name)){const zip=await leggiZip(f);for(const v of zip.voci){const nome=v.nome.split('/').pop();if(/(^|\/)__MACOSX\//.test(v.nome)||nome.startsWith('.')||!/\.(xml|p7m)$/i.test(nome))continue;aggiungi(nome,await zip.estrai(v))}}
    else if(/\.(xml|p7m)$/i.test(f.name)) aggiungi(f.name,new Uint8Array(await leggiComeArrayBuffer(f)));
    else out.push({nome:f.name,errore:'non è un XML né uno ZIP'});
  }
  return out;
}
AZIONI['fatture-carica']=async()=>{const fs=await scegliFile({accetta:'.zip,.xml,.p7m'});if(fs.length)await caricaFatture(fs)};
async function caricaFatture(files){
  let letti;try{letti=await fileFattureDa(files)}catch(e){return segnalaErrore(e,'Non sono riuscito ad aprire i file')}
  const nuove=[],gia=[],errori=[];const chiave=f=>[f.piva,f.tipo,f.numero,f.data].join('|');
  const esistenti=new Set((stato.fatture||[]).map(chiave));
  for(const x of letti){
    if(x.errore){errori.push(x.nome+': '+x.errore);continue}
    try{
      const f=leggiFatturaXml(x.testo);const d=f.documenti[0];const tipo=versoFattura(f,stato.azienda.piva);
      if(!tipo){errori.push(x.nome+': non è intestata né emessa da '+(nomeImpresa(true)||'l\'azienda'));continue}
      const contro=tipo==='attiva'?f.cessionario:f.cedente;
      const rec={tipo,numero:d.numero,data:d.data,tipoDocumento:d.tipoDocumento,controparte:contro.nome,piva:contro.piva||contro.cf,imponibile:d.imponibile,imposta:d.imposta,totale:d.totale,allegati:d.allegati.length,nomeFile:x.nome,bytes:x.bytes};
      if(esistenti.has(chiave(rec))||nuove.some(y=>chiave(y)===chiave(rec))){gia.push(rec);continue}
      nuove.push(rec);
    }catch(e){errori.push(x.nome+': '+e.message)}
  }
  if(!nuove.length) return informa('Nessuna fattura nuova',html`<p>${gia.length?html`${plurale(gia.length,'fattura era','fatture erano')} già caricate. `:''}${errori.length?html`${plurale(errori.length,'file non letto','file non letti')}:`:''}</p>${errori.length?html`<ul class="piccolo">${errori.slice(0,15).map(e=>html`<li>${e}</li>`)}</ul>`:''}`);
  // mese proposto: quello che compare di più nelle date (lo ZIP del portale è filtrato per mese)
  const conta=new Map();for(const f of nuove){const k=(f.data||'').slice(0,7);if(k)conta.set(k,(conta.get(k)||0)+1)}
  const proposto=[...conta.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||ui.filtri.commercialista;
  const mesi=unici([proposto,...mesiCommercialista()]).sort().reverse();
  const nA=nuove.filter(f=>f.tipo==='attiva').length,nP=nuove.length-nA;
  const mese=await dialogo({titolo:'Carica fatture',largo:true,corpo:html`<p>Ho trovato <b>${plurale(nA,'fattura attiva','fatture attive')}</b> e <b>${plurale(nP,'fattura passiva','fatture passive')}</b>${gia.length?html`; ${plurale(gia.length,'era già caricata','erano già caricate')} e le salto`:''}.</p>
    <div class="campo"><label>Mese a cui vanno (quello del filtro sul portale)</label><select name="mese">${mesi.map(x=>html`<option value="${x}" ${x===proposto?'selected':''}>${fMeseAnno(+x.slice(0,4),+x.slice(5))}</option>`)}</select></div>
    ${errori.length?html`<details class="mt-s"><summary class="warn-t piccolo">${plurale(errori.length,'file non letto','file non letti')}</summary><ul class="piccolo">${errori.map(e=>html`<li>${e}</li>`)}</ul></details>`:''}
    <details class="mt-s"><summary class="piccolo">Vedi l'elenco</summary><table class="tabella densa"><tbody>${nuove.map(f=>html`<tr><td>${f.tipo==='attiva'?'Attiva':'Passiva'}</td><td>${f.numero}</td><td>${fData(f.data)}</td><td class="taglia" style="max-width:240px">${f.controparte}</td><td class="num">${fEuro(f.totale)}</td></tr>`)}</tbody></table></details>`,
    pulsanti:[{testo:'Annulla',valore:null},{testo:'Carica',classe:'primario',primario:true,fn:v=>v.querySelector('[name=mese]').value}]});
  if(!mese) return;
  const prog=dialogoAvanzamento('Archiviazione delle fatture');
  try{
    for(let i=0;i<nuove.length;i++){const f=nuove[i];await prog.aggiorna(i,nuove.length,f.nomeFile);
      const blob=new File([f.bytes],f.nomeFile,{type:/\.p7m$/i.test(f.nomeFile)?'application/pkcs7-mime':'application/xml'});
      f.fileId=(await salvaFile(blob,{nome:f.nomeFile},{dentroEsegui:true})).rec.id;delete f.bytes;delete f.nomeFile}
  }finally{prog.chiudi()}
  esegui(`Caricate ${nuove.length} fatture di ${fMeseAnno(+mese.slice(0,4),+mese.slice(5))}`,s=>{s.fatture=s.fatture||[];for(const f of nuove)s.fatture.push(Object.assign({id:nuovoId('ft'),mese},f))},{senzaRender:true});
  vai('commercialista/'+mese);render();
}
AZIONI['fattura-togli']=async d=>{const f=perId('fatture',d.id);if(!f||!(await conferma(`Togliere la fattura ${f.numero} di ${f.controparte}? L'XML resta nel cestino per 30 giorni.`,{pericolo:true,ok:'Togli'})))return;esegui('Tolta fattura '+f.numero,s=>{s.fatture=s.fatture.filter(x=>x.id!==f.id);cestinaFileOrfani(s)})};

// ---- la fattura da leggere: impaginata dall'app, con PDF e stampa dall'anteprima ----
async function fatturaLetta(f){const b=await leggiFile(f.fileId);if(!b)throw new Error('file della fattura non trovato nell\'archivio');const u8=new Uint8Array(await leggiComeArrayBuffer(b));return leggiFatturaXml(/\.p7m$/i.test((fileMeta(f.fileId)||{}).nome||'')?xmlDaP7m(u8):new TextDecoder().decode(u8))}
function docFattura(x,nomeFile){
  const imp=v=>v==null?'':h(fNum(v,2));
  const sogg=(et,s)=>`<div class="fatt-sogg"><span class="et">${h(et)}</span><b>${h(s.nome)}</b><br>${h(s.via)}<br>${h([s.cap,s.comune,s.provincia?'('+s.provincia+')':''].filter(Boolean).join(' '))}${s.nazione&&s.nazione!=='IT'?' '+h(s.nazione):''}<br>${s.piva?'P.IVA '+h(s.paese+s.piva):''}${s.cf&&s.cf!==s.piva?(s.piva?' · ':'')+'C.F. '+h(s.cf):''}${s.email?'<br>'+h(s.email):''}</div>`;
  const blocchi=[];
  x.documenti.forEach((d,i)=>{
    const tipo=TIPI_FATTURA[d.tipoDocumento]||d.tipoDocumento;
    const rif=unici([...d.ordini.map(o=>'Ordine '+o.numero+(o.data?' del '+fData(o.data):'')),...d.contratti.map(o=>'Contratto '+o.numero+(o.data?' del '+fData(o.data):'')),...d.ddt.map(o=>'DDT '+o.numero+(o.data?' del '+fData(o.data):'')),...d.collegate.map(o=>'Rif. fattura '+o.numero+(o.data?' del '+fData(o.data):''))]); // lo stesso DDT si ripete per ogni riga che richiama
    blocchi.push({html:`<div class="fatt-testa ${i?'nuova':''}"><div><div class="fatt-tipo">${h(tipo)}</div><div class="fatt-num">N. <b>${h(d.numero)}</b> del <b>${h(fData(d.data))}</b></div></div><div class="fatt-totale"><span class="et">Totale documento</span><b>${h(fEuro(d.totale))}</b></div></div>
      <div class="fatt-soggetti">${sogg('Fornitore',x.cedente)}${sogg('Cliente',x.cessionario)}</div>${rif.length||d.causale?`<p class="fatt-rif">${rif.map(h).join(' · ')}${d.causale?(rif.length?'<br>':'')+h(d.causale):''}</p>`:''}`,tieniConSuccessivo:true});
    // colonne che nessuna riga usa (spesso U.M. e sconto) non si stampano
    const col=[['Descrizione','',l=>(l.codice?'<span class="mini">'+h(l.codice)+'</span> ':'')+h(l.descrizione).replace(/\n/g,'<br>')],
      ['Q.tà','num',l=>l.quantita!=null?h(fNum(l.quantita,Number.isInteger(l.quantita)?0:2)):''],['U.M.','',l=>h(l.um)],
      ['Prezzo','num',l=>l.prezzo!=null?h(fNum(l.prezzo,2)):''],['Sconto','num',l=>l.sconti.map(s=>(s.tipo==='MG'?'+':'-')+(s.percentuale!=null?fNum(s.percentuale,2)+'%':fNum(s.importo||0,2))).map(h).join(' ')],
      ['Importo','num',l=>imp(l.totale)],['IVA','num',l=>l.natura?h(l.natura):l.aliquota!=null?h(fNum(l.aliquota,0))+'%':'']].filter(([,,f],i)=>i===0||d.linee.some(l=>f(l)));
    blocchi.push(`<table class="fatt-righe"><thead><tr>${col.map(([t,c])=>`<th class="${c}">${t}</th>`).join('')}</tr></thead><tbody>${d.linee.map(l=>`<tr>${col.map(([,c,f])=>`<td class="${c}">${f(l)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${col.length}" class="mini">Nessuna riga.</td></tr>`}</tbody></table>`);
    const rit=somma(d.ritenute,r=>r.importo),cassa=somma(d.casse,c=>c.importo);
    const netto=arrotonda2(d.totale-rit);
    blocchi.push(`<div class="fatt-fondo"><table class="fatt-iva"><thead><tr><th>Aliquota</th><th class="num">Imponibile</th><th class="num">Imposta</th><th>Note</th></tr></thead><tbody>${d.riepilogo.map(r=>`<tr><td>${r.natura?h(naturaIva(r.natura)):h(fNum(r.aliquota||0,0))+'%'}</td><td class="num">${imp(r.imponibile)}</td><td class="num">${imp(r.imposta)}</td><td class="mini">${h([r.esigibilita==='S'?'Scissione dei pagamenti':r.esigibilita==='D'?'Esigibilità differita':'',r.norma].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table>
      <table class="fatt-tot"><tbody><tr><td>Imponibile</td><td class="num">${h(fEuro(d.imponibile))}</td></tr><tr><td>IVA</td><td class="num">${h(fEuro(d.imposta))}</td></tr>${cassa?`<tr><td>Cassa previdenziale</td><td class="num">${h(fEuro(cassa))}</td></tr>`:''}${d.bollo?`<tr><td>Bollo</td><td class="num">${h(fEuro(d.bollo))}</td></tr>`:''}<tr class="totale"><td>Totale documento</td><td class="num">${h(fEuro(d.totale))}</td></tr>${rit?`<tr><td>Ritenuta d'acconto</td><td class="num">-${h(fEuro(rit))}</td></tr><tr class="totale"><td>Netto a pagare</td><td class="num">${h(fEuro(netto))}</td></tr>`:''}</tbody></table></div>`);
    if(d.pagamenti.length) blocchi.push(`<table class="fatt-pag"><thead><tr><th>Pagamento</th><th>Scadenza</th><th class="num">Importo</th><th>Coordinate</th></tr></thead><tbody>${d.pagamenti.map(p=>`<tr><td>${h(MODI_PAGAMENTO[p.modalita]||p.modalita)}${p.condizioni==='TP01'?' <span class="mini">(a rate)</span>':''}</td><td>${p.scadenza?h(fData(p.scadenza)):''}</td><td class="num">${imp(p.importo)}</td><td>${p.iban?'IBAN '+h(p.iban):''}${p.istituto?(p.iban?'<br>':'')+'<span class="mini">'+h(p.istituto)+'</span>':''}${p.beneficiario?'<br><span class="mini">a '+h(p.beneficiario)+'</span>':''}</td></tr>`).join('')}</tbody></table>`);
    if(d.allegati.length) blocchi.push(`<p class="fatt-nota">Allegati nel file: ${d.allegati.map(a=>h(a.nome||'senza nome')).join(', ')}</p>`);
  });
  blocchi.push(`<p class="fatt-nota">Copia di cortesia letta dal file «${h(nomeFile||'')}». Ha valore fiscale solo il file XML trasmesso tramite il Sistema di Interscambio.</p>`);
  const d0=x.documenti[0];
  return {titolo:nomeChiaro([TIPI_FATTURA[d0.tipoDocumento]||'Fattura',d0.numero,(versoFattura(x,stato.azienda.piva)==='attiva'?x.cessionario:x.cedente).nome,dataNomeFile(d0.data)]),cartaIntestata:false,classe:'fatt',blocchi};
}
AZIONI['fattura-apri']=async d=>{
  const f=perId('fatture',d.id);if(!f)return;
  let x;try{x=await fatturaLetta(f)}catch(e){return segnalaErrore(e,'Non riesco a leggere la fattura')}
  const allegati=x.documenti.flatMap(dd=>dd.allegati).filter(a=>a.dati&&(/pdf/i.test(a.formato)||/\.pdf$/i.test(a.nome)));
  const doc=docFattura(x,(fileMeta(f.fileId)||{}).nome);
  anteprimaStampa({titolo:doc.titolo,doc,registra:false,alMontaggio:ov=>{
    const comandi=ov.querySelector('.comandi');if(!comandi)return;
    const agg=(testo,ico,fn)=>{const b=creaEl(html`<button class="pulsante piccolo">${icona(ico,'piccola')}${testo}</button>`);b.onclick=fn;comandi.insertBefore(b,comandi.querySelector('[data-scarica-pdf]'))};
    // il PDF allegato si apre subito al clic: un'attesa prima di window.open farebbe bloccare la finestra
    allegati.forEach((a,i)=>agg(allegati.length>1?'Originale '+(i+1):'PDF originale','pdf',()=>{try{const bin=atob(a.dati.replace(/\s+/g,''));const u8=Uint8Array.from(bin,c=>c.charCodeAt(0));const u=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));if(!window.open(u,'_blank'))scaricaBlob(new Blob([u8],{type:'application/pdf'}),a.nome||doc.titolo+'.pdf');setTimeout(()=>URL.revokeObjectURL(u),120000)}catch(e){segnalaErrore(e,'Allegato non leggibile')}}));
    agg('XML','file',async()=>{const b=await leggiFile(f.fileId);if(b)scaricaBlob(b,(fileMeta(f.fileId)||{}).nome||'fattura.xml')});
  }});
};

// ---- il pacchetto ----
AZIONI['comm-pacchetto']=async d=>{
  const k=d.mese;const [a,m]=k.split('-').map(Number);
  const att=fattureMese(k,'attiva'),pas=fattureMese(k,'passiva'),docs=documentiMese(k).filter(x=>x.incluso);
  const manca=[!att.length&&'fatture attive',!pas.length&&'fatture passive',...POSTI_COMMERCIALISTA.filter(([p])=>!meseCommercialista(k)[p]).map(([,t])=>t.toLowerCase())].filter(Boolean);
  if(manca.length&&!(await conferma(`Per ${fMeseAnno(a,m)} mancano: ${manca.join(', ')}. Preparo lo stesso il pacchetto?`,{ok:'Prepara lo stesso'})))return;
  const radice=pulisciNomeFile((nomeImpresa(true)||'Documenti')+' '+nomeMese(m)+' '+a);
  const cA=cartellaFatture(k,'attiva',att.length),cP=cartellaFatture(k,'passiva',pas.length),cD=m+' '+nomeMese(m);
  const voci=[],usati=new Set(),contenuto=[];
  const prog=dialogoAvanzamento('Preparazione del pacchetto',{annullabile:true});
  try{
    const tutti=[...att.map(f=>[cA,f.fileId,(fileMeta(f.fileId)||{}).nome]),...pas.map(f=>[cP,f.fileId,(fileMeta(f.fileId)||{}).nome]),...docs.map(x=>[cD,x.fileId,x.nome])];
    for(const c of [cA,cP,cD]) voci.push({nome:radice+'/'+c+'/',dati:''}); // le tre cartelle ci sono sempre, anche vuote
    for(let i=0;i<tutti.length;i++){
      if(prog.annullato)return prog.chiudi();const [cart,id,nome]=tutti[i];await prog.aggiorna(i,tutti.length,nome);
      const b=await leggiFile(id);if(!b)continue;const p=nomeUnico(usati,cart+'/'+nome);voci.push({nome:radice+'/'+p,dati:b});contenuto.push(p);
    }
    const blob=await creaZip(voci);prog.chiudi();
    esegui('Pacchetto per il commercialista di '+fMeseAnno(a,m),s=>{const c=assicuraMeseComm(s,k);c.preparato=new Date().toISOString();c.contenuto=contenuto},{senzaRender:true,silenzioso:true});
    await condividiOScarica(blob,radice+'.zip',{testo:'Documenti di '+fMeseAnno(a,m)});
    render();
  }catch(e){prog.chiudi();segnalaErrore(e,'Pacchetto non preparato')}
};
