// ---------------------------------------------------------------------
// PREVENTIVI: listino per categoria, editor con righe da listino o libere, incolla da Excel,
// totali con sconto, voci da quotare (mai prezzi inventati), stampa ed esportazioni.
// ---------------------------------------------------------------------
const STATI_PREVENTIVO={bozza:'Bozza',inviato:'Inviato',accettato:'Accettato',rifiutato:'Rifiutato',scaduto:'Scaduto'};
function pillolaStatoPreventivo(s){return pillolaGenerica(STATI_PREVENTIVO[s]||s,s==='accettato'?'valido':s==='rifiutato'||s==='scaduto'?'scaduto':s==='inviato'?'pianificare':'neutro')}
function totaliPreventivo(p){
  let imponibile=0;const daQuotare=[];
  for(const r of p.righe||[]){ if(r.esclusa) continue; const q=+r.quantita||0; if(r.prezzo==null||r.prezzo===''){daQuotare.push(r);continue} imponibile+=q*(+r.prezzo); }
  const sconto=imponibile*(+p.scontoPct||0)/100;
  return {imponibile,sconto,totale:imponibile-sconto,daQuotare};
}
function prossimoNumeroPreventivo(anno){return (stato.preventivi.filter(p=>p.anno===anno).reduce((m,p)=>Math.max(m,+p.numero||0),0))+1}
VISTE.preventivi=function(r){
  if(r.query.nuovo){setTimeout(()=>nuovoPreventivo(r.query.cliente),0);history.replaceState(null,'','#/preventivi')}
  if(r.id==='listino') return vistaListino(r);
  if(r.id) return vistaPreventivo(r.id);
  const righe=ordina(stato.preventivi.map(p=>({p,tot:totaliPreventivo(p)})),x=>x.p.data||'','desc');
  const vista=ui.filtri.preventiviVista||'lavagna';
  const anno=new Date().getFullYear();const dellAnno=righe.filter(x=>x.p.anno===anno);
  const mandati=dellAnno.filter(x=>x.p.stato!=='bozza'),presi=dellAnno.filter(x=>x.p.stato==='accettato');
  const sotto=mandati.length?html`<b>${fEuro(somma(presi,x=>x.tot.totale),0)}</b> accettati su ${fEuro(somma(mandati,x=>x.tot.totale),0)} mandati nel ${anno} · ne prendi <b>${Math.round(presi.length/mandati.length*100)}%</b>`:html`${stato.preventivi.length} preventivi · ${stato.listino.length} voci di listino`;
  const testa=html`<div class="testata"><div><div class="occhiello">Lavori</div><h1>Preventivi</h1><p class="sotto">${sotto}</p></div><div class="azioni"><div class="gruppo-pulsanti"><button class="pulsante ${vista==='lavagna'?'attivo':''}" data-azione="preventivi-vista" data-valore="lavagna">Per stato</button><button class="pulsante ${vista==='elenco'?'attivo':''}" data-azione="preventivi-vista" data-valore="elenco">Elenco</button></div><a class="pulsante" href="#/preventivi/listino">${icona('elenco','piccola')}Listino</a><button class="pulsante" data-azione="preventivo-importa-voci" title="Carica il capitolato o il computo del cliente (Excel o PDF): le voci finiscono in un preventivo dell’impresa">${icona('magia','piccola')}Dall’Excel del cliente</button><button class="pulsante primario" data-azione="preventivo-nuovo">Nuovo preventivo<span class="manopola">${icona('piu','piccola')}</span></button></div></div>`;
  if(!stato.preventivi.length) return html`${testa}${vuoto({icona:'preventivi',titolo:'Nessun preventivo',testo:'Crea il primo dal listino, oppure carica l’Excel del cliente: prendo le voci e le metto nel tuo modello.',azione:{testo:'Nuovo preventivo',azione:'preventivo-nuovo'}})}`;
  if(vista==='elenco') return html`${testa}${tabella({id:'preventivi',righe,href:x=>'#/preventivi/'+x.p.id,colonne:[{chiave:'n',titolo:'Numero',principale:true,valore:x=>(x.p.anno*1000+x.p.numero),formatta:x=>html`<b>${x.p.numero}/${x.p.anno}</b>`},{chiave:'data',titolo:'Data',valore:x=>x.p.data,formatta:x=>fData(x.p.data)},{chiave:'cl',titolo:'Cliente',valore:x=>nomeCliente(x.p.clienteId),formatta:x=>nomeCliente(x.p.clienteId)||daCompilare()},{chiave:'ogg',titolo:'Oggetto',valore:x=>x.p.oggetto||''},{chiave:'stato',titolo:'Stato',valore:x=>x.p.stato,formatta:x=>html`<select class="stato-rapido ${x.p.stato}" data-cambio="preventivo-stato" data-id="${x.p.id}" aria-label="Stato del preventivo" onclick="event.stopPropagation()">${Object.entries(STATI_PREVENTIVO).map(([v,t])=>html`<option value="${v}" ${x.p.stato===v?'selected':''}>${t}</option>`)}</select>`},{chiave:'dq',titolo:'Da quotare',num:true,valore:x=>x.tot.daQuotare.length,formatta:x=>x.tot.daQuotare.length?html`<span class="pillola scadenza">${icona('attenzione','piccola')}${x.tot.daQuotare.length}</span>`:''},{chiave:'tot',titolo:'Totale',num:true,valore:x=>x.tot.totale,formatta:x=>fEuro(x.tot.totale)}]})}`;
  // lavagna: una colonna per stato; si trascina una scheda per cambiarle stato
  const corsie=[['bozza','Bozze',['bozza'],'var(--ink-4)'],['inviato','Mandati, in attesa',['inviato'],'var(--accent)'],['accettato','Accettati',['accettato'],'var(--ok)'],['rifiutato','Non presi',['rifiutato','scaduto'],'var(--bad)']];
  const scheda=x=>{const p=x.p;const gg=p.data?giorniTra(p.data,oggi()):null;return html`<a class="carta-prev" href="#/preventivi/${p.id}" draggable="true" data-prev="${p.id}"><span class="n"><span class="mono">${p.numero}/${p.anno}</span>${p.data?' · '+fData(p.data):''}${p.stato==='scaduto'?html` · <span class="bad-t">scaduto</span>`:''}</span><b>${p.oggetto||'Senza oggetto'}</b><span class="c">${nomeCliente(p.clienteId)||'cliente da scegliere'}</span><span class="f"><span class="importo">${fEuro(x.tot.totale,0)}</span><span class="spazio"></span>${p.cantiereId&&cantiere(p.cantiereId)?html`<span class="cantiere-tag ${coloreCantiere(cantiere(p.cantiereId))}">${nomeCantiere(p.cantiereId)}</span>`:''}</span>${x.tot.daQuotare.length?html`<span class="nota-carta warn-t">${icona('attenzione','piccola')}${plurale(x.tot.daQuotare.length,'voce da quotare','voci da quotare')}</span>`:p.stato==='inviato'&&gg!=null?html`<span class="nota-carta ${gg>30?'warn-t':''}">${icona('orologio','piccola')}mandato ${gg===0?'oggi':plurale(gg,'giorno','giorni')+' fa'}${gg>30?': senti il cliente':''}</span>`:''}</a>`};
  return html`${testa}<div class="lavagna">${corsie.map(([id,tit,stati,col])=>{const xs=righe.filter(x=>stati.includes(x.p.stato));return html`<div class="corsia" data-corsia="${id}"><div class="corsia-testa"><i style="background:${col}"></i><b>${tit}</b><span class="pillola neutro">${xs.length}</span><span class="somma">${fEuro(somma(xs,x=>x.tot.totale),0)}</span></div>${xs.map(scheda)}${id==='bozza'?html`<button class="aggiungi-carta" data-azione="preventivo-nuovo">${icona('piu','piccola')}Nuovo preventivo</button>`:''}</div>`})}</div><p class="piccolo silenzioso mt-s">Trascina una scheda in un’altra colonna per cambiarne lo stato.</p>`;
};
AZIONI['preventivi-vista']=d=>{ui.filtri.preventiviVista=d.valore;render()};
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('[data-prev]');if(!c)return;e.dataTransfer.setData('text/x-preventivo',c.dataset.prev);e.dataTransfer.effectAllowed='move';c.classList.add('in-volo')});
document.addEventListener('dragend',e=>{tutti('.in-volo,.corsia.sopra').forEach(x=>x.classList.remove('in-volo','sopra'))});
document.addEventListener('dragover',e=>{const c=e.target.closest&&e.target.closest('[data-corsia]');if(!c||!Array.from(e.dataTransfer.types||[]).includes('text/x-preventivo'))return;e.preventDefault();tutti('.corsia.sopra').forEach(x=>x!==c&&x.classList.remove('sopra'));c.classList.add('sopra')});
document.addEventListener('drop',e=>{const c=e.target.closest&&e.target.closest('[data-corsia]');const id=e.dataTransfer&&e.dataTransfer.getData('text/x-preventivo');if(!c||!id)return;e.preventDefault();const p=perId('preventivi',id);const st=c.dataset.corsia;if(p&&p.stato!==st&&!(st==='rifiutato'&&p.stato==='scaduto'))esegui('Preventivo '+p.numero+'/'+p.anno+': '+STATI_PREVENTIVO[st],s=>{s.preventivi.find(x=>x.id===id).stato=st})});
AZIONI['preventivo-nuovo']=()=>nuovoPreventivo();
async function nuovoPreventivo(clienteId){
  const anno=new Date().getFullYear();
  const v=await dialogoModulo('Nuovo preventivo',[{nome:'clienteId',etichetta:'Cliente',tipo:'select',opzioni:stato.clienti.map(c=>({v:c.id,t:c.ragioneSociale}))},{nome:'cantiereId',etichetta:'Cantiere collegato',tipo:'select',opzioni:stato.cantieri.map(c=>({v:c.id,t:c.nome})),aiuto:'Se il cantiere non esiste ancora (preventivo prima di aver vinto la commessa) lascia vuoto: descrivi il lavoro nell\'oggetto e collega il cantiere più avanti da qui, quando lo crei'},{nome:'oggetto',etichetta:'Oggetto',largo:true,obbligatorio:true},{nome:'data',etichetta:'Data',tipo:'data',obbligatorio:true},{nome:'validitaGiorni',etichetta:'Validità (giorni)',tipo:'numero',decimali:0}],{clienteId:clienteId||'',data:oggi(),validitaGiorni:30});
  if(!v) return;
  const id=nuovoId('pv');
  esegui('Nuovo preventivo',s=>{s.preventivi.push(Object.assign({id,numero:prossimoNumeroPreventivo(anno),anno,stato:'bozza',righe:[],scontoPct:0,condizioni:'Pagamento: [DA COMPILARE]\nEsclusi: fornitura materiali salvo dove indicato, opere murarie, smaltimento.\nPrezzi IVA esclusa.',note:''},v))});
  vai('preventivi/'+id);
}
function vistaPreventivo(id){
  const p=perId('preventivi',id); if(!p) return html`<div class="vuoto">${icona('attenzione')}<h3>Preventivo non trovato</h3><a class="pulsante" href="#/preventivi">Elenco</a></div>`;
  const tot=totaliPreventivo(p);
  dopoRender(()=>{tutti('.voce-prev input[data-riga-campo="descrizione"]').forEach(i=>attivaSuggerimenti(i,()=>stato.listino.map(l=>l.descrizione)))});
  // le righe si raggruppano per categoria del listino; quelle libere in fondo
  const categoria=r=>{const l=r.voceId&&stato.listino.find(x=>x.id===r.voceId);const lav=l&&stato.lavorazioni.find(x=>x.id===l.categoriaId);return lav?lav.breve:'Altre voci'};
  const gruppi=new Map();(p.righe||[]).forEach((r,i)=>{const c=categoria(r);if(!gruppi.has(c))gruppi.set(c,[]);gruppi.get(c).push([r,i])});
  const riga=(r,i)=>{const senza=r.prezzo==null||r.prezzo==='';const imp=senza?null:(+r.quantita||0)*+r.prezzo;return html`<div class="voce-prev ${r.esclusa?'esclusa':''} ${senza&&!r.esclusa?'da-quotare':''}">
    <div class="ds">${r.codice?html`<span class="codice">${r.codice}</span>`:''}<input type="text" value="${r.descrizione||''}" data-riga="${i}" data-riga-campo="descrizione" placeholder="Descrizione della voce" aria-label="Descrizione">${r.descrizioneEstesa?html`<span class="estesa" title="${r.descrizioneEstesa}">${tronca(r.descrizioneEstesa,140)}</span>`:''}</div>
    <label class="qta"><input type="text" inputmode="decimal" value="${r.quantita!=null?fNum(r.quantita,Number.isInteger(+r.quantita)?0:2):''}" data-riga="${i}" data-riga-campo="quantita" placeholder="0" aria-label="Quantità"><input type="text" class="um" value="${r.um||''}" data-riga="${i}" data-riga-campo="um" aria-label="Unità di misura"></label>
    <div class="prezzo"><label class="pz"><input type="text" inputmode="decimal" value="${!senza?fNum(r.prezzo,2):''}" data-riga="${i}" data-riga-campo="prezzo" placeholder="da quotare" aria-label="Prezzo unitario"><span>€</span></label><button class="tipo" data-azione="preventivo-riga-tipo" data-id="${p.id}" data-i="${i}" title="Cambia fra solo posa e fornitura e posa">${r.tipoPrezzo==='fornituraPosa'?'fornitura e posa':'solo posa'} ⇄</button></div>
    <div class="imp">${imp==null?(r.esclusa?'':html`<span class="pillola scadenza">da quotare</span>`):fEuro(imp)}${r.esclusa?html`<span class="piccolo silenzioso">esclusa fornitura</span>`:''}</div>
    <div class="az"><label class="spunta piccolo" title="Solo posa, esclusa fornitura: la riga resta nel preventivo ma fuori dal totale"><input type="checkbox" data-riga="${i}" data-riga-campo="esclusa" ${r.esclusa?'checked':''}>escl.</label><button class="pulsante discreto icona piccolo" data-azione="preventivo-riga-elimina" data-id="${p.id}" data-i="${i}" title="Togli la voce" aria-label="Togli la voce">${icona('chiudi','piccola')}</button></div></div>`};
  const flusso=[['bozza','Bozza'],['inviato','Mandato'],['accettato','Accettato']];const passo=flusso.findIndex(x=>x[0]===p.stato);
  return html`<div class="editor-prev"><div class="col-prev">
    <div class="occhiello-prev">Preventivo <span class="mono">${p.numero}/${p.anno}</span> · ${fData(p.data)}${p.validitaGiorni?' · valido '+p.validitaGiorni+' giorni':''}</div>
    <input class="titolo-prev" value="${p.oggetto||''}" placeholder="Oggetto del preventivo" data-cambio="preventivo-campo" data-id="${p.id}" data-campo="oggetto" aria-label="Oggetto">
    <div class="riga mt-s mb"><button class="chip" data-azione="preventivo-modifica" data-id="${p.id}">${icona('clienti','piccola')}${nomeCliente(p.clienteId)||'Scegli il cliente'}</button>${p.cantiereId&&cantiere(p.cantiereId)?html`<a class="cantiere-tag ${coloreCantiere(cantiere(p.cantiereId))}" href="#/cantieri/${p.cantiereId}">${nomeCantiere(p.cantiereId)}</a>`:html`<button class="chip" data-azione="preventivo-modifica" data-id="${p.id}">${icona('cantieri','piccola')}Collega un cantiere</button>`}<span class="spazio"></span><button class="pulsante discreto piccolo" data-azione="preventivo-importa-voci" data-id="${p.id}">${icona('magia','piccola')}Voci dall’Excel del cliente</button><button class="pulsante discreto piccolo" data-azione="preventivo-incolla" data-id="${p.id}">${icona('incolla','piccola')}Incolla da Excel</button></div>
    ${tot.daQuotare.length?html`<div class="avviso-inline attenzione">${icona('attenzione')}<div class="corpo"><b>${plurale(tot.daQuotare.length,'voce da quotare','voci da quotare')}:</b> restano senza prezzo finché non lo scrivi, mai prezzi inventati.</div></div>`:''}
    ${Array.from(gruppi.entries()).map(([cat,rr])=>html`<div class="capitolo"><div class="capitolo-testa"><b>${cat}</b><span>${fEuro(somma(rr.filter(([r])=>!r.esclusa&&r.prezzo!=null&&r.prezzo!==''),([r])=>(+r.quantita||0)*+r.prezzo))}</span></div>${rr.map(([r,i])=>riga(r,i))}</div>`)}
    ${(p.righe||[]).length?'':html`<div class="vuoto">${icona('preventivi')}<h3>Ancora nessuna voce</h3><p>Scrivi qui sotto «massetto», «gres», «battiscopa»… e scegli dal listino, oppure prendi le voci dall’Excel del cliente.</p></div>`}
    <div class="aggiungi-voce"><div class="campo-voce">${icona('piu')}<input type="search" id="cerca-voce" data-prev="${p.id}" placeholder="Aggiungi una voce: scrivi «massetto», «gres», «battiscopa»… o il codice" autocomplete="off"></div><div class="proposte-voce" id="proposte-voce"></div></div>
    <div class="griglia due mt"><div class="scheda"><h3>Condizioni</h3><textarea data-cambio="preventivo-campo" data-id="${p.id}" data-campo="condizioni" rows="5">${p.condizioni||''}</textarea></div><div class="scheda"><h3>Note interne</h3><textarea data-cambio="preventivo-campo" data-id="${p.id}" data-campo="note" rows="5" placeholder="Non vanno in stampa">${p.note||''}</textarea></div></div>
  </div>
  <aside class="lato-prev"><div class="guscio"><div class="scheda">
    <div class="flusso">${flusso.map(([v,t],i)=>html`<button class="${i===passo?'attivo':i<passo?'fatto':''}" data-azione="preventivo-stato-imposta" data-id="${p.id}" data-valore="${v}"><i></i>${t}</button>`)}</div>
    ${p.stato==='rifiutato'||p.stato==='scaduto'?html`<div class="avviso-inline critico mt-s">${icona('chiudi')}<div class="corpo">${p.stato==='scaduto'?'Scaduto senza risposta.':'Il cliente non l’ha preso.'}</div></div>`:''}
    <div class="totali-prev"><div class="r"><span>Somma delle voci</span><span>${fEuro(tot.imponibile)}</span></div><div class="r"><span class="riga stretta">Sconto <label class="sconto"><input type="text" inputmode="decimal" value="${fNum(p.scontoPct||0,0)}" data-cambio="preventivo-sconto" data-id="${p.id}" aria-label="Sconto in percentuale"><span>%</span></label></span><span>${tot.sconto?'− '+fEuro(tot.sconto):'—'}</span></div><div class="r t"><span>Totale<small>IVA esclusa</small></span><b>${fEuro(tot.totale)}</b></div></div>
    <div class="colonna mt"><button class="pulsante primario" data-azione="preventivo-stampa" data-id="${p.id}">${icona('stampa','piccola')}Anteprima e stampa</button><div class="riga stretta"><button class="pulsante" style="flex:1" data-azione="preventivo-xlsx" data-id="${p.id}">${icona('scarica','piccola')}Excel</button><button class="pulsante" style="flex:1" data-azione="preventivo-csv" data-id="${p.id}">CSV</button></div><button class="pulsante discreto" data-azione="preventivo-modifica" data-id="${p.id}">${icona('modifica','piccola')}Intestazione, cliente e cantiere</button>${p.stato==='inviato'?html`<button class="pulsante discreto pericolo" data-azione="preventivo-stato-imposta" data-id="${p.id}" data-valore="rifiutato">Il cliente non l’ha preso</button>`:''}</div>
  </div></div></aside></div>`;
}
// barra «aggiungi una voce»: cerca nel listino mentre scrivi; Invio prende la prima
function proposteVoce(inp){
  const box=el('#proposte-voce');if(!box)return;const q=normalizzaTesto(inp.value);
  if(!q){box.classList.remove('aperte');box.innerHTML='';return}
  const voci=stato.listino.filter(l=>normalizzaTesto(l.codice+' '+l.descrizione+' '+((stato.lavorazioni.find(x=>x.id===l.categoriaId)||{}).breve||'')).includes(q)).slice(0,8);
  box.innerHTML=html`${voci.map((l,i)=>html`<button class="proposta ${i?'':'prima'}" data-azione="preventivo-voce-aggiungi" data-id="${inp.dataset.prev}" data-voce="${l.id}"><span><span class="codice">${l.codice}</span>${l.descrizione}</span><small>posa ${l.prezzoPosa!=null?fEuro(l.prezzoPosa):'—'}</small><small>forn. e posa ${l.prezzoFornituraPosa!=null?fEuro(l.prezzoFornituraPosa):'—'}/${l.um}</small></button>`)}<button class="proposta ${voci.length?'':'prima'}" data-azione="preventivo-voce-libera" data-id="${inp.dataset.prev}" data-testo="${inp.value}"><span>${icona('piu','piccola')} Voce libera: «${inp.value}»</span><small></small><small>la scrivi tu</small></button>`;
  box.classList.add('aperte');
}
document.addEventListener('input',e=>{if(e.target.id==='cerca-voce')proposteVoce(e.target)});
document.addEventListener('keydown',e=>{if(e.target.id==='cerca-voce'&&e.key==='Enter'){e.preventDefault();const b=el('#proposte-voce .proposta.prima');if(b)b.click()}if(e.target.id==='cerca-voce'&&e.key==='Escape'){e.target.value='';proposteVoce(e.target)}});
document.addEventListener('click',e=>{if(!e.target.closest('.aggiungi-voce')){const b=el('#proposte-voce');if(b)b.classList.remove('aperte')}});
function rigaDaListino(l,tipo){const fp=tipo==='fornituraPosa'&&l.prezzoFornituraPosa!=null;return {id:nuovoId('r'),voceId:l.id,codice:l.codice,descrizione:l.descrizione,descrizioneEstesa:l.descrizioneEstesa,um:l.um,quantita:null,prezzo:fp?l.prezzoFornituraPosa:l.prezzoPosa!=null?l.prezzoPosa:null,tipoPrezzo:fp?'fornituraPosa':'posa',esclusa:false}}
// dopo l'aggiunta il cursore va sulla quantità della voce nuova (l'ultima riga, ovunque stia nel suo gruppo)
const quantitaDopo=id=>setTimeout(()=>{const p=perId('preventivi',id);const x=p&&el(`.voce-prev input[data-riga="${p.righe.length-1}"][data-riga-campo="quantita"]`);if(x){x.scrollIntoView({block:'center',behavior:'smooth'});x.focus();x.select()}},30);
AZIONI['preventivo-voce-aggiungi']=d=>{const l=stato.listino.find(x=>x.id===d.voce);if(!l)return;esegui('Aggiunta voce '+l.codice,s=>{const p=s.preventivi.find(x=>x.id===d.id);const ultimo=p.righe[p.righe.length-1];p.righe.push(rigaDaListino(l,ultimo&&ultimo.tipoPrezzo))});quantitaDopo(d.id)};
AZIONI['preventivo-voce-libera']=d=>{esegui('Aggiunta riga libera',s=>{s.preventivi.find(x=>x.id===d.id).righe.push({id:nuovoId('r'),codice:'',descrizione:d.testo||'',um:'mq',quantita:null,prezzo:null,tipoPrezzo:'posa',esclusa:false})});quantitaDopo(d.id)};
// posa ⇄ fornitura e posa: se la voce viene dal listino e ha l'altro prezzo, lo prende
AZIONI['preventivo-riga-tipo']=d=>esegui('Cambiato tipo di prezzo',s=>{const r=s.preventivi.find(x=>x.id===d.id).righe[+d.i];r.tipoPrezzo=r.tipoPrezzo==='fornituraPosa'?'posa':'fornituraPosa';const l=r.voceId&&s.listino.find(x=>x.id===r.voceId);if(l){const nuovo=r.tipoPrezzo==='fornituraPosa'?l.prezzoFornituraPosa:l.prezzoPosa;if(nuovo!=null)r.prezzo=nuovo}},{silenzioso:true});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||t.dataset.riga===undefined||!t.dataset.rigaCampo)return;const pid=leggiRotta().id;const p=perId('preventivi',pid);if(!p)return;const i=+t.dataset.riga,campo=t.dataset.rigaCampo;let v=t.type==='checkbox'?t.checked:t.value;if(campo==='quantita'||campo==='prezzo'){v=v.trim()===''?null:leggiNumero(v);if(v!==null&&v<0){avviso(campo==='prezzo'?'Il prezzo non può essere negativo':'La quantità non può essere negativa',{tipo:'errore'});return}}
  esegui('Modificata riga preventivo',s=>{const r=s.preventivi.find(x=>x.id===pid).righe[i];r[campo]=v},{silenzioso:true});});
