// ---------------------------------------------------------------------
// FORNITORI: anagrafica fornitori e spesa collegata dai movimenti di budget.
// Esclude sempre gli operai, anche se compaiono come controparte nelle fatture.
// ---------------------------------------------------------------------
function movimentiFornitore(f){
  const q=normalizzaTesto(f.ragioneSociale);
  return stato.movimenti.filter(m=>m.tipo==='uscita'&&m.categoria!=='manodopera'&&(m.fornitoreId===f.id||(!m.fornitoreId&&q&&normalizzaTesto(m.controparte).includes(q))));
}
VISTE.fornitori=function(r){
  if(r.query.nuovo){setTimeout(()=>dialogoFornitore(null),0);history.replaceState(null,'','#/fornitori')}
  if(r.id) return vistaFornitore(r.id);
  const righe=stato.fornitori.map(f=>{const mov=movimentiFornitore(f);return {f,mov,speso:somma(mov,m=>+m.imponibile||0)}});
  return html`<div class="testata"><div><h1>Fornitori</h1><div class="sotto">${plurale(stato.fornitori.length,'fornitore','fornitori')} · esclusi gli operai</div></div>
    <div class="azioni"><button class="pulsante primario" data-azione="fornitore-nuovo">${icona('piu')}Nuovo fornitore</button></div></div>
  ${tabella({id:'fornitori',righe,chiaveOrd:'nome',href:r=>'#/fornitori/'+r.f.id,colonne:[
    {chiave:'nome',titolo:'Ragione sociale',principale:true,valore:r=>r.f.ragioneSociale},
    {chiave:'cosa',titolo:'Cosa fornisce',valore:r=>r.f.cosaFornisce||''},
    {chiave:'con',titolo:'Contatti',formatta:r=>html`${r.f.telefono?contattoCliccabile('tel',r.f.telefono):''} ${r.f.email?contattoCliccabile('mail',r.f.email):''}`},
    {chiave:'fatture',titolo:'Fatture',num:true,valore:r=>r.mov.length},
    {chiave:'speso',titolo:'Speso',num:true,valore:r=>r.speso,formatta:r=>fEuro(r.speso,0)},
  ],vuoto:vuoto({icona:'fornitori',titolo:'Nessun fornitore',testo:'Aggiungi i fornitori dell\'azienda per vedere la spesa collegata dal budget.',azione:{testo:'Nuovo fornitore',azione:'fornitore-nuovo'}})})}`;
};
AZIONI['fornitore-nuovo']=()=>dialogoFornitore(null);
AZIONI['fornitore-modifica']=d=>dialogoFornitore(perId('fornitori',d.id));
function vistaFornitore(id){
  const f=perId('fornitori',id); if(!f) return html`<div class="vuoto">${icona('attenzione')}<h3>Fornitore non trovato</h3><a class="pulsante" href="#/fornitori">Torna all'elenco</a></div>`;
  const mov=movimentiFornitore(f).sort((a,b)=>a.data<b.data?1:-1);
  const speso=somma(mov,m=>+m.imponibile||0);
  return html`<div class="briciole"><a href="#/fornitori">Fornitori</a> › ${f.ragioneSociale}</div>
  <div class="testata"><div><h1>${f.ragioneSociale}</h1><div class="sotto">${f.cosaFornisce||''}</div></div>
    <div class="azioni"><button class="pulsante" data-azione="fornitore-modifica" data-id="${f.id}">${icona('modifica')}Modifica</button></div></div>
  <div class="griglia due mb">
    <div class="scheda"><h3>${icona('fornitori')}Dati</h3><div class="campi">
      <div class="campo"><span class="etichetta-campo">Partita IVA</span><div>${valoreODaCompilare(f.piva)}</div></div>
      <div class="campo"><span class="etichetta-campo">Telefono</span><div>${f.telefono?contattoCliccabile('tel',f.telefono):daCompilare()}</div></div>
      <div class="campo"><span class="etichetta-campo">Email</span><div>${f.email?contattoCliccabile('mail',f.email):daCompilare()}</div></div>
    </div>${f.note?html`<p class="piccolo secondario mt-s">${f.note}</p>`:''}</div>
    <div class="scheda"><h3>${icona('euro')}Spesa</h3><div class="campi">
      <div class="campo"><span class="etichetta-campo">Totale imponibile</span><div><b>${fEuro(speso,0)}</b></div></div>
      <div class="campo"><span class="etichetta-campo">Fatture</span><div>${mov.length}</div></div>
    </div></div>
  </div>
  ${tabella({id:'movfornitore',righe:mov,onRiga:m=>vai('budget?movimento='+m.id),colonne:[
    {chiave:'data',titolo:'Data',principale:true,formatta:m=>fData(m.data)},
    {chiave:'numero',titolo:'Numero',valore:m=>m.numero||''},
    {chiave:'cat',titolo:'Categoria',valore:m=>CATEGORIE_MOVIMENTO[m.categoria]||''},
    {chiave:'cant',titolo:'Cantiere',formatta:m=>quoteMovimentoPerCantiere(m).map(q=>html`<span class="etichetta-tag">${nomeCantiere(q.cantiereId)}</span> `)},
    {chiave:'imp',titolo:'Imponibile',num:true,formatta:m=>fEuro(m.imponibile,0)},
  ],vuoto:vuoto({icona:'euro',titolo:'Nessun movimento collegato',testo:'Collega le fatture da Budget scegliendo questo fornitore, oppure scrivendo il suo nome nella controparte.'})})}`;
}
function dialogoFornitore(f){
  const nuovo=!f; f=f||{};
  const campi=[{nome:'ragioneSociale',etichetta:'Ragione sociale',obbligatorio:true,largo:true},{nome:'cosaFornisce',etichetta:'Cosa fornisce',largo:true,segnaposto:'es. materiali edili, noleggio mezzi, trasporti'},{nome:'piva',etichetta:'Partita IVA',valida:validatorePIVA},{nome:'telefono',etichetta:'Telefono',tipo:'tel'},{nome:'email',etichetta:'Email',tipo:'email',valida:validatoreEmail},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}];
  return dialogoModulo(nuovo?'Nuovo fornitore':'Modifica '+f.ragioneSociale,campi,f,{pulsantiExtra:nuovo?[]:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare il fornitore '+f.ragioneSociale+'?',{pericolo:true})){esegui('Eliminato fornitore '+f.ragioneSociale,s=>{s.fornitori=s.fornitori.filter(x=>x.id!==f.id)});vai('fornitori');return null}return false}}]}).then(v=>{
    if(!v)return;
    if(nuovo){const id=nuovoId('fr');esegui('Nuovo fornitore '+v.ragioneSociale,s=>{s.fornitori.push(Object.assign({id},v))});vai('fornitori/'+id)}
    else esegui('Modificato fornitore '+v.ragioneSociale,s=>{Object.assign(s.fornitori.find(x=>x.id===f.id),v)});
  });
}
