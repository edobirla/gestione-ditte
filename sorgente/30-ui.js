// ---------------------------------------------------------------------
// Componenti riutilizzabili. Tutto produce stringhe HTML sicure (via html``) o
// manipola il DOM in modo circoscritto. Niente finestre di sistema.
// ---------------------------------------------------------------------

// ---- avvisi (toast) ----
function avviso(testo,opz){
  opz=opz||{};
  const cont=el('#avvisi'); if(!cont) return;
  const a=creaEl(html`<div class="avviso ${opz.tipo||''}" role="status"><div class="corpo">${testo}</div>${opz.azione?html`<button class="pulsante piccolo">${opz.azione.testo}</button>`:''}<button class="pulsante piccolo icona" aria-label="Chiudi">${icona('chiudi','piccola')}</button></div>`);
  const btns=a.querySelectorAll('button');
  if(opz.azione){btns[0].onclick=()=>{a.remove();opz.azione.fn()}}
  btns[btns.length-1].onclick=()=>a.remove();
  // un solo avviso "silenzioso" alla volta (quelli delle modifiche), per non impilarli
  if(opz.silenzioso){tutti('.avviso.silenzioso',cont).forEach(x=>x.remove());a.classList.add('silenzioso')}
  cont.appendChild(a);
  setTimeout(()=>{if(a.parentNode)a.remove()},opz.durata||4000);
}

// ---- dialoghi ----
// dialogo({titolo, corpo(html), pulsanti:[{testo, classe, valore, chiudi:true}], largo, alMontaggio(el)}) → Promise<valore>
function dialogo(opz){
  return new Promise(risolvi=>{
    const cont=el('#dialoghi');
    const pulsanti=opz.pulsanti||[{testo:'Chiudi',valore:null}];
    const velo=creaEl(html`<div class="velo" role="dialog" aria-modal="true" aria-label="${opz.titolo||''}"><div class="dialogo ${opz.largo?'largo':''} ${opz.enorme?'enorme':''}">
      <div class="testa"><h2>${opz.titolo||''}</h2>${opz.senzaChiudi?'':html`<button class="pulsante discreto icona" data-chiudi aria-label="Chiudi">${icona('chiudi')}</button>`}</div>
      <div class="corpo">${grezzo(opz.corpo||'')}</div>
      ${pulsanti.length?html`<div class="piede">${grezzo(pulsanti.map((p,i)=>`<button class="pulsante ${h(p.classe||'')} ${p.sinistra?'sinistra':''}" data-pulsante="${i}" ${p.primario?'data-primario':''}>${h(p.testo)}</button>`).join(''))}</div>`:''}
    </div></div>`);
    const chiudi=(v)=>{velo.remove();document.removeEventListener('keydown',tasti);risolvi(v)};
    const tasti=(e)=>{ if(e.key==='Escape'&&!opz.senzaChiudi){e.preventDefault();chiudi(opz.valoreEscape===undefined?null:opz.valoreEscape)} if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){const p=velo.querySelector('[data-primario]');if(p)p.click()} };
    velo.addEventListener('click',e=>{
      if(e.target===velo&&!opz.senzaChiudi) return chiudi(opz.valoreEscape===undefined?null:opz.valoreEscape);
      const b=e.target.closest('[data-chiudi]'); if(b) return chiudi(opz.valoreEscape===undefined?null:opz.valoreEscape);
      const p=e.target.closest('[data-pulsante]');
      if(p){ const def=pulsanti[+p.dataset.pulsante]; if(def.fn){ const r=def.fn(velo); if(r===false) return; if(r&&r.then){ p.disabled=true; r.then(v=>{ if(v===false){p.disabled=false;return} chiudi(v===undefined?def.valore:v) }).catch(err=>{p.disabled=false;segnalaErrore(err)}); return; } chiudi(r===undefined?def.valore:r); return; } chiudi(def.valore); }
    });
    document.addEventListener('keydown',tasti);
    cont.appendChild(velo);
    velo.chiudi=chiudi;
    if(opz.alMontaggio) opz.alMontaggio(velo,chiudi);
    const primo=velo.querySelector('input:not([type=hidden]),select,textarea,button[data-primario],button');
    if(primo&&!opz.senzaFocus) setTimeout(()=>primo.focus(),30);
  });
}
function conferma(testo,opz){
  opz=opz||{};
  return dialogo({titolo:opz.titolo||'Conferma',corpo:html`<p>${grezzo(typeof testo==='string'?h(testo).replace(/\n/g,'<br>'):testo)}</p>`,valoreEscape:false,pulsanti:[{testo:opz.annulla||'Annulla',valore:false},{testo:opz.ok||'Conferma',classe:opz.pericolo?'pericolo pieno':'primario',valore:true,primario:true}]});
}
function informa(titolo,corpo){return dialogo({titolo,corpo:typeof corpo==='string'?html`<p>${grezzo(h(corpo).replace(/\n/g,'<br>'))}</p>`:corpo,pulsanti:[{testo:'Ok',classe:'primario',valore:true,primario:true}]})}
function chiediTesto(titolo,opz){
  opz=opz||{};
  return dialogo({titolo,corpo:html`<div class="campo"><label>${opz.etichetta||''}</label>${opz.multiriga?html`<textarea id="dlg-testo" rows="5">${opz.valore||''}</textarea>`:html`<input id="dlg-testo" type="${opz.tipo||'text'}" value="${opz.valore||''}" placeholder="${opz.segnaposto||''}">`}${opz.aiuto?html`<div class="aiuto">${opz.aiuto}</div>`:''}</div>`,pulsanti:[{testo:'Annulla',valore:null},{testo:opz.ok||'Ok',classe:'primario',primario:true,fn:v=>{const t=v.querySelector('#dlg-testo').value;if(opz.obbligatorio&&!t.trim()){v.querySelector('#dlg-testo').focus();return false}return t}}],alMontaggio:v=>{const i=v.querySelector('#dlg-testo');if(i&&!opz.multiriga)i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();v.querySelector('[data-primario]').click()}})}});
}
function dialogoErrore(dettaglio){
  return dialogo({titolo:'Dettaglio dell\'errore',largo:true,corpo:html`<p>I dati non sono andati persi: l'ultima modifica salvata è al sicuro. Copia il dettaglio se vuoi segnalarlo.</p><pre class="codice-blocco">${dettaglio}</pre>`,pulsanti:[{testo:'Copia',fn:()=>{copiaNegliAppunti(dettaglio);avviso('Copiato');return false}},{testo:'Chiudi',classe:'primario',valore:true}]});
}
// Dialogo di avanzamento per le operazioni lunghe, con annullamento
function dialogoAvanzamento(titolo,opz){
  opz=opz||{};
  const stato={annullato:false};
  const velo=creaEl(html`<div class="velo" role="dialog" aria-modal="true"><div class="dialogo"><div class="testa"><h2>${titolo}</h2></div><div class="corpo"><div class="progresso"><div style="width:0%"></div></div><p class="mt-s secondario" data-testo>${opz.testo||'Attendere…'}</p></div>${opz.annullabile?html`<div class="piede"><button class="pulsante" data-annulla>Annulla</button></div>`:''}</div></div>`);
  el('#dialoghi').appendChild(velo);
  const b=velo.querySelector('[data-annulla]'); if(b) b.onclick=()=>{stato.annullato=true;b.disabled=true;b.textContent='Annullamento…'};
  return {
    aggiorna(fatti,totale,testo){velo.querySelector('.progresso>div').style.width=(totale?Math.round(fatti/totale*100):0)+'%';if(testo!==undefined)velo.querySelector('[data-testo]').textContent=testo;/* cede il passo al disegno; in una scheda nascosta requestAnimationFrame non scatta, quindi si prosegue subito */return new Promise(r=>document.hidden?r():requestAnimationFrame(()=>setTimeout(r,0)))},
    testo(t){velo.querySelector('[data-testo]').textContent=t},
    chiudi(){velo.remove()},
    get annullato(){return stato.annullato}
  };
}

