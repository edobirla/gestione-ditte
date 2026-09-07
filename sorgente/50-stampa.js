// ---------------------------------------------------------------------
// STAMPA: impaginazione A4 fatta dall'applicazione.
// Un documento è un elenco di blocchi HTML; si misurano nel DOM (un solo passaggio di layout) e si
// distribuiscono in pagine da 210×297 mm con margini interni. Le tabelle si spezzano per righe
// ripetendo l'intestazione, un titolo non resta mai solo in fondo, ogni pagina ha carta intestata e
// piè "Pagina N di M". L'anteprima mostra le stesse pagine che vanno in stampa.
// In stampa @page{margin:0} elimina data/ora/titolo/URL del browser; i margini sono quelli interni.
// ---------------------------------------------------------------------
const MM=96/25.4;
function intestazioneCartaIntestata(){
  const a=stato.azienda;const righe=(a.cartaIntestata&&a.cartaIntestata.righe)||[];
  return html`<div class="carta-intestata"><img src="{{IMG:logo}}" alt="Pavimass"><div class="dati"><b>${a.ragioneSociale}</b>${righe.map(r=>html`${r}<br>`)}</div></div>`;
}
function pieStandard(titolo){return html`<span>${titolo||''}</span><span class="numero-pagina">Pagina <span data-n></span> di <span data-m></span></span>`}
// Sostituisce i segnaposto immagine nelle pagine (le immagini non si salvano nello storico dei generati)
function risolviImmagini(htmlStr){return String(htmlStr==null?'':htmlStr).replace(/\{\{IMG:([\w]+)\}\}/g,(m,k)=>{if(k==='logo')return h(immagineAzienda('logo')||IMMAGINI.logo);if(IMMAGINI[k]||stato.azienda['img_'+k])return h(immagineAzienda(k));if(IMMAGINI.pos&&IMMAGINI.pos[k])return h(IMMAGINI.pos[k]);return ''})}
// Raggruppa le righe di una tabella tenendo insieme quelle unite da rowspan: una riga con
// rowspan=3 "porta con sé" le 2 righe successive, altrimenti spezzando la tabella a metà del
// gruppo il rowspan resterebbe orfano sulla pagina dopo (colonna mancante o disallineata).
function raggruppaRigheRowspan(trEls){
  const righeRaw=trEls.map(tr=>({el:tr,h:tr.getBoundingClientRect().height}));
  const reach=righeRaw.map((r,i)=>{let max=i;for(const td of r.el.children){const rs=parseInt(td.getAttribute('rowspan')||'1',10);if(rs>1)max=Math.max(max,i+rs-1)}return max});
  const gruppi=[];let i=0;
  while(i<righeRaw.length){let fine=reach[i];let j=i;while(j<fine){j++;if(reach[j]>fine)fine=reach[j]}gruppi.push({righe:righeRaw.slice(i,fine+1),h:righeRaw.slice(i,fine+1).reduce((a,x)=>a+x.h,0)});i=fine+1}
  return gruppi;
}
// doc: {titolo, orientamento, cartaIntestata (bool), intestazione (html alternativa), pie (html), blocchi:[string|{html,tieniConSuccessivo,nuovaPagina,intera}], classe}
function impagina(doc){
  const cont=el('#stampa');cont.innerHTML='';cont.style.cssText='display:block;position:absolute;left:-20000px;top:0;width:auto';
  const oriz=doc.orientamento==='orizzontale';
  const testaHtml=doc.intestazione!==undefined?doc.intestazione:(doc.cartaIntestata===false?'':intestazioneCartaIntestata());
  const pieHtml=doc.pie!==undefined?doc.pie:pieStandard(doc.titolo);
  const nuovaPagina=(classe)=>{const p=creaEl(html`<div class="pagina ${oriz?'orizzontale':''} ${testaHtml?'':'senza-intestazione'} ${classe||''}"><div class="testa-pagina ${doc.intestazioneSemplice?'semplice':''}">${grezzo(risolviImmagini(testaHtml))}</div><div class="corpo-pagina doc ${doc.classe||''}"></div><div class="pie-pagina">${grezzo(pieHtml)}</div></div>`);cont.appendChild(p);return p};
  // 1) misura: tutti i blocchi in una pagina di misura
  const mis=nuovaPagina();const corpo=mis.querySelector('.corpo-pagina');
  const H=corpo.getBoundingClientRect().height;
  const blocchi=doc.blocchi.map(b=>typeof b==='string'||b instanceof Grezzo?{html:String(b)}:b).filter(b=>b.html&&String(b.html).trim()).map(b=>Object.assign({},b,{html:risolviImmagini(String(b.html))}));
  const nodi=blocchi.map(b=>{const n=creaEl('<div class="blk">'+String(b.html)+'</div>');corpo.appendChild(n);return n});
  const misure=nodi.map((n,i)=>{const r=n.getBoundingClientRect();const cr=corpo.getBoundingClientRect();const m={top:r.top-cr.top,h:r.height};const t=n.querySelector(':scope>table');if(t){const th=t.querySelector('thead');m.tabella=t;m.testaH=th?th.getBoundingClientRect().height:0;m.righe=raggruppaRigheRowspan(Array.from(t.querySelectorAll(':scope>tbody>tr')));m.pieH=t.querySelector('tfoot')?t.querySelector('tfoot').getBoundingClientRect().height:0}const l=n.querySelector(':scope>ul,:scope>ol');if(l&&l.children.length>3){m.lista=l;m.voci=Array.from(l.children).map(li=>({el:li,h:li.getBoundingClientRect().height}))}const g=n.querySelector(':scope>.gruppo');if(g&&g.children.length>1){m.gruppo=g;m.figli=Array.from(g.children).map(c=>({el:c,h:c.getBoundingClientRect().height+parseFloat(getComputedStyle(c).marginBottom||0)}))}return m});
  // altezza effettiva = distanza dal prossimo (comprende i margini)
  for(let i=0;i<misure.length;i++){misure[i].alt=i<misure.length-1?misure[i+1].top-misure[i].top:misure[i].h}
  const eTitolo=n=>/^H[1-5]$/.test((n.firstElementChild||{}).tagName||'')||n.firstElementChild&&n.firstElementChild.classList&&(n.firstElementChild.classList.contains('scheda-titolo')||n.firstElementChild.classList.contains('titolo-tabella')||n.firstElementChild.classList.contains('scadenzario-gruppo'));
  mis.remove();
  // 2) distribuisci
  const pagine=[];let pag=null,y=0;const TOL=1;
  const apri=(classe)=>{pag=nuovaPagina(classe);pagine.push(pag);y=0;return pag.querySelector('.corpo-pagina')};
  let corpoP=apri();
  const metti=(nodo,alt)=>{corpoP.appendChild(nodo);y+=alt};
  for(let i=0;i<blocchi.length;i++){
    const b=blocchi[i],n=nodi[i],m=misure[i];
    if(b.nuovaPagina&&y>0) corpoP=apri();
    if(b.intera){ if(y>0||pagine.length===0)corpoP=apri(b.senzaIntestazione?'copertina-pagina':''); else if(b.senzaIntestazione){pag.classList.add('copertina-pagina')} n.style.height='100%'; metti(n,H); corpoP=apri(); continue; }
    const spazio=H-y;
    // titolo: deve stare con almeno un pezzo del blocco successivo
    if(eTitolo(n)&&i<blocchi.length-1){const prossimo=misure[i+1];const minimoProssimo=prossimo.righe?Math.min(prossimo.alt,prossimo.testaH+(prossimo.righe[0]?prossimo.righe[0].h:0)+8):Math.min(prossimo.alt,48);if(m.alt+minimoProssimo>spazio+TOL&&y>0){corpoP=apri()}metti(n,m.alt);continue}
    if(m.alt<=spazio+TOL){metti(n,m.alt);continue}
    // tabella: spezza per righe ripetendo l'intestazione
    if(m.righe&&m.righe.length>1){
      let righe=m.righe.slice();let prima=true;
      while(righe.length){
        if(!prima||y>0){ if(y+m.testaH+righe[0].h>H-TOL){corpoP=apri()} }
        const t=m.tabella.cloneNode(false);const thead=m.tabella.querySelector('thead');if(thead)t.appendChild(thead.cloneNode(true));const tb=document.createElement('tbody');t.appendChild(tb);
        let hh=m.testaH;const disp=H-y-TOL;
        while(righe.length&&hh+righe[0].h<=disp){const r=righe.shift();for(const rr of r.righe)tb.appendChild(rr.el);hh+=r.h}
        if(!tb.children.length){ // neanche un gruppo di righe entra: pagina nuova
          if(y===0){const r=righe.shift();for(const rr of r.righe)tb.appendChild(rr.el);hh+=r.h} else {corpoP=apri();continue} }
        if(!righe.length&&m.tabella.querySelector('tfoot')){t.appendChild(m.tabella.querySelector('tfoot').cloneNode(true));hh+=m.pieH}
        const wrap=document.createElement('div');wrap.className='blk';wrap.appendChild(t);
        // gli eventuali elementi prima/dopo la tabella nel blocco (es. titolo tabella) vanno con la prima/ultima parte
        if(prima){Array.from(n.childNodes).filter(x=>x!==m.tabella&&x.compareDocumentPosition(m.tabella)&Node.DOCUMENT_POSITION_FOLLOWING).forEach(x=>wrap.insertBefore(x,t))}
        if(!righe.length){Array.from(n.childNodes).filter(x=>x!==m.tabella).forEach(x=>wrap.appendChild(x))}
        metti(wrap,hh+8);prima=false;
        if(righe.length)corpoP=apri();
      }
      continue;
    }
    // elenco lungo: spezza per voci
    if(m.voci){
      let voci=m.voci.slice();let prima=true;
      while(voci.length){
        if(y>H-40)corpoP=apri();
        const l=m.lista.cloneNode(false);let hh=0;const disp=H-y-TOL;
        if(prima){Array.from(n.childNodes).filter(x=>x!==m.lista&&x.compareDocumentPosition(m.lista)&Node.DOCUMENT_POSITION_FOLLOWING).forEach(x=>{corpoP.appendChild(x);y+=x.getBoundingClientRect?x.getBoundingClientRect().height:0})}
        while(voci.length&&hh+voci[0].h<=disp-y*0){const v=voci.shift();l.appendChild(v.el);hh+=v.h;if(y+hh>H-TOL)break}
        if(!l.children.length){if(y===0){const v=voci.shift();l.appendChild(v.el);hh+=v.h}else{corpoP=apri();continue}}
        if(m.lista.tagName==='OL'&&!prima)l.setAttribute('start',String(m.voci.length-voci.length-l.children.length+1));
        const wrap=document.createElement('div');wrap.className='blk';wrap.appendChild(l);metti(wrap,hh+6);prima=false;
        if(voci.length)corpoP=apri();
      }
      continue;
    }
    // gruppo di figli (es. più paragrafi): spezza per figli
    if(m.figli){
      let figli=m.figli.slice();
      while(figli.length){
        const g=m.gruppo.cloneNode(false);let hh=0;const disp=H-y-TOL;
        while(figli.length&&hh+figli[0].h<=disp){const f=figli.shift();g.appendChild(f.el);hh+=f.h}
        if(!g.children.length){if(y===0){const f=figli.shift();g.appendChild(f.el);hh+=f.h}else{corpoP=apri();continue}}
        const wrap=document.createElement('div');wrap.className='blk';wrap.appendChild(g);metti(wrap,hh);
        if(figli.length)corpoP=apri();
      }
      continue;
    }
    // blocco intero: pagina nuova (se è più alto di una pagina resta tagliato: caso raro, segnalato in console)
    if(y>0)corpoP=apri();
    if(m.alt>H)console.warn('Blocco più alto di una pagina',n);
    metti(n,m.alt);
  }
  // pagine vuote in coda (es. dopo una pagina intera) → rimuovi
  for(const p of pagine.slice()){const c=p.querySelector('.corpo-pagina');if(!c.children.length&&pagine.length>1){p.remove();pagine.splice(pagine.indexOf(p),1)}}
  // 3) numerazione
  pagine.forEach((p,i)=>{const nn=p.querySelector('[data-n]'),mm=p.querySelector('[data-m]');if(nn)nn.textContent=String(i+1);if(mm)mm.textContent=String(pagine.length)});
  cont.style.cssText='';
  return pagine.map(p=>astraiImmagini(p.outerHTML));
}
// Inverso di risolviImmagini: i data URL noti tornano segnaposto {{IMG:chiave}}, così lo storico resta leggero
function astraiImmagini(htmlStr){
  const coppie=[];for(const k of Object.keys(IMMAGINI)){if(k==='pos')continue;coppie.push([immagineAzienda(k)||IMMAGINI[k],k])}
  for(const k of Object.keys(stato.azienda)){if(k.startsWith('img_')&&stato.azienda[k])coppie.push([stato.azienda[k],k.slice(4)])}
  for(const k of Object.keys(IMMAGINI.pos||{}))coppie.push([IMMAGINI.pos[k],k]);
  for(const [u,k] of coppie){if(u&&htmlStr.includes(u))htmlStr=htmlStr.split(u).join('{{IMG:'+k+'}}')}
  return htmlStr;
}
// Anteprima a schermo, fedele: stesse pagine, scalate per stare nella finestra
function anteprimaStampa(opz){
  // opz: {titolo, doc} oppure {titolo, pagineHtml, orientamento}
  let pagine=opz.pagineHtml||impagina(opz.doc);
  const oriz=opz.orientamento==='orizzontale'||(opz.doc&&opz.doc.orientamento==='orizzontale');
  const segnaposti=[];const re=/\[DA COMPILARE[^\]]*\]/g;pagine.forEach((p,i)=>{const t=p.replace(/<[^>]+>/g,' ');let m;while((m=re.exec(t))){const ctx=t.slice(Math.max(0,m.index-70),m.index+m[0].length+40).replace(/\s+/g,' ').trim();segnaposti.push({pagina:i+1,frase:'…'+ctx+'…'})}});
  const cont=el('#stampa');cont.innerHTML=risolviImmagini(pagine.join(''));
  const stile=el('#stile-stampa')||creaEl('<style id="stile-stampa"></style>');stile.textContent=`@media print{@page{size:A4 ${oriz?'landscape':'portrait'};margin:0}}`;document.head.appendChild(stile);
  if(!opz.giaRegistrato&&opz.registra!==false){const g={id:nuovoId('g'),titolo:opz.titolo,quando:new Date().toISOString(),pagine,orientamento:oriz?'orizzontale':'verticale',riferimento:opz.riferimento||''};esegui('Generato: '+opz.titolo,s=>{s.generati.push(g);if(s.generati.length>200)s.generati.shift();if(opz.dopoRegistrazione)opz.dopoRegistrazione(s,g)},{senzaRender:true,silenzioso:true});opz.generatoId=g.id}
  const overlay=creaEl(html`<div class="anteprima-stampa" role="dialog" aria-label="Anteprima di stampa"><div class="comandi"><button class="pulsante icona" data-chiudi-anteprima aria-label="Chiudi">${icona('chiudi')}</button><h2>${opz.titolo}</h2><span class="piccolo secondario">${pagine.length} ${pagine.length===1?'pagina':'pagine'} · A4 ${oriz?'orizzontale':'verticale'}</span><button class="pulsante piccolo icona" data-zoom="-" aria-label="Riduci">${icona('zoom-meno')}</button><button class="pulsante piccolo icona" data-zoom="+" aria-label="Ingrandisci">${icona('zoom-piu')}</button>${opz.azioniExtra?grezzo(opz.azioniExtra):''}<button class="pulsante primario" data-stampa>${icona('stampa')}Stampa / Salva PDF</button></div>${segnaposti.length?html`<div class="segnaposto-lista">${icona('attenzione')} <b>${segnaposti.length} segnaposto da compilare</b>: ${segnaposti.slice(0,6).map(s=>html`<span title="${s.frase}">pag. ${s.pagina}</span>`).reduce((a,b)=>html`${a} · ${b}`)}${segnaposti.length>6?' …':''} <button class="pulsante piccolo" data-segnaposti>Elenco</button></div>`:''}<div class="fogli"><div class="zoom-contenitore">${grezzo(risolviImmagini(pagine.join('')))}</div></div></div>`);
  document.body.appendChild(overlay);ui.anteprimaAperta=true;
  const zc=overlay.querySelector('.zoom-contenitore');let zoom=Math.min(1,(overlay.querySelector('.fogli').clientWidth-48)/((oriz?297:210)*MM));
  const applica=()=>{zc.style.transform=`scale(${zoom})`;zc.style.width=((oriz?297:210)*MM)+'px';zc.style.marginBottom=(-(1-zoom)*zc.scrollHeight)+'px'};applica();
  overlay.querySelector('[data-zoom="+"]').onclick=()=>{zoom=Math.min(2,zoom*1.2);applica()};overlay.querySelector('[data-zoom="-"]').onclick=()=>{zoom=Math.max(0.3,zoom/1.2);applica()};
  const chiudi=()=>{overlay.remove();ui.anteprimaAperta=false;document.removeEventListener('keydown',tasti)};
  const tasti=e=>{if(e.key==='Escape'){e.preventDefault();chiudi()}};document.addEventListener('keydown',tasti);
  overlay.querySelector('[data-chiudi-anteprima]').onclick=chiudi;
  overlay.querySelector('[data-stampa]').onclick=()=>{ if(eIos()) avviso('Su iPad e iPhone: Condividi → Stampa, oppure Condividi → Salva su File come PDF',{durata:6000}); setTimeout(()=>window.print(),50); };
  const bs=overlay.querySelector('[data-segnaposti]');if(bs)bs.onclick=()=>informa('Segnaposto non compilati',html`<p>Ogni voce mostra la frase che contiene il segnaposto, così sai dove intervenire.</p><ol>${segnaposti.map(s=>html`<li><b>Pag. ${s.pagina}</b>: ${s.frase}</li>`)}</ol>`);
  if(opz.alMontaggio)opz.alMontaggio(overlay);
  return {pagine,chiudi,generatoId:opz.generatoId};
}
window.addEventListener('afterprint',()=>{});

