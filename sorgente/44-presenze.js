// ---------------------------------------------------------------------
// PRESENZE: griglia mensile (persone in riga, giorni in colonna; tre righe per persona),
// strumenti rapidi, postazione di trascrizione, incolla dati, calcoli e uscite.
// Regole aziendali: 8 nei giorni lavorati (salvo schema orario), mai sabato/domenica,
// FS solo se la festività cade in giorno feriale, importo = arrotondamento aziendale.
// ---------------------------------------------------------------------
ui.pres={attiva:null,selezione:null};
// Nome del tasto: alcune tastiere virtuali e strumenti di automazione mandano key vuoto ma keyCode valorizzato
function nomeTasto(e){return e.key||({13:'Enter',9:'Tab',27:'Escape',37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',46:'Delete',8:'Backspace',113:'F2'})[e.keyCode]||''}
function personePresenze(anno,mese){
  const k=chiaveMese(anno,mese);const m=stato.presenze[k];
  const conDati=m?Object.keys(m.persone):[];
  return stato.persone.filter(p=>(p.inLibroPresenze&&p.attivo)||conDati.includes(p.id)).filter(p=>{ if(p.dataCessazione&&p.dataCessazione<k+'-01'&&!conDati.includes(p.id)) return false; return true; }).sort((a,b)=>((a.sezionePresenze==='soci')?0:1)-((b.sezionePresenze==='soci')?0:1)||confrontaTesto(nomePersona(a),nomePersona(b)));
}
function riepilogoMese(anno,mese){
  const m=meseP(anno,mese);const persone=personePresenze(anno,mese);
  let oreTotali=0,importoTotale=0,giorniDaCompilare=0;const perPersona=[];
  const lav=giorniLavorativiMese(anno,mese,stato.impostazioni.festivitaLocali);
  const oggiD=new Date();const limite=(anno<oggiD.getFullYear()||(anno===oggiD.getFullYear()&&mese<oggiD.getMonth()+1))?31:(anno===oggiD.getFullYear()&&mese===oggiD.getMonth()+1)?oggiD.getDate():0;
  for(const p of persone){
    const mp=m&&m.persone[p.id];const calc=calcolaMesePersona(mp||{giorni:{}},p);
    oreTotali+=calc.oreGriglia;importoTotale+=calc.importo||0;
    if(p.attivo&&p.inLibroPresenze){const mancanti=lav.filter(g=>g<=limite&&!(mp&&mp.giorni&&mp.giorni[String(g)]&&(valoreCella(mp.giorni[String(g)])!=null||mp.giorni[String(g)].trasferta)));giorniDaCompilare+=mancanti.length;perPersona.push({p,calc,mancanti})}
    else perPersona.push({p,calc,mancanti:[]});
  }
  return {oreTotali,importoTotale,giorniDaCompilare,perPersona};
}
// Le festività che cadono in un giorno feriale si segnano da sole con FS (per chi ha già qualcosa in quel mese)
function completaFestivita(anno,mese){
  const m=meseP(anno,mese);if(!m)return;const k=chiaveMese(anno,mese);const fest=festivitaAnno(anno,stato.impostazioni.festivitaLocali);
  const da=[];for(const p of personePresenze(anno,mese)){if(p.soloTrasferte||!p.attivo||!p.inLibroPresenze)continue;const mp=m.persone[p.id];if(!mp||!Object.keys(mp.giorni||{}).length)continue;
    for(let g=1;g<=giorniNelMese(anno,mese);g++){const iso=k+'-'+pad2(g);if(!fest.has(iso)||eFineSettimana(anno,mese,g))continue;const c=mp.giorni[String(g)];if(!c||(c.ore==null&&!c.codice))da.push([p.id,g])}}
  if(da.length)esegui('FS nelle festività '+fMeseAnno(anno,mese),s=>{for(const [pid,g] of da){const mp=assicuraMesePersona(s,anno,mese,pid);const c=mp.giorni[String(g)]||{};delete c.ore;c.codice='FS';mp.giorni[String(g)]=c}},{senzaRender:true,silenzioso:true});
}
VISTE.presenze=function(r){
  let {anno,mese}=daChiaveMese(r.id)||{anno:new Date().getFullYear(),mese:new Date().getMonth()+1};
  const k=chiaveMese(anno,mese);const m=meseP(anno,mese)||{persone:{}};
  const persone=personePresenze(anno,mese);
  const n=giorniNelMese(anno,mese);const fest=festivitaAnno(anno,stato.impostazioni.festivitaLocali);
  const giorni=Array.from({length:n},(_,i)=>{const g=i+1;const iso=k+'-'+pad2(g);const gs=giornoSettimana(anno,mese,g);return {g,iso,gs,we:gs===0||gs===6,festivo:fest.has(iso),oggi:iso===oggi()}});
  const prev=mesePrecedente(anno,mese),succ=meseSuccessivo(anno,mese);
  const compatta=ui.filtri.presenzeCompatta;
  const rie=riepilogoMese(anno,mese);
  // avvisi: massimali annui, giorni letti con incertezza
  const avvisi=[];
  for(const p of persone){const mesiAnno=Object.keys(stato.presenze).filter(x=>x.startsWith(anno+'-')).map(x=>stato.presenze[x].persone[p.id]).filter(Boolean);const mx=controllaMassimali(mesiAnno);for(const a of mx.avvisi)avvisi.push(nomePersona(p)+': '+a);const mp=m.persone[p.id];if(mp){if(mp.incerti&&mp.incerti.length)avvisi.push(`${nomePersona(p)}: ${mp.incerti.length} giorni letti con incertezza da confermare (${mp.incerti.join(', ')})`)}}
  const sezioni=[['soci','Soci'],['dipendenti','Dipendenti']];
  completaFestivita(anno,mese);
  dopoRender(montaGriglia);
  return html`<div class="testata"><div><div class="occhiello">Presenze</div><div class="riga stretta"><a class="pulsante icona" href="#/presenze/${chiaveMese(prev.anno,prev.mese)}" aria-label="Mese precedente">${icona('sinistra')}</a><h1 style="min-width:220px;text-align:center">${fMeseAnno(anno,mese)}</h1><a class="pulsante icona" href="#/presenze/${chiaveMese(succ.anno,succ.mese)}" aria-label="Mese successivo">${icona('destra')}</a><a class="pulsante piccolo discreto" href="#/presenze">Oggi</a></div></div>
    <div class="azioni"><button class="pulsante" data-azione="presenze-strumenti" data-k="${k}">${icona('magia')}Strumenti</button><button class="pulsante" data-azione="presenze-trascrizione" data-k="${k}">${icona('tastiera')}Compila un operaio</button><button class="pulsante" data-azione="presenze-uscite" data-k="${k}">${icona('scarica')}Esporta</button><button class="pulsante icona" data-azione="presenze-aiuto" title="Tasti e regole">${icona('info')}</button></div></div>
  <div class="griglia quattro mb"><div class="indicatore" style="cursor:default"><span class="etichetta">Ore in griglia</span><span class="valore md">${fOre(rie.oreTotali)}</span></div><div class="indicatore" style="cursor:default"><span class="etichetta">Importo del mese</span><span class="valore md">${fEuro(rie.importoTotale,0)}</span></div><div class="indicatore ${rie.giorniDaCompilare?'attenzione':''}" style="cursor:default"><span class="etichetta">Giorni-persona da compilare</span><span class="valore md">${rie.giorniDaCompilare}</span></div><div class="indicatore" style="cursor:default"><span class="etichetta">Giorni lavorativi</span><span class="valore md">${giorniLavorativiMese(anno,mese,stato.impostazioni.festivitaLocali).length}</span><span class="nota">${giorni.filter(x=>x.festivo&&!x.we).map(x=>'FS '+x.g).join(', ')||'nessuna festività feriale'}</span></div></div>
  ${avvisi.length?html`<div class="avviso-inline attenzione">${icona('attenzione')}<div class="corpo">${avvisi.map(a=>html`${a}<br>`)}</div></div>`:''}
  <div class="strumenti-tabella"><div class="gruppo-pulsanti"><button class="pulsante ${compatta?'':'attivo'}" data-azione="presenze-vista" data-valore="tutto">Ore, cantiere e committente</button><button class="pulsante ${compatta?'attivo':''}" data-azione="presenze-vista" data-valore="ore">Solo ore</button></div><span class="spazio"></span>${legendaCantieriMese(anno,mese,m)}</div>
  <div class="pie-griglia piccolo silenzioso mb-s">Frecce per muoversi · digita per scrivere · ⇧ + frecce per più giorni · Canc svuota · clic sul nome per compilarlo da solo</div>
  <div class="presenze-griglia desktop ${compatta?'compatta':''}" id="presenze-griglia" tabindex="0" data-k="${k}"><table>
    <thead><tr><th class="fisso">Persona</th><th class="fisso2"></th>${giorni.map(d=>html`<th class="${d.we?'fine-settimana':''} ${d.festivo?'festivo':''} ${d.gs===1?'lun':''} ${d.oggi?'oggi-col':''}" title="${fData(d.iso)}${d.festivo?' · festività':''}"><span class="gs">${NOMI_GIORNI_BREVI[d.gs]}</span>${d.g}</th>`)}<th class="totale">Ore</th><th class="totale">Importo</th></tr></thead>
    <tbody>${(()=>{let i=0;return sezioni.map(([sz,tit])=>{const pp=persone.filter(p=>(p.sezionePresenze||'dipendenti')===sz);if(!pp.length)return '';return html`<tr class="sezione"><td colspan="${n+4}">${tit}</td></tr>${pp.map(p=>righePersona(p,m.persone[p.id]||{giorni:{}},giorni,k,i++%2===1))}`})})()}</tbody></table></div>
  <div class="presenze-mobile">${vistaPresenzeMobile(persone,m,giorni,k)}</div>`;
};
function righePersona(p,mp,giorni,k,pari){
  const calc=calcolaMesePersona(mp,p);const n=giorni.length;const gg=mp.giorni||{};
  const blocco=pari?'blocco-pari':'';
  const cella=(d,riga)=>{const c=gg[String(d.g)]||{};const bloccata=d.we;let v='',cls='',titoloCella='',dentro='',grezzoV='';
    if(riga==='ore'){const val=valoreCella(c);if(typeof val==='number'){v=fOre(val);grezzoV=v;dentro=v;cls=val>8?'oltre':val<8?'meno':''}else if(typeof val==='string'){v=val;grezzoV=val;cls='codice codice-'+val;if(val==='FS'&&p.festivitaPagate)cls+=(mp.festivitaEscluse||[]).includes(d.g)?' fs-esclusa':' fs-pagata';dentro=html`<span>${val}</span>`}}
    else if(riga==='trasferta'){v=c.trasferta||'';grezzoV=v;dentro=v;cls='testo'}
    else{const t=tratto(d,riga);grezzoV=c[riga]||'';cls=t.cls;titoloCella=t.titolo;dentro=t.html}
    const incerto=(mp.incerti||[]).includes(d.g);
    return html`<td class="cella ${cls} ${bloccata?'bloccata':''} ${d.we?'fine-settimana':''} ${d.festivo?'festivo':''} ${d.gs===1?'lun':''} ${incerto?'riga-scadenza':''}" data-pid="${p.id}" data-riga="${riga}" data-giorno="${d.g}" data-v="${grezzoV}" title="${bloccata?'Sabato e domenica non si compilano':titoloCella||((d.festivo?'Festività':'')+(incerto?' · letto con incertezza':''))}">${dentro}</td>`};
  // cantiere e committente: i giorni consecutivi (nella settimana) con lo stesso valore diventano un tratto colorato
  const valore=(g,riga)=>{const c=gg[String(g)];return c&&c[riga]?normalizzaTesto(c[riga]):''};
  const tratto=(d,riga)=>{
    const c=gg[String(d.g)]||{};const v=c[riga];if(!v||d.we)return {cls:'testo',html:'',titolo:''};
    const iso=k+'-'+pad2(d.g);const cc=cantiereDaCella(c,iso);const q=normalizzaTesto(v);
    const lavorativo=x=>x&&!x.we;const prima=giorni[d.g-2],dopo=giorni[d.g];
    const inizio=!(lavorativo(prima)&&valore(prima.g,riga)===q),fine=!(lavorativo(dopo)&&valore(dopo.g,riga)===q);
    let lung=1;if(inizio){let j=d.g;while(j<n&&lavorativo(giorni[j])&&valore(giorni[j].g,riga)===q){lung++;j++}}
    const fuori=riga==='cantiere'&&!cc;
    const titolo=riga==='cantiere'?(fuori?v+' — non riconosco il cantiere (né dal nome né dalla località): queste ore non contano per nessun cantiere':cc.nome!==v?v+' → cantiere '+cc.nome:v):v;
    return {cls:`tratto ${riga==='committente'?'committente':''} ${inizio?'inizio':''} ${fine?'fine':''} ${fuori?'fuori-elenco':''} ${cc?coloreCantiere(cc):''}`,titolo,
      html:inizio?html`<span class="etichetta-tratto" style="width:${lung*38-14}px">${riga==='cantiere'&&cc?cc.nome:v}</span>`:''};
  };
  const nome=html`<td class="fisso"><span class="nome-compila" data-azione="presenze-compila" data-k="${k}" data-pid="${p.id}" title="Compila tutto il mese di ${nomePersona(p)}">${nomePersona(p)}</span></td>`;
  if(p.soloTrasferte){
    return html`<tr class="persona-prima ${blocco}">${nome}<td class="fisso2">trasferte</td>${giorni.map(d=>cella(d,'trasferta'))}<td class="totale">—</td><td class="totale num" data-azione="presenze-persona" data-k="${k}" data-pid="${p.id}" style="cursor:pointer" title="Apri il riepilogo">${fEuro(calc.importo,0)}</td></tr>`;
  }
  return html`<tr class="persona-prima ${blocco}">${nome}<td class="fisso2">ore</td>${giorni.map(d=>cella(d,'ore'))}<td class="totale num">${fOre(calc.oreGriglia)}</td><td class="totale num" data-azione="presenze-persona" data-k="${k}" data-pid="${p.id}" style="cursor:pointer" title="Apri il riepilogo della persona (anche per scrivere una nota)">${calc.importo!=null?fEuro(calc.importo,0):'—'} ${icona('modifica','piccola'+(mp.note?'':' silenzioso'))}</td></tr>
  <tr class="riga-secondaria ${blocco}"><td class="fisso"></td><td class="fisso2">cantiere</td>${giorni.map(d=>cella(d,'cantiere'))}<td class="totale" colspan="2">${Object.entries(calc.perCodice).map(([c,nn])=>html`<span class="etichetta-tag" title="${(CODICI_ASSENZA[c]||{}).nome||c}">${c} ${nn}</span> `)}</td></tr>
  <tr class="riga-secondaria ultima ${blocco}"><td class="fisso"></td><td class="fisso2">committente</td>${giorni.map(d=>cella(d,'committente'))}<td class="totale" colspan="2">${(mp.aggiustamenti||[]).length?html`<span class="piccolo secondario">${mp.aggiustamenti.map(a=>a.sigla+' '+fEuro(a.importo,0)).join(', ')}</span>`:''}</td></tr>`;
}
// i cantieri che compaiono nel mese, con il loro colore: è la legenda della griglia
function legendaCantieriMese(anno,mese,m){
  const visti=new Map();const k=chiaveMese(anno,mese);
  for(const pid of Object.keys(m.persone||{}))for(const [g,c] of Object.entries(m.persone[pid].giorni||{})){if(!c.cantiere)continue;const cc=cantiereDaCella(c,k+'-'+pad2(+g));if(cc)visti.set(cc.id,cc)}
  return html`<div class="legenda-cantieri">${Array.from(visti.values()).map(c=>html`<a class="cantiere-tag ${coloreCantiere(c)}" href="#/cantieri/${c.id}">${c.nome}</a>`)}</div>`;
}
AZIONI['presenze-vista']=d=>{ui.filtri.presenzeCompatta=d.valore==='ore';render()};
AZIONI['presenze-compatta']=(d,t)=>{ui.filtri.presenzeCompatta=t.checked;render()};
// ---- vista telefono: una persona alla volta ----
function vistaPresenzeMobile(persone,m,giorni,k){
  const pid=ui.filtri.presenzePersonaMobile||(persone[0]||{}).id;const p=persona(pid);if(!p)return '';
  const mp=m.persone[p.id]||{giorni:{}};const calc=calcolaMesePersona(mp,p);
  return html`<div class="scheda"><select data-cambio="presenze-persona-mobile" aria-label="Persona">${persone.map(x=>html`<option value="${x.id}" ${x.id===pid?'selected':''}>${nomePersona(x)}</option>`)}</select>
  <div class="riga mt-s"><span>Ore: <b>${fOre(calc.oreGriglia)}</b></span><span class="spazio"></span><b>${fEuro(calc.importo,0)}</b><button class="pulsante piccolo" data-azione="presenze-persona" data-k="${k}" data-pid="${p.id}">Riepilogo e note${mp.note?' '+icona('info','piccola'):''}</button></div>
  <div class="mt">${giorni.map(d=>{const c=(mp.giorni||{})[String(d.g)]||{};const v=valoreCella(c);return html`<div class="giorno-card ${d.we?'fine-settimana':''} ${d.festivo?'festivo':''}"><div class="g">${d.g}<small>${NOMI_GIORNI_BREVI[d.gs]}</small></div>${d.we?html`<div class="piccolo">non si compila</div>`:p.soloTrasferte?html`<input type="text" value="${c.trasferta||''}" placeholder="trasferta" data-mob="trasferta" data-pid="${p.id}" data-giorno="${d.g}" data-k="${k}">`:html`<div class="campi-g"><input type="text" value="${v==null?'':typeof v==='number'?fOre(v):v}" placeholder="ore" data-mob="ore" data-pid="${p.id}" data-giorno="${d.g}" data-k="${k}" style="text-align:center"><input type="text" value="${c.cantiere||''}" placeholder="cantiere" data-mob="cantiere" data-pid="${p.id}" data-giorno="${d.g}" data-k="${k}"><input type="text" value="${c.committente||''}" placeholder="committente" data-mob="committente" data-pid="${p.id}" data-giorno="${d.g}" data-k="${k}"></div>`}</div>`})}</div></div>`;
}
AZIONI['presenze-persona-mobile']=(d,t)=>{ui.filtri.presenzePersonaMobile=t.value;render()};
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.mob)return;const {anno,mese}=daChiaveMese(t.dataset.k);scriviCella(anno,mese,t.dataset.pid,+t.dataset.giorno,t.dataset.mob,t.value,{senzaRender:true});const p=persona(t.dataset.pid);const mp=meseP(anno,mese).persone[p.id];const calc=calcolaMesePersona(mp,p);});
// ---- scrittura di una cella (con le regole) ----
function scriviCella(anno,mese,pid,giorno,riga,valore,opz){
  opz=opz||{};
  const iso=chiaveMese(anno,mese)+'-'+pad2(giorno);
  if(eFineSettimana(anno,mese,giorno)){avviso('Sabato e domenica non si compilano: le ore del fine settimana contano solo nel totale dichiarato',{tipo:'attenzione',silenzioso:true});return false}
  valore=(valore==null?'':String(valore)).trim();
  let nuovo={};
  if(riga==='ore'){
    if(valore==='') nuovo={ore:null,codice:null};
    else { const cod=valore.toUpperCase(); if(CODICI_ASSENZA[cod]){ if(cod==='FS'&&!eFestivo(iso,stato.impostazioni.festivitaLocali)){avviso('FS si usa solo nei giorni di festività: il '+fData(iso)+' non lo è',{tipo:'attenzione',silenzioso:true});return false} nuovo={codice:cod,ore:null}; } else { const n=leggiNumero(valore); if(n===null||n<0||n>24){avviso('Valore non valido: ore (0–24) oppure codice M, I, PE, FS, FE, AS, CI',{tipo:'errore',silenzioso:true});return false} nuovo={ore:n,codice:null}; } }
  } else nuovo={[riga]:(riga==='cantiere'?nomeCantiereCanonico(valore):valore)||null};
  const p=persona(pid);
  esegui(`Presenze ${fDataBreve(iso)} ${nomePersona(p).split(' ')[0]}`,s=>{
    const mp=assicuraMesePersona(s,anno,mese,pid);
    const c=mp.giorni[String(giorno)]||{};
    Object.assign(c,nuovo);
    // scegliendo il cantiere, il committente si propone da solo: l'impresa affidataria del cantiere
    if(riga==='cantiere'&&valore&&!c.committente){const prop=committenteProposto(valore);if(prop)c.committente=prop}
    for(const kk of Object.keys(c)) if(c[kk]===null||c[kk]==='') delete c[kk];
    if(Object.keys(c).length) mp.giorni[String(giorno)]=c; else delete mp.giorni[String(giorno)];
    if(mp.incerti) mp.incerti=mp.incerti.filter(g=>g!==giorno);
  },{senzaRender:opz.senzaRender,silenzioso:true});
  return true;
}
// Il cantiere si scrive a mano (a volte è solo la località di trasferta), ma se corrisponde a un
// cantiere dell'elenco si salva col suo nome esatto: così ore e costi si ritrovano sul cantiere.
function nomeCantiereCanonico(v){if(!v)return v;const q=normalizzaTesto(v);const c=stato.cantieri.find(x=>normalizzaTesto(x.nome)===q);return c?c.nome:v}
// Di che cantiere è una cella? Nella riga «cantiere» spesso c'è solo la località (es. «piancastagnaio»):
// vale il nome esatto; altrimenti un cantiere il cui nome o comune contiene quella parola, aperto quel giorno
// (date di inizio/fine, se ci sono) e, se c'è più di un candidato, dello stesso committente. Solo se è uno.
function cantiereDaCella(cella,iso){
  const q=normalizzaTesto(cella&&cella.cantiere);if(!q)return null;
  const esatto=stato.cantieri.find(x=>normalizzaTesto(x.nome)===q);if(esatto)return esatto;
  const parola=t=>(' '+normalizzaTesto(t)+' ').includes(' '+q+' ');
  let cand=stato.cantieri.filter(c=>(parola(c.nome)||parola((c.indirizzo||{}).comune))&&(!iso||((!c.dataInizio||c.dataInizio<=iso)&&(!c.dataFine||c.dataFine>=iso))));
  if(cand.length>1&&cella.committente){const cm=normalizzaTesto(cella.committente);const st=cand.filter(c=>[c.committenteId,c.affidatariaId].some(id=>id&&normalizzaTesto(nomeCliente(id))===cm));if(st.length)cand=st}
  return cand.length===1?cand[0]:null;
}
function eCantiereInElenco(v){const q=normalizzaTesto(v);return stato.cantieri.some(x=>normalizzaTesto(x.nome)===q)}
function committenteProposto(nomeCantiere_){
  const nq=normalizzaTesto(nomeCantiere_);
  const c=stato.cantieri.find(x=>normalizzaTesto(x.nome)===nq)||stato.cantieri.find(x=>normalizzaTesto(x.nome).includes(nq)||nq.includes(normalizzaTesto(x.indirizzo.comune||'zzz')));
  if(c){const aff=cliente(c.affidatariaId)||cliente(c.committenteId);if(aff)return aff.ragioneSociale}
  // storico: ultimo committente usato con questo cantiere
  const chiavi=Object.keys(stato.presenze).sort().reverse();
  for(const k of chiavi){for(const pid of Object.keys(stato.presenze[k].persone)){const gg=stato.presenze[k].persone[pid].giorni||{};for(const g of Object.keys(gg)){if(normalizzaTesto(gg[g].cantiere||'')===nq&&gg[g].committente)return gg[g].committente}}}
  return null;
}
// Suggerimenti per cantiere/committente: prima i cantieri in corso («nome · committente · comune», si cerca su tutto), poi lo storico
function suggerimentiCantieri(campo){
  const voci=stato.cantieri.filter(c=>c.stato!=='chiuso').map(c=>{const cm=nomeCliente(c.affidatariaId)||nomeCliente(c.committenteId)||'';const co=(c.indirizzo||{}).comune;return {v:campo==='committente'?cm:c.nome,t:c.nome+(cm?' · '+cm:'')+(co?' · '+co:'')}}).filter(x=>x.v).sort((a,b)=>confrontaTesto(a.t,b.t));
  const gia=new Set(voci.map(x=>x.v));
  return [...voci,...valoriUsati(campo).filter(x=>!gia.has(x))];
}
function valoriUsati(campo){
  const out=new Set();
  for(const k of Object.keys(stato.presenze))for(const pid of Object.keys(stato.presenze[k].persone)){const gg=stato.presenze[k].persone[pid].giorni||{};for(const g of Object.keys(gg))if(gg[g][campo])out.add(gg[g][campo])}
  if(campo==='committente')for(const c of stato.clienti)out.add(c.ragioneSociale);
  const altri=Array.from(out).sort(confrontaTesto);
  if(campo!=='cantiere')return altri;
  const aperti=stato.cantieri.filter(c=>c.stato!=='chiuso').map(c=>c.nome).sort(confrontaTesto);const chiusi=stato.cantieri.filter(c=>c.stato==='chiuso').map(c=>c.nome).sort(confrontaTesto);
  return unici([...aperti,...chiusi,...altri.filter(v=>!eCantiereInElenco(v))]);
}
// ---- griglia: navigazione e inserimento da tastiera ----
function montaGriglia(){
  const g=el('#presenze-griglia'); if(!g) return;
  const k=g.dataset.k;const {anno,mese}=daChiaveMese(k);
  const celle=()=>tutti('td.cella',g);
  const trova=(pid,riga,giorno)=>g.querySelector(`td.cella[data-pid="${pid}"][data-riga="${riga}"][data-giorno="${giorno}"]`);
  const evidenzia=()=>{celle().forEach(c=>c.classList.remove('attiva','selezionata'));const a=ui.pres.attiva;if(!a)return;const ca=trova(a.pid,a.riga,a.giorno);if(ca){ca.classList.add('attiva');ca.scrollIntoView({block:'nearest',inline:'nearest'})}const s=ui.pres.selezione;if(s){const [g1,g2]=[Math.min(s.da,s.a),Math.max(s.da,s.a)];for(let gg=g1;gg<=g2;gg++){const c=trova(a.pid,a.riga,gg);if(c)c.classList.add('selezionata')}}};
  if(ui.pres.attiva&&ui.pres.attiva.k===k){evidenzia();if(ui.pres.focus){g.focus({preventScroll:true});ui.pres.focus=false}}
  const attiva=(td,estendi)=>{const a={k,pid:td.dataset.pid,riga:td.dataset.riga,giorno:+td.dataset.giorno};if(estendi&&ui.pres.attiva&&ui.pres.attiva.pid===a.pid&&ui.pres.attiva.riga===a.riga){ui.pres.selezione={da:ui.pres.attiva.giorno,a:a.giorno};ui.pres.attiva=Object.assign({},ui.pres.attiva)}else{ui.pres.attiva=a;ui.pres.selezione=null}evidenzia()};
  let editor=null;
  const inizioEdit=(td,iniziale)=>{
    if(editor||td.classList.contains('bloccata')) return;
    const riga=td.dataset.riga;const val=iniziale!==undefined?iniziale:(td.dataset.v!=null?td.dataset.v:td.textContent);
    const inp=document.createElement('input');inp.type='text';inp.value=val;inp.setAttribute('aria-label','Valore');
    td.textContent='';td.appendChild(inp);editor={td,inp,riga};
    if(riga==='cantiere'||riga==='committente'||riga==='trasferta') attivaSuggerimenti(inp,()=>riga==='trasferta'?valoriUsati('trasferta'):suggerimentiCantieri(riga));
    if(riga==='ore') attivaSuggerimenti(inp,()=>[{v:'8',t:'8 ore'},{v:'4',t:'4 ore'},...Object.entries(CODICI_ASSENZA).map(([c,x])=>({v:c,t:c+' — '+x.nome}))]);
    inp.focus();if(iniziale===undefined)inp.select();else inp.setSelectionRange(inp.value.length,inp.value.length);
    inp.addEventListener('keydown',e=>{
      const k=nomeTasto(e);
      if(k==='Enter'){e.preventDefault();e.stopPropagation();commit();muovi(0,1)}
      else if(k==='Tab'){e.preventDefault();e.stopPropagation();commit();muovi(e.shiftKey?-1:1,0)}
      else if(k==='Escape'){e.preventDefault();e.stopPropagation();annullaEdit()}
      else if(k==='ArrowUp'||k==='ArrowDown'){if(inp.value===val||riga==='ore'){e.preventDefault();e.stopPropagation();commit();muovi(0,k==='ArrowDown'?1:-1)}}
    });
    inp.addEventListener('blur',()=>{setTimeout(()=>{if(editor&&editor.inp===inp)commit()},150)});
  };
  const annullaEdit=()=>{if(!editor)return;const {td}=editor;editor=null;render();ui.pres.focus=true};
  const commit=()=>{
    if(!editor)return;const {td,inp,riga}=editor;editor=null;const v=inp.value;
    const pid=td.dataset.pid,giorno=+td.dataset.giorno;
    const sel=ui.pres.selezione;
    if(sel&&ui.pres.attiva&&ui.pres.attiva.pid===pid&&ui.pres.attiva.riga===riga){const [g1,g2]=[Math.min(sel.da,sel.a),Math.max(sel.da,sel.a)];applicaBlocco(anno,mese,[pid],g1,g2,riga,v);ui.pres.selezione=null}
    else scriviCella(anno,mese,pid,giorno,riga,v,{senzaRender:true});
    ui.pres.focus=true;render();
  };
  const righeOrdine=p=>p.soloTrasferte?['trasferta']:(ui.filtri.presenzeCompatta?['ore']:['ore','cantiere','committente']);
  const muovi=(dx,dy)=>{
    const a=ui.pres.attiva;if(!a)return;const n=giorniNelMese(anno,mese);
    let giorno=a.giorno+dx;if(giorno<1)giorno=1;if(giorno>n)giorno=n;
    let pid=a.pid,riga=a.riga;
    if(dy){const pers=personePresenze(anno,mese).filter(p=>(p.sezionePresenze||'dipendenti')==='soci').concat(personePresenze(anno,mese).filter(p=>(p.sezionePresenze||'dipendenti')!=='soci'));const seq=[];for(const p of pers)for(const r of righeOrdine(p))seq.push({pid:p.id,riga:r});let i=seq.findIndex(x=>x.pid===pid&&x.riga===riga);i=Math.max(0,Math.min(seq.length-1,i+dy));pid=seq[i].pid;riga=seq[i].riga}
    // salta il fine settimana muovendosi in orizzontale
    if(dx){let tent=0;while(eFineSettimana(anno,mese,giorno)&&tent<7){giorno+=dx>0?1:-1;tent++}if(giorno<1||giorno>n)return}
    ui.pres.attiva={k,pid,riga,giorno};ui.pres.selezione=null;evidenzia();
  };
  g.onclick=e=>{const td=e.target.closest('td.cella');if(!td)return;if(editor&&editor.td===td)return;if(editor)commit();attiva(td,e.shiftKey);g.focus({preventScroll:true})};
  g.ondblclick=e=>{const td=e.target.closest('td.cella');if(td&&!td.classList.contains('bloccata')){attiva(td);inizioEdit(td)}};
  g.onkeydown=e=>{
    if(editor)return;const a=ui.pres.attiva;if(!a)return;
    const kk=nomeTasto(e);
    if(kk==='ArrowLeft'){e.preventDefault();if(e.shiftKey){ui.pres.selezione={da:(ui.pres.selezione||{da:a.giorno}).da,a:Math.max(1,(ui.pres.selezione?ui.pres.selezione.a:a.giorno)-1)};evidenzia()}else muovi(-1,0)}
    else if(kk==='ArrowRight'){e.preventDefault();if(e.shiftKey){ui.pres.selezione={da:(ui.pres.selezione||{da:a.giorno}).da,a:Math.min(giorniNelMese(anno,mese),(ui.pres.selezione?ui.pres.selezione.a:a.giorno)+1)};evidenzia()}else muovi(1,0)}
    else if(kk==='ArrowUp'){e.preventDefault();muovi(0,-1)}
    else if(kk==='ArrowDown'||kk==='Enter'){e.preventDefault();if(kk==='Enter'&&!e.shiftKey){const td=trova(a.pid,a.riga,a.giorno);if(td&&!td.classList.contains('bloccata')){inizioEdit(td);return}}muovi(0,1)}
    else if(kk==='Tab'){e.preventDefault();muovi(e.shiftKey?-1:1,0)}
    else if(kk==='F2'){e.preventDefault();const td=trova(a.pid,a.riga,a.giorno);if(td)inizioEdit(td)}
    else if(kk==='Delete'||kk==='Backspace'){e.preventDefault();const sel=ui.pres.selezione;if(sel){applicaBlocco(anno,mese,[a.pid],Math.min(sel.da,sel.a),Math.max(sel.da,sel.a),a.riga,'');ui.pres.selezione=null}else scriviCella(anno,mese,a.pid,a.giorno,a.riga,'',{senzaRender:true});ui.pres.focus=true;render()}
    else if(kk==='Escape'){ui.pres.selezione=null;evidenzia()}
    else if(e.key.length===1&&!e.metaKey&&!e.ctrlKey&&!e.altKey){const td=trova(a.pid,a.riga,a.giorno);if(td&&!td.classList.contains('bloccata')){e.preventDefault();inizioEdit(td,e.key)}}
  };
}
function applicaBlocco(anno,mese,pids,g1,g2,riga,valore,opz){
  opz=opz||{};
  const k=chiaveMese(anno,mese);valore=(valore==null?'':String(valore)).trim();
  let nuovo=null;
  if(riga==='ore'){ if(valore===''){nuovo={ore:null,codice:null}} else {const cod=valore.toUpperCase();if(CODICI_ASSENZA[cod])nuovo={codice:cod,ore:null};else{const n=leggiNumero(valore);if(n===null||n<0||n>24){avviso('Valore non valido',{tipo:'errore'});return false}nuovo={ore:n,codice:null}}} }
  else nuovo={[riga]:valore||null};
  esegui(`Presenze ${fMeseAnno(anno,mese)}: giorni ${g1}–${g2} (${pids.length} persone)`,s=>{
    for(const pid of pids){const mp=assicuraMesePersona(s,anno,mese,pid);
      for(let gg=g1;gg<=g2;gg++){ if(eFineSettimana(anno,mese,gg)) continue; const iso=k+'-'+pad2(gg); const fest=eFestivo(iso,s.impostazioni.festivitaLocali); if(opz.soloLavorativi&&fest) continue;
        const c=mp.giorni[String(gg)]||{}; let nv=Object.assign({},nuovo);
        if(riga==='ore'&&nv.codice==='FS'&&!fest) continue; // FS solo nei festivi feriali
        if(riga==='ore'&&fest&&nv.ore!=null&&opz.rispettaFestivi){nv={codice:'FS',ore:null}}
        if(opz.nonSovrascrivere&&((riga==='ore'&&(c.ore!=null||c.codice))||(riga!=='ore'&&c[riga]))) continue;
        Object.assign(c,nv);
        if(riga==='cantiere'&&valore&&!c.committente){const prop=committenteProposto(valore);if(prop)c.committente=prop}
        for(const kk of Object.keys(c)) if(c[kk]===null||c[kk]==='') delete c[kk];
        if(Object.keys(c).length) mp.giorni[String(gg)]=c; else delete mp.giorni[String(gg)];
      }}
  },{senzaRender:opz.senzaRender});
  return true;
}
AZIONI['presenze-aiuto']=()=>informa('Presenze: tasti e regole',html`<div class="tasti-aiuto"><span class="kbd">← → ↑ ↓</span><span>muoversi fra le celle (il fine settimana si salta)</span><span class="kbd">8</span><span>digita per inserire; Invio conferma e scende, Tab conferma e va a destra</span><span class="kbd">⇧ + ← →</span><span>seleziona un intervallo di giorni: poi digita il valore e Invio per applicarlo a tutti</span><span class="kbd">Canc</span><span>svuota la cella o l'intervallo</span><span class="kbd">FE M I PE FS AS CI</span><span>codici di assenza (FS solo nei giorni di festività feriale)</span></div><div class="sezione-titolo">Regole dell'azienda</div><ul class="piccolo"><li>Nei giorni lavorati si scrive sempre 8, salvo schema orario personale.</li><li>Mai ore di sabato e domenica: le celle sono bloccate. Il lavoro eventuale nel fine settimana si conta come aggiustamento in euro nel riepilogo della persona, non in griglia.</li><li>FE = giorno feriale non lavorato. I giorni non segnati sul foglio restano vuoti: non si indovina.</li><li>Scegliendo il cantiere il committente si propone da solo, prendendo l'impresa affidataria del cantiere (LGC, non Lidl).</li><li>Importo = arrotondamento aziendale a multipli di 10 di (ore in griglia × tariffa + aggiustamenti + fisso): resto 0–3 per difetto, 4–9 per eccesso.</li></ul>`);
// ---- strumenti rapidi ----
AZIONI['presenze-strumenti']=async d=>{
  const {anno,mese}=daChiaveMese(d.k);const persone=personePresenze(anno,mese);
  const scelta=await dialogo({titolo:'Strumenti per '+fMeseAnno(anno,mese),corpo:html`<div class="scelta-lista">
    <label><input type="radio" name="st" value="riempi" checked><span><b>Riempi il mese</b><div class="desc">8 ore nei giorni lavorativi (o lo schema orario personale), FS nelle festività feriali, trasferte per chi ha solo quelle. Non tocca le celle già compilate.</div></span></label>
    <label><input type="radio" name="st" value="copiaPersona"><span><b>Copia da una persona all'altra</b><div class="desc">Ore, cantiere e committente di una persona su altre.</div></span></label>
  </div>`,pulsanti:[{testo:'Annulla',valore:null},{testo:'Avanti',classe:'primario',primario:true,fn:v=>v.querySelector('[name=st]:checked').value}]});
  if(!scelta) return;
  const opzPersone=persone.slice().sort((a,b)=>(a.sezionePresenze||'dipendenti')<(b.sezionePresenze||'dipendenti')?-1:1).map(p=>({v:p.id,t:(p.sezionePresenze==='soci'?'Soci · ':'Dipendenti · ')+nomePersona(p)}));
  if(scelta==='riempi'){
    const v=await dialogoModulo('Riempi il mese',[{nome:'persone',etichetta:'Persone',tipo:'chip',largo:true,opzioni:opzPersone},{nome:'cantiere',etichetta:'Cantiere (facoltativo)',lista:'lista-cantieri'},{nome:'committente',etichetta:'Committente (facoltativo)'},{nome:'sovrascrivi',tipo:'spunta',testo:'Sovrascrivi anche le celle già compilate'}],{persone:persone.filter(p=>p.attivo&&p.inLibroPresenze).map(p=>p.id)});
    if(!v||!v.persone.length) return;
    riempiMese(anno,mese,v.persone,{cantiere:v.cantiere,committente:v.committente,sovrascrivi:v.sovrascrivi});
  } else if(scelta==='copiaPersona'){
    const v=await dialogoModulo('Copia da una persona',[{nome:'da',etichetta:'Da',tipo:'select',obbligatorio:true,opzioni:opzPersone},{nome:'a',etichetta:'A',tipo:'chip',largo:true,obbligatorio:true,opzioni:opzPersone},{nome:'cosa',etichetta:'Cosa copiare',tipo:'chip',largo:true,opzioni:[{v:'ore',t:'Ore e codici'},{v:'cantiere',t:'Cantiere'},{v:'committente',t:'Committente'}]}],{cosa:['ore','cantiere','committente']});
    if(!v) return;
    esegui('Copiate presenze da '+nomePersona(persona(v.da)),s=>{const src=(assicuraMesePersona(s,anno,mese,v.da)).giorni;for(const pid of v.a){if(pid===v.da)continue;const mp=assicuraMesePersona(s,anno,mese,pid);for(const g of Object.keys(src)){const c=Object.assign({},mp.giorni[g]||{});if(v.cosa.includes('ore')){delete c.ore;delete c.codice;if(src[g].ore!=null)c.ore=src[g].ore;if(src[g].codice)c.codice=src[g].codice}if(v.cosa.includes('cantiere')&&src[g].cantiere)c.cantiere=src[g].cantiere;if(v.cosa.includes('committente')&&src[g].committente)c.committente=src[g].committente;if(Object.keys(c).length)mp.giorni[g]=c}}});
  }
};
function riempiMese(anno,mese,pids,opz){
  opz=opz||{};
  esegui('Riempito '+fMeseAnno(anno,mese)+' per '+pids.length+' persone',s=>{
    const fest=festivitaAnno(anno,s.impostazioni.festivitaLocali);const n=giorniNelMese(anno,mese);
    for(const pid of pids){const p=s.persone.find(x=>x.id===pid);const mp=assicuraMesePersona(s,anno,mese,pid);
      if(p.soloTrasferte){ const loc=localitaTrasferte(s); let prec='';let settimana=[]; for(let g=1;g<=n;g++){const iso=chiaveMese(anno,mese)+'-'+pad2(g);if(eFineSettimana(anno,mese,g)||fest.has(iso)){if(giornoSettimana(anno,mese,g)===1)settimana=[];continue}if(giornoSettimana(anno,mese,g)===1)settimana=[];const c=mp.giorni[String(g)]||{};if(c.trasferta&&!opz.sovrascrivi){prec=c.trasferta;settimana.push(c.trasferta);continue}let cand=loc.filter(l=>l!==prec&&!settimana.includes(l));if(!cand.length)cand=loc.filter(l=>l!==prec);if(!cand.length)cand=loc;const scelto=cand[(g*7+settimana.length*3)%cand.length];c.trasferta=scelto;mp.giorni[String(g)]=c;prec=scelto;settimana.push(scelto)} continue; }
      for(let g=1;g<=n;g++){ if(eFineSettimana(anno,mese,g)) continue; const iso=chiaveMese(anno,mese)+'-'+pad2(g); const c=mp.giorni[String(g)]||{};
        if(fest.has(iso)){ if(opz.sovrascrivi||(c.ore==null&&!c.codice)){delete c.ore;c.codice='FS'} }
        else { const ore=oreStandardGiorno(p,iso); if(opz.sovrascrivi||(c.ore==null&&!c.codice)){ if(ore>0){c.ore=ore;delete c.codice} } if(ore>0){ if(opz.cantiere&&(opz.sovrascrivi||!c.cantiere))c.cantiere=nomeCantiereCanonico(opz.cantiere); if(opz.committente&&(opz.sovrascrivi||!c.committente))c.committente=opz.committente; else if(c.cantiere&&!c.committente){const pr=committenteProposto(c.cantiere);if(pr)c.committente=pr} } }
        if(Object.keys(c).length) mp.giorni[String(g)]=c; }
    }
  });
}
// Località per le trasferte: dallo storico (mai Subbiano, che è la sede)
function localitaTrasferte(s){
  const cnt=new Map();
  for(const k of Object.keys(s.presenze))for(const pid of Object.keys(s.presenze[k].persone)){const gg=s.presenze[k].persone[pid].giorni||{};for(const g of Object.keys(gg)){const t=(gg[g].trasferta||'').trim().toLowerCase();if(t&&t!=='subbiano')cnt.set(t,(cnt.get(t)||0)+1)}}
  const loc=Array.from(cnt.entries()).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  return loc.length?loc:['arezzo','firenze','siena','bibbiena','poppi','capolona','rassina','anghiari','sansepolcro','prato','empoli','perugia'];
}
// ---- riepilogo persona: aggiustamenti, importo forzato, foglio ore, note ----
AZIONI['presenze-persona']=async d=>{
  const {anno,mese}=daChiaveMese(d.k);const p=persona(d.pid);const mp=(meseP(anno,mese)||{persone:{}}).persone[p.id]||{giorni:{},aggiustamenti:[]};
  const calc=calcolaMesePersona(mp,p);
  const agg=(mp.aggiustamenti||[]).map(a=>a.sigla+' '+(a.importo>=0?'+':'')+a.importo).join('\n');
  const escluse=mp.festivitaEscluse||[];
  const campi=[
    {nome:'aggiustamentiTesto',etichetta:'Aggiustamenti (una riga: sigla importo)',tipo:'textarea',segnaposto:'brc 50\nmt -20',aiuto:'Anche negativi. Contano solo gli importi. Per ore lavorate nel fine settimana (non inseribili in griglia), aggiungi qui l\'importo corrispondente.'},
    {nome:'importoManuale',etichetta:'Importo del mese',tipo:'euro',aiuto:'Parte dal calcolo automatico: scrivi il tuo importo e resta quello, anche se cambi le ore. Svuota il campo per tornare al calcolo.'},
    {nome:'note',etichetta:'Note',tipo:'textarea',largo:true,aiuto:'Compaiono nel libro presenze stampato, sotto il nome; se lasci vuoto non compare nulla.'},
  ];
  if(p.festivitaPagate&&calc.giorniFS.length) campi.splice(1,0,{nome:'festivitaPagateGiorni',etichetta:'Festività pagate questo mese',tipo:'chip',largo:true,opzioni:calc.giorniFS.map(g=>({v:g,t:'Giorno '+g})),aiuto:'Deselezionata: la festività non entra nell\'importo del mese.'});
  const v=await dialogoModulo(nomePersona(p)+' · '+fMeseAnno(anno,mese),campi,{aggiustamentiTesto:agg,importoManuale:calc.importo,note:mp.note||'',festivitaPagateGiorni:calc.giorniFS.filter(g=>!escluse.includes(+g))},{intro:html`<div class="griglia due mb"><div class="indicatore" style="cursor:default"><span class="etichetta">Ore in griglia</span><span class="valore md">${fOre(calc.oreGriglia)}</span></div><div class="indicatore" style="cursor:default"><span class="etichetta">Importo calcolato</span><span class="valore md">${fEuro(calc.importoCalcolato,0)}</span><span class="nota">${calc.tariffa?fOre(calc.oreGriglia)+' h × '+fNum(calc.tariffa,2)+' € = '+fEuro(calc.tariffa*calc.oreGriglia):''}${calc.oreFestivitaPagate?' + festività '+fOre(calc.oreFestivitaPagate)+' h = '+fEuro(calc.tariffa*calc.oreFestivitaPagate,0):''}${calc.fisso?' + fisso '+fEuro(calc.fisso,0):''}${calc.aggiustamenti?' + agg. '+fEuro(calc.aggiustamenti,0):''}</span></div></div>`});
  if(!v) return;
  const aggiustamenti=(v.aggiustamentiTesto||'').split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const m=/^(.*?)\s*([+-]?\s*[\d.,]+)\s*€?$/.exec(x);if(!m)return {sigla:x,importo:0};return {sigla:m[1].trim()||'agg',importo:leggiNumero(m[2].replace(/\s/g,''))||0}});
  const festivitaEscluse=p.festivitaPagate?calc.giorniFS.filter(g=>!(v.festivitaPagateGiorni||[]).includes(g)).map(Number):[];
  esegui('Riepilogo '+nomePersona(p)+' '+fMeseAnno(anno,mese),s=>{const x=assicuraMesePersona(s,anno,mese,p.id);x.aggiustamenti=aggiustamenti;if(v.importoManuale!==calc.importo){x.importoForzato=v.importoManuale!=null;x.importoManuale=v.importoManuale}x.note=v.note;x.festivitaEscluse=festivitaEscluse});
};
// ---- compilazione operaio per operaio (tutto il mese da tastiera) ----
AZIONI['presenze-compila']=d=>{const {anno,mese}=daChiaveMese(d.k);apriTrascrizione(anno,mese,d.pid)};
AZIONI['presenze-trascrizione']=async d=>{
  const {anno,mese}=daChiaveMese(d.k);const persone=personePresenze(anno,mese);
  if(!persone.length) return avviso('Nessuna persona da compilare in questo mese',{tipo:'attenzione'});
  const scelta=await dialogoModulo('Compila un operaio',[{nome:'pid',etichetta:'Operaio',tipo:'select',obbligatorio:true,opzioni:persone.map(p=>({v:p.id,t:nomePersona(p)}))}],{pid:ui.filtri.ultimaTrascrizione||persone[0].id},{ok:'Apri il mese',intro:html`<p class="piccolo secondario">Tutto il mese di una persona in un'unica tabella, da riempire con la tastiera senza mai staccare le mani.</p>`});
  if(!scelta) return;
  ui.filtri.ultimaTrascrizione=scelta.pid;
  apriTrascrizione(anno,mese,scelta.pid);
};
async function apriTrascrizione(anno,mese,pid){
  const p=persona(pid);const k=chiaveMese(anno,mese);
  const mp=clona(((meseP(anno,mese)||{persone:{}}).persone[pid])||{giorni:{},aggiustamenti:[]});
  const n=giorniNelMese(anno,mese);const fest=festivitaAnno(anno,stato.impostazioni.festivitaLocali);
  const righe=Array.from({length:n},(_,i)=>{const g=i+1;const iso=k+'-'+pad2(g);const gs=giornoSettimana(anno,mese,g);const c=mp.giorni[String(g)]||{};const v=valoreCella(c);return {g,gs,we:gs===0||gs===6,fest:fest.has(iso),ore:v==null?'':typeof v==='number'?fOre(v):v,cantiere:c.cantiere||'',committente:c.committente||'',trasferta:c.trasferta||'',incerto:(mp.incerti||[]).includes(g)}});
  const st=!!p.soloTrasferte;
  const corpo=html`<div class="riga mb-s ripeti"><span>Ripeti la riga <b data-rip-g>—</b> (la riga in cui ti trovi) fino al giorno</span><input type="number" min="1" max="${n}" data-rip-fino style="width:70px" placeholder="${n}"><button type="button" class="pulsante piccolo" data-rip>Compila uguale</button><span class="piccolo secondario">salta sabato e domenica, nelle festività scrive FS</span></div><label class="campo-nota"><span class="piccolo secondario">Note per il commercialista (compaiono in rosso nella scheda stampata; le note automatiche su assenze e festività pagate si aggiungono da sole)</span><textarea data-nota rows="2" style="width:100%">${mp.note||''}</textarea></label><div class="trascrizione"><div class="griglia-t"><table><thead><tr><th>G</th>${st?html`<th>Località trasferta</th>`:html`<th>Ore/cod.</th><th>Cantiere</th><th>Committente</th><th title="Da ricontrollare">?</th>`}</tr></thead><tbody>${righe.map(r=>html`<tr class="${r.we?'fine-settimana':''} ${r.fest?'festivo':''}" data-g="${r.g}"><td><b>${r.g}</b> <span class="piccolo">${NOMI_GIORNI_BREVI[r.gs]}</span></td>${r.we?html`<td colspan="${st?1:4}" class="piccolo secondario">fine settimana: non si compila</td>`:st?html`<td><input type="text" data-tr="trasferta" data-g="${r.g}" value="${r.trasferta}" style="width:100%"></td>`:html`<td><input type="text" data-tr="ore" data-g="${r.g}" value="${r.ore}" style="width:64px;text-align:center" placeholder="${r.fest?'FS':'8'}"></td><td><input type="text" data-tr="cantiere" data-g="${r.g}" value="${r.cantiere}"></td><td><input type="text" data-tr="committente" data-g="${r.g}" value="${r.committente}"></td><td><input type="checkbox" data-tr="incerto" data-g="${r.g}" ${r.incerto?'checked':''} aria-label="Da ricontrollare"></td>`}</tr>`)}</tbody></table></div></div>
  <div class="riga mt-s piccolo secondario"><span><span class="kbd">Invio</span> giù nella stessa colonna · <span class="kbd">Tab</span> a destra · <span class="kbd">⌘D</span> copia dalla riga sopra · <span class="kbd">⌘↓</span> riempi in giù fino a fine mese · <span class="kbd">?</span> segna da ricontrollare</span></div>`;
  const ris=await dialogo({titolo:'Compila · '+nomePersona(p)+' · '+fMeseAnno(anno,mese),enorme:true,corpo,senzaFocus:true,valoreEscape:null,pulsanti:[{testo:'Annulla',valore:null},{testo:'Applica',classe:'primario',primario:true,fn:v=>leggiTrascrizione(v)}],alMontaggio:v=>{
    const primo=v.querySelector('input[data-tr="ore"],input[data-tr="trasferta"]');if(primo)primo.focus();
    tutti('input[data-tr="trasferta"]',v).forEach(i=>attivaSuggerimenti(i,()=>valoriUsati('trasferta')));
    let rigaAtt=0;const campoRip=v.querySelector('[data-rip-g]');
    v.addEventListener('focusin',e=>{const t=e.target;if(t.dataset&&t.dataset.tr){rigaAtt=+t.dataset.g;campoRip.textContent=rigaAtt}});
    v.querySelector('[data-rip]').onclick=()=>{const fino=Math.min(n,+v.querySelector('[data-rip-fino]').value||0);if(!rigaAtt||fino<=rigaAtt){avviso('Clicca prima nella riga da ripetere e scrivi il giorno finale (dopo quella riga)',{tipo:'attenzione'});return}
      const val=(g,c)=>{const i=v.querySelector(`input[data-tr="${c}"][data-g="${g}"]`);return i?i.value:null};
      for(let g=rigaAtt+1;g<=fino;g++){const dest=(c,x)=>{const i=v.querySelector(`input[data-tr="${c}"][data-g="${g}"]`);if(i)i.value=x};if(!v.querySelector(`input[data-tr="ore"][data-g="${g}"],input[data-tr="trasferta"][data-g="${g}"]`))continue;
        if(st){dest('trasferta',val(rigaAtt,'trasferta'));continue}
        const fs=fest.has(k+'-'+pad2(g));const ore=val(rigaAtt,'ore');
        if(fs&&ore&&leggiNumero(ore)!==null){dest('ore','FS');dest('cantiere','');dest('committente','')}else{dest('ore',ore);dest('cantiere',val(rigaAtt,'cantiere'));dest('committente',val(rigaAtt,'committente'))}}
      avviso('Compilato dal giorno '+(rigaAtt+1)+' al '+fino+': controlla e premi Applica',{silenzioso:true})};
    tutti('input[data-tr="ore"]',v).forEach(i=>attivaSuggerimenti(i,()=>[{v:'8',t:'8 ore'},{v:'4',t:'4 ore'},...Object.entries(CODICI_ASSENZA).map(([c,x])=>({v:c,t:c+' — '+x.nome}))]));
    tutti('input[data-tr="cantiere"],input[data-tr="committente"]',v).forEach(i=>attivaSuggerimenti(i,()=>suggerimentiCantieri(i.dataset.tr)));
    v.addEventListener('keydown',e=>{
      const t=e.target;if(!t.dataset||!t.dataset.tr)return;const col=t.dataset.tr,g=+t.dataset.g;const kk=nomeTasto(e);
      const trovaInput=(gg,c)=>v.querySelector(`input[data-tr="${c}"][data-g="${gg}"]`);
      const prossimo=(dir)=>{let gg=g+dir;while(gg>=1&&gg<=n){const i=trovaInput(gg,col);if(i)return i;gg+=dir}return null};
      if(kk==='Enter'){e.preventDefault();const nx=prossimo(1);if(nx){nx.focus();nx.select()}}
      else if(kk==='ArrowDown'&&!(e.metaKey||e.ctrlKey)){if(t.tagName==='INPUT'&&t.type==='text'&&document.querySelector('.suggerimenti'))return;e.preventDefault();const nx=prossimo(1);if(nx){nx.focus();nx.select()}}
      else if(kk==='ArrowUp'){if(document.querySelector('.suggerimenti'))return;e.preventDefault();const nx=prossimo(-1);if(nx){nx.focus();nx.select()}}
      else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='d'){e.preventDefault();const pr=prossimo(-1);if(pr&&t.type==='text'){t.value=pr.value;t.dispatchEvent(new Event('change'))}}
      else if((e.metaKey||e.ctrlKey)&&kk==='ArrowDown'){e.preventDefault();let gg=g+1;while(gg<=n){const i=trovaInput(gg,col);if(i&&i.type==='text'&&!i.value)i.value=t.value;gg++}}
      else if(e.key==='?'&&col!=='incerto'){e.preventDefault();const cb=trovaInput(g,'incerto');if(cb)cb.checked=!cb.checked}
      else if(col==='cantiere'&&kk==='Tab'&&!e.shiftKey){const com=trovaInput(g,'committente');if(com&&!com.value&&t.value){const pr=committenteProposto(t.value);if(pr)com.value=pr}}
    });
    v.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.tr==='cantiere'&&t.value){const com=v.querySelector(`input[data-tr="committente"][data-g="${t.dataset.g}"]`);if(com&&!com.value){const pr=committenteProposto(t.value);if(pr)com.value=pr}}});
  }});
  if(!ris) return;
  const errori=[];
  esegui('Compilazione '+nomePersona(p)+' '+fMeseAnno(anno,mese),s=>{
    const x=assicuraMesePersona(s,anno,mese,pid);const vecchi=x.giorni;x.giorni={};x.incerti=[];if(ris.note!==undefined)x.note=ris.note;
    for(const r of ris.righe){const c={};const tv=st?r.trasferta:((vecchi[String(r.g)]||{}).trasferta);if(tv)c.trasferta=tv;if(r.ore){const cod=r.ore.toUpperCase();if(CODICI_ASSENZA[cod]){if(cod==='FS'&&!fest.has(k+'-'+pad2(r.g))){errori.push('giorno '+r.g+': FS non ammesso (non è festività)');}else c.codice=cod}else{const nn=leggiNumero(r.ore);if(nn===null||nn<0||nn>24)errori.push('giorno '+r.g+': valore «'+r.ore+'» non valido');else c.ore=nn}}
      if(r.cantiere)c.cantiere=nomeCantiereCanonico(r.cantiere);if(r.committente)c.committente=r.committente;else if(c.cantiere){const pr=committenteProposto(c.cantiere);if(pr)c.committente=pr}
      if(Object.keys(c).length)x.giorni[String(r.g)]=c;if(r.incerto)x.incerti.push(r.g)}
  });
  if(errori.length) informa('Alcuni valori non sono stati applicati',errori.join('\n'));
}
function leggiTrascrizione(v){
  const righe={};
  for(const i of tutti('input[data-tr]',v)){const g=+i.dataset.g;righe[g]=righe[g]||{g};righe[g][i.dataset.tr]=i.type==='checkbox'?i.checked:i.value.trim()}
  const nota=v.querySelector('[data-nota]');return {righe:Object.values(righe),note:nota?nota.value.trim():undefined};
}
// ---- uscite ----
AZIONI['presenze-uscite']=async d=>{
  const {anno,mese}=daChiaveMese(d.k);
  const scelta=await dialogo({titolo:'Esporta · '+fMeseAnno(anno,mese),corpo:html`<div class="scelta-lista">
    <label><input type="radio" name="u" value="stampa" checked><span><b>Stampa il libro presenze</b><div class="desc">A4 orizzontale, carta intestata su ogni pagina.</div></span></label>
    <label><input type="radio" name="u" value="xlsx"><span><b>Excel per il commercialista</b><div class="desc">Un foglio per mese dell'anno ${anno} più il foglio con la legenda dei codici, nel formato del libro presenze.</div></span></label>
    <label><input type="radio" name="u" value="csv"><span><b>CSV del mese</b></span></label>
    <label><input type="radio" name="u" value="riepilogo"><span><b>Riepilogo testuale del mese</b><div class="desc">Operaio, ore totali, giorni per tipo di assenza, importo: da incollare nella mail al commercialista.</div></span></label>
  </div>`,pulsanti:[{testo:'Annulla',valore:null},{testo:'Avanti',classe:'primario',primario:true,fn:v=>v.querySelector('[name=u]:checked').value}]});
  if(!scelta) return;
  if(scelta==='stampa') return stampaLibroPresenze(anno,mese);
  if(scelta==='xlsx') return esportaPresenzeXlsx(anno);
  if(scelta==='csv') return esportaPresenzeCsv(anno,mese);
  if(scelta==='riepilogo') return mostraTestoEsportato('Riepilogo presenze '+fMeseAnno(anno,mese),riepilogoPresenzeMarkdown(anno,mese),nomeFileData('Riepilogo presenze '+capitalizza(nomeMese(mese))+' '+anno,'md'));
};