// ---- pillole e stati ----
function pillola(statoKey,testo,opz){
  opz=opz||{};
  const def=STATI_DOC[statoKey]||{etichetta:statoKey,icona:'info'};
  return html`<span class="pillola ${statoKey} ${opz.stimata?'stimata':''} ${opz.grande?'grande':''}" title="${opz.titolo||''}">${icona(def.icona)}${testo||def.etichetta}${opz.stimata?' (stimata)':''}</span>`;
}
function pillolaDocumento(info,opz){
  opz=opz||{};
  if(!info) return pillola('mancante');
  let testo=STATI_DOC[info.stato].etichetta;
  if(info.stato==='scaduto'&&info.data) testo=`Scaduto il ${fData(info.data)}`;
  else if(info.stato==='scadenza'&&info.giorni!=null) testo=`Scade fra ${info.giorni} gg`;
  else if(info.stato==='pianificare'&&info.giorni!=null) testo=`Fra ${info.giorni} gg`;
  else if(info.stato==='valido'&&info.data&&!opz.breve) testo=`Valido al ${fData(info.data)}`;
  return pillola(info.stato,testo,{stimata:info.stimata,titolo:info.stimata?'Scadenza stimata dalla validità tipica: la data sul documento prevale':''});
}
function pillolaGenerica(testo,classe,iconaNome){return html`<span class="pillola ${classe||'neutro'}">${iconaNome?icona(iconaNome):''}${testo}</span>`}

