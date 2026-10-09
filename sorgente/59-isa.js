// ---------------------------------------------------------------------
// ISA (indici sintetici di affidabilità): i dati del quadro C e del quadro A, dalle fatture emesse
// nell'anno d'imposta. Prima si faceva a mano in Excel: per ogni fattura specializzazione, comune,
// provincia, regione e ambito, poi una tabella pivot. Qui lavorazione e ambito vengono dal cantiere
// (o si scelgono per la fattura), il luogo dall'indirizzo del cantiere; si classificano solo le
// fatture senza cantiere. Le percentuali sono sui ricavi (imponibile; le note di credito sottraggono).
// stato.isa[anno] = {fatture:{[movimentoId]:{spec:[chiavi],comune,provincia,ambito}}, punteggio, fileId}
// ---------------------------------------------------------------------
const ISA_SPECIALIZZAZIONI=[['ceramica','Ceramica'],['cotto','Cotto'],['graniglia','Graniglia'],['moquette','Moquettes e altri tessuti'],['linoleum','Linoleum, gomma, plastica e PVC'],['parquet','Parquet (con levigatura) e laminati'],['marmo','Marmo e pietra (con levigatura)'],['legno','Legno diverso dal parquet, sughero, pelli e cuoio'],['levigatura','Sola levigatura pavimenti'],['resina','Resina e altri materiali compositi'],['sottofondi','Costruzione di sottofondi per pavimenti'],['impermeabilizzazione','Impermeabilizzazione e coibentazione'],['intonaco','Intonaco'],['cartongesso','Posa in opera del cartongesso'],['controsoffitti','Controsoffittatura'],['muratura_int','Lavori in muratura interni'],['muratura_est','Lavori in muratura esterni'],['altro','Altri lavori di completamento e finitura']];
const ISA_NOME=Object.fromEntries(ISA_SPECIALIZZAZIONI);
const ISA_AMBITI={nuova:'Nuove costruzioni',recupero:'Riqualificazione e recupero'};
// lavorazioni del cantiere (quelle del POS) → specializzazione ISA
const ISA_DA_LAVORAZIONE={1:'sottofondi',2:'ceramica',3:'parquet',4:'altro',5:'ceramica',6:'ceramica',7:'impermeabilizzazione'};
const REGIONE_PROVINCIA=(()=>{const t={'Piemonte':'TO VC NO CN AT AL BI VB','Valle d\'Aosta':'AO','Lombardia':'VA CO SO MI BG BS PV CR MN LC LO MB','Trentino-Alto Adige':'BZ TN','Veneto':'VR VI BL TV VE PD RO','Friuli-Venezia Giulia':'UD GO TS PN','Liguria':'IM SV GE SP','Emilia-Romagna':'PC PR RE MO BO FE RA FC RN','Toscana':'MS LU PT FI LI PI AR SI GR PO','Umbria':'PG TR','Marche':'PU AN MC AP FM','Lazio':'VT RI RM LT FR','Abruzzo':'AQ TE PE CH','Molise':'CB IS','Campania':'CE BN NA AV SA','Puglia':'FG BA TA BR LE BT','Basilicata':'PZ MT','Calabria':'CS CZ RC KR VV','Sicilia':'TP PA ME AG CL EN CT RG SR','Sardegna':'SS NU CA OR SU'};const m={};for(const [r,ss] of Object.entries(t))for(const s of ss.split(' '))m[s]=r;return m})();
function isaAnno(anno){return (stato.isa||{})[anno]||{fatture:{}}}
// classificazione di una fattura: prima quello scelto a mano, poi il cantiere
function classeFattura(m,anno){
  const scelto=(isaAnno(anno).fatture||{})[m.id]||{};
  const quote=quoteMovimentoPerCantiere(m);const c=quote.length?cantiere(quote[0].cantiereId):null;
  const specC=c?((c.isa&&c.isa.spec&&c.isa.spec.length)?c.isa.spec:unici((c.lavorazioni||[]).map(id=>ISA_DA_LAVORAZIONE[id]).filter(Boolean))):[];
  const ind=(c&&c.indirizzo)||{};
  const k={spec:scelto.spec&&scelto.spec.length?scelto.spec:specC,comune:scelto.comune||ind.comune||'',provincia:(scelto.provincia||ind.provincia||'').toUpperCase(),ambito:scelto.ambito||(c&&c.isa&&c.isa.ambito)||'',cantiere:c};
  k.regione=REGIONE_PROVINCIA[k.provincia]||'';
  k.completa=!!(k.spec.length&&k.comune&&k.provincia&&k.ambito);
  return k;
}
function fattureIsa(anno){return stato.movimenti.filter(m=>(m.tipo==='entrata'||m.tipo==='nota_credito')&&(m.data||'').startsWith(String(anno))).sort((a,b)=>(a.data||'')<(b.data||'')?-1:1)}
// percentuali intere che sommano 100 (resti più grandi)
function percentuali(mappa){
  const tot=somma(Array.from(mappa.values()));if(!tot)return [];
  const r=Array.from(mappa.entries()).map(([k,v])=>({k,v,p:Math.floor(v/tot*100),resto:v/tot*100%1}));
  let manca=100-somma(r,x=>x.p);r.slice().sort((a,b)=>b.resto-a.resto).forEach(x=>{if(manca>0){x.p++;manca--}});
  return r.filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
}
function calcoloIsa(anno){
  const ff=fattureIsa(anno).map(m=>({m,k:classeFattura(m,anno),ricavi:importoConSegno(m)}));
  const spec=new Map(),ambito=new Map(),comuni=new Map(),province=new Map(),regioni=new Map();
  const agg=(mp,k,v)=>mp.set(k,(mp.get(k)||0)+v);
  for(const f of ff.filter(x=>x.k.completa)){for(const s of f.k.spec)agg(spec,s,f.ricavi/f.k.spec.length);agg(ambito,f.k.ambito,f.ricavi);agg(comuni,f.k.comune+'|'+f.k.provincia,f.ricavi);agg(province,f.k.provincia,f.ricavi);agg(regioni,f.k.regione||'?',f.ricavi)}
  const regioneTop=Array.from(regioni.entries()).sort((a,b)=>b[1]-a[1])[0];
  // il comune con più ricavi dentro la regione principale (C34) e la sua provincia (C35)
  const comuneTop=Array.from(comuni.entries()).filter(([k])=>REGIONE_PROVINCIA[k.split('|')[1]]===(regioneTop&&regioneTop[0])).sort((a,b)=>b[1]-a[1])[0];
  const [cTop,pTop]=comuneTop?comuneTop[0].split('|'):['',''];
  const loc=new Map([['C36',0],['C37',0],['C38',0],['C39',0]]);
  for(const f of ff.filter(x=>x.k.completa)){const r=f.k.comune===cTop&&f.k.provincia===pTop?'C36':f.k.provincia===pTop?'C37':f.k.regione===(regioneTop&&regioneTop[0])?'C38':'C39';agg(loc,r,f.ricavi)}
  return {ff,spec:percentuali(spec),ambito:percentuali(ambito),loc:percentuali(loc),regione:regioneTop?regioneTop[0]:'',comune:cTop,provincia:pTop,ricavi:somma(ff,f=>f.ricavi),daFare:ff.filter(f=>!f.k.completa)};
}
// quadro A: dalle presenze (stima: giorni lavorati e assenze retribuite dei dipendenti)
function personaleIsa(anno){
  const dip=new Set(),soci=new Set();let giornate=0;
  for(const k of Object.keys(stato.presenze).filter(k=>k.startsWith(anno+'-')))for(const [pid,mp] of Object.entries(stato.presenze[k].persone||{})){const p=persona(pid);if(!p)continue;const socio=(p.sezionePresenze||'dipendenti')==='soci';let gg=0;for(const c of Object.values(mp.giorni||{})){const v=valoreCella(c);if((typeof v==='number'&&v>0)||['FE','FS','PE','M','I'].includes(v))gg++}if(!gg)continue;(socio?soci:dip).add(pid);if(!socio)giornate+=gg}
  return {dipendenti:dip.size,soci:soci.size,giornate};
}
function contenutoIsa(r){
  const oggiD=new Date();const predef=oggiD.getFullYear()-1;
  const anni=unici([predef,oggiD.getFullYear(),...stato.movimenti.filter(m=>m.tipo==='entrata').map(m=>+(m.data||'').slice(0,4)).filter(Boolean)]).sort((a,b)=>b-a);
  const anno=+(ui.filtri.isaAnno||predef);
  const C=calcoloIsa(anno);const P=personaleIsa(anno);const I=isaAnno(anno);
  const barre=(xs,nome,colore)=>xs.length?xs.map(x=>html`<div class="riga-isa"><span>${nome(x.k)}</span><span class="b"><i style="width:${x.p}%;${colore?'background:'+colore:''}"></i></span><b>${x.p}%</b></div>`):html`<p class="piccolo silenzioso">Compare appena ci sono fatture classificate.</p>`;
  const punteggi=Object.entries(stato.isa||{}).filter(([a,v])=>v&&v.punteggio!=null).map(([a,v])=>({a:+a,p:+v.punteggio})).sort((x,y)=>x.a-y.a);
  return html`<div class="strumenti-tabella"><select data-cambio="isa-anno" aria-label="Anno d'imposta">${anni.map(a=>html`<option value="${a}" ${a===anno?'selected':''}>Redditi ${a} · ISA ${a+1}</option>`)}</select><span class="conteggio">${plurale(C.ff.length,'fattura','fatture')} · ricavi ${fEuro(C.ricavi,0)}</span><button class="pulsante" data-azione="isa-excel" data-anno="${anno}">${icona('scarica','piccola')}Excel per il commercialista</button><button class="pulsante" data-azione="isa-dichiarazione" data-anno="${anno}">${icona('allega','piccola')}${I.fileId?'Dichiarazione ISA':'Allega la dichiarazione ISA'}</button></div>
  ${C.ff.length?(C.daFare.length?html`<div class="avviso-inline attenzione">${icona('attenzione')}<div class="corpo"><b>${plurale(C.daFare.length,'fattura da classificare','fatture da classificare')}</b> (${fEuro(somma(C.daFare,f=>f.ricavi),0)}): di solito sono senza cantiere, o il cantiere non ha indirizzo, lavorazioni o ambito. Cliccale per sistemarle: le percentuali si aggiornano.</div></div>`:html`<div class="avviso-inline info">${icona('ok')}<div class="corpo">Tutte le fatture del ${anno} sono classificate: lavorazione e ambito dal cantiere, comune e provincia dal suo indirizzo.</div></div>`):''}
  ${C.ff.length?'':vuoto({icona:'budget',titolo:'Nessuna fattura emessa nel '+anno,testo:'L’ISA si calcola dalle fatture emesse registrate in Budget (anche importate dagli XML).'})}
  ${C.ff.length?html`<div class="bento">
    <div class="guscio c-7"><div class="scheda"><div class="intesta"><h2>Specializzazione</h2><span class="piccolo silenzioso">quadro C · % sui ricavi</span></div>${barre(C.spec,k=>ISA_NOME[k]||k)}</div></div>
    <div class="guscio c-5"><div class="scheda"><div class="intesta"><h2>Ambito</h2><span class="piccolo silenzioso">C44 · C45</span></div>${barre(C.ambito,k=>ISA_AMBITI[k]||k,'var(--k2)')}
      <div class="intesta mt"><h2>Personale</h2><span class="piccolo silenzioso">quadro A · dalle presenze</span></div>
      <div class="riga-isa n"><span>Dipendenti con presenze</span><b>${P.dipendenti}</b></div><div class="riga-isa n"><span>Giornate retribuite (stima)</span><b>${fNum(P.giornate,0)}</b></div><div class="riga-isa n"><span>Soci</span><b>${P.soci}</b></div></div></div>
    <div class="guscio c-7"><div class="scheda"><div class="intesta"><h2>Dove hai lavorato</h2><span class="piccolo silenzioso">quadro C · localizzazione</span></div>
      <dl class="dati-doc mb"><dt>Regione (C33)</dt><dd>${C.regione||'—'}</dd><dt>Comune (C34)</dt><dd>${C.comune?C.comune+' ('+C.provincia+')':'—'}</dd></dl>
      ${barre(C.loc,k=>({C36:'Nel comune (C36)',C37:'Resto della provincia (C37)',C38:'Resto della regione (C38)',C39:'Fuori regione (C39)'})[k],'var(--k3)')}</div></div>
    <div class="guscio c-5"><div class="scheda"><div class="intesta"><h2>Punteggio ISA</h2><span class="piccolo silenzioso">dalle dichiarazioni allegate</span></div>
      ${punteggi.length?html`<div class="punteggi">${punteggi.map(x=>html`<div><b>${fNum(x.p,1)}</b><i class="${x.p>=8?'bene':''}" style="height:${Math.max(6,(x.p-1)/9*100)}%"></i><small>${x.a+1}</small></div>`)}</div>`:html`<p class="piccolo silenzioso">Allega la dichiarazione ISA di ogni anno e scrivi il punteggio: qui vedi l’andamento.</p>`}
      <p class="minuscolo silenzioso mt-s">Da 8: niente visto di conformità per compensare fino a 20.000 €. Da 9: esclusione dalle società non operative.</p></div></div>
  </div>
  <div class="sezione-titolo">Fatture del ${anno}</div>
  ${tabella({id:'isa-fatture',righe:C.ff,onRiga:f=>classificaFattura(f.m.id,anno),classeRiga:f=>f.k.completa?'':'riga-scadenza',colonne:[
    {chiave:'n',titolo:'Fattura',principale:true,valore:f=>f.m.data,formatta:f=>html`<b>${f.m.numero||'—'}</b><br><span class="piccolo silenzioso">${fData(f.m.data)}</span>`},
    {chiave:'c',titolo:'Cliente',formatta:f=>html`${nomeCliente(f.m.clienteId)||f.m.controparte||''}${f.k.cantiere?html`<br><span class="cantiere-tag ${coloreCantiere(f.k.cantiere)}">${f.k.cantiere.nome}</span>`:''}`},
    {chiave:'d',titolo:'Dove',formatta:f=>f.k.comune?html`${f.k.comune} <span class="silenzioso">(${f.k.provincia})</span>`:html`<span class="pillola scadenza">da scegliere</span>`},
    {chiave:'l',titolo:'Lavorazione',formatta:f=>f.k.spec.length?f.k.spec.map(s=>ISA_NOME[s].split(' (')[0]).join(', '):html`<span class="pillola scadenza">da scegliere</span>`},
    {chiave:'a',titolo:'Ambito',formatta:f=>f.k.ambito?ISA_AMBITI[f.k.ambito]:html`<span class="pillola scadenza">da scegliere</span>`},
    {chiave:'r',titolo:'Ricavi',num:true,valore:f=>f.ricavi,formatta:f=>fEuro(f.ricavi)}]})}`:''}`;
}
AZIONI['isa-anno']=(d,t)=>{ui.filtri.isaAnno=t.value;render()};
async function classificaFattura(mid,anno){
  const m=perId('movimenti',mid);const k=classeFattura(m,anno);const c=k.cantiere;
  const v=await dialogoModulo('Fattura '+(m.numero||'')+' · '+fEuroInt(importoConSegno(m)),[
    {nome:'spec',etichetta:'Lavorazione (si può sceglierne più di una: i ricavi si dividono in parti uguali)',tipo:'chip',largo:true,opzioni:ISA_SPECIALIZZAZIONI.map(([v,t])=>({v,t}))},
    {nome:'comune',etichetta:'Comune dove è stato fatto il lavoro',obbligatorio:true},{nome:'provincia',etichetta:'Provincia (sigla)',obbligatorio:true},
    {nome:'ambito',etichetta:'Ambito',tipo:'select',obbligatorio:true,opzioni:Object.entries(ISA_AMBITI).map(([v,t])=>({v,t}))},
    ...(c?[{nome:'perCantiere',tipo:'spunta',testo:'Usa lavorazione e ambito per tutte le fatture del cantiere «'+c.nome+'»'}]:[])],
    {spec:k.spec,comune:k.comune,provincia:k.provincia,ambito:k.ambito,perCantiere:!!c},{intro:html`<p class="piccolo secondario">${nomeCliente(m.clienteId)||m.controparte||''} · ${fData(m.data)}${c?' · cantiere '+c.nome:' · nessun cantiere collegato'}</p>`});
  if(!v) return;
  const prov=String(v.provincia||'').trim().toUpperCase().slice(0,2);
  esegui('ISA: classificata la fattura '+(m.numero||''),s=>{
    s.isa=s.isa||{};const a=s.isa[anno]=s.isa[anno]||{fatture:{}};a.fatture=a.fatture||{};
    if(v.perCantiere&&c){const cc=s.cantieri.find(x=>x.id===c.id);cc.isa={spec:v.spec,ambito:v.ambito};a.fatture[mid]={comune:v.comune,provincia:prov}}
    else a.fatture[mid]={spec:v.spec,comune:v.comune,provincia:prov,ambito:v.ambito};
  });
}
// stesse colonne del foglio che si usava a mano, più i totali per il quadro C
AZIONI['isa-excel']=async d=>{
  const anno=+d.anno;const C=calcoloIsa(anno);
  const righe=[['Nr. Fattura','Data','Specializzazione','Regione','Comune','Provincia','Ambito attività','Ricavi']];
  for(const f of C.ff){const parti=f.k.spec.length?f.k.spec:[''];for(const s of parti)righe.push([f.m.numero||'',fData(f.m.data),ISA_NOME[s]||'',f.k.regione,f.k.comune,f.k.provincia,ISA_AMBITI[f.k.ambito]||'',Math.round(f.ricavi/parti.length*100)/100])}
  const ries=[['Quadro C — specializzazione','%'],...C.spec.map(x=>[ISA_NOME[x.k],x.p]),[],['Ambito','%'],...C.ambito.map(x=>[ISA_AMBITI[x.k],x.p]),[],['Localizzazione',''],['Regione (C33)',C.regione],['Comune (C34)',C.comune],['Provincia (C35)',C.provincia],...C.loc.map(x=>[({C36:'Nel comune (C36)',C37:'Resto della provincia (C37)',C38:'Resto della regione (C38)',C39:'Fuori regione (C39)'})[x.k],x.p]),[],['Quadro A — dalle presenze',''],...Object.entries(personaleIsa(anno)).map(([k,v])=>[{dipendenti:'Dipendenti con presenze',soci:'Soci',giornate:'Giornate retribuite (stima)'}[k],v])];
  if(C.daFare.length)ries.push([],['Fatture non classificate',C.daFare.length]);
  const blob=await creaXlsx([{nome:String(anno),righe,larghezze:{A:12,B:12,C:34,D:14,E:24,F:10,G:28,H:12}},{nome:'Riepilogo '+anno,righe:ries,larghezze:{A:40,B:14}}]);
  await condividiOScarica(blob,nomeFileData('Calcolo ISA '+anno,'xlsx'),{testo:'Calcolo ISA, redditi '+anno});
};
AZIONI['isa-dichiarazione']=async d=>{
  const anno=+d.anno;const I=isaAnno(anno);
  const v=await dialogoModulo('Dichiarazione ISA · redditi '+anno,[{nome:'punteggio',etichetta:'Punteggio di affidabilità',tipo:'numero',decimali:2,aiuto:'Lo trovi nell’ultima pagina, «Sintesi adeguamento»'}],{punteggio:I.punteggio},{ok:I.fileId?'Salva':'Scegli il PDF e salva',intro:I.fileId?html`<p><button class="pulsante piccolo" data-azione="file-apri" data-id="${I.fileId}">${icona('pdf','piccola')}Apri la dichiarazione allegata</button></p>`:html`<p class="piccolo secondario">Il PDF resta nell’archivio, con il punteggio dell’anno.</p>`});
  if(!v) return;
  let fileId=I.fileId;
  if(!fileId){const fs=await scegliFile({multipli:false,accetta:'.pdf'});if(fs.length){const r=await acquisisciFile(fs[0],{});fileId=r.rec.id}}
  esegui('ISA '+anno,s=>{s.isa=s.isa||{};const a=s.isa[anno]=s.isa[anno]||{fatture:{}};a.punteggio=v.punteggio;if(fileId)a.fileId=fileId});
};

VISTE.fineanno=function(r){
  const t=r.id||'isa';
  return html`<div class="testata"><div><div class="occhiello">Amministrazione · per il commercialista</div><h1>Fine anno</h1><p class="sotto">Quello che serve una volta l’anno: i dati ISA dalle fatture e le rimanenze al 31 dicembre.</p></div></div>
  ${linguetteRotta('fineanno',[{id:'isa',testo:'ISA'},{id:'rimanenze',testo:'Rimanenze'}],t)}
  ${t==='rimanenze'?contenutoRimanenze(r):contenutoIsa(r)}`;
};
