// ---------------------------------------------------------------------
// DASHBOARD: "come stiamo messi" in cinque secondi. Ogni riquadro porta al dettaglio.
// Ogni riquadro è protetto: se un modulo ha un problema, gli altri si vedono lo stesso.
// ---------------------------------------------------------------------
VISTE.dashboard=function(){
  const riquadro=(fn)=>{try{return fn()}catch(e){console.error(e);return html`<div class="avviso-inline critico">${icona('errore')}<div class="corpo">Riquadro non disponibile: ${e.message}</div></div>`}};
  const az=azioniConsigliate();const urgenti=az.filter(a=>a.livello!=='pianificare').length;
  const attivi=stato.cantieri.filter(c=>c.stato==='attivo'||c.stato==='sospeso');
  const squadra=stato.persone.filter(p=>p.attivo&&p.inCantiere!==false);const idonei=squadra.filter(p=>idoneita(p).idonea).length;
  const d=new Date();const rm=riepilogoMese(d.getFullYear(),d.getMonth()+1);const lav=giorniLavorativiMese(d.getFullYear(),d.getMonth()+1,stato.impostazioni.festivitaLocali).filter(g=>g<=d.getDate());
  const compilato=lav.length&&squadra.length?Math.round(Math.max(0,1-rm.giorniDaCompilare/(lav.length*Math.max(1,personePresenze(d.getFullYear(),d.getMonth()+1).length)))*100):null;
  const ora=d.getHours();const saluto=ora<13?'Buongiorno.':ora<18?'Buon pomeriggio.':'Buonasera.';
  const titolo=urgenti?html`${saluto} <em>${urgenti===1?'Una cosa':numeroInLettere(urgenti)+' cose'}<br>da sistemare.</em>`:html`${saluto} <em>Tutto in ordine.</em>`;
  const sotto=[attivi.length?html`<b>${plurale(attivi.length,'cantiere aperto','cantieri aperti')}</b>`:'nessun cantiere aperto',squadra.length?html`<b>${idonei} su ${squadra.length}</b> idonei al cantiere`:'',compilato!=null?html`${nomeMese(d.getMonth()+1)} compilato al <b>${compilato}%</b>`:''].filter(x=>x&&String(x));
  return html`<div class="testata"><div><div class="occhiello">${capitalizza(NOMI_GIORNI[d.getDay()])} ${fDataLunga(oggi())}</div><h1 class="titolo-oggi">${titolo}</h1><p class="sotto">${grezzo(sotto.map(String).join(', '))}.</p></div>
    <div class="azioni"><button class="pulsante" data-azione="carica-documento-globale">${icona('carica','piccola')}Carica documento</button>
    <div class="tendina-box"><button class="pulsante primario" data-azione="tendina">Nuovo<span class="manopola">${icona('piu','piccola')}</span></button><div class="tendina">
      <a class="voce-t" href="#/operai?nuovo=1"><span class="ic-t">${icona('persona','piccola')}</span><span><b>Persona</b><span>Anche partendo da un UNILAV</span></span></a>
      <a class="voce-t" href="#/cantieri?nuovo=1"><span class="ic-t">${icona('cantieri','piccola')}</span><span><b>Cantiere</b><span>Con committente e date</span></span></a>
      <a class="voce-t" href="#/preventivi?nuovo=1"><span class="ic-t">${icona('preventivi','piccola')}</span><span><b>Preventivo</b><span>Dal listino o dall’Excel del cliente</span></span></a>
      <a class="voce-t" href="#/budget?nuovo=1"><span class="ic-t">${icona('budget','piccola')}</span><span><b>Movimento</b><span>Fattura o spesa</span></span></a>
      <button class="voce-t" data-azione="carica-documento-globale"><span class="ic-t">${icona('documenti','piccola')}</span><span><b>Documento</b><span>Lo riconosco e lo archivio io</span></span></button>
    </div></div></div></div>
  <div class="bento">
    <div class="guscio c-8">${riquadro(()=>riquadroDaFare(az))}</div>
    <div class="guscio c-4">${riquadro(riquadroDocumenti)}</div>
    <div class="guscio c-4">${riquadro(riquadroMese)}</div>
    <div class="guscio c-8">${riquadro(riquadroCantieri)}</div>
    <div class="guscio c-7">${riquadro(riquadroIdoneita)}</div>
    <div class="guscio c-5">${riquadro(riquadroMargini)}</div>
    <div class="guscio c-6">${riquadro(riquadroClienti)}</div>
    <div class="guscio c-6">${riquadro(riquadroOreCantiere)}</div>
  </div>`;
};
function numeroInLettere(n){return ['zero','una','due','tre','quattro','cinque','sei','sette','otto','nove','dieci'][n]?capitalizza(['zero','una','due','tre','quattro','cinque','sei','sette','otto','nove','dieci'][n]):String(n)}
function riquadroDaFare(az){
  const tutte=ui.filtri.oggiTutte;const vis=tutte?az:az.slice(0,7);
  return html`<div class="scheda"><div class="intesta"><h2>Da fare</h2><span class="pillola neutro">${az.length}</span><a class="vai" href="#/operai/scadenzario">Scadenzario ${icona('destra','piccola')}</a></div>
  ${az.length?html`<ul class="da-fare">${vis.map(a=>html`<li class="${a.livello}" data-azione="vai" data-href="${a.href}"><span class="ck">${a.livello==='scaduto'?icona('attenzione'):a.livello==='scadenza'?icona('orologio'):''}</span><div><div class="t">${a.testo}</div>${a.sotto?html`<div class="s">${a.sotto}</div>`:''}</div>${icona('freccia-destra','piccola va')}</li>`)}</ul>
  ${az.length>7?html`<button class="pulsante discreto piccolo mt-s" data-azione="oggi-tutte">${tutte?'Mostra meno':'Mostra tutte ('+az.length+')'}</button>`:''}`:html`<div class="vuoto">${icona('ok')}<h3>Niente da sistemare</h3><p>Documenti, presenze e backup sono in regola.</p></div>`}</div>`;
}
AZIONI['oggi-tutte']=()=>{ui.filtri.oggiTutte=!ui.filtri.oggiTutte;render()};
function riquadroDocumenti(){
  const sc=riepilogoScadenze();
  const v=[['Validi',sc.validi.length,'var(--ok)'],['Entro '+sc.soglie.scadenza+' gg',sc.entro60.length,'var(--warn)'],['Scaduti',sc.scaduti.length,'var(--bad)'],['Mancanti',sc.mancanti.length,'var(--sunk-3)']];
  const tot=somma(v,x=>x[1])||1;let off=0;
  const archi=v.slice(0,3).map(x=>{const len=x[1]/tot*100;const a=len?html`<circle cx="21" cy="21" r="16" fill="none" stroke="${x[2]}" stroke-width="5" stroke-dasharray="${Math.max(len-1.5,.5)} 100" stroke-dashoffset="${-off}" pathLength="100" stroke-linecap="round"/>`:'';off+=len;return a});
  return html`<div class="scheda"><div class="intesta"><h2>Documenti</h2><a class="vai" href="#/operai/scadenzario">Tutti ${icona('destra','piccola')}</a></div>
  <div class="anello-box"><div class="anello"><svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="16" fill="none" stroke="var(--sunk-2)" stroke-width="5"/>${archi}</svg><div class="centro-anello"><div><b>${sc.righe.length+sc.mancanti.length}</b><span>documenti</span></div></div></div>
  <ul class="legenda-anello">${v.map(x=>html`<li><i style="background:${x[2]}"></i>${x[0]}<b>${x[1]}</b></li>`)}</ul></div></div>`;
}
function riquadroMese(){
  const d=new Date();const anno=d.getFullYear(),mese=d.getMonth()+1;
  const r=riepilogoMese(anno,mese);const n=giorniNelMese(anno,mese);
  const perGiorno=new Array(n).fill(0);const mm=meseP(anno,mese);
  if(mm)for(const pid of Object.keys(mm.persone))for(const [g,c] of Object.entries(mm.persone[pid].giorni||{})){const v=valoreCella(c);if(typeof v==='number')perGiorno[+g-1]+=v}
  const mx=Math.max(...perGiorno,1);
  const barre=perGiorno.map((v,i)=>{const gs=giornoSettimana(anno,mese,i+1);const we=gs===0||gs===6;return html`<i class="${we?'we':v?'pieno':''}" style="height:${we?8:v?Math.max(12,v/mx*100):10}%" title="${i+1} ${nomeMese(mese)}: ${fOre(v)} ore"></i>`});
  return html`<div class="scheda"><div class="intesta"><h2>${capitalizza(nomeMese(mese))}</h2><a class="vai" href="#/presenze/${chiaveMese(anno,mese)}">Presenze ${icona('destra','piccola')}</a></div>
  <div class="grande-numero">${fOre(r.oreTotali)||0}<small>ore</small></div><div class="barrette">${barre}</div><div class="barrette-asse"><span>1</span><span>${Math.round(n/2)}</span><span>${n}</span></div>
  <div class="coppia"><div><div class="k">Importo stimato</div><div class="v">${fEuro(r.importoTotale,0)}</div></div><div><div class="k">Da compilare</div><div class="v ${r.giorniDaCompilare?'warn-t':''}">${r.giorniDaCompilare?plurale(r.giorniDaCompilare,'giorno','giorni'):'niente'}</div></div></div></div>`;
}
function avanzamentoCantiere(c){
  if(!c.dataInizio||!c.dataFine) return null;
  const tot=giorniTra(c.dataInizio,c.dataFine),pass=giorniTra(c.dataInizio,oggi());
  return tot>0?{fr:pass/tot,ritardo:pass>tot?pass-tot:0,mancano:Math.max(0,tot-pass)}:null;
}
function riquadroCantieri(){
  const attivi=stato.cantieri.filter(c=>c.stato==='attivo'||c.stato==='sospeso');
  if(!attivi.length) return html`<div class="scheda"><div class="intesta"><h2>Cantieri aperti</h2></div><div class="vuoto">${icona('cantieri')}<h3>Nessun cantiere aperto</h3><p>Quando ne apri uno lo vedi qui con avanzamento, squadra e documenti pronti.</p><a class="pulsante" href="#/cantieri?nuovo=1">Nuovo cantiere</a></div></div>`;
  return html`<div class="scheda"><div class="intesta"><h2>Cantieri aperti</h2><a class="vai" href="#/cantieri?vista=tempo">Diagramma ${icona('destra','piccola')}</a></div>
  ${attivi.map(c=>{const ck=checklistCantiere(c);const av=avanzamentoCantiere(c);return html`<div class="riga-cantiere ${coloreCantiere(c)}" data-azione="vai" data-href="cantieri/${c.id}"><div style="min-width:0"><div class="n"><span class="puntino"></span><span class="taglia">${c.nome}</span>${c.stato==='sospeso'?html`<span class="pillola scadenza">sospeso</span>`:''}</div><div class="w taglia">${nomeCliente(c.affidatariaId)||nomeCliente(c.committenteId)||''}${c.indirizzo&&c.indirizzo.comune?' · '+c.indirizzo.comune:''}</div></div>
    <div class="tr">${av?html`<div class="traccia"><i class="${av.ritardo?'tardi':''}" style="width:${Math.min(100,Math.max(3,av.fr*100))}%"></i></div><div class="traccia-nota"><span class="${av.ritardo?'bad-t':''}">${av.ritardo?'in ritardo di '+plurale(av.ritardo,'giorno','giorni'):Math.round(av.fr*100)+'% del tempo'}</span><span>fine ${fDataBreve(c.dataFine)}</span></div>`:html`<span class="piccolo silenzioso">${c.periodoTesto||'date da scrivere'}</span>`}</div>
    <div class="pila">${(c.operai||[]).slice(0,5).map(id=>persona(id)?avatar(persona(id),'mini'):'')}</div>
    <div class="docs num" title="Documenti pronti per la committenza"><b>${ck.pronti}</b><span class="silenzioso">/${ck.totale}</span></div></div>`})}</div>`;
}
function riquadroIdoneita(){
  const persone=stato.persone.filter(p=>p.attivo&&p.inCantiere!==false);
  const st=persone.map(p=>({p,i:idoneita(p)}));const no=st.filter(x=>!x.i.idonea).length;
  return html`<div class="scheda"><div class="intesta"><h2>Squadra oggi</h2>${st.length-no?html`<span class="pillola valido">${st.length-no} idonei</span>`:''}${no?html`<span class="pillola scaduto">${no} ${no===1?'bloccato':'bloccati'}</span>`:''}<a class="vai" href="#/operai">Operai ${icona('destra','piccola')}</a></div>
  ${st.length?html`<div class="squadra">${st.map(({p,i})=>html`<a class="compagno ${!i.idonea?'no':i.avvisi.length?'mezzo':''}" href="#/operai/${p.id}" title="${i.idonea?(i.avvisi.length?'Idoneo · '+i.avvisi.join('; '):'Idoneo, documenti in regola'):i.motivi.join('; ')}">${avatar(p)}<span style="min-width:0"><b>${nomePersona(p)}</b><span>${i.idonea?(i.avvisi.length?'manca: '+i.avvisi.map(x=>x.split(':')[0]).join(', '):p.mansione||'idoneo'):i.motivi[0]||'non idoneo'}</span></span></a>`)}</div>`:html`<p class="secondario">Nessuna persona attiva che va in cantiere.</p>`}</div>`;
}
function riquadroMargini(){
  const con=stato.cantieri.map(c=>({c,eco:economiaCantiere(c.id,stato.movimenti)})).filter(x=>x.eco.entrate||x.eco.uscite);
  if(!con.length) return html`<div class="scheda"><div class="intesta"><h2>Margine per cantiere</h2></div><p class="secondario piccolo">Ancora nessun movimento assegnato ai cantieri. Registra le fatture in <a href="#/budget">Budget</a> e assegnale: qui vedi chi guadagna e chi è in perdita.</p></div>`;
  const ord=con.slice().sort((a,b)=>b.eco.margine-a.eco.margine).slice(0,7);const mx=Math.max(...ord.map(x=>Math.abs(x.eco.margine)),1);
  return html`<div class="scheda"><div class="intesta"><h2>Margine per cantiere</h2><span class="piccolo silenzioso">imponibile</span><a class="vai" href="#/budget">Budget ${icona('destra','piccola')}</a></div>
  ${ord.map(x=>html`<a class="barra-o" href="#/cantieri/${x.c.id}" style="color:inherit;text-decoration:none"><span>${x.c.nome}</span><span class="b"><i class="${x.eco.margine<0?'neg':''}" style="width:${Math.abs(x.eco.margine)/mx*100}%"></i></span><span class="v ${x.eco.margine<0?'bad-t':''}">${fEuro(x.eco.margine,0)}</span></a>`)}</div>`;
}
function riquadroClienti(){
  const anno=new Date().getFullYear();
  const perCliente=fatturatoPerCliente(anno);
  const top=perCliente.slice(0,4);
  const fermi=stato.clienti.filter(c=>{const u=ultimoLavoroCliente(c.id);return c.stato!=='chiuso'&&(!u||giorniTra(u,oggi())>180)});
  return html`<div class="scheda"><div class="intesta"><h2>Clienti</h2><a class="vai" href="#/clienti?vista=confronto">Confronto ${icona('destra','piccola')}</a></div>
  <div class="grande-numero">${fEuro(somma(perCliente,x=>x.fatturato),0).replace(' €','')}<small>€ fatturati nel ${anno}</small></div>
  ${top.length?html`<ul class="elenco-piatto mt">${top.map(x=>html`<li class="link" data-azione="vai" data-href="clienti/${x.cliente.id}"><span class="spazio taglia">${x.cliente.ragioneSociale}</span><b class="num">${fEuro(x.fatturato,0)}</b></li>`)}</ul>`:html`<p class="secondario piccolo mt">Nessuna fattura registrata per il ${anno}: il fatturato si calcola dai movimenti in Budget.</p>`}
  ${fermi.length?html`<div class="sezione-titolo">Fermi da più di sei mesi</div><div class="chip-lista">${fermi.slice(0,8).map(c=>html`<a class="chip" href="#/clienti/${c.id}">${c.ragioneSociale}</a>`)}</div>`:''}</div>`;
}
function riquadroOreCantiere(){
  const d=new Date();const mesi=[];for(let i=5;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);mesi.push({anno:x.getFullYear(),mese:x.getMonth()+1})}
  const perCant=new Map();
  for(const m of mesi){const mm=meseP(m.anno,m.mese);if(!mm)continue;for(const pid of Object.keys(mm.persone)){for(const g of Object.keys(mm.persone[pid].giorni||{})){const c=mm.persone[pid].giorni[g];const v=valoreCella(c);if(typeof v!=='number'||!v)continue;const cc=cantiereDaCella(c,chiaveMese(m.anno,m.mese)+'-'+pad2(+g));const k=cc?cc.nome:(c.cantiere||'senza cantiere');if(!perCant.has(k))perCant.set(k,new Array(mesi.length).fill(0));perCant.get(k)[mesi.indexOf(m)]+=v}}}
  const serie=Array.from(perCant.entries()).map(([k,v])=>({nome:k,tot:somma(v),v})).sort((a,b)=>b.tot-a.tot).slice(0,6);
  if(!serie.length) return html`<div class="scheda"><div class="intesta"><h2>Ore per cantiere</h2></div><p class="secondario">Nessuna ora registrata negli ultimi sei mesi.</p></div>`;
  return html`<div class="scheda"><div class="intesta"><h2>Ore per cantiere</h2><span class="piccolo silenzioso">ultimi sei mesi</span></div>${graficoImpilato(mesi.map((m,i)=>({etichetta:NOMI_MESI_BREVI[m.mese-1]+' '+String(m.anno).slice(2),valori:serie.map(s=>s.v[i])})),serie.map(s=>({nome:capitalizza(s.nome)})),{altezza:200,formatta:v=>fNum(v,0)})}</div>`;
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
  try{out.push(...scadenzeVersamenti())}catch(e){}
  const imp=stato.impostazioni;
  if(!imp.ultimoBackup||giorniTra(imp.ultimoBackup.slice(0,10),oggiIso)>3) if((imp.modificheDopoBackup||0)>0||!imp.ultimoBackup) out.push({p:imp.ultimoBackup?3:1,livello:imp.ultimoBackup?'pianificare':'scadenza',testo:imp.ultimoBackup?`Backup non fatto da ${giorniTra(imp.ultimoBackup.slice(0,10),oggiIso)} giorni`:'Nessun backup ancora eseguito',href:'impostazioni?backup=1'});
  return out.sort((a,b)=>a.p-b.p);
}