// ---- tabelle ----
// tabella({colonne:[{chiave, titolo, classe, num, formatta(riga), ordina:fn|bool, etichetta}], righe, chiaveOrd, dir, onRiga(riga), classeRiga(riga), vuoto, piede, reattiva:true, id})
function tabella(opz){
  const righe=opz.righe||[];
  if(!righe.length&&opz.vuoto) return typeof opz.vuoto==='string'?html`<div class="vuoto">${opz.vuoto}</div>`:opz.vuoto;
  const stOrd=opz.id?(ui.filtri['ord:'+opz.id]||{}):{};
  const chiaveOrd=stOrd.chiave||opz.chiaveOrd, dir=stOrd.dir||opz.dir||'asc';
  let ordinate=righe;
  if(chiaveOrd){ const col=opz.colonne.find(c=>c.chiave===chiaveOrd); const fn=col&&typeof col.ordina==='function'?col.ordina:(r=>col&&col.valore?col.valore(r):r[chiaveOrd]); ordinate=ordina(righe,fn,dir); }
  const testa=opz.colonne.map(c=>html`<th class="${c.num?'num':''} ${c.classe||''} ${c.ordina!==false?'ordinabile':''}" ${c.ordina!==false&&opz.id?html`data-ordina="${c.chiave}" data-tabella="${opz.id}"`:''}>${c.titolo}${chiaveOrd===c.chiave?html`<span class="freccia">${dir==='asc'?'↑':'↓'}</span>`:''}</th>`);
  const corpo=ordinate.map((r,i)=>{
    const celle=opz.colonne.map(c=>{const v=c.formatta?c.formatta(r,i):(c.valore?c.valore(r):r[c.chiave]);return html`<td class="${c.num?'num':''} ${c.classe||''} ${c.principale?'principale':''}" data-etichetta="${c.etichetta||c.titolo}">${v instanceof Grezzo?v:(v==null?'':v)}</td>`});
    const cls=opz.classeRiga?opz.classeRiga(r):'';
    return html`<tr class="${opz.onRiga||opz.href?'cliccabile':''} ${cls}" ${opz.href?html`data-href="${opz.href(r)}"`:''} ${opz.onRiga?html`data-riga="${i}"`:''}>${celle}</tr>`;
  });
  const t=html`<div class="tabella-scorri"><table class="tabella ${opz.reattiva===false?'':'reattiva'} ${opz.densa?'densa':''}" ${opz.id?html`id="tab-${opz.id}"`:''}><thead><tr>${testa}</tr></thead><tbody>${corpo}</tbody>${opz.piede?html`<tfoot>${opz.piede}</tfoot>`:''}</table></div>`;
  if(opz.onRiga){ opz._righeOrdinate=ordinate; registraTabellaCliccabile(opz); }
  return t;
}
const tabelleCliccabili=[];
function registraTabellaCliccabile(opz){tabelleCliccabili.push(opz)}
document.addEventListener('click',e=>{
  const th=e.target.closest('th[data-ordina]');
  if(th){const id=th.dataset.tabella,k=th.dataset.ordina;const cur=ui.filtri['ord:'+id]||{};ui.filtri['ord:'+id]={chiave:k,dir:cur.chiave===k&&cur.dir==='asc'?'desc':'asc'};render();return}
  const tr=e.target.closest('tr[data-riga]');
  if(tr&&!e.target.closest('button,a,input,select,label')){const tab=tr.closest('table');const opz=tabelleCliccabili.find(o=>o.id&&tab.id==='tab-'+o.id)||tabelleCliccabili[tabelleCliccabili.length-1];if(opz&&opz._righeOrdinate){opz.onRiga(opz._righeOrdinate[+tr.dataset.riga])}return}
  const trh=e.target.closest('tr[data-href]');
  if(trh&&!e.target.closest('button,a,input,select,label')){location.hash=trh.dataset.href}
});