AZIONI['preventivo-sconto']=(d,t)=>{const v=leggiNumero(t.value)||0;esegui('Sconto preventivo',s=>{s.preventivi.find(x=>x.id===d.id).scontoPct=v},{silenzioso:true})};
AZIONI['preventivo-campo']=(d,t)=>{esegui('Modificato preventivo',s=>{s.preventivi.find(x=>x.id===d.id)[d.campo]=t.value},{silenzioso:true,senzaRender:true})};
AZIONI['preventivo-modifica']=async d=>{const p=perId('preventivi',d.id);const v=await dialogoModulo('Intestazione preventivo',[{nome:'numero',etichetta:'Numero',tipo:'numero',decimali:0,obbligatorio:true},{nome:'anno',etichetta:'Anno',tipo:'numero',decimali:0,obbligatorio:true},{nome:'data',etichetta:'Data',tipo:'data',obbligatorio:true},{nome:'stato',etichetta:'Stato',tipo:'select',vuoto:false,opzioni:Object.entries(STATI_PREVENTIVO).map(([v,t])=>({v,t}))},{nome:'clienteId',etichetta:'Cliente',tipo:'select',opzioni:stato.clienti.map(c=>({v:c.id,t:c.ragioneSociale}))},{nome:'cantiereId',etichetta:'Cantiere',tipo:'select',opzioni:stato.cantieri.map(c=>({v:c.id,t:c.nome})),aiuto:'Se nel frattempo hai creato il cantiere (commessa vinta), collegalo qui'},{nome:'oggetto',etichetta:'Oggetto',largo:true,obbligatorio:true},{nome:'validitaGiorni',etichetta:'Validità (giorni)',tipo:'numero',decimali:0}],p,{pulsantiExtra:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare il preventivo '+p.numero+'/'+p.anno+'?',{pericolo:true})){esegui('Eliminato preventivo',s=>{s.preventivi=s.preventivi.filter(x=>x.id!==p.id)});vai('preventivi');return null}return false}}]});if(!v)return;esegui('Modificato preventivo',s=>{Object.assign(s.preventivi.find(x=>x.id===p.id),v)})};
// Lo stato si cambia da dove lo si guarda: nell'elenco con un menu, nella scheda con un pulsante.
// Prima bisognava aprire il preventivo, aprire "Modifica" e cercarlo in mezzo agli altri campi.
AZIONI['preventivo-stato']=(d,t)=>{const p=perId('preventivi',d.id);if(!p||p.stato===t.value)return;esegui('Preventivo '+p.numero+'/'+p.anno+': '+STATI_PREVENTIVO[t.value],s=>{s.preventivi.find(x=>x.id===d.id).stato=t.value})};
AZIONI['preventivo-stato-imposta']=d=>{const p=perId('preventivi',d.id);if(!p||p.stato===d.valore)return;esegui('Preventivo '+p.numero+'/'+p.anno+': '+STATI_PREVENTIVO[d.valore],s=>{s.preventivi.find(x=>x.id===d.id).stato=d.valore})};
AZIONI['preventivo-riga-libera']=d=>esegui('Aggiunta riga',s=>{s.preventivi.find(x=>x.id===d.id).righe.push({id:nuovoId('r'),codice:'',descrizione:'',um:'mq',quantita:null,prezzo:null,tipoPrezzo:'posa',esclusa:false})});
AZIONI['preventivo-riga-elimina']=d=>esegui('Eliminata riga',s=>{s.preventivi.find(x=>x.id===d.id).righe.splice(+d.i,1)});
AZIONI['preventivo-riga-listino']=async d=>{
  const v=await dialogo({titolo:'Aggiungi dal listino',largo:true,corpo:html`<input type="search" id="cerca-listino" placeholder="Cerca voce" class="mb-s"><div id="lista-listino" style="max-height:50vh;overflow:auto"></div>`,pulsanti:[{testo:'Annulla',valore:null},{testo:'Aggiungi selezionate',classe:'primario',primario:true,fn:v=>tutti('input[data-voce]:checked',v).map(x=>x.dataset.voce)}],alMontaggio:v=>{const lista=v.querySelector('#lista-listino'),cerca=v.querySelector('#cerca-listino');const disegna=()=>{const q=normalizzaTesto(cerca.value);const voci=stato.listino.filter(l=>!q||normalizzaTesto(l.codice+' '+l.descrizione+' '+(stato.lavorazioni.find(x=>x.id===l.categoriaId)||{}).breve).includes(q));const g=raggruppa(voci,l=>l.categoriaId);lista.innerHTML=Array.from(g.entries()).map(([cat,vv])=>html`<div class="sezione-titolo">${(stato.lavorazioni.find(x=>x.id===cat)||{}).breve||cat}</div>${vv.map(l=>html`<label class="spunta" style="align-items:flex-start"><input type="checkbox" data-voce="${l.id}"><span><b>${l.codice}</b> ${l.descrizione} <span class="secondario">· ${l.um}</span> ${l.prezzoPosa!=null?html`<span class="etichetta-tag">${fEuro(l.prezzoPosa)}</span>`:html`<span class="pillola scadenza piccolo">da quotare</span>`}</span></label>`)}`).join('')};cerca.addEventListener('input',disegna);disegna()}});
  if(!v||!v.length) return;
  esegui('Aggiunte '+v.length+' voci dal listino',s=>{const p=s.preventivi.find(x=>x.id===d.id);for(const id of v){const l=s.listino.find(x=>x.id===id);p.righe.push({id:nuovoId('r'),voceId:l.id,codice:l.codice,descrizione:l.descrizione,descrizioneEstesa:l.descrizioneEstesa,um:l.um,quantita:null,prezzo:l.prezzoPosa!=null?l.prezzoPosa:null,tipoPrezzo:'posa',esclusa:false})}});
};
// Riconoscimento delle colonne di un capitolato (da incolla, da Excel del cliente o da PDF):
// una griglia di celle -> righe di preventivo. Il prezzo mancante non si inventa: la riga resta da quotare.
function righeCapitolatoDaGriglia(righe){
  if(!righe.length) return {righe:[],colonne:''};
  const testa=righe[0].map(x=>normalizzaTesto(x));
  const idx={codice:-1,descrizione:-1,estesa:-1,um:-1,quantita:-1,prezzo:-1,note:-1};
  const haTesta=testa.some(x=>/art|codice|descr|um|q ?ta|quant|prezzo|pu|importo/.test(x));
  if(haTesta){testa.forEach((x,i)=>{if(idx.codice<0&&/^(art|articolo|codice|cod|nr|n)$/.test(x))idx.codice=i;else if(idx.descrizione<0&&/descrizione sintetica|^descrizione$|^descr/.test(x))idx.descrizione=i;else if(idx.estesa<0&&/estesa/.test(x))idx.estesa=i;else if(idx.um<0&&/^(um|u m|unita|u\.m\.)$/.test(x))idx.um=i;else if(idx.quantita<0&&/q ?ta|quant/.test(x))idx.quantita=i;else if(idx.prezzo<0&&/prezzo|^pu$|unitario/.test(x))idx.prezzo=i;else if(idx.note<0&&/note/.test(x))idx.note=i})}
  else { // senza intestazione: si indovina dalla forma delle celle
    const testo=[],num=[];righe[0].forEach((x,i)=>{if(leggiNumero(x)!==null&&/^[\d.,\s€]+$/.test(String(x).trim()))num.push(i);else testo.push(i)});
    if(testo.length)idx.codice=testo[0];if(testo.length>1)idx.descrizione=testo[1];if(testo.length>2)idx.estesa=testo[2];const umI=righe[0].findIndex(x=>/^(mq|ml|m|cad|n|kg|a corpo|corpo|pz|h)$/i.test(String(x).trim()));if(umI>=0)idx.um=umI;if(num.length)idx.quantita=num[0];if(num.length>1)idx.prezzo=num[1];
  }
  const dati=(haTesta?righe.slice(1):righe).filter(r=>!/^totale/i.test(String(r[idx.codice>=0?idx.codice:0]||'').trim())&&!/^totale/i.test(String(r[0]||'').trim()));
  const out=dati.map(r=>{const g=i=>i>=0&&r[i]!=null?String(r[i]).trim():'';const pr=leggiNumero(g(idx.prezzo));return {id:nuovoId('r'),codice:g(idx.codice),descrizione:g(idx.descrizione)||g(idx.estesa)||g(idx.codice),descrizioneEstesa:g(idx.estesa),um:g(idx.um)||'',quantita:leggiNumero(g(idx.quantita)),prezzo:pr!=null&&pr>0?pr:null,tipoPrezzo:/fornitura/i.test(g(idx.descrizione))?'fornituraPosa':'posa',esclusa:/solo posa|esclusa fornitura/i.test(g(idx.note)+' '+r.join(' ')),note:g(idx.note)}}).filter(x=>x.descrizione&&!/^(totale|totali|sommano|importo complessivo|a riportare|riporto)\b/i.test(x.descrizione.trim()));
  return {righe:out,colonne:Object.entries(idx).filter(([k,v])=>v>=0).map(([k])=>k).join(', ')||'nessuna intestazione'};
}
async function anteprimaRigheCapitolato(nuove,colonne,ok){
  return dialogo({titolo:'Voci riconosciute',largo:true,corpo:html`<p>${nuove.length} righe riconosciute (colonne: ${colonne}). ${nuove.filter(x=>x.prezzo==null).length} senza prezzo resteranno da quotare.</p><table class="tabella densa"><thead><tr><th>Codice</th><th>Descrizione</th><th>UM</th><th class="num">Q.tà</th><th class="num">Prezzo</th></tr></thead><tbody>${nuove.map(x=>html`<tr><td>${x.codice}</td><td>${tronca(x.descrizione,70)}</td><td>${x.um}</td><td class="num">${x.quantita!=null?fNum(x.quantita,2):''}</td><td class="num">${x.prezzo!=null?fEuro(x.prezzo):html`<span class="pillola scadenza">da quotare</span>`}</td></tr>`)}</tbody></table>`,pulsanti:[{testo:'Annulla',valore:false},{testo:ok||'Aggiungi',classe:'primario',primario:true,valore:true}]});
}
// Incolla celle copiate da Excel: righe separate da a-capo, colonne da tabulazione.
AZIONI['preventivo-incolla']=async d=>{
  const t=await chiediTesto('Incolla le celle copiate da Excel',{multiriga:true,aiuto:'Copia dal foglio del cliente le righe (con o senza intestazione): articolo, descrizione, descrizione estesa, um, quantità, prezzo, importo. Le colonne vengono riconosciute; dove il prezzo manca la riga resta da quotare.',ok:'Analizza'});
  if(!t) return;
  const righe=t.split(/\r?\n/).map(l=>l.split('\t')).filter(r=>r.some(x=>x.trim()));
  if(!righe.length) return avviso('Niente da incollare',{tipo:'errore'});
  const {righe:nuove,colonne}=righeCapitolatoDaGriglia(righe);
  if(!nuove.length) return avviso('Non ho riconosciuto nessuna voce',{tipo:'errore'});
  if(!(await anteprimaRigheCapitolato(nuove,colonne))) return;
  esegui('Incollate '+nuove.length+' righe da Excel',s=>{s.preventivi.find(x=>x.id===d.id).righe.push(...nuove)});
};
AZIONI['preventivo-stampa']=d=>stampaPreventivo(perId('preventivi',d.id));
AZIONI['preventivo-xlsx']=d=>esportaPreventivoXlsx(perId('preventivi',d.id));
AZIONI['preventivo-csv']=d=>{const p=perId('preventivi',d.id);const righe=[['Codice','Descrizione','Descrizione estesa','UM','Quantità','Tipo','Prezzo unitario','Importo','Esclusa','Note']];for(const r of p.righe)righe.push([r.codice,r.descrizione,r.descrizioneEstesa||'',r.um,r.quantita,r.tipoPrezzo==='fornituraPosa'?'Fornitura e posa':'Posa',r.prezzo,r.prezzo!=null&&!r.esclusa?(+r.quantita||0)*+r.prezzo:'',r.esclusa?'SOLO POSA — esclusa fornitura':'',r.note||'']);scaricaCsv(righe,nomeFileData('Preventivo '+p.numero+' '+p.anno,'csv'))};

// ---- listino ----
function vistaListino(r){
  const cat=ui.filtri.listinoCat||'';
  const voci=stato.listino.filter(l=>!cat||String(l.categoriaId)===cat);
  return html`<div class="briciole"><a href="#/preventivi">Preventivi</a> › Listino</div><div class="testata"><div><h1>Listino</h1><div class="sotto">${stato.listino.length} voci in sette categorie. I prezzi mancanti compaiono come «da quotare»: non si inventano.</div></div><div class="azioni"><button class="pulsante" data-azione="listino-importa">${icona('carica')}Importa CSV</button><button class="pulsante" data-azione="listino-esporta">${icona('scarica')}Esporta CSV</button><button class="pulsante primario" data-azione="listino-nuova">${icona('piu')}Nuova voce</button></div></div>
  <div class="strumenti-tabella"><div class="chip-lista"><a class="chip ${cat===''?'attiva':''}" data-azione="listino-cat" data-valore="">Tutte</a>${stato.lavorazioni.map(l=>html`<a class="chip ${cat===String(l.id)?'attiva':''}" data-azione="listino-cat" data-valore="${l.id}">${l.breve}</a>`)}</div></div>
  ${tabella({id:'listino',righe:voci,chiaveOrd:'codice',onRiga:l=>dialogoVoceListino(l),colonne:[{chiave:'codice',titolo:'Codice',principale:true},{chiave:'cat',titolo:'Categoria',valore:l=>(stato.lavorazioni.find(x=>x.id===l.categoriaId)||{}).breve||''},{chiave:'descrizione',titolo:'Descrizione',formatta:l=>html`${l.descrizione}${l.descrizioneEstesa?html`<br><span class="piccolo secondario">${tronca(l.descrizioneEstesa,100)}</span>`:''}`},{chiave:'um',titolo:'UM'},{chiave:'pp',titolo:'Sola posa',num:true,valore:l=>l.prezzoPosa==null?-1:l.prezzoPosa,formatta:l=>l.prezzoPosa!=null?fEuro(l.prezzoPosa):html`<span class="pillola scadenza">da quotare</span>`},{chiave:'pf',titolo:'Fornitura e posa',num:true,valore:l=>l.prezzoFornituraPosa==null?-1:l.prezzoFornituraPosa,formatta:l=>l.prezzoFornituraPosa!=null?fEuro(l.prezzoFornituraPosa):html`<span class="silenzioso">—</span>`}]})}`;
}
AZIONI['listino-cat']=d=>{ui.filtri.listinoCat=d.valore;render()};
AZIONI['listino-nuova']=()=>dialogoVoceListino(null);
function dialogoVoceListino(l){
  const nuovo=!l; l=l||{um:'mq'};
  return dialogoModulo(nuovo?'Nuova voce di listino':'Voce '+l.codice,[{nome:'codice',etichetta:'Codice',obbligatorio:true},{nome:'categoriaId',etichetta:'Categoria',tipo:'select',obbligatorio:true,opzioni:stato.lavorazioni.map(x=>({v:x.id,t:x.breve}))},{nome:'descrizione',etichetta:'Descrizione sintetica',obbligatorio:true,largo:true},{nome:'descrizioneEstesa',etichetta:'Descrizione estesa',tipo:'textarea',largo:true},{nome:'um',etichetta:'Unità di misura',tipo:'select',vuoto:false,opzioni:['mq','ml','cad','a corpo','kg','h'].map(x=>({v:x,t:x}))},{nome:'prezzoPosa',etichetta:'Prezzo sola posa',tipo:'euro'},{nome:'prezzoFornituraPosa',etichetta:'Prezzo fornitura e posa',tipo:'euro'},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}],l,{pulsantiExtra:nuovo?[]:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare la voce '+l.codice+'?',{pericolo:true})){esegui('Eliminata voce listino',s=>{s.listino=s.listino.filter(x=>x.id!==l.id)});return null}return false}}]}).then(v=>{if(!v)return;v.categoriaId=+v.categoriaId;if(nuovo)esegui('Nuova voce listino '+v.codice,s=>{s.listino.push(Object.assign({id:nuovoId('l')},v))});else esegui('Modificata voce '+v.codice,s=>{Object.assign(s.listino.find(x=>x.id===l.id),v)})});
}
AZIONI['listino-esporta']=()=>{const righe=[['Codice','Categoria','Descrizione','Descrizione estesa','UM','Prezzo posa','Prezzo fornitura e posa','Note']];for(const l of stato.listino)righe.push([l.codice,(stato.lavorazioni.find(x=>x.id===l.categoriaId)||{}).breve||l.categoriaId,l.descrizione,l.descrizioneEstesa||'',l.um,l.prezzoPosa,l.prezzoFornituraPosa,l.note||'']);scaricaCsv(righe,nomeFileData('Listino '+nomeImpresa(true),'csv'))};
AZIONI['listino-importa']=async()=>{const fs=await scegliFile({multipli:false,accetta:'.csv,.txt'});if(!fs.length)return;const testo=await leggiComeTesto(fs[0]);const righe=leggiCsv(testo);if(righe.length<2)return avviso('CSV vuoto',{tipo:'errore'});const testa=righe[0].map(normalizzaTesto);const col=n=>testa.findIndex(x=>x.includes(n));const iC=col('codice'),iCat=col('categoria'),iD=col('descrizione'),iE=testa.findIndex(x=>x.includes('estesa')),iU=testa.findIndex(x=>x==='um'||x.includes('unita')),iP=testa.findIndex(x=>x.includes('posa')&&!x.includes('fornitura')),iF=testa.findIndex(x=>x.includes('fornitura')),iN=col('note');const nuove=[],agg=[];for(const r of righe.slice(1)){if(!r[iC])continue;const catNome=normalizzaTesto(r[iCat]||'');const cat=stato.lavorazioni.find(l=>normalizzaTesto(l.breve)===catNome||String(l.id)===r[iCat])||null;const v={codice:r[iC],categoriaId:cat?cat.id:7,descrizione:r[iD]||'',descrizioneEstesa:iE>=0?r[iE]:'',um:iU>=0?r[iU]:'mq',prezzoPosa:iP>=0?leggiNumero(r[iP]):null,prezzoFornituraPosa:iF>=0?leggiNumero(r[iF]):null,note:iN>=0?r[iN]:''};const es=stato.listino.find(l=>l.codice===v.codice);if(es)agg.push({id:es.id,v});else nuove.push(Object.assign({id:nuovoId('l')},v))}if(!(await conferma(`Importare ${nuove.length} voci nuove e aggiornarne ${agg.length}?`)))return;esegui('Importato listino',s=>{for(const n of nuove)s.listino.push(n);for(const a of agg)Object.assign(s.listino.find(x=>x.id===a.id),a.v)})};
function leggiCsv(testo){const sep=(testo.split('\n')[0].match(/;/g)||[]).length>=(testo.split('\n')[0].match(/,/g)||[]).length?';':',';const out=[];let riga=[],campo='',inQ=false;for(let i=0;i<testo.length;i++){const c=testo[i];if(inQ){if(c==='"'){if(testo[i+1]==='"'){campo+='"';i++}else inQ=false}else campo+=c}else{if(c==='"')inQ=true;else if(c===sep){riga.push(campo);campo=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&testo[i+1]==='\n')i++;riga.push(campo);out.push(riga);riga=[];campo=''}else campo+=c}}if(campo||riga.length){riga.push(campo);out.push(riga)}return out.filter(r=>r.some(x=>x.trim()))}

// ---- estrazione delle voci dal capitolato del cliente nel modello dell’impresa ----
// Scelta di Edoardo: le voci del file del cliente (Excel o PDF) vengono portate dentro un preventivo
// dell’impresa, che esce sempre col nostro template. Il file del cliente non viene modificato.
function indiceColLettere(lettere){let n=0;for(const ch of lettere)n=n*26+(ch.charCodeAt(0)-64);return n-1}
// Legge il primo foglio di un .xlsx come griglia di testo (niente librerie: lo zip e l'XML bastano)
async function grigliaDaXlsx(file){
  const zip=await leggiZip(file);
  const vSheet=zip.voci.find(v=>v.nome==='xl/worksheets/sheet1.xml');
  if(!vSheet) throw new Error('non ho trovato un foglio di lavoro in questo file');
  const doc=new DOMParser().parseFromString(await zip.testo(vSheet),'application/xml');
  if(doc.querySelector('parsererror')) throw new Error('il foglio di lavoro non è leggibile');
  const vShared=zip.voci.find(v=>v.nome==='xl/sharedStrings.xml');
  const shared=vShared?Array.from((await zip.testo(vShared)).matchAll(/<si>([\s\S]*?)<\/si>/g)).map(m=>m[1].replace(/<[^>]+>/g,'')):[];
  const mappa=new Map();let righeMax=0,colMax=0;
  tutti('c',doc).forEach(c=>{
    const m=/^([A-Z]+)(\d+)$/.exec(c.getAttribute('r')||'');if(!m)return;
    const col=indiceColLettere(m[1]),riga=+m[2]-1;
    const t=c.getAttribute('t'),vEl=c.querySelector('v'),isEl=c.querySelector('is');
    let testo='';
    if(t==='s'&&vEl)testo=shared[+vEl.textContent]||'';else if(isEl)testo=(isEl.textContent||'').trim();else if(vEl)testo=vEl.textContent;
    if(!String(testo).trim())return;
    if(riga>righeMax)righeMax=riga;if(col>colMax)colMax=col;
    mappa.set(riga+':'+col,String(testo));
  });
  righeMax=Math.min(righeMax,2000);colMax=Math.min(colMax,40);
  const out=[];
  for(let r=0;r<=righeMax;r++){const riga=[];for(let c=0;c<=colMax;c++)riga.push(mappa.get(r+':'+c)||'');if(riga.some(x=>x.trim()))out.push(riga)}
  return out;
}
// Da un PDF: le colonne di una tabella stampata restano separate da più spazi
async function grigliaDaPdfCapitolato(file){
  const testo=(await estraiTestoPdf(file)).testo||'';
  return testo.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>3&&/[a-zà-ù]{4}/i.test(l))
    .map(l=>l.split(/\s{2,}|\t/).map(x=>x.trim())).filter(r=>r.length>1);
}
AZIONI['preventivo-importa-voci']=async d=>{
  const fs=await scegliFile({multipli:false,accetta:'.xlsx,.pdf'});
  if(!fs.length) return;
  const f=fs[0];
  let griglia;
  try{ griglia=/\.xlsx$/i.test(f.name)?await grigliaDaXlsx(f):ePdf(f.type,f.name)?await grigliaDaPdfCapitolato(f):null; }
  catch(e){ return segnalaErrore(e,'Non sono riuscito a leggere «'+f.name+'»'); }
  if(!griglia) return avviso('Serve un file .xlsx o un PDF con testo dentro (non una scansione)',{tipo:'errore'});
  if(!griglia.length) return avviso('Il file non contiene righe leggibili: se è una scansione il testo non c\'è',{tipo:'errore'});
  const {righe:nuove,colonne}=righeCapitolatoDaGriglia(griglia);
  if(!nuove.length) return avviso('Non ho riconosciuto nessuna voce di capitolato in questo file',{tipo:'errore'});
  if(d&&d.id){ // dentro un preventivo già aperto: aggiunge le righe
    if(!(await anteprimaRigheCapitolato(nuove,colonne))) return;
    return esegui('Importate '+nuove.length+' voci da '+f.name,s=>{s.preventivi.find(x=>x.id===d.id).righe.push(...nuove)});
  }
  if(!(await anteprimaRigheCapitolato(nuove,colonne,'Crea il preventivo'))) return;
  const anno=new Date().getFullYear();
  const v=await dialogoModulo('Nuovo preventivo dalle voci di «'+f.name+'»',[{nome:'clienteId',etichetta:'Cliente',tipo:'select',opzioni:stato.clienti.map(c=>({v:c.id,t:c.ragioneSociale}))},{nome:'cantiereId',etichetta:'Cantiere collegato',tipo:'select',opzioni:stato.cantieri.map(c=>({v:c.id,t:c.nome}))},{nome:'oggetto',etichetta:'Oggetto',largo:true,obbligatorio:true},{nome:'data',etichetta:'Data',tipo:'data',obbligatorio:true},{nome:'validitaGiorni',etichetta:'Validità (giorni)',tipo:'numero',decimali:0}],{oggetto:f.name.replace(/\.(xlsx|pdf)$/i,''),data:oggi(),validitaGiorni:30});
  if(!v) return;
  const id=nuovoId('pv');
  esegui('Nuovo preventivo da '+f.name,s=>{s.preventivi.push(Object.assign({id,numero:prossimoNumeroPreventivo(anno),anno,stato:'bozza',righe:nuove,scontoPct:0,condizioni:'Pagamento: [DA COMPILARE]\nEsclusi: fornitura materiali salvo dove indicato, opere murarie, smaltimento.\nPrezzi IVA esclusa.',note:'Voci importate da '+f.name},v))});
  vai('preventivi/'+id);
};
