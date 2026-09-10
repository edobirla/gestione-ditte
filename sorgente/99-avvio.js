// ---------------------------------------------------------------------
// Avvio: apre il database, carica (o crea) lo stato, applica tema e preferenze, disegna.
// ---------------------------------------------------------------------
async function avvia(){
  try{ applicaTema(localStorage.getItem('pavimass-tema')||'sistema'); }catch(e){ applicaTema('sistema'); }
  el('#marchio-logo').src=IMMAGINI.logo;
  el('#btn-tema').addEventListener('click',cicloTema);
  el('#btn-annulla').addEventListener('click',annulla);
  el('#btn-ripristina').addEventListener('click',ripristina);
  el('#spia-backup').addEventListener('click',()=>vai('impostazioni?backup=1'));
  try{
    await apriDb();
    await caricaStato();
  }catch(e){
    el('#contenuto').innerHTML=html`<div class="avviso-inline critico">${icona('errore')}<div class="corpo"><b>Non riesco ad aprire l'archivio del browser.</b><br>${(e&&e.message)||e}<br><br>Se stai usando una finestra privata, aprilo in una finestra normale: la navigazione privata non conserva i dati. Se il problema resta, prova un altro browser (Safari o Chrome).</div></div>`;
    return;
  }
  if(stato.impostazioni.tema&&stato.impostazioni.tema!==ui.tema) applicaTema(stato.impostazioni.tema);
  applicaDensita(stato.impostazioni.densita);
  if(!stato.impostazioni.dispositivo){ stato.impostazioni.dispositivo=eIos()?'iPhone/iPad':eMac()?'Mac':'Computer'; salvaStato(); }
  attivaRicerca();
  window.addEventListener('resize',debounce(()=>{if(ui.rotta&&ui.rotta.sezione==='presenze')render()},200));
  if(!location.hash) location.hash='#/dashboard';
  render();
  // Chiede al browser di non svuotare l'archivio da solo. Non blocca: se rifiuta lo segnaliamo in Impostazioni.
  chiediPersistenza().then(ok=>{ui.persistenza=ok});
  // Cestino: i file orfani da più di 30 giorni si eliminano davvero
  svuotaCestinoScaduto(30).catch(()=>{});
  // Promemoria discreto se manca il backup da tempo
  const imp=stato.impostazioni;
  if(!imp.ultimoBackup&&(imp.modificheDopoBackup||0)>20) avviso('Non hai ancora fatto un backup: fallo da Impostazioni.',{durata:7000,azione:{testo:'Vai',fn:()=>vai('impostazioni?backup=1')}});
  else if(imp.ultimoBackup&&giorniTra(imp.ultimoBackup.slice(0,10),oggi())>=7&&(imp.modificheDopoBackup||0)>0) avviso('Ultimo backup '+fData(imp.ultimoBackup.slice(0,10))+': conviene rifarlo.',{durata:6000,azione:{testo:'Vai',fn:()=>vai('impostazioni?backup=1')}});
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',avvia); else avvia();