// ---- moduli (form) ----
// campi: [{nome, etichetta, tipo:'testo|numero|data|select|textarea|spunta|email|tel|euro|ore', opzioni:[{v,t}], obbligatorio, aiuto, largo, valida(v)->errore|null, sola}]
function modulo(campi,valori,opz){
  valori=valori||{};opz=opz||{};
  return html`<div class="campi ${opz.classe||''}">${campi.map(c=>{
    const v=leggiPercorso(valori,c.nome);
    const idc='c-'+c.nome.replace(/\./g,'-');
    let input;
    switch(c.tipo){
      case 'select': input=html`<select id="${idc}" name="${c.nome}" ${c.sola?'disabled':''}>${(c.vuoto!==false?html`<option value="">${c.vuotoTesto||'—'}</option>`:'')}${(c.opzioni||[]).map(o=>html`<option value="${o.v}" ${String(o.v)===String(v==null?'':v)?'selected':''}>${o.t}</option>`)}</select>`; break;
      case 'textarea': input=html`<textarea id="${idc}" name="${c.nome}" rows="${c.righe||3}" ${c.sola?'disabled':''}>${v==null?'':v}</textarea>`; break;
      case 'spunta': input=html`<label class="spunta"><input type="checkbox" id="${idc}" name="${c.nome}" ${v?'checked':''} ${c.sola?'disabled':''}> ${c.testo||''}</label>`; break;
      case 'numero': case 'euro': case 'ore': input=html`<div class="suffisso"><input type="text" inputmode="decimal" class="num-input" id="${idc}" name="${c.nome}" data-numero value="${v==null?'':fNum(v,c.tipo==='euro'?2:(c.decimali!==undefined?c.decimali:(Number.isInteger(+v)?0:2)))}" ${c.sola?'disabled':''} placeholder="${c.segnaposto||''}">${c.tipo==='euro'?html`<span>€</span>`:c.tipo==='ore'?html`<span>ore</span>`:c.suffisso?html`<span>${c.suffisso}</span>`:''}</div>`; break;
      case 'data': input=html`<input type="date" id="${idc}" name="${c.nome}" value="${v||''}" ${c.sola?'disabled':''}>`; break;
      case 'mese': input=html`<input type="month" id="${idc}" name="${c.nome}" value="${v||''}" ${c.sola?'disabled':''}>`; break;
      case 'chip': input=html`<div class="chip-lista" data-chip="${c.nome}">${(c.opzioni||[]).map(o=>{const on=(v||[]).includes(o.v);return html`<label class="chip ${on?'attiva':''}"><input type="checkbox" name="${c.nome}" value="${o.v}" ${on?'checked':''}>${o.t}</label>`})}</div>`; break;
      case 'radio': input=html`<div class="scelta-lista">${(c.opzioni||[]).map(o=>html`<label class="${String(o.v)===String(v)?'attiva':''}"><input type="radio" name="${c.nome}" value="${o.v}" ${String(o.v)===String(v)?'checked':''}><span>${o.t}${o.desc?html`<div class="desc">${o.desc}</div>`:''}</span></label>`)}</div>`; break;
      default: input=html`<input type="${c.tipo==='email'?'email':c.tipo==='tel'?'tel':c.tipo==='url'?'url':c.tipo==='password'?'password':'text'}" id="${idc}" name="${c.nome}" value="${v==null?'':v}" ${c.sola?'disabled':''} placeholder="${c.segnaposto||''}" ${c.lista?html`list="${c.lista}"`:''} ${c.maiuscolo?'style="text-transform:uppercase"':''} autocomplete="off">`;
    }
    return html`<div class="campo ${c.largo?'largo':''}" data-campo="${c.nome}">${c.tipo==='spunta'?'':html`<label for="${idc}">${c.etichetta}${c.obbligatorio?html` <span class="obbl">*</span>`:''}</label>`}${input}${c.aiuto?html`<div class="aiuto">${c.aiuto}</div>`:''}<div class="errore nascosto"></div></div>`;
  })}</div>`;
}
function leggiPercorso(o,p){return p.split('.').reduce((a,k)=>a==null?undefined:a[k],o)}
function scriviPercorso(o,p,v){const parti=p.split('.');let cur=o;for(let i=0;i<parti.length-1;i++){if(cur[parti[i]]==null||typeof cur[parti[i]]!=='object')cur[parti[i]]={};cur=cur[parti[i]]}cur[parti[parti.length-1]]=v}
// Legge i valori di un modulo e valida. Restituisce {valori, errori:[{campo,errore}]}
function leggiModulo(radice,campi){
  const valori={};const errori=[];
  for(const c of campi){
    let v;
    const elc=radice.querySelector(`[name="${c.nome}"]`);
    if(c.tipo==='chip'){v=tutti(`[name="${c.nome}"]:checked`,radice).map(x=>x.value)}
    else if(c.tipo==='radio'){const r=radice.querySelector(`[name="${c.nome}"]:checked`);v=r?r.value:null}
    else if(!elc) continue;
    else if(c.tipo==='spunta') v=elc.checked;
    else if(c.tipo==='numero'||c.tipo==='euro'||c.tipo==='ore'){const raw=elc.value.trim();v=raw===''?null:leggiNumero(raw);if(raw!==''&&v===null)errori.push({campo:c.nome,errore:'Numero non valido'})}
    else v=elc.value;
    if(typeof v==='string'){v=v.trim();if(c.maiuscolo)v=v.toUpperCase();if(v==='')v=c.tipo==='select'?null:'';}
    if(c.obbligatorio&&(v===null||v===undefined||v===''||(Array.isArray(v)&&!v.length))) errori.push({campo:c.nome,errore:'Campo obbligatorio'});
    else if(c.valida&&v!==null&&v!==undefined&&v!==''){const err=c.valida(v,valori);if(err)errori.push({campo:c.nome,errore:err})}
    scriviPercorso(valori,c.nome,v);
  }
  // mostra errori vicino al campo
  tutti('.campo',radice).forEach(x=>{x.classList.remove('con-errore');const e=x.querySelector('.errore');if(e){e.classList.add('nascosto');e.textContent=''}});
  for(const e of errori){const x=radice.querySelector(`.campo[data-campo="${e.campo}"]`);if(x){x.classList.add('con-errore');const ee=x.querySelector('.errore');ee.classList.remove('nascosto');ee.innerHTML=icona('attenzione','piccola')+' '+h(e.errore)}}
  if(errori.length){const primo=radice.querySelector('.campo.con-errore input,.campo.con-errore select,.campo.con-errore textarea');if(primo)primo.focus()}
  return {valori,errori};
}
// Dialogo con modulo: restituisce i valori o null
function dialogoModulo(titolo,campi,valori,opz){
  opz=opz||{};
  return dialogo({titolo,largo:opz.largo!==false,corpo:html`${opz.intro?grezzo(opz.intro):''}<form onsubmit="return false">${modulo(campi,valori)}</form>${opz.coda?grezzo(opz.coda):''}`,pulsanti:[...(opz.pulsantiExtra||[]),{testo:'Annulla',valore:null},{testo:opz.ok||'Salva',classe:'primario',primario:true,fn:v=>{const {valori:val,errori}=leggiModulo(v.querySelector('form'),campi);if(errori.length)return false;if(opz.validaTutto){const err=opz.validaTutto(val,v);if(err){avviso(err,{tipo:'errore'});return false}}return val}}],alMontaggio:v=>{ attivaChip(v); if(opz.alMontaggio) opz.alMontaggio(v); }});
}
function attivaChip(radice){tutti('.chip-lista label.chip',radice).forEach(l=>{const i=l.querySelector('input');i.addEventListener('change',()=>l.classList.toggle('attiva',i.checked))});tutti('.scelta-lista label',radice).forEach(l=>{const i=l.querySelector('input');if(i)i.addEventListener('change',()=>{tutti('label',l.parentNode).forEach(x=>x.classList.toggle('attiva',x.querySelector('input').checked))})})}
function validatoreCF(v){const r=validaCodiceFiscale(v);return r.ok?null:r.errore}
function validatorePIVA(v){const r=validaPartitaIva(v);return r.ok?null:r.errore}
function validatoreEmail(v){return validaEmail(v)?null:'Indirizzo email non valido'}
function validatoreData(v){return dataValida(v)?null:'Data non valida'}

