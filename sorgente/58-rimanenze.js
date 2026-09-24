// ---------------------------------------------------------------------
// RIMANENZE al 31/12, da dare al commercialista: magazzino, lavori in corso, fatture da emettere.
// Lavori e fatture si propongono dai dati (ore in presenze dopo l'ultima fattura del cantiere,
// fatture emesse l'anno dopo), ma ogni valore resta modificabile a mano.
// stato.rimanenze["AAAA"] = {magazzino:[{id,descrizione,qta,um,costo}],
//   lavori:[{id,cantiereId,cliente,cantiere,tipologia,ore,manodopera,materiali,importo}],
//   fatture:[{id,cantiereId,movimentoId,cliente,numero,data,cantiere,tipologia,importo}]}
// ---------------------------------------------------------------------
const SEZIONI_RIMANENZE={magazzino:'Rimanenze di magazzino',lavori:'Lavori in corso',fatture:'Fatture da emettere'};
function rimanenzeAnno(s,anno){s.rimanenze=s.rimanenze||{};return s.rimanenze[anno]=s.rimanenze[anno]||{magazzino:[],lavori:[],fatture:[]}}
const importoMagazzino=r=>arrotonda2((+r.qta||0)*(+r.costo||0));
const costiLavoro=r=>arrotonda2((+r.manodopera||0)+(+r.materiali||0));
function totaleRimanenze(sez,righe){return arrotonda2(somma(righe,sez==='magazzino'?importoMagazzino:sez==='lavori'?costiLavoro:r=>+r.importo||0))}
function numTxt(v){if(v==null||v==='')return '';const x=+(+v).toFixed(4);return fNum(x,Number.isInteger(x)?0:Math.max(2,(String(x).split('.')[1]||'').length))}

// ---- dai dati: ore, costi, fatture per cantiere ----
function fattureCantiere(cid){return stato.movimenti.filter(m=>m.tipo==='entrata'&&m.data&&quoteMovimentoPerCantiere(m).some(q=>q.cantiereId===cid)).sort((a,b)=>a.data<b.data?-1:1)}
// Ore e costo della manodopera su un cantiere fra due date (dopo "dal", fino ad "al" compreso).
// In presenze il cantiere è testo libero (spesso la località): lo riconosce cantiereDaCella().
function oreCantiere(c,dal,al){
  let ore=0,costo=0,senzaTariffa=0;
  for(const k of Object.keys(stato.presenze||{})){
    if(k>al.slice(0,7)||(dal&&k<dal.slice(0,7)))continue;
    for(const [pid,mp] of Object.entries(stato.presenze[k].persone||{})){
      const p=persona(pid);const tariffa=+((p&&p.retribuzione)||{}).tariffaOraria||0;
      for(const [g,cella] of Object.entries(mp.giorni||{})){
        const iso=k+'-'+pad2(+g);if(iso>al||(dal&&iso<=dal))continue;
        if(cantiereDaCella(cella,iso)!==c)continue;
        const v=valoreCella(cella);if(typeof v!=='number'||!v)continue;
        ore+=v;costo+=v*tariffa;if(!tariffa)senzaTariffa+=v;
      }
    }
  }
  return {ore,costo:arrotonda2(costo),senzaTariffa};
}
function speseCantiere(cid,dal,al){return arrotonda2(somma(stato.movimenti.filter(m=>m.tipo==='uscita'&&m.categoria!=='manodopera'&&m.data&&m.data<=al&&(!dal||m.data>dal)),m=>somma(quoteMovimentoPerCantiere(m).filter(q=>q.cantiereId===cid),q=>+q.importo||0)))}
function tipologiaCantiere(c){return (c.lavorazioni||[]).map(id=>(stato.lavorazioni.find(l=>l.id===id)||{}).breve).filter(Boolean).join(', ')||c.descrizione||''}
function luogoCantiere(c){const i=c.indirizzo||{};return [c.nome,i.comune?i.comune+(i.provincia?' ('+i.provincia+')':''):''].filter(Boolean).join(', ')}
function clienteCantiere(c){return nomeCliente(c.affidatariaId)||nomeCliente(c.committenteId)||''}
function rigaLavoro(c,anno){
  const fine=anno+'-12-31';const ult=fattureCantiere(c.id).filter(m=>m.data<=fine).pop();const dal=ult?ult.data:null;
  const o=oreCantiere(c,dal,fine);
  return {id:nuovoId('rl'),cantiereId:c.id,cliente:clienteCantiere(c),cantiere:luogoCantiere(c),tipologia:tipologiaCantiere(c),ore:o.ore,manodopera:o.costo,materiali:speseCantiere(c.id,dal,fine),importo:null,dal};
}
function rigaFattura(m,c){
  const q=c?quoteMovimentoPerCantiere(m).find(x=>x.cantiereId===c.id):null;
  return {id:nuovoId('rf'),cantiereId:c?c.id:null,movimentoId:m.id,cliente:m.controparte||nomeCliente(m.controparteId)||nomeCliente(m.clienteId)||(c?clienteCantiere(c):''),numero:m.numero||'',data:m.data,cantiere:c?luogoCantiere(c):'',tipologia:c?tipologiaCantiere(c):(m.descrizione||''),importo:q?+q.importo||0:+m.imponibile||0};
}
// Proposta: ogni cantiere con ore lavorate dopo la sua ultima fattura dell'anno.
// Se la fattura successiva è già stata emessa l'anno dopo → fatture da emettere; altrimenti → lavori in corso.
function proposteRimanenze(anno){
  const fine=anno+'-12-31',dopo=(+anno+1)+'-12-31';const lavori=[],fatture=[];
  for(const c of stato.cantieri){
    const ft=fattureCantiere(c.id);const ult=ft.filter(m=>m.data<=fine).pop();
    if(!oreCantiere(c,ult?ult.data:null,fine).ore)continue;
    const succ=ft.find(m=>m.data>fine&&m.data<=dopo);
    if(succ)fatture.push(rigaFattura(succ,c));else lavori.push(rigaLavoro(c,anno));
  }
  return {lavori,fatture};
}