// ---- blocchi da testo semplice (Markdown ridotto) con segnaposto ----
function inlineMd(t){
  let s=h(t);
  s=s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g,'$1<i>$2</i>');
  s=s.replace(/\[DA COMPILARE[^\]]*\]/g,m=>'<span class="da-compilare">'+m+'</span>');
  return s;
}
function blocchiDaMarkdown(testo,contesto){
  const righe=testo.replace(/\r/g,'').split('\n');const out=[];let par=[];let lista=null;let tab=null;
  const chiudiPar=()=>{if(par.length){out.push('<p>'+inlineMd(par.join(' '))+'</p>');par=[]}};
  const chiudiLista=()=>{if(lista){out.push('<ul>'+lista.map(x=>'<li>'+inlineMd(x)+'</li>').join('')+'</ul>');lista=null}};
  const chiudiTab=()=>{if(tab){const [testa,...corpo]=tab;out.push('<table><thead><tr>'+testa.map(c=>'<th>'+inlineMd(c)+'</th>').join('')+'</tr></thead><tbody>'+corpo.map(r=>'<tr>'+r.map(c=>'<td>'+inlineMd(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>');tab=null}};
  for(let r of righe){
    r=r.replace(/\{\{(.+?)\}\}/g,(m,k)=>{const v=contesto?contesto(k.trim()):null;if(v&&v.blocco){chiudiPar();chiudiLista();chiudiTab();out.push(v.blocco);return ''}return v&&v.testo!==undefined?v.testo:'[DA COMPILARE: '+k.trim()+']'});
    if(!r.trim()){chiudiPar();chiudiLista();chiudiTab();continue}
    let m;
    if((m=/^(#{1,4})\s+(.*)$/.exec(r))){chiudiPar();chiudiLista();chiudiTab();const l=m[1].length;out.push({html:`<h${l} class="${l===1?'centro':''}">${inlineMd(m[2])}</h${l}>`,tieniConSuccessivo:true});continue}
    if(/^\s*[-*]\s+/.test(r)){chiudiPar();chiudiTab();lista=lista||[];lista.push(r.replace(/^\s*[-*]\s+/,''));continue}
    if(/^\|/.test(r)){chiudiPar();chiudiLista();const celle=r.split('|').slice(1,-1).map(x=>x.trim());if(celle.every(c=>/^-+$/.test(c)))continue;tab=tab||[];tab.push(celle);continue}
    chiudiLista();chiudiTab();par.push(r.trim());
  }
  chiudiPar();chiudiLista();chiudiTab();
  return out;
}
function bloccoFirma(opz){
  opz=opz||{};
  const a=stato.azienda;
  return html`<div class="blocco-firma"><div class="luogo">${a.indirizzo.comune||'Subbiano'} (${a.indirizzo.provincia||'AR'}), ${fData(opz.data||oggi())}</div><div class="firma"><div>${opz.etichetta||'Timbro e firma impresa/società'}</div><div class="linea">${opz.senzaFirma?'':html`<img src="{{IMG:${opz.immagine||'firmaTimbro'}}}" alt="">`}</div></div></div>`.s;
}
// Contesto dei segnaposto per le dichiarazioni di un cantiere
function contestoDichiarazione(c,opz){
  opz=opz||{};
  const a=stato.azienda;const leg=persona(a.legaleRappresentanteId);const comm=c?cliente(c.committenteId):null;const aff=c?cliente(c.affidatariaId):null;const cse=c?professionista(c.cseId):null;
  const operai=c?(c.operai||[]).map(id=>persona(id)).filter(Boolean):[];
  const prep=c&&c.prepostoId?persona(c.prepostoId):null;
  const rls=persona(a.rlsId),rspp=persona(a.rsppId);
  const DC=(k)=>'[DA COMPILARE: '+k+']';
  const v=(x,k)=>(x===null||x===undefined||x==='')?DC(k):String(x);
  const sede=indirizzoTesto(a.indirizzo);
  const lavNomi=c?(c.lavorazioni||[]).map(id=>(stato.lavorazioni.find(l=>l.id===id)||{}).nome).filter(Boolean):[];
  const docCorso=(p,tipo)=>{const d=migliorDocumento(documentiPersona(p.id).filter(x=>x.tipoId===tipo),tipoDoc(tipo),oggi(),soglie());return d&&d.doc.dataEmissione?fData(d.doc.dataEmissione):null};
  const tabellaOperai=()=>'<table><thead><tr><th>Cognome e nome</th><th>Nato il</th><th>Codice fiscale</th><th>Mansione</th><th>Qualifiche</th></tr></thead><tbody>'+(operai.length?operai.map(p=>`<tr><td>${h(nomePersona(p))}</td><td>${p.dataNascita?h(fData(p.dataNascita)):'<span class="da-compilare">[DA COMPILARE]</span>'}</td><td>${p.cf?h(p.cf):'<span class="da-compilare">[DA COMPILARE]</span>'}</td><td>${h(p.mansione||'')}</td><td>${h((p.qualifiche||[]).map(q=>QUALIFICHE[q]||q).join(', '))}</td></tr>`).join(''):'<tr><td colspan="5"><span class="da-compilare">[DA COMPILARE: operai assegnati al cantiere]</span></td></tr>')+'</tbody></table>';
  const elencoOperai=()=>'<ul>'+(operai.length?operai.map(p=>`<li>${h(nomePersona(p))}${p.dataNascita?', nato il '+h(fData(p.dataNascita)):''}${p.cf?', C.F. '+h(p.cf):''} — ${h(p.mansione||'')}</li>`).join(''):'<li><span class="da-compilare">[DA COMPILARE: operai assegnati al cantiere]</span></li>')+'</ul>';
  // Firma per accettazione di chi viene nominato: la sua firma se è stata caricata nella scheda,
  // altrimenti la riga vuota di prima (mai una firma di qualcun altro al posto suo).
  const accettazione=(persone,ruolo)=>{
    if(!persone.length) return `<p>Per accettazione, ${h(ruolo)}: ______________________________</p>`;
    return '<div class="gruppo">'+persone.map(x=>`<div class="firma-accettazione"><span class="chi">Per accettazione, ${h(ruolo)} ${h(nomePersona(x))}</span><span class="linea">${x.firmaImg?`<img src="${h(x.firmaImg)}" alt="">`:''}</span></div>`).join('')+'</div>';
  };
  const elencoAddetti=(q)=>{const l=operai.filter(p=>(p.qualifiche||[]).includes(q));return '<ul>'+(l.length?l.map(p=>`<li>${h(nomePersona(p))}${p.cf?', C.F. '+h(p.cf):''}</li>`).join(''):`<li><span class="da-compilare">[DA COMPILARE: nessun operaio assegnato con qualifica ${h(QUALIFICHE[q])}]</span></li>`)+'</ul>'};
  const mappa={
    'azienda.ragioneSociale':a.ragioneSociale,'azienda.sede':sede,'azienda.piva':a.piva,'azienda.cf':a.cf,'azienda.pec':a.pec,'azienda.telefono':a.telefono,'azienda.inail':a.inail,'azienda.rea':a.rea,'azienda.email':a.email,
    'legale.nome':leg?nomePersona(leg):null,'legale.natoA':leg?leg.luogoNascita:null,'legale.natoIl':leg&&leg.dataNascita?fData(leg.dataNascita):null,'legale.residenza':leg?leg.residenza:null,'legale.cf':leg?leg.cf:null,
    'cantiere.nome':c?c.nome:null,'cantiere.descrizione':c?c.descrizione:null,'cantiere.indirizzo':c?indirizzoTesto(c.indirizzo):null,'cantiere.comune':c?c.indirizzo.comune:null,'cantiere.cap':c?c.indirizzo.cap:null,'cantiere.lavorazioni':lavNomi.join('; ')||null,
    'committente.nome':comm?comm.ragioneSociale:null,'committente.indirizzo':comm?indirizzoTesto(comm.indirizzo):null,'affidataria.nome':aff?aff.ragioneSociale:null,'affidataria.indirizzo':aff?indirizzoTesto(aff.indirizzo):null,
    'cse.nome':cse?nomeProfessionista(cse.id):null,'rspp.nome':rspp?nomePersona(rspp):null,'rls.nome':rls?nomePersona(rls):null,'medico.nome':a.medicoCompetente?a.medicoCompetente.nome:null,
    'preposto.nome':prep?nomePersona(prep):null,'preposto.cf':prep?prep.cf:null,'preposto.natoIl':prep&&prep.dataNascita?fData(prep.dataNascita):null,'preposto.corsoData':prep?docCorso(prep,'corso_preposto'):null,
    'oggi':fData(opz.data||oggi()),
  };
  return (k)=>{
    if(k==='luogoData') return {blocco:bloccoFirma({data:opz.data,senzaFirma:opz.senzaFirma,etichetta:opz.etichettaFirma})};
    if(k==='operai.elenco') return {blocco:elencoOperai()};
    if(k==='operai.tabella') return {blocco:tabellaOperai()};
    if(k==='cantiere.lavorazioniElenco') return {blocco:'<ol>'+(lavNomi.length?lavNomi.map(x=>'<li>'+h(x)+'</li>').join(''):'<li><span class="da-compilare">[DA COMPILARE: lavorazioni]</span></li>')+'</ol>'};
    if(k==='addettiAntincendio.elenco') return {blocco:elencoAddetti('antincendio')};
    if(k==='addettiPrimoSoccorso.elenco') return {blocco:elencoAddetti('primoSoccorso')};
    if(k==='preposto.accettazione') return {blocco:accettazione(prep?[prep]:[],'il Preposto')};
    if(k==='addettiAntincendio.accettazione') return {blocco:accettazione(operai.filter(x=>(x.qualifiche||[]).includes('antincendio')),'l\'Addetto')};
    if(k==='addettiPrimoSoccorso.accettazione') return {blocco:accettazione(operai.filter(x=>(x.qualifiche||[]).includes('primoSoccorso')),'l\'Addetto')};
    if(k in mappa) return {testo:v(mappa[k],k)};
    return {testo:DC(k)};
  };
}
// ---- documenti ----
function docDichiarazione(modello,c,opz){
  opz=opz||{};
  const blocchi=blocchiDaMarkdown(modello.testo,contestoDichiarazione(c,{data:opz.data,senzaFirma:!modello.firma}));
  return {titolo:modello.nome,cartaIntestata:modello.cartaIntestata!==false,blocchi,pie:pieStandard(modello.nome+(c?' · '+c.nome:''))};
}
AZIONI['dichiarazione-compila']=async d=>{
  let c=cantiere(d.cantiere);
  let modelloId=d.modello;
  if(!modelloId||!c){
    const campi=[];
    if(!modelloId)campi.push({nome:'modelloId',etichetta:'Modello',tipo:'select',obbligatorio:true,opzioni:stato.modelli.dichiarazioni.map(m=>({v:m.id,t:m.nome}))});
    if(!c)campi.push({nome:'cantiereId',etichetta:'Cantiere (facoltativo)',tipo:'select',opzioni:stato.cantieri.map(x=>({v:x.id,t:x.nome})),aiuto:'Lascia vuoto per una dichiarazione aziendale non legata a un cantiere: i campi del cantiere compariranno da compilare'});
    campi.push({nome:'data',etichetta:'Data',tipo:'data',obbligatorio:true});
    const scelta=await dialogoModulo('Compila una dichiarazione',campi,{data:oggi()},{ok:'Anteprima',intro:html`<p class="piccolo secondario">Si compila da sola con i dati dell'azienda, del legale rappresentante e, se scelto, del cantiere: denominazione e indirizzo, comune, committente, impresa affidataria, operai assegnati. Quello che manca compare in rosso, non si inventa.</p>`});
    if(!scelta)return;
    if(scelta.modelloId)modelloId=scelta.modelloId;
    if(scelta.cantiereId)c=cantiere(scelta.cantiereId);
    d.data=scelta.data;
  }
  const m=stato.modelli.dichiarazioni.find(x=>x.id===modelloId);if(!m)return;
  const doc=docDichiarazione(m,c,{data:d.data});
  anteprimaStampa({titolo:m.nome+(c?' · '+c.nome:''),doc,riferimento:c?c.nome:'',dopoRegistrazione:(s,g)=>{if(c){const cc=s.cantieri.find(x=>x.id===c.id);cc.documentiProdotti.push({id:nuovoId('dp'),tipo:'Dichiarazione',titolo:m.nome,data:d.data||oggi(),modelloId:m.id,generatoId:g.id,fileId:null,note:m.firma?'Firma grafica applicata. Se la committenza richiede firma digitale, il PDF va firmato con dispositivo.':''})}}});
};
function docScadenzario(){
  const sc=riepilogoScadenze();
  const conData=sc.righe.filter(x=>x.info.data).sort((a,b)=>a.info.data<b.info.data?-1:1);
  const gruppi=raggruppa(conData,x=>x.info.data.slice(0,7));
  const blocchi=[`<h1>Scadenzario documenti</h1><p class="sx">Aggiornato al ${h(fData(sc.oggi))}. Stati: scaduto (data passata), in scadenza entro ${sc.soglie.scadenza} giorni, da pianificare entro ${sc.soglie.pianificare} giorni. Le date seguite da ~ sono stimate dalla validità tipica: la data sul documento prevale.</p>`];
  blocchi.push(`<table><tbody><tr><td><b>Scaduti</b></td><td class="num">${sc.scaduti.length}</td><td><b>Mancanti</b></td><td class="num">${sc.mancanti.length}</td><td><b>In scadenza</b></td><td class="num">${sc.entro60.length}</td><td><b>Da pianificare</b></td><td class="num">${sc.entro90.length}</td></tr></tbody></table>`);
  if(sc.mancanti.length) blocchi.push({html:'<h2>Documenti mancanti</h2>',tieniConSuccessivo:true},`<table><thead><tr><th>Persona</th><th>Documento</th><th>Effetto</th></tr></thead><tbody>${sc.mancanti.map(m=>`<tr><td>${h(nomePersona(m.persona))}</td><td>${h(m.nome)}</td><td class="${m.bloccante?'stato-scaduto':''}">${m.bloccante?'Blocca l\'ingresso in cantiere':'Richiesto dalle committenze'}</td></tr>`).join('')}</tbody></table>`);
  for(const [k,righe] of gruppi){const {anno,mese}=daChiaveMese(k);blocchi.push({html:`<div class="scadenzario-gruppo">${h(fMeseAnno(anno,mese))}</div>`,tieniConSuccessivo:true},`<table><thead><tr><th style="width:24mm">Scadenza</th><th>Chi</th><th>Documento</th><th style="width:22mm">Emissione</th><th style="width:30mm">Stato</th></tr></thead><tbody>${righe.map(x=>`<tr><td>${h(fData(x.info.data))}${x.info.stimata?' ~':''}</td><td>${h(x.soggetto)}</td><td>${h((x.tipo||{}).nome||'')}${x.doc.titolo?' <span class="mini">'+h(x.doc.titolo)+'</span>':''}</td><td>${h(fData(x.doc.dataEmissione)||'')}</td><td class="stato-doc stato-${x.info.stato}">${h(STATI_DOC[x.info.stato].etichetta)}${x.info.giorni!=null&&x.info.giorni>=0?' ('+x.info.giorni+' gg)':''}</td></tr>`).join('')}</tbody></table>`)}
  if(sc.senzaScadenza.length) blocchi.push({html:'<h2>Documenti senza scadenza</h2>',tieniConSuccessivo:true},`<table><thead><tr><th>Chi</th><th>Documento</th><th>Emissione</th><th>File</th></tr></thead><tbody>${sc.senzaScadenza.map(x=>`<tr><td>${h(x.soggetto)}</td><td>${h((x.tipo||{}).nome||'')}${x.doc.titolo?' <span class="mini">'+h(x.doc.titolo)+'</span>':''}</td><td>${h(fData(x.doc.dataEmissione)||'—')}</td><td>${(x.doc.file||[]).length?'sì':'<span class="da-compilare">manca</span>'}</td></tr>`).join('')}</tbody></table>`);
  blocchi.push(bloccoFirma({}));
  return {titolo:'Scadenzario Pavimass',cartaIntestata:true,blocchi};
}
AZIONI['stampa-scadenzario']=()=>anteprimaStampa({titolo:'Scadenzario Pavimass',doc:docScadenzario()});
// Preventivo: stessa impaginazione del gestionale di fatturazione usato in azienda
// (template/Prev. n.4-26-P ...pdf), così tutte le offerte Pavimass escono uguali.
function docPreventivo(p){
  const tot=totaliPreventivo(p);const cl=cliente(p.clienteId);const c=cantiere(p.cantiereId);const a=stato.azienda;
  const righe=(p.righe||[]);
  const dc=(v,et)=>v?h(v):`<span class="da-compilare">[DA COMPILARE${et?': '+et:''}]</span>`;
  const riq=(et,corpo,cls)=>`<div class="riq-prev ${cls||''}"><span class="et">${h(et)}</span><div class="vl">${corpo}</div></div>`;
  const intestatario=cl?`<b>Spett.le</b><br>${h(cl.ragioneSociale)}<br>${h(indirizzoTesto(cl.indirizzo))}`:'<span class="da-compilare">[DA COMPILARE: cliente]</span>';
  const destinazione=c?h(c.nome)+(c.indirizzo&&c.indirizzo.comune?'<br>'+h(indirizzoTesto(c.indirizzo)):''):(p.oggetto?h(p.oggetto):'—');
  const testata=`<div class="prev-testa">
    <div class="prev-mittente"><img src="{{IMG:logo}}" alt="${h(a.ragioneSociale)}"><div class="ind">${h(a.indirizzo.via||'')}<br>${h(a.indirizzo.cap||'')} ${h(a.indirizzo.comune||'')} (${h(a.indirizzo.provincia||'')})<br>Italia<br>P.IVA e C.F. ${h(a.piva||'')}</div>
      <div class="prev-numero"><div class="barra"><b>Preventivo</b></div><div class="celle"><div><span class="et">Numero</span><span class="vl">${h(p.numero)}/${h(String(p.anno).slice(-2))}/P</span></div><div><span class="et">Data</span><span class="vl">${h(fData(p.data))}</span></div><div><span class="et">Partita Iva</span><span class="vl">${cl&&cl.piva?h(cl.piva):''}</span></div><div><span class="et">Codice fiscale</span><span class="vl">${cl&&cl.cf?h(cl.cf):''}</span></div></div></div></div>
    <div class="prev-destinatario">${riq('Intestatario',intestatario,'alto')}${riq('Destinazione',destinazione,'alto')}</div>
  </div>
  <div class="prev-condizioni">${riq('Condizioni di pagamento',dc((cl&&cl.condizioniPagamento)||a.condizioniPagamento,'condizioni di pagamento'))}${riq('Banca e Coordinate',(a.banca?h(a.banca):'')+(a.iban?(a.banca?' - ':'')+h(a.iban)+'<br>IBAN: '+h(a.iban):(a.banca?'':'<span class="da-compilare">[DA COMPILARE: banca e IBAN in Impostazioni → Azienda]</span>')))}</div>`;
  const corpoRighe=righe.map(r=>{
    const imp=(r.prezzo==null||r.prezzo==='')?null:(+r.quantita||0)*+r.prezzo;
    const desc=h(r.descrizione||'')+(r.descrizioneEstesa?'<div class="mini">'+h(r.descrizioneEstesa)+'</div>':'')+(r.esclusa?'<div class="mini"><b>SOLO POSA — esclusa fornitura</b></div>':'');
    return `<tr><td>${desc}</td><td class="num">${r.quantita!=null&&r.quantita!==''?h(fNum(r.quantita,Number.isInteger(+r.quantita)?0:2)):''}</td><td class="um">${h(r.um||'')}</td><td class="num">${r.esclusa?'—':imp==null?'<span class="da-compilare">[DA QUOTARE]</span>':h(fNum(r.prezzo,2))}</td><td class="num">${r.esclusa?'escl.':imp==null?'':h(fNum(imp,2))}</td><td class="civa">${h(p.codiceIva||'N6.7')}</td></tr>`;
  }).join('');
  const tabella=`<table class="prev-voci"><thead><tr><th>Descrizione</th><th class="num q">Q.tà</th><th class="um">U.M.</th><th class="num pz">Prezzo</th><th class="num imp">Importo</th><th class="civa">C.IVA</th></tr></thead><tbody>${corpoRighe||'<tr><td colspan="6" class="mini">Nessuna voce inserita.</td></tr>'}</tbody></table>`;
  const notePiede=[a.notePreventivo,p.validitaGiorni?'Validità preventivo: '+fNum(p.validitaGiorni,0)+' giorni':null,a.cellulare?'Cell. '+a.cellulare:null].filter(Boolean);
  const piede=`<div class="prev-piede">
    <div class="prev-fascia">${notePiede.map(x=>`<span>${h(x)}</span>`).join('')}</div>
    <div class="prev-totali"><div class="col"><span class="et">Imponibili</span><span class="vl">${h(fEuro(tot.totale))}</span></div><div class="col"><span class="et">Descrizione imposta</span><span class="vl piccolo">${h(p.descrizioneImposta||'inversione contabile')}</span></div><div class="col"><span class="et">Imposta</span><span class="vl">${h(fEuro(0))}</span></div><div class="col tot"><span class="et">Totale documento</span><span class="vl">${h(fEuro(tot.totale))}</span></div></div>
    <div class="prev-totali sotto"><div class="col"><span class="et">Tot. imponibile</span><span class="vl">${h(fEuro(tot.totale))}</span></div><div class="col"><span class="et">Tot. imposte</span><span class="vl">${h(fEuro(0))}</span></div></div>
    <div class="prev-fondo">${riq('Note',(p.condizioni?h(p.condizioni).replace(/\n/g,'<br>'):'')+(tot.daQuotare.length?`<div class="da-compilare mini">Voci ancora da quotare: ${h(tot.daQuotare.map(r=>r.codice||tronca(r.descrizione,30)).join(', '))}</div>`:''),'note')}<div class="firma-acc"><i>Firma per accettazione</i><div class="linea"></div></div></div>
    <p class="prev-privacy">Ai sensi del D.Lgs. 196/2003 Vi informiamo che i Vs. dati saranno utilizzati esclusivamente per i fini connessi ai rapporti commerciali tra di noi in essere. Vi preghiamo di controllare i Vs. dati anagrafici, la P. IVA e il Cod. Fiscale. Non ci riteniamo responsabili di eventuali errori.</p></div>`;
  return {titolo:'Preventivo '+p.numero+'/'+p.anno,cartaIntestata:false,classe:'prev',blocchi:[testata,tabella,piede]};
}
function stampaPreventivo(p){anteprimaStampa({titolo:'Preventivo '+p.numero+' '+p.anno,doc:docPreventivo(p),riferimento:nomeCliente(p.clienteId)})}
// Libro presenze: una scheda per persona, fedele al modello aziendale "Scheda Ore Mensile"
// (testata con logo + titolo, riquadri nome/qualifica, tabella Giorno/Committente/Località trasferta/Ore).
function classeGiornoOre(v,we,festivo){
  if(v==='FE') return 'g-ferie';
  if(v==='FS'||(festivo&&v==null)) return 'g-festivo';
  if(v==='M'||v==='I') return 'g-malattia';
  if(typeof v==='string') return 'g-assenza';
  if(we) return 'g-we';
  return '';
}
function docLibroPresenze(anno,mese){
  const m=meseP(anno,mese)||{persone:{}};const persone=personePresenze(anno,mese);const n=giorniNelMese(anno,mese);const fest=festivitaAnno(anno,stato.impostazioni.festivitaLocali);const k=chiaveMese(anno,mese);
  const blocchi=[];
  let primo=true;
  for(const sz of ['soci','dipendenti']){
    const pp=persone.filter(p=>(p.sezionePresenze||'dipendenti')===sz);if(!pp.length)continue;
    for(const p of pp){
      const mp=m.persone[p.id]||{giorni:{}};const calc=calcolaMesePersona(mp,p);
      const righe=[];
      for(let g=1;g<=n;g++){
        const we=eFineSettimana(anno,mese,g);const c=mp.giorni[String(g)]||{};const iso=k+'-'+pad2(g);const festivo=fest.has(iso);
        const v=valoreCella(c);
        const cls=classeGiornoOre(v,we,festivo);
        const ore=v==null?'—':typeof v==='number'?fOre(v):((CODICI_ASSENZA[v]||{}).nome||v);
        const committente=[c.committente,c.cantiere&&c.cantiere!==c.committente?c.cantiere:''].filter(Boolean).join(' · ');
        righe.push(`<tr${cls?` class="${cls}"`:''}><td class="giorno">${g}<span class="gs"> ${h(NOMI_GIORNI_BREVI[giornoSettimana(anno,mese,g)])}</span></td><td>${h(committente)||'—'}</td><td>${h(c.trasferta||'')||'—'}</td><td class="num">${h(ore)}</td></tr>`);
      }
      const totale=p.soloTrasferte?'—':fOre(calc.oreGriglia);
      blocchi.push({nuovaPagina:!primo,html:`<div class="ore-anagrafica"><div class="riq"><span class="et">Nome e cognome</span><div class="vl">${h(nomePersona(p))}</div></div><div class="riq"><span class="et">Qualifica / Ruolo</span><div class="vl">${h(p.mansione||(sz==='soci'?'Socio':'Operaio'))}</div></div></div>`});
      blocchi.push(`<table class="ore-mensili"><thead><tr><th class="giorno">Giorno</th><th>Committente</th><th class="trasf">Località Trasferta</th><th class="num ore">Ore Ordinarie</th></tr></thead><tbody>${righe.join('')}</tbody><tfoot><tr class="totale"><td colspan="3" class="num">Totale mese</td><td class="num">${h(totale)}</td></tr></tfoot></table>`);
      const assenze=Object.entries(calc.perCodice).map(([cc,nn])=>((CODICI_ASSENZA[cc]||{}).nome||cc)+' '+nn).join(' · ');
      blocchi.push(`<div class="ore-piede"><div class="riq note"><span class="et">Note</span><div class="vl">${h(mp.note||'')}${assenze?`<div class="mini">${h(assenze)}</div>`:''}</div></div><div class="riq importo"><span class="et">Importo totale</span><div class="vl">${h(calc.importo!=null?fEuro(calc.importo,0):'—')}${mp.importoForzato?' <span class="mini">(forzato)</span>':''}</div></div></div>`);
      primo=false;
    }
  }
  if(!blocchi.length) blocchi.push('<p class="sx">Nessuna persona in presenze per questo mese.</p>');
  const testa=`<div class="carta-intestata ore-testa"><img src="{{IMG:logo}}" alt="${h(stato.azienda.ragioneSociale)}"><div class="dati"><b>${h(stato.azienda.ragioneSociale)}</b>${(((stato.azienda.cartaIntestata||{}).righe)||[]).map(r=>h(r)+'<br>').join('')}</div><div class="titolo-scheda"><b>SCHEDA ORE MENSILE</b><span>${h(capitalizza(fMeseAnno(anno,mese)))}</span></div></div>`;
  return {titolo:'Scheda ore mensile '+capitalizza(nomeMese(mese))+' '+anno,intestazione:testa,classe:'ore-mensili-doc',blocchi};
}
function stampaLibroPresenze(anno,mese){anteprimaStampa({titolo:'Scheda ore mensile '+capitalizza(nomeMese(mese))+' '+anno,doc:docLibroPresenze(anno,mese)})}
function docChecklist(c){
  const ck=checklistCantiere(c);const g=raggruppa(ck.voci,v=>v.gruppo);
  const blocchi=[`<h1 class="sx">Checklist documenti — ${h(c.nome)}</h1><p class="sx">Committente: ${nomeCliente(c.committenteId)?h(nomeCliente(c.committenteId)):'<span class="da-compilare">[DA COMPILARE]</span>'} · Impresa affidataria: ${nomeCliente(c.affidatariaId)?h(nomeCliente(c.affidatariaId)):'<span class="da-compilare">[DA COMPILARE]</span>'} · Aggiornata al ${h(fData(oggi()))} · ${ck.pronti} su ${ck.totale} pronti</p>`];
  for(const [gr,voci] of g){blocchi.push({html:`<h2>${h(gr)}</h2>`,tieniConSuccessivo:true},`<table class="checklist"><thead><tr><th style="width:8mm"></th><th>Documento</th><th>Soggetto</th><th style="width:30mm">Stato</th><th>Note</th></tr></thead><tbody>${voci.map(v=>`<tr><td class="${v.stato==='ok'?'si':'no'}">${v.stato==='ok'?'✓':'✗'}</td><td>${h(v.nome)}</td><td>${h(v.soggetto)}</td><td class="${v.stato==='ok'?'stato-valido':v.stato==='scaduto'?'stato-scaduto':'stato-pianificare'}">${h(STATI_CHECKLIST[v.stato].t)}</td><td class="mini">${v.info&&v.info.data?(v.info.stato==='scaduto'?'scaduto il ':'scade il ')+h(fData(v.info.data)):''}${v.motivo?' '+h(v.motivo):''}</td></tr>`).join('')}</tbody></table>`)}
  return {titolo:'Checklist '+c.nome,cartaIntestata:true,blocchi};
}
AZIONI['checklist-stampa']=d=>{const c=cantiere(d.id);anteprimaStampa({titolo:'Checklist '+c.nome,doc:docChecklist(c),riferimento:c.nome})};
function docBudget(anno){
  const mov=stato.movimenti.filter(m=>(m.data||'').startsWith(anno)).sort((a,b)=>a.data<b.data?-1:1);
  const E=somma(mov.filter(m=>m.tipo==='entrata'),m=>+m.imponibile||0),U=somma(mov.filter(m=>m.tipo==='uscita'),m=>+m.imponibile||0),N=somma(mov.filter(m=>m.tipo==='nota_credito'),m=>+m.imponibile||0);
  const cs=stato.cantieri.filter(c=>String(c.anno)===String(anno)).map(c=>({c,eco:economiaCantiere(c.id,stato.movimenti)}));
  const blocchi=[`<h1 class="sx">Riepilogo economico ${h(anno)}</h1><p class="sx">Importi sempre al netto di IVA (imponibile). Due letture: per data fattura (come il software di contabilità) e per cantiere (cantieri iniziati nel ${h(anno)}, comprese le fatture di altri anni).</p>`,
    `<table><tbody><tr><td>Entrate per data fattura</td><td class="num">${h(fEuro(E-N,0))}</td></tr><tr><td>Uscite per data fattura</td><td class="num">${h(fEuro(U,0))}</td></tr><tr class="totale"><td>Risultato</td><td class="num">${h(fEuro(E-N-U,0))}</td></tr><tr><td>Margine cantieri ${h(anno)} (per cantiere, senza spese generali)</td><td class="num">${h(fEuro(somma(cs,x=>x.eco.margine),0))}</td></tr></tbody></table>`,
    {html:'<h2>Per cantiere</h2>',tieniConSuccessivo:true},`<table><thead><tr><th>Cantiere</th><th>Cliente</th><th class="num">Entrate</th><th class="num">Uscite</th><th class="num">Margine</th><th class="num">%</th></tr></thead><tbody>${cs.map(x=>`<tr><td>${h(x.c.nome)}</td><td>${h(nomeCliente(x.c.affidatariaId)||nomeCliente(x.c.committenteId))}</td><td class="num">${h(fEuro(x.eco.entrate,0))}</td><td class="num">${h(fEuro(x.eco.uscite,0))}</td><td class="num ${x.eco.margine<0?'stato-scaduto':''}">${h(fEuro(x.eco.margine,0))}</td><td class="num">${x.eco.marginePct!=null?h(fPct(x.eco.marginePct,0)):''}</td></tr>`).join('')}</tbody></table>`,
    {html:'<h2>Movimenti</h2>',tieniConSuccessivo:true},`<table><thead><tr><th>Data</th><th>Tipo</th><th>Numero</th><th>Controparte</th><th>Categoria</th><th>Cantiere</th><th class="num">Imponibile</th></tr></thead><tbody>${mov.map(m=>`<tr><td>${h(fData(m.data))}</td><td>${h(TIPI_MOVIMENTO[m.tipo])}</td><td>${h(m.numero||'')}</td><td>${h(m.controparte||nomeCliente(m.clienteId))}</td><td>${h(CATEGORIE_MOVIMENTO[m.categoria]||'')}</td><td class="mini">${h(quoteMovimentoPerCantiere(m).map(q=>nomeCantiere(q.cantiereId)).join(', ')||(m.categoria==='spese_generali'?'spese generali':'non assegnata'))}</td><td class="num">${m.tipo==='nota_credito'?'− ':''}${h(fEuro(m.imponibile))}</td></tr>`).join('')}</tbody></table>`];
  return {titolo:'Riepilogo economico '+anno,cartaIntestata:true,blocchi};
}
function stampaBudget(anno){anteprimaStampa({titolo:'Riepilogo economico '+anno,doc:docBudget(anno)})}