// ---- pannello laterale ----
// apriPannello({titolo, corpo(html), piede(html), largo, alMontaggio, pieno})
function apriPannello(opz){
  const p=el('#pannello');
  ui.pannello=opz;
  p.innerHTML=html`<div class="testa"><button class="pulsante discreto icona" data-chiudi-pannello aria-label="Chiudi pannello">${icona('chiudi')}</button><h2>${opz.titolo||''}</h2>${opz.azioni?grezzo(opz.azioni):''}</div><div class="corpo ${opz.pieno?'pieno':''}">${grezzo(opz.corpo||'')}</div>${opz.piede?html`<div class="piede">${grezzo(opz.piede)}</div>`:''}`;
  p.classList.add('aperto');p.classList.toggle('largo',!!opz.largo);p.setAttribute('aria-hidden','false');
  el('#velo-pannello').classList.add('aperto');
  document.body.classList.add('con-pannello');document.body.classList.toggle('pannello-largo',!!opz.largo);
  if(opz.alMontaggio) opz.alMontaggio(p);
}
function chiudiPannello(){const p=el('#pannello');p.classList.remove('aperto');p.setAttribute('aria-hidden','true');el('#velo-pannello').classList.remove('aperto');document.body.classList.remove('con-pannello','pannello-largo');ui.pannello=null;setTimeout(()=>{if(!ui.pannello)p.innerHTML=''},250)}
document.addEventListener('click',e=>{if(e.target.closest('[data-chiudi-pannello]')||e.target.id==='velo-pannello')chiudiPannello()});

