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
  const mx=Math.max(...righe.map(r=>r.speso),1);
  return html`<div class="testata"><div><div class="occhiello">Amministrazione</div><h1>Fornitori</h1><p class="sotto">La spesa viene dai movimenti del Budget, manodopera esclusa.</p></div>
    <div class="azioni"><button class="pulsante primario" data-azione="fornitore-nuovo">Nuovo fornitore<span class="manopola">${icona('piu','piccola')}</span></button></div></div>
  ${righe.length?html`<div class="guscio"><div class="scheda scheda-tabella"><table class="tabella"><thead><tr><th>Fornitore</th><th class="nascondi-telefono">Cosa fornisce</th><th class="nascondi-telefono">Contatti</th><th class="num">Fatture</th><th class="num">Speso</th><th class="nascondi-telefono" style="width:24%"></th></tr></thead><tbody>${righe.sort((a,b)=>b.speso-a.speso||a.f.ragioneSociale.localeCompare(b.f.ragioneSociale)).map(r=>html`<tr class="cliccabile" data-azione="vai" data-href="fornitori/${r.f.id}"><td><span class="chi"><span class="sigla-piccola ${coloreDa(r.f.id)}">${iniziali(r.f.ragioneSociale)}</span><b>${r.f.ragioneSociale}</b></span></td><td class="nascondi-telefono silenzioso">${r.f.cosaFornisce||''}</td><td class="nascondi-telefono">${r.f.telefono?contattoCliccabile('tel',r.f.telefono):''}</td><td class="num">${r.mov.length||html`<span class="silenzioso">—</span>`}</td><td class="num"><b>${r.speso?fEuro(r.speso,0):'—'}</b></td><td class="nascondi-telefono"><div class="traccia"><i style="width:${r.speso/mx*100}%;background:var(--accent)"></i></div></td></tr>`)}</tbody></table></div></div>`
  :vuoto({icona:'fornitori',titolo:'Nessun fornitore',testo:'Aggiungi i fornitori dell\'azienda per vedere la spesa collegata dal budget.',azione:{testo:'Nuovo fornitore',azione:'fornitore-nuovo'}})}`;
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
      ${f.cf?html`<div class="campo"><span class="etichetta-campo">Codice fiscale</span><div>${f.cf}</div></div>`:''}
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
  const campi=[{nome:'ragioneSociale',etichetta:'Ragione sociale',obbligatorio:true,largo:true},{nome:'cosaFornisce',etichetta:'Cosa fornisce',largo:true,segnaposto:'es. materiali edili, noleggio mezzi, trasporti'},{nome:'piva',etichetta:'Partita IVA',valida:validatorePIVA},{nome:'cf',etichetta:'Codice fiscale',maiuscolo:true,valida:validatoreCF,aiuto:'Per i fornitori privati senza partita IVA (es. il proprietario del capannone)'},{nome:'telefono',etichetta:'Telefono',tipo:'tel'},{nome:'email',etichetta:'Email',tipo:'email',valida:validatoreEmail},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}];
  return dialogoModulo(nuovo?'Nuovo fornitore':'Modifica '+f.ragioneSociale,campi,f,{pulsantiExtra:nuovo?[]:[{testo:'Elimina',classe:'pericolo',sinistra:true,fn:async()=>{if(await conferma('Eliminare il fornitore '+f.ragioneSociale+'?',{pericolo:true})){esegui('Eliminato fornitore '+f.ragioneSociale,s=>{s.fornitori=s.fornitori.filter(x=>x.id!==f.id)});vai('fornitori');return null}return false}}]}).then(v=>{
    if(!v)return;
    if(nuovo){const id=nuovoId('fr');esegui('Nuovo fornitore '+v.ragioneSociale,s=>{s.fornitori.push(Object.assign({id},v))});vai('fornitori/'+id)}
    else esegui('Modificato fornitore '+v.ragioneSociale,s=>{Object.assign(s.fornitori.find(x=>x.id===f.id),v)});
  });
}
