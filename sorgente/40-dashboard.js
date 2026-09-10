// ---------------------------------------------------------------------
// DASHBOARD: "come stiamo messi" in cinque secondi. Ogni riquadro porta al dettaglio.
// Ogni riquadro è protetto: se un modulo ha un problema, gli altri si vedono lo stesso.
// ---------------------------------------------------------------------
VISTE.dashboard=function(){
  const riquadro=(fn)=>{try{return fn()}catch(e){console.error(e);return html`<div class="avviso-inline critico">${icona('errore')}<div class="corpo">Riquadro non disponibile: ${e.message}</div></div>`}};
  return html`<div class="testata"><div><h1>Buongiorno</h1><div class="sotto">${capitalizza(NOMI_GIORNI[new Date().getDay()])} ${fDataLunga(oggi())}</div></div></div>
  ${riquadro(riquadroSemaforo)}
  <div class="mt">${riquadro(riquadroAzioni)}</div>
  <div class="mt">${riquadro(riquadroIdoneita)}</div>
  <div class="mt">${riquadro(riquadroCantieri)}</div>
  <div class="griglia due mt">${riquadro(riquadroMese)}${riquadro(riquadroClienti)}</div>
  <div class="griglia due mt">${riquadro(riquadroMargini)}${riquadro(riquadroOreCantiere)}</div>`;
};
function riquadroSemaforo(){
  const sc=riepilogoScadenze();
  const entro30=sc.righe.filter(r=>r.info.data&&r.info.giorni!=null&&r.info.giorni>=0&&r.info.giorni<=30);
  return html`${entro30.length?html`<div class="avviso-inline attenzione mb-s" data-azione="vai" data-href="operai/scadenzario" style="cursor:pointer">${icona('attenzione')}<div class="corpo"><b>${plurale(entro30.length,'documento scade','documenti scadono')} entro 30 giorni:</b> ${tronca(entro30[0].soggetto+': '+(entro30[0].tipo||{}).nome,50)}${entro30.length>1?' e altri '+(entro30.length-1):''}</div></div>`:''}
  <div class="griglia quattro">
    <a class="indicatore critico" href="#/operai/scadenzario"><span class="etichetta">${icona('errore')}Scaduti</span><span class="valore">${sc.scaduti.length}</span><span class="nota">${sc.mancanti.filter(m=>m.bloccante).length} mancanti bloccanti</span></a>
    <a class="indicatore attenzione" href="#/operai/scadenzario"><span class="etichetta">${icona('attenzione')}Entro ${sc.soglie.scadenza} giorni</span><span class="valore">${sc.entro60.length}</span><span class="nota">${sc.entro60[0]?tronca(sc.entro60[0].soggetto+': '+(sc.entro60[0].tipo||{}).nome,36):''}</span></a>
    <a class="indicatore" href="#/operai/scadenzario"><span class="etichetta">${icona('calendario')}Entro ${sc.soglie.pianificare} giorni</span><span class="valore">${sc.entro90.length}</span><span class="nota">da pianificare</span></a>
    <a class="indicatore ok" href="#/operai"><span class="etichetta">${icona('ok')}Validi</span><span class="valore">${sc.validi.length}</span><span class="nota">su ${sc.righe.length} documenti</span></a>
  </div>`;
}
function riquadroIdoneita(){
  const persone=stato.persone.filter(p=>p.attivo&&p.inCantiere!==false);
  return html`<div class="scheda"><h3>${icona('elmetto')}Idoneità al cantiere oggi</h3><ul class="elenco-piatto">${persone.map(p=>{const i=idoneita(p);return html`<li class="link" data-azione="vai" data-href="operai/${p.id}">${avatar(p)}<span class="spazio"><b>${nomePersona(p)}</b><br><span class="piccolo ${i.idonea?'secondario':'da-compilare'}">${i.idonea?(i.avvisi.length?'Idoneo · manca: '+i.avvisi.map(x=>x.split(':')[0]).join(', '):'Idoneo, documenti in regola'):i.motivi.join('; ')}</span></span>${i.idonea?html`<span class="pillola valido">${icona('ok')}Sì</span>`:html`<span class="pillola scaduto">${icona('blocco')}No</span>`}</li>`})}</ul></div>`;
}
function riquadroCantieri(){
  const attivi=stato.cantieri.filter(c=>c.stato==='attivo'||c.stato==='sospeso');
  if(!attivi.length) return html`<div class="scheda"><h3>${icona('cantieri')}Cantieri attivi</h3><p class="secondario">Nessun cantiere attivo. <a href="#/cantieri">Vai ai cantieri</a>.</p></div>`;
  const righe=attivi.map(c=>{const ck=checklistCantiere(c);const eco=economiaCantiere(c.id,stato.movimenti);const fine=c.dataFine?giorniTra(oggi(),c.dataFine):null;return {c,ck,eco,fine}});
  return html`<div class="scheda"><h3>${icona('cantieri')}Cantieri attivi <span class="azioni"><a class="pulsante piccolo" href="#/cantieri?vista=tempo">${icona('tempo','piccola')}Diagramma</a></span></h3>${tabella({righe,href:r=>'#/cantieri/'+r.c.id,colonne:[
    {chiave:'nome',titolo:'Cantiere',principale:true,formatta:r=>html`<b>${r.c.nome}</b><br><span class="piccolo secondario">${nomeCliente(r.c.affidatariaId)||nomeCliente(r.c.committenteId)||''}${r.c.stato==='sospeso'?' · sospeso':''}</span>`},
    {chiave:'tempo',titolo:'Avanzamento',formatta:r=>r.c.dataFine?(r.fine>=0?html`${r.fine} giorni alla fine`:html`<span class="da-compilare">in ritardo di ${-r.fine} giorni</span>`):r.c.dataInizio?html`iniziato il ${fData(r.c.dataInizio)}`:html`<span class="secondario">${r.c.periodoTesto||'date da compilare'}</span>`},
    {chiave:'operai',titolo:'Operai',formatta:r=>(r.c.operai||[]).length?r.c.operai.map(id=>nomePersona(persona(id)).split(' ')[0]).join(', '):html`<span class="silenzioso">nessuno</span>`},
    {chiave:'doc',titolo:'Documenti pronti',formatta:r=>html`<b>${r.ck.pronti}</b>/${r.ck.totale}${r.ck.urgenti.length?html` <span class="pillola scaduto">${icona('attenzione','piccola')}${r.ck.urgenti.length}</span>`:''}`},
    {chiave:'margine',titolo:'Margine',num:true,formatta:r=>r.eco.entrate||r.eco.uscite?html`<span class="${r.eco.margine<0?'da-compilare':''}">${fEuro(r.eco.margine,0)}</span>`:html`<span class="silenzioso">nessun movimento</span>`},
  ]})}</div>`;
}
function riquadroMese(){
  const d=new Date();const anno=d.getFullYear(),mese=d.getMonth()+1;
  const r=riepilogoMese(anno,mese);
  const lav=giorniLavorativiMese(anno,mese,stato.impostazioni.festivitaLocali);
  const passati=lav.filter(g=>g<=d.getDate());
  return html`<div class="scheda"><h3>${icona('presenze')}${fMeseAnno(anno,mese)} <span class="azioni"><a class="pulsante piccolo" href="#/presenze/${chiaveMese(anno,mese)}">Apri</a></span></h3>
  <div class="griglia tre"><div class="indicatore" data-azione="vai" data-href="presenze/${chiaveMese(anno,mese)}"><span class="etichetta">Ore inserite</span><span class="valore md">${fOre(r.oreTotali)}</span></div><div class="indicatore" data-azione="vai" data-href="presenze/${chiaveMese(anno,mese)}"><span class="etichetta">Importo stimato</span><span class="valore md">${fEuro(r.importoTotale,0)}</span></div><div class="indicatore ${r.giorniDaCompilare>0?'attenzione':''}" data-azione="vai" data-href="presenze/${chiaveMese(anno,mese)}"><span class="etichetta">Giorni da compilare</span><span class="valore md">${r.giorniDaCompilare}</span><span class="nota">su ${passati.length} lavorativi passati</span></div></div></div>`;
}
function riquadroClienti(){
  const anno=new Date().getFullYear();
  const perCliente=fatturatoPerCliente(anno);
  const top=perCliente.slice(0,3);
  const fermi=stato.clienti.filter(c=>{const u=ultimoLavoroCliente(c.id);return c.stato!=='chiuso'&&(!u||giorniTra(u,oggi())>180)});
  return html`<div class="scheda"><h3>${icona('clienti')}Clienti <span class="azioni"><a class="pulsante piccolo" href="#/clienti?vista=confronto">Confronto</a></span></h3>
  <div class="riga mb-s"><span class="secondario">Fatturato ${anno} (imponibile)</span><span class="spazio"></span><b>${fEuro(somma(perCliente,x=>x.fatturato),0)}</b></div>
  ${top.length?html`<div class="sezione-titolo">I primi tre</div><ul class="elenco-piatto">${top.map(x=>html`<li class="link" data-azione="vai" data-href="clienti/${x.cliente.id}"><span class="spazio">${x.cliente.ragioneSociale}</span><b class="num">${fEuro(x.fatturato,0)}</b></li>`)}</ul>`:html`<p class="secondario piccolo">Nessuna fattura registrata per il ${anno}: il fatturato si calcola dai movimenti in Budget.</p>`}
  ${fermi.length?html`<div class="sezione-titolo">Fermi da più di sei mesi</div><div class="chip-lista">${fermi.slice(0,8).map(c=>html`<a class="chip" href="#/clienti/${c.id}">${c.ragioneSociale}</a>`)}</div>`:''}</div>`;
}
function riquadroMargini(){
  const con=stato.cantieri.map(c=>({c,eco:economiaCantiere(c.id,stato.movimenti)})).filter(x=>x.eco.entrate||x.eco.uscite);
  if(!con.length) return html`<div class="scheda"><h3>${icona('bilancia')}Margine cantieri</h3><p class="secondario">Nessun movimento economico assegnato ai cantieri. Registra le fatture in <a href="#/budget">Budget</a> e assegnale ai cantieri: qui compariranno i tre migliori e quelli in perdita.</p></div>`;
  const ord=con.slice().sort((a,b)=>b.eco.margine-a.eco.margine);
  const migliori=ord.slice(0,3),perdita=ord.filter(x=>x.eco.margine<0).slice(-3).reverse();
  return html`<div class="scheda"><h3>${icona('bilancia')}Margine cantieri</h3>${perdita.length?html`<div class="avviso-inline critico">${icona('errore')}<div class="corpo"><b>In perdita:</b> ${perdita.map(x=>html`<a href="#/cantieri/${x.c.id}">${x.c.nome}</a> (${fEuro(x.eco.margine,0)})`).reduce((a,b)=>html`${a} · ${b}`)}</div></div>`:''}${graficoBarreOrizzontali(ord.slice(0,8).map(x=>({etichetta:x.c.nome,valore:Math.round(x.eco.margine),href:'#/cantieri/'+x.c.id})),{formatta:v=>fEuro(v,0)})}</div>`;
}
function riquadroOreCantiere(){
  const d=new Date();const mesi=[];for(let i=5;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);mesi.push({anno:x.getFullYear(),mese:x.getMonth()+1})}
  const perCant=new Map();
  for(const m of mesi){const mm=meseP(m.anno,m.mese);if(!mm)continue;for(const pid of Object.keys(mm.persone)){for(const g of Object.keys(mm.persone[pid].giorni||{})){const c=mm.persone[pid].giorni[g];const v=valoreCella(c);if(typeof v!=='number'||!v)continue;const k=(c.cantiere||'senza cantiere').toLowerCase();if(!perCant.has(k))perCant.set(k,new Array(mesi.length).fill(0));perCant.get(k)[mesi.indexOf(m)]+=v}}}
  const serie=Array.from(perCant.entries()).map(([k,v])=>({nome:k,tot:somma(v),v})).sort((a,b)=>b.tot-a.tot).slice(0,6);
  if(!serie.length) return html`<div class="scheda"><h3>${icona('avanzamento')}Ore per cantiere, ultimi sei mesi</h3><p class="secondario">Nessuna ora registrata negli ultimi sei mesi.</p></div>`;
  return html`<div class="scheda"><h3>${icona('avanzamento')}Ore per cantiere, ultimi sei mesi</h3>${graficoImpilato(mesi.map((m,i)=>({etichetta:NOMI_MESI_BREVI[m.mese-1]+' '+String(m.anno).slice(2),valori:serie.map(s=>s.v[i])})),serie.map(s=>({nome:capitalizza(s.nome)})),{altezza:220,formatta:v=>fNum(v,0)})}</div>`;
}
function riquadroAzioni(){
  const az=azioniConsigliate();
  return html`<div class="scheda"><h3>${icona('magia')}Azioni consigliate</h3>${az.length?html`<ul class="elenco-piatto">${az.slice(0,12).map(a=>html`<li class="link" data-azione="vai" data-href="${a.href}"><span class="pillola ${a.livello}">${icona(a.livello==='scaduto'?'errore':a.livello==='scadenza'?'attenzione':'info','piccola')}${a.livello==='scaduto'?'urgente':a.livello==='scadenza'?'presto':'da fare'}</span><span class="spazio">${a.testo}</span>${icona('destra','piccola')}</li>`)}</ul>${az.length>12?html`<p class="piccolo secondario mt-s">e altre ${az.length-12}…</p>`:''}`:html`<p class="secondario">${icona('ok')} Niente di urgente: tutto in ordine.</p>`}</div>`;
}
// Azioni consigliate generate dai dati, ordinate per urgenza (0 = più urgente)
function azioniConsigliate(){
  const out=[];const oggiIso=oggi();const s=soglie();
  const sc=riepilogoScadenze();
  for(const r of sc.scaduti) out.push({p:0,livello:'scaduto',testo:`Rinnovare ${(r.tipo||{}).nome} di ${r.soggetto} (scaduto il ${fData(r.info.data)})`,href:r.persona?'operai/'+r.persona.id:'impostazioni'});
  for(const m of sc.mancanti) out.push({p:m.bloccante?0:2,livello:m.bloccante?'scaduto':'pianificare',testo:`${m.nome} mancante per ${nomePersona(m.persona)}${m.bloccante?': non può entrare in cantiere':''}`,href:'operai/'+m.persona.id});
  const durc=documentiAzienda().filter(d=>d.tipoId==='durc').map(d=>infoDocumento(d)).sort((a,b)=>(b.giorni||0)-(a.giorni||0))[0];
  if(durc&&durc.giorni!=null&&durc.giorni>=0&&durc.giorni<=(s.durcAvviso||30)) out.push({p:1,livello:'scadenza',testo:`DURC in scadenza il ${fData(durc.data)}: richiederne uno nuovo`,href:'documenti?doc='+documentiAzienda().find(d=>d.tipoId==='durc').id});
  for(const r of sc.entro60) if(!(r.tipo&&r.tipo.id==='durc')) out.push({p:1,livello:'scadenza',testo:`${(r.tipo||{}).nome} di ${r.soggetto} scade il ${fData(r.info.data)}`,href:r.persona?'operai/'+r.persona.id:'impostazioni'});
  for(const c of stato.cantieri){
    if(c.stato==='attivo'&&c.dataFine&&c.dataFine<oggiIso) out.push({p:2,livello:'scadenza',testo:`Cantiere ${c.nome}: fine prevista il ${fData(c.dataFine)} ma ancora attivo`,href:'cantieri/'+c.id});
    if(c.stato==='attivo'&&!stato.pos.find(p=>p.cantiereId===c.id)&&!(c.documentiProdotti||[]).find(d=>d.tipo==='POS')) out.push({p:2,livello:'pianificare',testo:`Cantiere ${c.nome} attivo senza POS`,href:'cantieri/'+c.id+'/pos'});
    if(c.stato==='attivo'||c.stato==='sospeso'){const ck=checklistCantiere(c);if(ck.urgenti.length) out.push({p:1,livello:'scadenza',testo:`Cantiere ${c.nome}: ${plurale(ck.urgenti.length,'documento mancante o scaduto','documenti mancanti o scaduti')} nella checklist`,href:'cantieri/'+c.id})}
  }
  // Promemoria fisso: documenti/ore per il commercialista entro il 12 del mese
  if(+oggiIso.slice(8,10)<=12){const meseScorso=mesePrecedente(+oggiIso.slice(0,4),+oggiIso.slice(5,7));out.push({p:2,livello:'pianificare',testo:`Preparare presenze e documenti per il commercialista (entro il 12)`,href:'presenze/'+chiaveMese(meseScorso.anno,meseScorso.mese)})}
  const d=new Date();const prec=mesePrecedente(d.getFullYear(),d.getMonth()+1);
  const rp=riepilogoMese(prec.anno,prec.mese);
  if(rp.giorniDaCompilare>0) out.push({p:2,livello:'scadenza',testo:`Presenze di ${fMeseAnno(prec.anno,prec.mese)} incomplete: ${rp.giorniDaCompilare} giorni-persona da compilare`,href:'presenze/'+chiaveMese(prec.anno,prec.mese)});
  // buste paga mancanti per mesi lavorati (ultimi 3 mesi chiusi)
  for(let i=1;i<=3;i++){const x=new Date(d.getFullYear(),d.getMonth()-i,1);const anno=x.getFullYear(),mese=x.getMonth()+1;const mm=meseP(anno,mese);if(!mm)continue;for(const pid of Object.keys(mm.persone)){const p=persona(pid);if(!p||!p.attivo)continue;if(!stato.bustePaga.find(b=>b.personaId===pid&&b.anno===anno&&b.mese===mese)) out.push({p:3,livello:'pianificare',testo:`Busta paga di ${nomePersona(p)} per ${fMeseAnno(anno,mese)} mancante`,href:'documenti/buste?persona='+pid})}}
  for(const pv of stato.preventivi) if(pv.stato==='inviato'&&pv.data&&giorniTra(pv.data,oggiIso)>30) out.push({p:3,livello:'pianificare',testo:`Preventivo ${pv.numero}/${pv.anno} inviato il ${fData(pv.data)} senza risposta`,href:'preventivi/'+pv.id});
  const nonAss=stato.movimenti.filter(m=>m.categoria!=='spese_generali'&&!quoteMovimentoPerCantiere(m).length);
  if(nonAss.length) out.push({p:3,livello:'pianificare',testo:`${nonAss.length} fatture non assegnate a un cantiere`,href:'budget?filtro=nonassegnate'});
  const dv=stato.movimenti.filter(m=>m.daVerificare);if(dv.length) out.push({p:3,livello:'pianificare',testo:`${dv.length} movimenti da verificare`,href:'budget?filtro=daverificare'});
  const imp=stato.impostazioni;
  if(!imp.ultimoBackup||giorniTra(imp.ultimoBackup.slice(0,10),oggiIso)>3) if((imp.modificheDopoBackup||0)>0||!imp.ultimoBackup) out.push({p:imp.ultimoBackup?3:1,livello:imp.ultimoBackup?'pianificare':'scadenza',testo:imp.ultimoBackup?`Backup non fatto da ${giorniTra(imp.ultimoBackup.slice(0,10),oggiIso)} giorni`:'Nessun backup ancora eseguito',href:'impostazioni?backup=1'});
  return out.sort((a,b)=>a.p-b.p);
}