// ---- stati vuoti ----
function vuoto(opz){return html`<div class="vuoto">${icona(opz.icona||'info')}<h3>${opz.titolo}</h3><p>${opz.testo||''}</p>${opz.azione?html`<button class="pulsante primario" data-azione="${opz.azione.azione}" ${opz.azione.dati?grezzo(Object.entries(opz.azione.dati).map(([k,v])=>`data-${k}="${h(v)}"`).join(' ')):''}>${opz.azione.testo}</button>`:''}</div>`}
function avvisoInline(tipo,testo,iconaNome){return html`<div class="avviso-inline ${tipo}">${icona(iconaNome||(tipo==='critico'?'errore':tipo==='attenzione'?'attenzione':'info'))}<div class="corpo">${grezzo(typeof testo==='string'?h(testo):testo)}</div></div>`}
function linguette(id,voci,attiva){return html`<div class="linguette" role="tablist">${voci.map(v=>html`<button role="tab" class="${v.id===attiva?'attiva':''}" data-linguetta="${id}" data-valore="${v.id}" aria-selected="${v.id===attiva}">${v.icona?icona(v.icona):''}${v.testo}${v.contatore!=null?html`<span class="contatore ${v.critico?'critico':''}">${v.contatore}</span>`:''}</button>`)}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-linguetta]');if(b){ui.filtri['ling:'+b.dataset.linguetta]=b.dataset.valore;render()}});
function linguettaAttiva(id,predef){return ui.filtri['ling:'+id]||predef}
function avatar(p,grande){const nome=nomePersona(p);return html`<span class="persona-avatar ${grande?'grande':''}" data-avatar="${p.id}" title="${nome}">${iniziali(nome)}</span>`}
function riepilogoPersona(p){return html`<span class="riga stretta">${avatar(p)}<span><b>${nomePersona(p)}</b><br><span class="piccolo secondario">${p.mansione||''}</span></span></span>`}
function contattoCliccabile(tipo,valore){if(!valore)return '';const href=tipo==='tel'?'tel:'+String(valore).replace(/\s+/g,''):tipo==='mail'?'mailto:'+valore:valore;return html`<a href="${href}" class="riga stretta" style="display:inline-flex">${icona(tipo==='tel'?'telefono':tipo==='mail'?'mail':'esterno','piccola')}${valore}</a>`}

// ---- grafici SVG (senza librerie; leggibili in chiaro, scuro e stampa) ----
function graficoBarre(dati,opz){
  // dati: [{etichetta, valore, classe?}]; opz: {altezza, larghezza, formatta, orizzontale}
  opz=Object.assign({altezza:220,larghezza:640,formatta:v=>fNum(v,0)},opz||{});
  if(!dati.length) return html`<div class="vuoto piccolo">Nessun dato</div>`;
  const W=opz.larghezza,H=opz.altezza,ml=44,mr=12,mt=18,mb=34;
  const max=Math.max(0,...dati.map(d=>d.valore)),min=Math.min(0,...dati.map(d=>d.valore));
  const span=(max-min)||1;
  const iw=W-ml-mr,ih=H-mt-mb;
  const y=v=>mt+ih-(v-min)/span*ih;
  const bw=iw/dati.length;const pad=Math.min(12,bw*0.25);
  const passi=4;const linee=[];for(let i=0;i<=passi;i++){const v=min+span*i/passi;linee.push(html`<line class="griglia-linea" x1="${ml}" x2="${W-mr}" y1="${y(v)}" y2="${y(v)}"/><text x="${ml-4}" y="${y(v)+4}" text-anchor="end">${opz.formatta(v)}</text>`)}
  const barre=dati.map((d,i)=>{const x=ml+i*bw+pad/2;const hgt=Math.abs(y(d.valore)-y(0));const top=Math.min(y(d.valore),y(0));const lab=tronca(d.etichetta,bw<40?4:bw<70?8:14);return html`<g><rect class="barra ${d.valore<0?'negativa':''} ${d.classe||''}" x="${x}" y="${top}" width="${Math.max(2,bw-pad)}" height="${Math.max(0.5,hgt)}" rx="2"><title>${d.etichetta}: ${opz.formatta(d.valore)}</title></rect>${bw>28?html`<text class="etichetta-valore" x="${x+(bw-pad)/2}" y="${top-4}" text-anchor="middle">${opz.formatta(d.valore)}</text>`:''}<text x="${x+(bw-pad)/2}" y="${H-mb+14}" text-anchor="middle">${lab}</text></g>`});
  return html`<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opz.titolo||'Grafico a barre'}">${linee}<line class="asse" x1="${ml}" x2="${W-mr}" y1="${y(0)}" y2="${y(0)}"/>${barre}</svg>`;
}
function graficoBarreOrizzontali(dati,opz){
  opz=Object.assign({larghezza:640,formatta:v=>fNum(v,0),rigaH:26},opz||{});
  if(!dati.length) return html`<div class="vuoto piccolo">Nessun dato</div>`;
  const W=opz.larghezza,ml=Math.min(200,Math.max(...dati.map(d=>d.etichetta.length))*6.2+10),mr=70,rh=opz.rigaH,H=dati.length*rh+10;
  const max=Math.max(0,...dati.map(d=>d.valore)),min=Math.min(0,...dati.map(d=>d.valore));const span=(max-min)||1;const iw=W-ml-mr;
  const x=v=>ml+(v-min)/span*iw;
  const linee=[];if(opz.media!=null){linee.push(html`<line class="media" x1="${x(opz.media)}" x2="${x(opz.media)}" y1="4" y2="${H-4}"/><text x="${x(opz.media)+3}" y="12">media ${opz.formatta(opz.media)}</text>`)}
  return html`<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opz.titolo||'Grafico a barre orizzontali'}"><line class="asse" x1="${x(0)}" x2="${x(0)}" y1="4" y2="${H-4}"/>${dati.map((d,i)=>{const y0=6+i*rh;const w=Math.abs(x(d.valore)-x(0));const left=Math.min(x(d.valore),x(0));return html`<g ${d.href?html`data-href="${d.href}" class="cliccabile" style="cursor:pointer"`:''}><text x="${ml-6}" y="${y0+rh/2+4}" text-anchor="end">${tronca(d.etichetta,30)}</text><rect class="barra ${d.valore<0?'negativa':''} ${d.classe||''}" x="${left}" y="${y0+4}" width="${Math.max(1,w)}" height="${rh-10}" rx="2"><title>${d.etichetta}: ${opz.formatta(d.valore)}</title></rect><text class="etichetta-valore" x="${d.valore<0?left-4:left+w+4}" y="${y0+rh/2+4}" text-anchor="${d.valore<0?'end':'start'}">${opz.formatta(d.valore)}</text></g>`})}${linee}</svg>`;
}
function graficoImpilato(dati,serie,opz){
  // dati: [{etichetta, valori:[..per serie..]}]; serie: [{nome, classe:'s1'..}]
  opz=Object.assign({altezza:240,larghezza:640,formatta:v=>fNum(v,0)},opz||{});
  if(!dati.length) return html`<div class="vuoto piccolo">Nessun dato</div>`;
  const W=opz.larghezza,H=opz.altezza,ml=44,mr=12,mt=14,mb=34;const iw=W-ml-mr,ih=H-mt-mb;
  const max=Math.max(1,...dati.map(d=>somma(d.valori)));const y=v=>mt+ih-v/max*ih;const bw=iw/dati.length,pad=Math.min(14,bw*0.3);
  const linee=[];for(let i=0;i<=4;i++){const v=max*i/4;linee.push(html`<line class="griglia-linea" x1="${ml}" x2="${W-mr}" y1="${y(v)}" y2="${y(v)}"/><text x="${ml-4}" y="${y(v)+4}" text-anchor="end">${opz.formatta(v)}</text>`)}
  const barre=dati.map((d,i)=>{let acc=0;const x=ml+i*bw+pad/2;const segs=d.valori.map((v,j)=>{const y1=y(acc+v),y0=y(acc);acc+=v;return html`<rect class="barra ${serie[j].classe||'s'+(j+1)}" x="${x}" y="${y1}" width="${Math.max(2,bw-pad)}" height="${Math.max(0,y0-y1)}"><title>${d.etichetta} · ${serie[j].nome}: ${opz.formatta(v)}</title></rect>`});return html`<g>${segs}<text x="${x+(bw-pad)/2}" y="${H-mb+14}" text-anchor="middle">${tronca(d.etichetta,bw<40?4:10)}</text></g>`});
  return html`<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opz.titolo||'Grafico impilato'}">${linee}<line class="asse" x1="${ml}" x2="${W-mr}" y1="${y(0)}" y2="${y(0)}"/>${barre}</svg><div class="legenda">${serie.map((s,j)=>html`<span><i class="${s.classe||'s'+(j+1)}"></i>${s.nome}</span>`)}</div>`;
}
function graficoLinee(serie,opz){
  // serie: [{nome, punti:[{x:etichetta, y}], classe}] tutte con le stesse etichette
  opz=Object.assign({altezza:220,larghezza:640,formatta:v=>fNum(v,0),area:false},opz||{});
  if(!serie.length||!serie[0].punti.length) return html`<div class="vuoto piccolo">Nessun dato</div>`;
  const W=opz.larghezza,H=opz.altezza,ml=44,mr=12,mt=14,mb=30;const iw=W-ml-mr,ih=H-mt-mb;
  const n=serie[0].punti.length;const tutti_=serie.flatMap(s=>s.punti.map(p=>p.y)).filter(v=>v!=null);
  const max=Math.max(1,...tutti_),min=Math.min(0,...tutti_);const span=(max-min)||1;
  const x=i=>ml+(n===1?iw/2:i*iw/(n-1));const y=v=>mt+ih-(v-min)/span*ih;
  const linee=[];for(let i=0;i<=4;i++){const v=min+span*i/4;linee.push(html`<line class="griglia-linea" x1="${ml}" x2="${W-mr}" y1="${y(v)}" y2="${y(v)}"/><text x="${ml-4}" y="${y(v)+4}" text-anchor="end">${opz.formatta(v)}</text>`)}
  const passoEt=Math.ceil(n/Math.max(1,Math.floor(iw/48)));
  const etich=serie[0].punti.map((p,i)=>i%passoEt===0||i===n-1?html`<text x="${x(i)}" y="${H-mb+14}" text-anchor="middle">${tronca(p.x,7)}</text>`:'');
  const percorsi=serie.map((s,j)=>{const pts=s.punti.map((p,i)=>p.y==null?null:[x(i),y(p.y)]);let d='',prima=true;pts.forEach(pt=>{if(!pt){prima=true;return}d+=(prima?'M':'L')+pt[0].toFixed(1)+' '+pt[1].toFixed(1)+' ';prima=false});const cls=s.classe||(j?'s'+(j+1):'');let area='';if(opz.area){const val=pts.filter(Boolean);if(val.length>1)area=html`<path class="area ${cls}" d="M${val[0][0]} ${y(0)} ${val.map(p=>'L'+p[0]+' '+p[1]).join(' ')} L${val[val.length-1][0]} ${y(0)} Z"/>`}return html`${area}<path class="linea ${cls}" d="${d}"/>${pts.map((pt,i)=>pt?html`<circle class="punto ${cls}" cx="${pt[0]}" cy="${pt[1]}" r="3"><title>${s.nome} · ${s.punti[i].x}: ${opz.formatta(s.punti[i].y)}</title></circle>`:'')}`});
  return html`<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opz.titolo||'Grafico a linee'}">${linee}<line class="asse" x1="${ml}" x2="${W-mr}" y1="${y(0)}" y2="${y(0)}"/>${percorsi}${etich}</svg>${serie.length>1?html`<div class="legenda">${serie.map((s,j)=>html`<span><i class="${s.classe||(j?'s'+(j+1):'')}"></i>${s.nome}</span>`)}</div>`:''}`;
}
function minigrafico(valori){
  if(!valori||valori.length<2) return '';
  const W=90,H=24,max=Math.max(1,...valori),min=Math.min(0,...valori),span=(max-min)||1;
  const pts=valori.map((v,i)=>[(i*(W-4)/(valori.length-1)+2).toFixed(1),(H-2-(v-min)/span*(H-4)).toFixed(1)]);
  return html`<svg class="minigrafico" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path class="area" d="M${pts[0][0]} ${H-2} ${pts.map(p=>'L'+p[0]+' '+p[1]).join(' ')} L${pts[pts.length-1][0]} ${H-2} Z"/><path d="M${pts.map(p=>p.join(' ')).join(' L')}"/></svg>`;
}
// Diagramma temporale dei cantieri: righe = cantieri, asse = mesi, linea di oggi
function graficoTemporale(righe,opz){
  // righe: [{etichetta, inizio(iso), fine(iso), classe, href}]
  opz=Object.assign({larghezza:900,rigaH:28},opz||{});
  const datate=righe.filter(r=>r.inizio);
  if(!datate.length) return html`<div class="vuoto piccolo">Nessun cantiere con date</div>`;
  const oggiIso=oggi();
  let minD=daIso(oggiIso),maxD=daIso(oggiIso);
  for(const r of datate){const a=daIso(r.inizio),b=daIso(r.fine||r.inizio);if(a<minD)minD=a;if(b>maxD)maxD=b}
  minD=new Date(minD.getFullYear(),minD.getMonth()-1,1);maxD=new Date(maxD.getFullYear(),maxD.getMonth()+2,0);
  const W=opz.larghezza,ml=150,mr=10,mt=24,rh=opz.rigaH,H=mt+datate.length*rh+8;const iw=W-ml-mr;
  const tot=maxD-minD;const x=d=>ml+(d-minD)/tot*iw;
  const mesi=[];for(let d=new Date(minD);d<=maxD;d=new Date(d.getFullYear(),d.getMonth()+1,1)){const x0=x(d);mesi.push(html`<line class="griglia-linea" x1="${x0}" x2="${x0}" y1="${mt-4}" y2="${H}"/><text x="${x0+3}" y="${mt-8}">${NOMI_MESI_BREVI[d.getMonth()]}${d.getMonth()===0||d.getTime()===minD.getTime()?' '+String(d.getFullYear()).slice(2):''}</text>`)}
  const barre=datate.map((r,i)=>{const y0=mt+i*rh;const a=daIso(r.inizio),b=daIso(r.fine||r.inizio);const x0=x(a),x1=Math.max(x0+3,x(new Date(b.getTime()+86400000)));return html`<g ${r.href?html`data-href="${r.href}" style="cursor:pointer"`:''}><text x="${ml-6}" y="${y0+rh/2+4}" text-anchor="end">${tronca(r.etichetta,24)}</text><rect class="barra-tempo ${r.classe||''}" x="${x0}" y="${y0+5}" width="${x1-x0}" height="${rh-10}"><title>${r.etichetta}: ${fData(r.inizio)} → ${r.fine?fData(r.fine):'in corso'}</title></rect>${r.testo&&(x1-x0)>60?html`<text x="${x0+4}" y="${y0+rh/2+4}" style="fill:#fff;font-size:10px">${tronca(r.testo,Math.floor((x1-x0)/6))}</text>`:''}</g>`});
  const xo=x(daIso(oggiIso));
  return html`<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramma temporale dei cantieri">${mesi}${barre}<line class="oggi" x1="${xo}" x2="${xo}" y1="${mt-4}" y2="${H}"/><text x="${xo+3}" y="${H-2}" style="fill:var(--rosso)">oggi</text></svg>`;
}
document.addEventListener('click',e=>{const g=e.target.closest('svg g[data-href]');if(g)location.hash=g.dataset.href});
// Completamento automatico semplice su input (data-suggerimenti="nome elenco")
function attivaSuggerimenti(input,fonte){
  let box=null,idx=-1,voci=[];
  const chiudi=()=>{if(box){box.remove();box=null}idx=-1};
  const mostra=()=>{const q=normalizzaTesto(input.value);voci=unici(fonte()).filter(v=>v&&(!q||normalizzaTesto(v).includes(q))).slice(0,8);chiudi();if(!voci.length)return;box=creaEl(html`<div class="suggerimenti">${voci.map(v=>html`<div>${v}</div>`)}</div>`);const r=input.getBoundingClientRect();box.style.position='fixed';box.style.left=r.left+'px';box.style.top=(r.bottom+2)+'px';box.style.minWidth=r.width+'px';document.body.appendChild(box);tutti('div',box).forEach((d,i)=>d.onmousedown=ev=>{ev.preventDefault();input.value=voci[i];input.dispatchEvent(new Event('change',{bubbles:true}));chiudi()})};
  input.addEventListener('input',mostra);input.addEventListener('focus',mostra);input.addEventListener('blur',()=>setTimeout(chiudi,120));
  input.addEventListener('keydown',e=>{if(!box)return;const k=e.key||({13:'Enter',27:'Escape',38:'ArrowUp',40:'ArrowDown'})[e.keyCode]||'';if(k==='ArrowDown'){e.preventDefault();idx=Math.min(voci.length-1,idx+1)}else if(k==='ArrowUp'){e.preventDefault();idx=Math.max(0,idx-1)}else if(k==='Enter'&&idx>=0){e.preventDefault();input.value=voci[idx];input.dispatchEvent(new Event('change',{bubbles:true}));chiudi();return}else if(k==='Escape'){chiudi();return}else return;tutti('div',box).forEach((d,i)=>d.classList.toggle('attivo',i===idx))});
}