// ---- vista ----
VISTE.rimanenze=function(r){
  const oggiD=new Date();const predef=String(oggiD.getMonth()<6?oggiD.getFullYear()-1:oggiD.getFullYear());
  const anni=unici(Object.keys(stato.rimanenze||{}).concat([String(oggiD.getFullYear()-1),String(oggiD.getFullYear())])).sort().reverse();
  const anno=ui.filtri.rimanenzeAnno||predef;
  const R=(stato.rimanenze||{})[anno]||{magazzino:[],lavori:[],fatture:[]};
  const sez=linguettaAttiva('rimanenze','magazzino');
  const testa=html`<div class="testata"><div><h1>Rimanenze al 31/12/${anno}</h1><div class="sotto">Da consegnare al commercialista · magazzino ${fEuro(totaleRimanenze('magazzino',R.magazzino))} · lavori in corso ${fEuro(totaleRimanenze('lavori',R.lavori))} · fatture da emettere ${fEuro(totaleRimanenze('fatture',R.fatture))}</div></div>
    <div class="azioni"><select data-cambio="rim-anno" aria-label="Anno" style="width:auto">${anni.map(a=>html`<option value="${a}" ${a===anno?'selected':''}>${a}</option>`)}</select><button class="pulsante primario" data-azione="rim-stampa" data-anno="${anno}" title="Un unico PDF con magazzino, lavori in corso e fatture da emettere">${icona('stampa')}Esporta rimanenze</button></div></div>
  ${linguette('rimanenze',Object.entries(SEZIONI_RIMANENZE).map(([id,testo])=>({id,testo:testo.replace('Rimanenze di magazzino','Magazzino'),contatore:(R[id]||[]).length})),sez)}`;
  return testa+(sez==='lavori'?rimLavori(anno,R.lavori):sez==='fatture'?rimFatture(anno,R.fatture):rimMagazzino(anno,R.magazzino));
};
AZIONI['rim-anno']=(d,t)=>{ui.filtri.rimanenzeAnno=t.value;render()};
const inRim=(sez,i,campo,v,opz)=>html`<input type="text" ${opz&&opz.num?grezzo('inputmode="decimal" class="num-input"'):''} value="${opz&&opz.num?numTxt(v):(v||'')}" data-cambio="rim-campo" data-sez="${sez}" data-i="${i}" data-campo="${campo}" style="${(opz&&opz.stile)||''}">`;
const btnElimina=(sez,i)=>html`<button class="pulsante discreto icona piccolo" data-azione="rim-elimina" data-sez="${sez}" data-i="${i}" aria-label="Elimina riga">${icona('elimina','piccola')}</button>`;
const piedeRim=(anno,sez,righe,cols,dopo)=>html`<tfoot><tr><td colspan="${cols}" class="destra"><b>Totale</b></td><td class="num"><b data-rim-tot="${sez}">${fEuro(totaleRimanenze(sez,righe))}</b></td><td colspan="${dopo||1}"></td></tr></tfoot>`;
const pulsantiSez=(anno,sez,extra)=>html`<span class="azioni">${extra||''}<button class="pulsante piccolo" data-azione="rim-riga" data-anno="${anno}" data-sez="${sez}">${icona('piu','piccola')}Riga libera</button><button class="pulsante piccolo" data-azione="rim-stampa" data-anno="${anno}" data-sez="${sez}">${icona('stampa','piccola')}PDF</button></span>`;
function rimMagazzino(anno,righe){
  return html`<div class="scheda"><h3>Magazzino al 31/12/${anno} ${pulsantiSez(anno,'magazzino',html`<button class="pulsante piccolo" data-azione="rim-copia-anno" data-anno="${anno}">${icona('copia','piccola')}Copia dall'anno prima</button><button class="pulsante piccolo" data-azione="rim-importa" data-anno="${anno}">${icona('carica','piccola')}Importa da Excel</button>`)}</h3>
  ${righe.length?html`<div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>Descrizione</th><th class="num">Q.tà</th><th>UM</th><th class="num">Costo unit.</th><th class="num">Importo</th><th></th></tr></thead><tbody>
  ${righe.map((r,i)=>html`<tr><td>${inRim('magazzino',i,'descrizione',r.descrizione,{stile:'min-width:300px'})}</td><td>${inRim('magazzino',i,'qta',r.qta,{num:1,stile:'width:90px'})}</td><td>${inRim('magazzino',i,'um',r.um,{stile:'width:56px'})}</td><td>${inRim('magazzino',i,'costo',r.costo,{num:1,stile:'width:90px'})}</td><td class="num" data-rim-imp="magazzino:${i}">${fEuro(importoMagazzino(r))}</td><td>${btnElimina('magazzino',i)}</td></tr>`)}
  </tbody>${piedeRim(anno,'magazzino',righe,4)}</table></div>`:html`<p class="secondario">Nessun articolo. Importa il foglio Excel dell'inventario, copia l'elenco dell'anno prima o aggiungi le righe a mano.</p>`}</div>`;
}
function rimLavori(anno,righe){
  return html`<div class="scheda"><h3>Lavori in corso al 31/12/${anno} ${pulsantiSez(anno,'lavori',html`<button class="pulsante piccolo" data-azione="rim-proponi" data-anno="${anno}">${icona('magia','piccola')}Compila dai dati</button><button class="pulsante piccolo" data-azione="rim-cantiere" data-anno="${anno}">${icona('cantieri','piccola')}Aggiungi cantiere</button>`)}</h3>
  <p class="piccolo secondario">Cantieri con ore lavorate dopo l'ultima fattura (SAL) e la fattura successiva non ancora emessa. Manodopera = ore in presenze × tariffa oraria; materiali e altri costi = fatture d'acquisto del cantiere nello stesso periodo. Tutti i valori si possono correggere.</p>
  ${righe.length?html`<div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>Cliente</th><th>Cantiere</th><th>Tipologia lavori</th><th class="num">Ore</th><th class="num">Manodopera</th><th class="num">Materiali e altro</th><th class="num">Importo presunto lavori</th><th class="num">Costi</th><th></th></tr></thead><tbody>
  ${righe.map((r,i)=>html`<tr><td>${inRim('lavori',i,'cliente',r.cliente,{stile:'min-width:150px'})}</td><td>${inRim('lavori',i,'cantiere',r.cantiere,{stile:'min-width:160px'})}${r.dal?html`<div class="piccolo secondario">ore dopo la fattura del ${fData(r.dal)}</div>`:''}</td><td>${inRim('lavori',i,'tipologia',r.tipologia,{stile:'min-width:150px'})}</td><td>${inRim('lavori',i,'ore',r.ore,{num:1,stile:'width:64px'})}</td><td>${inRim('lavori',i,'manodopera',r.manodopera,{num:1,stile:'width:90px'})}</td><td>${inRim('lavori',i,'materiali',r.materiali,{num:1,stile:'width:90px'})}</td><td>${inRim('lavori',i,'importo',r.importo,{num:1,stile:'width:100px'})}</td><td class="num" data-rim-imp="lavori:${i}">${fEuro(costiLavoro(r))}</td><td>${btnElimina('lavori',i)}</td></tr>`)}
  </tbody>${piedeRim(anno,'lavori',righe,7)}</table></div>`:html`<p class="secondario">Nessun lavoro in corso. Nel PDF comparirà «Al 31/12/${anno} non risultano lavori in corso».</p>`}</div>`;
}
function rimFatture(anno,righe){
  return html`<div class="scheda"><h3>Fatture da emettere per lavori del ${anno} ${pulsantiSez(anno,'fatture',html`<button class="pulsante piccolo" data-azione="rim-proponi" data-anno="${anno}">${icona('magia','piccola')}Compila dai dati</button><button class="pulsante piccolo" data-azione="rim-da-fattura" data-anno="${anno}">${icona('budget','piccola')}Da una fattura emessa</button>`)}</h3>
  <p class="piccolo secondario">Fatture emesse nel ${+anno+1} per lavori svolti nel ${anno}: si propongono quelle dei cantieri che hanno ore lavorate dopo l'ultima fattura del ${anno}. Importi modificabili.</p>
  ${righe.length?html`<div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>Cliente</th><th>N. fattura</th><th>Data</th><th>Cantiere</th><th>Tipologia lavori</th><th class="num">Importo</th><th></th></tr></thead><tbody>
  ${righe.map((r,i)=>html`<tr><td>${inRim('fatture',i,'cliente',r.cliente,{stile:'min-width:150px'})}</td><td>${inRim('fatture',i,'numero',r.numero,{stile:'width:80px'})}</td><td><input type="date" value="${r.data||''}" data-cambio="rim-campo" data-sez="fatture" data-i="${i}" data-campo="data"></td><td>${inRim('fatture',i,'cantiere',r.cantiere,{stile:'min-width:160px'})}</td><td>${inRim('fatture',i,'tipologia',r.tipologia,{stile:'min-width:150px'})}</td><td>${inRim('fatture',i,'importo',r.importo,{num:1,stile:'width:100px'})}</td><td>${btnElimina('fatture',i)}</td></tr>`)}
  </tbody>${piedeRim(anno,'fatture',righe,5)}</table></div>`:html`<p class="secondario">Nessuna fattura da emettere. Nel PDF comparirà «Al 31/12/${anno} non risultano fatture da emettere».</p>`}</div>`;
}

// ---- modifiche ----
const annoRim=()=>ui.filtri.rimanenzeAnno||String(new Date().getMonth()<6?new Date().getFullYear()-1:new Date().getFullYear());
const CAMPI_NUMERICI_RIM=['qta','costo','ore','manodopera','materiali','importo'];
AZIONI['rim-campo']=(d,t)=>{
  const anno=annoRim();let v=t.value.trim();
  if(CAMPI_NUMERICI_RIM.includes(d.campo)){v=v===''?null:leggiNumero(v);if(v===null&&t.value.trim()!==''){avviso('Numero non valido',{tipo:'errore'});return}}
  // senza ridisegnare, altrimenti Tab perderebbe il campo successivo: si aggiornano solo i totali
  esegui('Modificate rimanenze',s=>{rimanenzeAnno(s,anno)[d.sez][+d.i][d.campo]=v},{senzaRender:true,silenzioso:true});
  const righe=rimanenzeAnno(stato,anno)[d.sez];const r=righe[+d.i];
  const c=el(`[data-rim-imp="${d.sez}:${d.i}"]`);if(c)c.textContent=fEuro(d.sez==='magazzino'?importoMagazzino(r):costiLavoro(r));
  const tot=el(`[data-rim-tot="${d.sez}"]`);if(tot)tot.textContent=fEuro(totaleRimanenze(d.sez,righe));
};
AZIONI['rim-elimina']=d=>esegui('Eliminata riga',s=>{rimanenzeAnno(s,annoRim())[d.sez].splice(+d.i,1)});
AZIONI['rim-riga']=d=>esegui('Aggiunta riga',s=>{rimanenzeAnno(s,d.anno)[d.sez].push(d.sez==='magazzino'?{id:nuovoId('rm'),descrizione:'',qta:null,um:'pz',costo:null}:{id:nuovoId('r'),cliente:'',cantiere:'',tipologia:'',importo:null})});
AZIONI['rim-proponi']=d=>{
  const R=(stato.rimanenze||{})[d.anno]||{lavori:[],fatture:[]};const p=proposteRimanenze(d.anno);
  // non si duplica ciò che c'è già (stesso cantiere nei lavori, stessa fattura fra le fatture)
  const lav=p.lavori.filter(x=>!R.lavori.some(y=>y.cantiereId===x.cantiereId)&&!R.fatture.some(y=>y.cantiereId===x.cantiereId));
  const ft=p.fatture.filter(x=>!R.fatture.some(y=>y.movimentoId===x.movimentoId)&&!R.lavori.some(y=>y.cantiereId===x.cantiereId));
  if(!lav.length&&!ft.length)return informa('Niente da aggiungere',html`<p>Non ho trovato altri cantieri con ore lavorate in presenze dopo l'ultima fattura del ${d.anno}.</p><p class="piccolo secondario">Le ore contano se nella riga «cantiere» delle presenze c'è il nome del cantiere o la sua località (in Presenze le celle non riconosciute sono sottolineate in arancione). Puoi sempre aggiungere un cantiere o una fattura a mano.</p>`);
  esegui(`Proposte: ${plurale(lav.length,'lavoro in corso','lavori in corso')}, ${plurale(ft.length,'fattura da emettere','fatture da emettere')}`,s=>{const X=rimanenzeAnno(s,d.anno);X.lavori.push(...lav);X.fatture.push(...ft)});
};
AZIONI['rim-cantiere']=async d=>{
  const v=await dialogoModulo('Aggiungi un cantiere ai lavori in corso',[{nome:'cantiereId',etichetta:'Cantiere',tipo:'select',obbligatorio:true,opzioni:stato.cantieri.map(c=>({v:c.id,t:c.nome+(c.anno?' ('+c.anno+')':'')}))}],{},{ok:'Aggiungi',intro:html`<p class="piccolo secondario">Ore e costi si calcolano dal giorno dopo l'ultima fattura del cantiere fino al 31/12/${d.anno}.</p>`});
  if(!v)return;const c=cantiere(v.cantiereId);
  esegui('Aggiunto '+c.nome+' ai lavori in corso',s=>{rimanenzeAnno(s,d.anno).lavori.push(rigaLavoro(c,d.anno))});
};
AZIONI['rim-da-fattura']=async d=>{
  const dopo=String(+d.anno+1);const ft=stato.movimenti.filter(m=>m.tipo==='entrata'&&(m.data||'').startsWith(dopo)).sort((a,b)=>a.data<b.data?-1:1);
  if(!ft.length)return informa('Nessuna fattura del '+dopo,html`<p>In Budget non ci sono fatture emesse nel ${dopo}. Aggiungi una riga libera e scrivi i dati a mano.</p>`);
  const v=await dialogoModulo('Da una fattura emessa nel '+dopo,[{nome:'id',etichetta:'Fattura',tipo:'select',obbligatorio:true,opzioni:ft.map(m=>({v:m.id,t:`${m.numero||'s.n.'} del ${fData(m.data)} · ${m.controparte||nomeCliente(m.controparteId)||nomeCliente(m.clienteId)||''} · ${fEuro(m.imponibile)}`}))}],{},{ok:'Aggiungi'});
  if(!v)return;const m=perId('movimenti',v.id);const q=quoteMovimentoPerCantiere(m)[0];
  esegui('Aggiunta fattura da emettere',s=>{rimanenzeAnno(s,d.anno).fatture.push(rigaFattura(m,q?cantiere(q.cantiereId):null))});
};
AZIONI['rim-copia-anno']=async d=>{
  const prec=((stato.rimanenze||{})[String(+d.anno-1)]||{}).magazzino||[];
  if(!prec.length)return informa('Niente da copiare',html`<p>Il magazzino del ${+d.anno-1} è vuoto.</p>`);
  if(!await conferma(`Copiare i ${prec.length} articoli del ${+d.anno-1} (con quantità e costi, da aggiornare)?`))return;
  esegui('Copiato magazzino dal '+(+d.anno-1),s=>{rimanenzeAnno(s,d.anno).magazzino.push(...prec.map(r=>Object.assign({},r,{id:nuovoId('rm')})))});
};
// Inventario da Excel: si cercano le colonne Descrizione / Q.tà / UM / Costo (o Prezzo) nel primo foglio
function magazzinoDaGriglia(g){
  const iT=g.findIndex(r=>r.some(x=>normalizzaTesto(x)==='descrizione'));if(iT<0)return [];
  const t=g[iT].map(normalizzaTesto);const col=re=>t.findIndex(x=>re.test(x));
  const cD=col(/^descrizione$/),cQ=col(/^q ?ta$|quant/),cU=col(/^um$|^u m$/),cC=col(/costo|prezzo/);
  // nel file xlsx i numeri sono sempre col punto decimale: «0.004» non è «4» all'italiana
  const num=x=>{const t=String(x==null?'':x).trim();return /^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(t)?+t:leggiNumero(t)};
  const out=[];
  for(const r of g.slice(iT+1)){const desc=String(r[cD]||'').trim();if(/^totale/i.test(desc)||/^totale/i.test(String(r[0]||'').trim()))break;const q=num(r[cQ]);if(!desc||q==null)continue;out.push({id:nuovoId('rm'),descrizione:desc,qta:q,um:cU>=0?String(r[cU]||'').trim():'',costo:cC>=0&&num(r[cC])!=null?+num(r[cC]).toFixed(4):null})}
  return out;
}
AZIONI['rim-importa']=async d=>{
  const fs=await scegliFile({multipli:false,accetta:'.xlsx'});if(!fs.length)return;
  let righe;try{righe=magazzinoDaGriglia(await grigliaDaXlsx(fs[0]))}catch(e){return segnalaErrore(e,'Non sono riuscito a leggere «'+fs[0].name+'»')}
  if(!righe.length)return avviso('Nel primo foglio non ho trovato una tabella con Descrizione e Q.tà',{tipo:'errore'});
  esegui(`Importati ${righe.length} articoli di magazzino`,s=>{rimanenzeAnno(s,d.anno).magazzino.push(...righe)});
};

