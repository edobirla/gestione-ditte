// ---------------------------------------------------------------------
// AGGIORNAMENTI: ogni versione costruita ha un'impronta (VERSIONE_APP, messa da costruisci.py) e
// pubblica.py mette accanto all'app versione.json con l'impronta pubblicata e le ultime novità.
// L'app lo controlla all'avvio, ogni mezz'ora e quando torna in primo piano: se è diversa avvisa,
// e «Aggiorna ora» scarica la pagina nuova scavalcando le copie del browser. I dati non si toccano.
// ---------------------------------------------------------------------
const VERSIONE_APP='__VERSIONE_APP__';   // impronta del contenuto: dice se è cambiato qualcosa
const NUMERO_VERSIONE='__NUMERO_VERSIONE__'; // il numero per le persone: 1.0, 1.1…
function appPubblicata(){return location.protocol==='https:'}
async function controllaAggiornamento(manuale){
  if(!appPubblicata()){if(manuale)avviso('Il controllo funziona sull\'app pubblicata, non su questa copia locale');return null}
  try{
    const r=await fetch('versione.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('risposta '+r.status);
    const v=await r.json();ui.ultimoControllo=new Date().toISOString();
    const prima=ui.aggiornamento;const impr=v.impronta||v.versione;ui.aggiornamento=impr&&impr!==VERSIONE_APP?v:null;ui.pubblicata=v;
    if(ui.aggiornamento&&(!prima||manuale)) avviso('È disponibile la versione '+(ui.aggiornamento.versione||'nuova')+' dell\'app.',{durata:manuale?6000:60000,azione:{testo:'Aggiorna ora',fn:applicaAggiornamento}});
    else if(manuale&&!ui.aggiornamento) avviso('L\'app è aggiornata');
    if(manuale||!!prima!==!!ui.aggiornamento) render();
    return ui.aggiornamento;
  }catch(e){if(manuale)avviso('Non riesco a controllare gli aggiornamenti: sei collegato a internet?',{tipo:'errore'});return null}
}
async function applicaAggiornamento(){
  try{await salvaSubito()}catch(e){}
  try{await fetch(location.pathname,{cache:'reload'})}catch(e){}           // rinfresca la copia del browser
  try{for(const k of await caches.keys())await caches.delete(k)}catch(e){}  // e quella per usarla senza rete
  try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg)await reg.update()}catch(e){}
  location.replace(location.pathname+'?agg='+Date.now()+location.hash);
}
AZIONI['aggiornamento-controlla']=()=>controllaAggiornamento(true);
AZIONI['aggiornamento-applica']=()=>applicaAggiornamento();
function avviaControlloAggiornamenti(){
  if(/[?&]agg=/.test(location.search)){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>avviso('App aggiornata'),600)}
  if(!appPubblicata())return;
  setTimeout(()=>controllaAggiornamento(false),4000);
  setInterval(()=>controllaAggiornamento(false),30*60*1000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')controllaAggiornamento(false)});
}
function impAggiornamenti(){
  const a=ui.aggiornamento,p=ui.pubblicata;
  return html`<div class="bento">
  <div class="guscio c-7"><div class="scheda"><div class="intesta"><h2>Aggiornamenti</h2>${a?html`<span class="pillola scadenza">nuova versione</span>`:appPubblicata()&&ui.ultimoControllo?html`<span class="pillola valido">aggiornata</span>`:''}</div>
    ${a?html`<div class="avviso-inline attenzione">${icona('aggiorna')}<div class="corpo"><b>C'è la versione ${a.versione}${a.data?' del '+fData(a.data.slice(0,10)):''}.</b> Aggiornare ricarica la pagina: i tuoi dati restano dove sono.</div></div>`:''}
    <dl class="dati-doc mt"><dt>Versione in uso</dt><dd><b>${NUMERO_VERSIONE}</b></dd>${p?html`<dt>Ultima pubblicata</dt><dd><b>${p.versione}</b>${p.data?html` <span class="silenzioso">· ${fData(p.data.slice(0,10))}</span>`:''}</dd>`:''}<dt>Ultimo controllo</dt><dd>${ui.ultimoControllo?fDataOra(ui.ultimoControllo):appPubblicata()?'in corso…':'solo sull\'app pubblicata'}</dd></dl>
    <div class="riga mt">${a?html`<button class="pulsante primario" data-azione="aggiornamento-applica">${icona('aggiorna','piccola')}Aggiorna ora</button>`:''}<button class="pulsante ${a?'':'primario'}" data-azione="aggiornamento-controlla">Controlla adesso</button></div>
    <p class="piccolo silenzioso mt">L'app controlla da sola all'apertura, ogni mezz'ora e quando torni sulla finestra; se c'è una novità compare un avviso e un pallino su Impostazioni.</p></div></div>
  <div class="guscio c-5"><div class="scheda"><div class="intesta"><h2>Novità</h2></div>${(p&&p.storico||[]).length?p.storico.map(v=>html`<div class="sezione-titolo">Versione ${v.versione}${v.data?' · '+fData(v.data.slice(0,10)):''}${v.versione===NUMERO_VERSIONE?html` <span class="pillola valido">in uso</span>`:''}</div><ul class="piccolo">${(v.novita||[]).map(n=>html`<li>${n}</li>`)}</ul>`):html`<p class="piccolo silenzioso">Le novità di ogni versione compaiono qui dopo il primo controllo.</p>`}</div></div></div>`;
}
