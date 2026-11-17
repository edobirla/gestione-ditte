// ---------------------------------------------------------------------
// MODULI DEL COMMITTENTE: il file Word (.docx) che manda il committente, da compilare senza averlo
// fra i modelli. Si apre già impaginato sulla carta intestata dell'azienda; i puntini e le righe da
// riempire diventano campi: quelli che si capiscono dal testo vicino («nato a …», «P.IVA …», «Luogo e
// data …») si riempiono da soli con i dati dell'azienda, del legale rappresentante e del cantiere,
// gli altri si scelgono da un elenco o si scrivono. Anche il resto del testo si corregge lì, sul foglio
// come verrà stampato (niente graffe né segnaposto). Poi anteprima, PDF e stampa come gli altri documenti.
// stato.moduli = [{id, titolo, nomeFile, fileId, cantiereId, html, creato, modificato}]
// ---------------------------------------------------------------------
const RE_PUNTINI=/(?:\.\s?){5,}|…(?:\s?…)+|…{2,}|_{4,}|-{6,}/g;

// ---- dal .docx all'HTML del foglio ----
async function docxInHtml(file){
  const zip=await leggiZip(file);const voce=zip.voci.find(v=>v.nome==='word/document.xml');
  if(!voce)throw new Error('non è un file Word .docx (i vecchi .doc vanno salvati come .docx da Word)');
  const xml=new TextDecoder().decode(await zip.estrai(voce));
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  const figli=(el,nome)=>Array.from(el.children).filter(c=>c.localName===nome);
  const uno=(el,perc)=>{let x=el;for(const n of perc.split('/')){x=x&&figli(x,n)[0];if(!x)return null}return x};
  const att=(el,n)=>el&&(el.getAttribute('w:'+n)||el.getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main',n));
  const vero=el=>!!el&&!['0','false','none'].includes(att(el,'val')||'');
  const corsa=r=>{const rp=uno(r,'rPr');let s='';
    for(const c of r.children){const n=c.localName;
      if(n==='t')s+=h(c.textContent);else if(n==='tab')s+='<span class="tab-mod"> </span>';else if(n==='br'||n==='cr')s+=att(c,'type')==='page'?'':'<br>';
      else if(n==='sym'){const ch=parseInt(att(c,'char')||'0',16);s+=[0xF0A8,0xF06F,0xF071,0xF0FE,0xF078,0xF0FD].includes(ch)?(ch===0xF0FE||ch===0xF078||ch===0xF0FD?'☒':'☐'):''}
      else if(n==='noBreakHyphen')s+='‑'}
    if(!s)return '';
    if(rp){if(vero(uno(rp,'b')))s='<b>'+s+'</b>';if(vero(uno(rp,'i')))s='<i>'+s+'</i>';const u=uno(rp,'u');if(u&&att(u,'val')!=='none')s='<u>'+s+'</u>';if(vero(uno(rp,'caps')))s='<span style="text-transform:uppercase">'+s+'</span>'}
    return s};
  // dentro un paragrafo: corse, collegamenti, campi, caselle dei moduli di Word
  const inline=el=>{let s='';for(const c of el.children){const n=c.localName;
    if(n==='r')s+=corsa(c);else if(['hyperlink','ins','smartTag','fldSimple','customXml','sdtContent','sdt'].includes(n))s+=inline(n==='sdt'?(uno(c,'sdtContent')||c):c);
    else if(n==='checkBox'){s+=vero(uno(c,'default'))?'☒':'☐'}}
    return s};
  const paragrafo=p=>{const pp=uno(p,'pPr');const jc=pp&&uno(pp,'jc');const al=jc?att(jc,'val'):'';const stile=pp&&uno(pp,'pStyle')?att(uno(pp,'pStyle'),'val')||'':'';
    let s=inline(p);const elenco=pp&&uno(pp,'numPr');
    // le caselle dei moduli (w14:checkbox) stanno in sdt dentro il paragrafo
    const cls=[al==='center'?'centro':al==='right'||al==='end'?'destra':al==='both'||al==='distribute'?'giust':''];
    if(/^(heading|titolo|title)/i.test(stile))return `<h3 class="${cls.join(' ')}">${s||'&nbsp;'}</h3>`;
    if(elenco)return `<p class="voce-mod ${cls.join(' ')}">• ${s}</p>`;
    return `<p class="${cls.join(' ')}">${s||'<br>'}</p>`};
  const tabella=t=>{const righe=figli(t,'tr').map(tr=>{const celle=figli(tr,'tc').map(tc=>{const pr=uno(tc,'tcPr');const vm=pr&&uno(pr,'vMerge');if(vm&&att(vm,'val')!=='restart')return null;const span=pr&&uno(pr,'gridSpan')?+att(uno(pr,'gridSpan'),'val')||1:1;return `<td${span>1?` colspan="${span}"`:''}>${blocchiDi(tc)}</td>`}).filter(Boolean);return `<tr>${celle.join('')}</tr>`});return `<table class="tab-mod"><tbody>${righe.join('')}</tbody></table>`};
  const blocchiDi=el=>{let s='';for(const c of el.children){const n=c.localName;if(n==='p')s+=paragrafo(c);else if(n==='tbl')s+=tabella(c);else if(n==='sdt')s+=blocchiDi(uno(c,'sdtContent')||c);else if(n==='customXml')s+=blocchiDi(c)}return s};
  const body=doc.getElementsByTagNameNS('*','body')[0];if(!body)throw new Error('documento Word vuoto');
  // le righe vuote in fondo (spesso tante) non servono
  return blocchiDi(body).replace(/(?:<p class="\s*"><br><\/p>)+$/,'');
}

// ---- i campi: dai puntini a <span class="campo-mod"> ----
function segnaCampi(htmlStr){
  let n=0;
  // solo nel testo, mai dentro i tag
  return htmlStr.replace(/>([^<]+)</g,(m,testo)=>'>'+testo.replace(RE_PUNTINI,x=>`<span class="campo-mod" data-campo="${n++}" data-vuoto="${h(x)}">${x}</span>`)+'<')
    .replace(/[☐☒]/g,x=>`<span class="casella-mod" data-casella>${x}</span>`);
}
// i dati che si possono mettere in un campo, con il nome che l'utente riconosce
function datiModulo(c){
  const ctx=contestoDichiarazione(c||null,{});const a=stato.azienda;const leg=legaleRappresentante();
  const val=k=>{const t=(ctx(k)||{}).testo;return t&&!/\[DA COMPILARE/.test(t)?t:''};
  const voci=[
    ['Ragione sociale','azienda.ragioneSociale'],['Partita IVA','azienda.piva'],['Codice fiscale dell’impresa','azienda.cf'],['Sede (indirizzo completo)','azienda.sede'],
    ['Comune della sede',null,a.indirizzo.comune],['Via della sede',null,a.indirizzo.via],['CAP della sede',null,a.indirizzo.cap],['Provincia della sede',null,a.indirizzo.provincia],
    ['PEC','azienda.pec'],['Email','azienda.email'],['Telefono','azienda.telefono'],['REA','azienda.rea'],['Codice INAIL','azienda.inail'],['Matricola INPS','azienda.inps'],['Cassa Edile','azienda.cassaEdile'],['CCNL applicato','azienda.ccnl'],
    ['Legale rappresentante','legale.nome'],['Luogo di nascita del legale rappresentante','legale.natoA'],['Data di nascita del legale rappresentante','legale.natoIl'],['Residenza del legale rappresentante','legale.residenza'],['Codice fiscale del legale rappresentante','legale.cf'],
    ['In qualità di',null,'Legale Rappresentante'],
    ['Cantiere','cantiere.nome'],['Indirizzo del cantiere','cantiere.indirizzo'],['Comune del cantiere','cantiere.comune'],['Lavorazioni del cantiere','cantiere.lavorazioni'],['Committente','committente.nome'],['Impresa affidataria','affidataria.nome'],['CSE','cse.nome'],
    ['RSPP','rspp.nome'],['RLS','rls.nome'],['Medico competente','medico.nome'],['Preposto','preposto.nome'],['Organico medio','organico.medio'],
    ['Data di oggi',null,fData(oggi())],['Luogo e data',null,[a.indirizzo.comune,fData(oggi())].filter(Boolean).join(', ')]
  ];
  return voci.map(([et,k,v])=>({etichetta:et,chiave:k||et,valore:k?val(k):(v||'')})).filter(x=>x.valore);
}
// cosa va in un campo, dal testo che lo precede nel paragrafo («nato a …» → luogo di nascita)
const REGOLE_CAMPI=[
  [/(?:luogo\s+e\s+data|luogo,?\s+data)\s*[:,]?\s*$/i,'Luogo e data'],
  [/(?:\bl[iì]|\badd[iì])\s*[:,]?\s*$/i,'Data di oggi'],
  [/\bnat[oa]\s+a\s*$/i,'Luogo di nascita del legale rappresentante'],
  [/\bnat[oa]\s+a\s+.{0,60}?\b(?:il|in\s+data)\s*$/i,'Data di nascita del legale rappresentante'],
  [/\b(?:residente|domiciliat[oa])\s+(?:a|in|nel\s+comune\s+di)\s*$/i,'Residenza del legale rappresentante'],
  [/(?:sottoscritt[oa]|il\/la\s+sottoscritt[oa]|nome\s+e\s+cognome|cognome\s+e\s+nome|dichiarante|\bsig\.?(?:ra)?)\s*[:,]?\s*$/i,'Legale rappresentante'],
  [/(?:in|nella\s+sua|nella)\s+(?:sua\s+)?qualit[aà]\s+di\s*$/i,'In qualità di'],
  [/(?:p\.?\s?iva|partita\s+iva)\s*(?:n\.?|n°|nr\.?)?\s*[:.]?\s*$/i,'Partita IVA'],
  [/(?:codice\s+fiscale|c\.\s?f\.?|\bcf)\s*(?:n\.?|n°)?\s*[:.]?\s*$/i,'CF'],
  [/(?:dell['’]\s*impresa|della\s+ditta|della\s+societ[aà]|dell['’]\s*operatore\s+economico|ragione\s+sociale|denominazione|\bimpresa|\bditta|\bsociet[aà])\s*[:,]?\s*$/i,'Ragione sociale'],
  [/con\s+sede\s+(?:legale\s+)?(?:in|a)\s*$/i,'Comune della sede'],
  [/(?:\bvia|\bviale|\bpiazza|indirizzo)\s*[:,]?\s*$/i,'Via della sede'],
  [/(?:\bcap|c\.a\.p\.)\s*[:.]?\s*$/i,'CAP della sede'],
  [/(?:\bprov\.?|provincia)\s*(?:di)?\s*[:.(]?\s*$/i,'Provincia della sede'],
  [/(?:\bpec|posta\s+elettronica\s+certificata)\s*[:.]?\s*$/i,'PEC'],
  [/(?:e-?mail)\s*[:.]?\s*$/i,'Email'],
  [/(?:\btel\.?|telefono|cell\.?)\s*[:.]?\s*$/i,'Telefono'],
  [/\binail\b.{0,25}$/i,'Codice INAIL'],[/\binps\b.{0,25}$/i,'Matricola INPS'],[/cassa\s+edile.{0,25}$/i,'Cassa Edile'],[/\bccnl\b.{0,40}$/i,'CCNL applicato'],[/\b(?:rea|r\.e\.a\.)\s*(?:n\.?)?\s*[:.]?\s*$/i,'REA'],
  [/(?:\bcantiere|lavori\s+di|appalto\s+(?:dei\s+lavori\s+)?di|opera)\s*[:,]?\s*$/i,'Cantiere'],
  [/(?:sit[oa]\s+in|ubicat[oa]\s+in)\s*$/i,'Indirizzo del cantiere'],
  [/committente\s*[:,]?\s*$/i,'Committente'],
  [/\bdata\s*[:.]?\s*$/i,'Data di oggi'],
];
const RE_CAMPO_FIRMA=/(?:\bfirma|timbro\s+e\s+firma|il\s+dichiarante|il\s+legale\s+rappresentante|in\s+fede)\s*[:.]?\s*(?:\(.*\))?\s*$/i;
// «Rossi Marioin qualità»: se il testo intorno è attaccato ai puntini, uno spazio
function spaziaCampo(sp){const n=sp.nextSibling,p=sp.previousSibling;if(n&&n.nodeType===3&&/^[A-Za-zÀ-ÿ0-9]/.test(n.textContent))n.textContent=' '+n.textContent;if(p&&p.nodeType===3&&/[A-Za-zÀ-ÿ0-9]$/.test(p.textContent))p.textContent+=' '}
function compilaCampiModulo(radice,c){
  const dati=datiModulo(c);const per=Object.fromEntries(dati.map(d=>[d.etichetta,d.valore]));
  let fatti=0;
  for(const sp of Array.from(radice.querySelectorAll('.campo-mod'))){
    if(sp.dataset.scelto)continue; // scelto o scritto a mano: non si tocca
    const blocco=sp.closest('p,td,h3,li')||sp.parentNode;
    // il testo prima del campo nello stesso paragrafo
    // i puntini degli altri campi diventano spazi: «______PROV.» deve leggersi «PROV.»
    const r=document.createRange();r.setStart(blocco,0);r.setEndBefore(sp);const tutto=r.toString().replace(/[._…\-]{3,}/g,' ').replace(/\s+/g,' ');const prima=tutto.slice(-90);
    // dopo «residente» via, CAP, provincia e comune sono della persona, non della sede: si lasciano scegliere
    const daPersona=/residente|domiciliat/i.test(tutto)&&!/con\s+sede/i.test(tutto.slice(tutto.search(/residente|domiciliat/i)));
    let val=null,eti=null;
    // «______, lì ______»: il primo è il luogo
    const dopo=(()=>{const r2=document.createRange();r2.setStartAfter(sp);r2.setEnd(blocco,blocco.childNodes.length);return r2.toString().slice(0,12)})();
    if(/^\s*,?\s*(?:l[iì]|add[iì])(?![a-zà-ü])/i.test(dopo)&&per['Comune della sede']){sp.textContent=per['Comune della sede'];sp.dataset.pieno='1';fatti++;continue}
    // riga da sola sotto «Timbro e firma»: è il posto della firma
    let sopra='';if(!prima.trim()){let x=blocco.previousElementSibling;for(let k=0;x&&k<4&&!sopra;k++,x=x.previousElementSibling)sopra=x.textContent.replace(/[._…\-]{3,}/g,' ').trim().slice(-60)}
    if(RE_CAMPO_FIRMA.test(prima)||(sopra&&/(?:firma|timbro|l['’]\s*impresa(?:\s+\w+)?|il\s+dichiarante|legale\s+rappresentante|in\s+fede|per\s+accettazione|il\s+datore\s+di\s+lavoro)[^a-z]*$/i.test(sopra))){sp.innerHTML=`<img class="firma-mod" src="${h(immagineAzienda('firmaTimbro'))}" alt="Timbro e firma">`;sp.dataset.pieno='firma';fatti++;continue}
    for(const [re,et] of REGOLE_CAMPI){if(!re.test(prima))continue;
      if(daPersona&&/della sede/.test(et))break;
      if(et==='CF'){const legale=/sottoscritt|nat[oa]\s+a|residente|\bsig/i.test(tutto)&&!/(?:impresa|ditta|societ[aà]|con\s+sede)\s+.{0,60}$/i.test(prima);eti=legale?'Codice fiscale del legale rappresentante':'Codice fiscale dell’impresa'}
      else eti=et;val=per[eti];break}
    if(val){sp.textContent=val;sp.dataset.pieno='1';sp.title=eti;spaziaCampo(sp);fatti++}
  }
  return fatti;
}

// ---- elenco nei Modelli e caricamento ----
function vistaModuliCommittente(){
  const mm=(stato.moduli||[]).slice().sort((a,b)=>(b.modificato||'')<(a.modificato||'')?-1:1);
  return html`<div class="zona-drop piccola mb" data-azione="modulo-carica">${icona('carica')}<div><b>Trascina qui il modulo Word del committente</b><br><span>Il file .docx: lo metto sulla carta intestata, riempio i puntini che riconosco con i dati dell'azienda e del cantiere, il resto lo scegli o lo scrivi tu sul foglio.</span></div></div>
  ${mm.length?html`<div class="scheda"><ul class="elenco-piatto">${mm.map(m=>html`<li class="link" data-azione="vai" data-href="modulo/${m.id}"><span class="spazio"><b>${m.titolo}</b><br><span class="piccolo silenzioso">${m.cantiereId?nomeCantiere(m.cantiereId)+' · ':''}modificato il ${fData((m.modificato||m.creato||'').slice(0,10))}</span></span>${icona('destra','piccola')}</li>`)}</ul></div>`:html`<p class="piccolo silenzioso">Nessun modulo ancora.</p>`}`;
}
AZIONI['modulo-carica']=async d=>{
  const fs=await scegliFile({multipli:false,accetta:'.docx,.doc'});if(!fs.length)return;const f=fs[0];
  if(/\.doc$/i.test(f.name))return informa('File Word vecchio (.doc)','Aprilo in Word o Pages e salvalo come .docx, poi caricalo di nuovo.');
  let corpo;try{corpo=segnaCampi(await docxInHtml(f))}catch(e){return segnalaErrore(e,'Non riesco a leggere il file Word')}
  const cant=d&&d.cantiere?d.cantiere:null;
  const es=await acquisisciFile(f,{});
  const id=nuovoId('mod');const ora=new Date().toISOString();
  // i campi riconosciuti si riempiono subito, su un foglio di appoggio fuori dallo schermo
  const tmp=document.createElement('div');tmp.innerHTML=corpo;tmp.style.cssText='position:absolute;left:-9999px';document.body.appendChild(tmp);
  compilaCampiModulo(tmp,cantiere(cant));const pronto=astraiImmagini(tmp.innerHTML);tmp.remove();
  esegui('Modulo '+f.name,s=>{s.moduli=s.moduli||[];s.moduli.push({id,titolo:f.name.replace(/\.docx$/i,''),nomeFile:f.name,fileId:es.rec.id,cantiereId:cant,html:pronto,creato:ora,modificato:ora})},{senzaRender:true});
  vai('modulo/'+id);
};

// ---- il foglio da compilare ----
VISTE.modulo=function(r){
  const m=perId('moduli',r.id);if(!m)return vuoto({icona:'documenti',titolo:'Modulo non trovato',testo:'Forse è stato eliminato.'});
  const pieni=(m.html.match(/data-pieno=/g)||[]).length,tot=(m.html.match(/class="campo-mod/g)||[]).length;
  dopoRender(()=>montaModulo(m.id));
  return html`<div class="briciole"><a href="#/documenti">Documenti</a> › Moduli dei committenti</div>
  <div class="testata"><div><div class="occhiello">Modulo del committente</div><h1 class="titolo-modulo" contenteditable="true" data-titolo-modulo spellcheck="false">${m.titolo}</h1>
    <p class="sotto">${tot?html`<b>${pieni}</b> campi su ${tot} già riempiti. Clicca un campo giallo per scegliere cosa metterci; il testo si corregge scrivendo sul foglio.`:'Nessun campo con i puntini: scrivi direttamente sul foglio.'}</p></div>
    <div class="azioni"><select data-cambio="modulo-cantiere" data-id="${m.id}" aria-label="Cantiere"><option value="">Nessun cantiere</option>${stato.cantieri.filter(c=>!['archiviato'].includes(c.stato)).map(c=>html`<option value="${c.id}" ${c.id===m.cantiereId?'selected':''}>${c.nome}</option>`)}</select>
    <button class="pulsante" data-azione="modulo-ricompila" data-id="${m.id}" title="Riempie di nuovo i campi che riconosco (quelli scelti a mano restano)">${icona('magia','piccola')}Riempi i campi</button>
    <button class="pulsante" data-azione="modulo-firma" data-id="${m.id}">${icona('firma','piccola')}Timbro e firma</button>
    <button class="pulsante primario" data-azione="modulo-anteprima" data-id="${m.id}">Anteprima, PDF e stampa<span class="manopola">${icona('stampa','piccola')}</span></button></div></div>
  <div class="foglio-modulo-scorri"><div class="foglio-modulo">${grezzo(risolviImmagini(String(intestazioneCartaIntestata())))}<div class="corpo-modulo" contenteditable="true" spellcheck="true" data-modulo="${m.id}">${grezzo(risolviImmagini(m.html))}</div></div></div>
  <div class="riga mt"><button class="pulsante pericolo discreto" data-azione="modulo-elimina" data-id="${m.id}">${icona('cestino','piccola')}Elimina il modulo</button><span class="spazio"></span>${m.fileId?html`<button class="pulsante discreto" data-azione="file-scarica" data-id="${m.fileId}">${icona('scarica','piccola')}Word originale</button>`:''}</div>`;
};
let _salvaModulo=null;
function salvaModulo(id,subito){
  clearTimeout(_salvaModulo);
  const fai=()=>{const box=el(`[data-modulo="${id}"]`);if(!box)return;const t=el('[data-titolo-modulo]');
    const htmlNuovo=astraiImmagini(box.innerHTML),titolo=t?t.textContent.trim()||'Modulo':null;const m=perId('moduli',id);if(!m||(m.html===htmlNuovo&&(!titolo||m.titolo===titolo)))return;
    esegui('Modifica al modulo',s=>{const x=s.moduli.find(y=>y.id===id);x.html=htmlNuovo;if(titolo)x.titolo=titolo;x.modificato=new Date().toISOString()},{senzaRender:true,silenzioso:true})};
  if(subito)fai();else _salvaModulo=setTimeout(fai,700);
}
function montaModulo(id){
  const box=el(`[data-modulo="${id}"]`);if(!box||box.dataset.montato)return;box.dataset.montato='1';
  box.addEventListener('input',()=>salvaModulo(id));
  const tit=el('[data-titolo-modulo]');if(tit){tit.addEventListener('input',()=>salvaModulo(id));tit.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();tit.blur()}})}
  // un campo scritto a mano resta quello: «Riempi i campi» non lo sovrascrive
  box.addEventListener('input',e=>{const sp=window.getSelection().anchorNode;const c=sp&&(sp.nodeType===1?sp:sp.parentNode).closest&&(sp.nodeType===1?sp:sp.parentNode).closest('.campo-mod');if(c){c.dataset.scelto='1';c.dataset.pieno='1'}});
  box.addEventListener('click',e=>{
    const cas=e.target.closest('[data-casella]');if(cas){cas.textContent=cas.textContent==='☒'?'☐':'☒';salvaModulo(id);return}
    const c=e.target.closest('.campo-mod');if(c)menuCampoModulo(c,id);
  });
}
function menuCampoModulo(sp,id){
  tutti('.menu-campo-mod').forEach(x=>x.remove());
  const m=perId('moduli',id);const dati=datiModulo(cantiere(m&&m.cantiereId));
  const menu=creaEl(html`<div class="menu-campo-mod scheda"><input type="search" placeholder="Cerca un dato o scrivi qui il testo" data-cerca-campo>
    <div class="voci-campo">${dati.map(d=>html`<button type="button" class="voce-campo" data-v="${d.valore}"><b>${d.etichetta}</b><span>${d.valore}</span></button>`)}</div>
    <div class="riga mt-s"><button type="button" class="pulsante piccolo" data-firma-campo>${icona('firma','piccola')}Timbro e firma</button><button type="button" class="pulsante piccolo discreto" data-puntini>Rimetti i puntini</button><span class="spazio"></span><button type="button" class="pulsante piccolo discreto" data-chiudi-campo>Chiudi</button></div></div>`);
  document.body.appendChild(menu);
  const rr=sp.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(window.innerWidth-menu.offsetWidth-8,rr.left))+'px';menu.style.top=Math.min(window.innerHeight-menu.offsetHeight-8,rr.bottom+6)+'px';
  const metti=(v,firma)=>{if(firma){sp.innerHTML=`<img class="firma-mod" src="${h(immagineAzienda('firmaTimbro'))}" alt="Timbro e firma">`;sp.dataset.pieno='firma'}else if(v==null){sp.textContent=sp.dataset.vuoto||'……';delete sp.dataset.pieno}else{sp.textContent=v;sp.dataset.pieno='1';spaziaCampo(sp)}sp.dataset.scelto='1';menu.remove();salvaModulo(id,true)};
  const cerca=menu.querySelector('[data-cerca-campo]');cerca.focus();
  cerca.addEventListener('input',()=>{const q=normalizzaTesto(cerca.value);tutti('.voce-campo',menu).forEach(b=>{b.style.display=!q||normalizzaTesto(b.textContent).includes(q)?'':'none'})});
  cerca.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const vis=tutti('.voce-campo',menu).filter(b=>b.style.display!=='none');if(cerca.value.trim()&&(!vis.length||vis.length===dati.length))metti(cerca.value.trim());else if(vis[0])metti(vis[0].dataset.v)}else if(e.key==='Escape')menu.remove()});
  menu.addEventListener('click',e=>{const b=e.target.closest('.voce-campo');if(b)return metti(b.dataset.v);if(e.target.closest('[data-firma-campo]'))return metti(null,true);if(e.target.closest('[data-puntini]'))return metti(null);if(e.target.closest('[data-chiudi-campo]'))menu.remove()});
  setTimeout(()=>document.addEventListener('pointerdown',function fuori(e){if(!menu.contains(e.target)&&e.target!==sp){menu.remove();document.removeEventListener('pointerdown',fuori,true)}},true),0);
}
AZIONI['modulo-cantiere']=(d,t)=>{salvaModulo(d.id,true);esegui('Cantiere del modulo',s=>{s.moduli.find(x=>x.id===d.id).cantiereId=t.value||null},{senzaRender:true,silenzioso:true});const box=el(`[data-modulo="${d.id}"]`);if(box){const n=compilaCampiModulo(box,cantiere(t.value));salvaModulo(d.id,true);avviso(n?plurale(n,'campo riempito','campi riempiti'):'Nessun campo nuovo da riempire',{silenzioso:!n})}};
AZIONI['modulo-ricompila']=d=>{const m=perId('moduli',d.id);const box=el(`[data-modulo="${d.id}"]`);if(!m||!box)return;const n=compilaCampiModulo(box,cantiere(m.cantiereId));salvaModulo(d.id,true);avviso(n?plurale(n,'campo riempito','campi riempiti'):'Nessun campo riconosciuto: scegli tu dal menu del campo')};
// timbro e firma in fondo, se il modulo non ha un posto per la firma
AZIONI['modulo-firma']=d=>{const box=el(`[data-modulo="${d.id}"]`);if(!box)return;box.insertAdjacentHTML('beforeend',`<p class="destra"><span class="campo-mod" data-pieno="firma" data-scelto="1" data-vuoto="……"><img class="firma-mod" src="${h(immagineAzienda('firmaTimbro'))}" alt="Timbro e firma"></span></p>`);salvaModulo(d.id,true)};
AZIONI['modulo-elimina']=async d=>{const m=perId('moduli',d.id);if(!m||!(await conferma(`Eliminare il modulo «${m.titolo}»? Il Word originale resta nel cestino 30 giorni.`,{pericolo:true,ok:'Elimina'})))return;esegui('Eliminato modulo',s=>{s.moduli=s.moduli.filter(x=>x.id!==m.id);cestinaFileOrfani(s)});vai('documenti')};
// Per la stampa i campi diventano testo normale: i puntini rimasti restano puntini, da riempire a penna
function docModulo(m){
  const tmp=document.createElement('div');tmp.innerHTML=m.html;
  tmp.querySelectorAll('.campo-mod,.casella-mod').forEach(sp=>{const f=document.createDocumentFragment();while(sp.firstChild)f.appendChild(sp.firstChild);sp.replaceWith(f)});
  tmp.querySelectorAll('img.firma-mod').forEach(i=>{i.setAttribute('src','{{IMG:firmaTimbro}}');i.className='firma-mod'});
  // le righe vuote in fondo non devono creare una pagina bianca
  const el_=Array.from(tmp.children);while(el_.length&&!el_[el_.length-1].textContent.trim()&&!el_[el_.length-1].querySelector('img'))el_.pop();
  // più righe vuote di fila diventano una; chi sta sopra la firma («L'impresa», «Timbro e firma») resta con lei
  const vuoto_=x=>!x.textContent.trim()&&!x.querySelector('img');const tenuti=el_.filter((x,i)=>!(vuoto_(x)&&i>0&&vuoto_(el_[i-1])));tenuti.forEach(x=>{if(vuoto_(x))x.classList.add('vuota-mod')});
  const blocchi=tenuti.map((x,i)=>{const dopo=tenuti.slice(i+1,i+3);return dopo.some(y=>y.querySelector('img.firma-mod'))&&!x.querySelector('img.firma-mod')?{html:x.outerHTML,tieniConSuccessivo:true}:x.outerHTML});
  return {titolo:m.titolo,cartaIntestata:true,classe:'modulo-stampa',blocchi,pie:pieStandard(m.titolo+(m.cantiereId?' · '+nomeCantiere(m.cantiereId):''))};
}
AZIONI['modulo-anteprima']=d=>{salvaModulo(d.id,true);const m=perId('moduli',d.id);if(!m)return;anteprimaStampa({titolo:m.titolo,doc:docModulo(m),riferimento:m.cantiereId?nomeCantiere(m.cantiereId):''})};