// ---- stampa: un unico PDF (o una sola sezione), una sezione per pagina ----
function docRimanenze(anno,soloSez){
  const R=(stato.rimanenze||{})[anno]||{magazzino:[],lavori:[],fatture:[]};const al='31/12/'+anno;
  const blocchi=[];let prima=true;
  const tab=(sez,testa,righe,cols)=>{blocchi.push({html:`<h1>${h(SEZIONI_RIMANENZE[sez])} <span class="secondario">al ${al}</span></h1>`,nuovaPagina:!prima,tieniConSuccessivo:true});prima=false;
    const vuoto={magazzino:`Al ${al} non risultano rimanenze di magazzino.`,lavori:`Al ${al} non risultano lavori in corso.`,fatture:`Al ${al} non risultano fatture da emettere per lavori svolti nel ${anno}.`}[sez];
    blocchi.push(righe.length?`<table class="rimanenze"><thead><tr>${testa}</tr></thead><tbody>${righe.join('')}</tbody><tfoot><tr class="totale">${cols}</tr></tfoot></table>`:`<p>${h(vuoto)}</p>`)};
  const n=v=>h(numTxt(v));const e=v=>h(v==null||v===''?'':fNum(+v,2));
  if(!soloSez||soloSez==='magazzino')tab('magazzino','<th>Descrizione</th><th class="num">Q.tà</th><th>UM</th><th class="num">Costo</th><th class="num">Importo</th>',R.magazzino.map(r=>`<tr><td>${h(r.descrizione)}</td><td class="num">${n(r.qta)}</td><td>${h(r.um||'')}</td><td class="num">${n(r.costo)}</td><td class="num">${e(importoMagazzino(r))}</td></tr>`),`<td colspan="4">Totale valore magazzino</td><td class="num">${e(totaleRimanenze('magazzino',R.magazzino))}</td>`);
  if(!soloSez||soloSez==='lavori')tab('lavori','<th>Cliente</th><th>Cantiere</th><th>Tipologia lavori</th><th class="num">Costi</th><th class="num">Importo presunto lavori</th>',R.lavori.map(r=>`<tr><td>${h(r.cliente)}</td><td>${h(r.cantiere)}</td><td>${h(r.tipologia)}</td><td class="num">${e(costiLavoro(r))}</td><td class="num">${e(r.importo)}</td></tr>`),`<td colspan="3">Totale presunto lavori da eseguire / costi</td><td class="num">${e(totaleRimanenze('lavori',R.lavori))}</td><td class="num">${e(somma(R.lavori,r=>+r.importo||0))}</td>`);
  if(!soloSez||soloSez==='fatture')tab('fatture','<th>Cliente</th><th>Fattura</th><th>Cantiere</th><th>Tipologia lavori</th><th class="num">Importo</th>',R.fatture.map(r=>`<tr><td>${h(r.cliente)}</td><td>${r.numero?'n. '+h(r.numero):''}${r.data?' del '+h(fData(r.data)):''}</td><td>${h(r.cantiere)}</td><td>${h(r.tipologia)}</td><td class="num">${e(r.importo)}</td></tr>`),`<td colspan="4">Totale presunto fatture da emettere</td><td class="num">${e(totaleRimanenze('fatture',R.fatture))}</td>`);
  const titolo=(soloSez?SEZIONI_RIMANENZE[soloSez]:'Rimanenze')+' al '+al;
  const testa=`<div class="carta-intestata ore-testa"><img src="{{IMG:logo}}" alt="${h(stato.azienda.ragioneSociale)}"><div class="dati"><b>${h(stato.azienda.ragioneSociale)}</b>${(((stato.azienda.cartaIntestata||{}).righe)||[]).map(r=>h(r)+'<br>').join('')}</div><div class="titolo-scheda"><b>${h((soloSez?SEZIONI_RIMANENZE[soloSez]:'Rimanenze').toUpperCase())}</b><span>${al}</span></div></div>`;
  return {titolo,intestazione:testa,blocchi};
}
AZIONI['rim-stampa']=d=>{const doc=docRimanenze(d.anno,d.sez);anteprimaStampa({titolo:doc.titolo,doc})};
