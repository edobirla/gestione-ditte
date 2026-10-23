// ---------------------------------------------------------------------
// Documento firmato con la stessa qualità dell'originale. Il PDF di partenza si ricopia così com'è
// (testo, grafica, tutte le pagine) e sulla pagina compilata si aggiunge un'annotazione con quello che
// si è messo nell'assistente: firme come immagini trasparenti a piena risoluzione, testo come testo vero,
// rettangoli bianchi. Le foto si rimettono alla loro risoluzione originale, con lo stesso disegno sopra.
// Solo se il PDF è protetto o ruotato si torna all'immagine della pagina, ad alta risoluzione.
// ---------------------------------------------------------------------
// Il disegno degli oggetti dell'assistente come contenuto PDF, in un riquadro largo w e alto h (punti,
// origine in basso a sinistra); le immagini delle firme diventano XObject con la loro trasparenza.
async function disegnoOggettiPdf(oggetti,w,h){
  const n2=x=>(Math.round(x*100)/100).toString();
  const righe=[],immagini=[];
  for(const o of oggetti){
    if(o.t==='copri'||o.t==='rettangolo'||(!o.t&&o.w&&o.h)){righe.push(`q 1 1 1 rg ${n2(o.x)} ${n2(h-o.y-o.h)} ${n2(o.w)} ${n2(o.h)} re f Q`);continue}
    if(o.t==='testo'){
      const dim=o.dim||10;const testo=String(o.testo||'');const multi=/\n/.test(testo);
      // a capo come a video: le righe scritte e, nelle caselle larghe, le parole che non ci stanno
      const ln=[];for(const riga of testo.split('\n')){if(!multi||!o.w){ln.push(riga);continue}let cur='';for(const p of riga.split(' ')){const prova=cur?cur+' '+p:p;if(cur&&larghezzaHelvetica(pdfWinAnsi(prova),0,dim)>o.w){ln.push(cur);cur=p}else cur=prova}ln.push(cur)}
      ln.forEach((t,k)=>{if(!t)return;righe.push(`BT /FH ${n2(dim)} Tf 0.07 0.07 0.07 rg ${n2(o.x)} ${n2(h-o.y-dim*0.9-k*dim*1.25)} Td (${pdfEsc(pdfWinAnsi(t))}) Tj ET`)});
      continue;
    }
    if(o.t==='firma'&&o.src){
      const im=await caricaImmagine(await (await fetch(o.src)).blob());
      const s=Math.min(o.w/im.width,o.h/im.height);const dw=im.width*s,dh=im.height*s;
      const {cw,ch,dati}=firmaNitida(im,Math.max(dw,dh));const rgb=new Uint8Array(cw*ch*3),alfa=new Uint8Array(cw*ch);
      for(let i=0,j=0,k=0;i<dati.length;i+=4){rgb[j++]=dati[i];rgb[j++]=dati[i+1];rgb[j++]=dati[i+2];alfa[k++]=dati[i+3]}
      const nome='S'+(immagini.length+1);immagini.push({nome,w:cw,h:ch,rgb:await comprimiFlate(rgb),alfa:await comprimiFlate(alfa)});
      righe.push(`q ${n2(dw)} 0 0 ${n2(dh)} ${n2(o.x+(o.w-dw)/2)} ${n2(h-o.y-(o.h+dh)/2)} cm /${nome} Do Q`);
    }
  }
  return {contenuto:righe.join('\n'),immagini};
}
// Firme e timbri caricati spesso sono piccoli (poche centinaia di pixel): stampati o ingranditi escono sfocati
// e a scalini. Si portano a 600 dpi della misura in cui vanno sul foglio e si ripulisce il bordo della
// trasparenza (sfocatura leggera + curva a S), come si fa per vettorializzare un tratto: bordi netti e lisci.
function firmaNitida(im,latoPt){
  const lato=Math.max(im.width,im.height);const f=Math.max(1,Math.min(8,latoPt/72*600/lato,3000/lato));
  const cw=Math.max(1,Math.round(im.width*f)),ch=Math.max(1,Math.round(im.height*f));
  const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(im,0,0,cw,ch);
  const dati=g.getImageData(0,0,cw,ch).data;if(f<1.5)return {cw,ch,dati};
  // sfocatura a scatola sulla sola trasparenza (raggio mezzo pixel originale), in orizzontale e in verticale
  const r=Math.max(1,Math.round(f/2));let a=new Float32Array(cw*ch);for(let i=0;i<a.length;i++)a[i]=dati[i*4+3];
  const passo=(src,lun,n,st,sp)=>{const out=new Float32Array(src.length);for(let k=0;k<n;k++){const b=k*sp;let s=0,cnt=0;for(let i=-r;i<=r;i++){const j=Math.min(lun-1,Math.max(0,i));s+=src[b+j*st];cnt++}for(let i=0;i<lun;i++){out[b+i*st]=s/cnt;const via=Math.max(0,i-r),entra=Math.min(lun-1,i+r+1);s+=src[b+entra*st]-src[b+via*st]}}return out};
  a=passo(passo(a,cw,ch,1,cw),ch,cw,cw,1);
  for(let i=0;i<a.length;i++){let t=(a[i]/255-0.3)/0.4;t=t<0?0:t>1?1:t;dati[i*4+3]=Math.round(255*t*t*(3-2*t))}
  return {cw,ch,dati};
}
const FONT_HELVETICA_PDF='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
const latinPdf=s=>{const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&255;return b};
// Firma su un PDF senza toccarne la qualità: null se non si può (protetto, ruotato, illeggibile)
async function pdfFirmatoOriginale(file,r){
  const doc=file._pdf||await apriPdfJs(file);const indice=r.pagina.indice||0;
  const pj=await doc.getPage(indice+1);if((pj.rotate||0)%360!==0)return null;
  const pdf=await analizzaPdf(file);const testo=latin1(pdf.bytes,0,pdf.bytes.length);
  if(pdf.cifrato||/\/Encrypt\s+\d+\s+\d+\s+R/.test(testo))return null;
  // pagine nell'ordine vero (pdf.js), oggetto della pagina da firmare
  const nums=[];for(let i=0;i<doc.numPages;i++){const p=i===indice?pj:await doc.getPage(i+1);if(!p.ref||!pdf.oggetti.has(p.ref.num))return null;nums.push(p.ref.num)}
  const numPagina=nums[indice];
  // tutto ciò che le pagine richiamano (come estraiPaginePdf, ma per tutte le pagine)
  const dentro=new Set();const coda=nums.slice();
  while(coda.length){const n=coda.pop();if(dentro.has(n)||!pdf.oggetti.has(n))continue;dentro.add(n);const c=pdf.corpo(n).replace(/\/Parent\s+\d+\s+0\s+R/g,'').replace(/stream[\s\S]*?endstream/g,'');const re=/(\d+)\s+0\s+R/g;let m;while((m=re.exec(c)))if(!dentro.has(+m[1]))coda.push(+m[1])}
  let massimo=0;for(const n of pdf.oggetti.keys())massimo=Math.max(massimo,n);
  const [vx0,vy0,vx1,vy1]=pj.view;const w=vx1-vx0,h=vy1-vy0;
  const dis=await disegnoOggettiPdf(r.oggetti,w,h);
  // numeri nuovi: annotazione, aspetto, immagini (con maschere), pagine, catalogo
  let n=massimo;const idAnnot=++n,idForma=++n;for(const im of dis.immagini){im.idMaschera=++n;im.id=++n}
  const nPages=++n,nCatalogo=++n;
  const sostituiti=new Map();
  // la pagina firmata: stessa pagina, con l'annotazione in più
  let dictPagina=pdf.corpo(numPagina);
  const annots=/\/Annots\s*(\[[^\]]*\]|(\d+)\s+0\s+R)/.exec(dictPagina);
  if(annots&&annots[2]){const a=+annots[2];sostituiti.set(a,pdf.corpo(a).replace('[','['+idAnnot+' 0 R '));dentro.add(a)}
  else if(annots)dictPagina=dictPagina.replace(annots[1],'['+idAnnot+' 0 R '+annots[1].slice(1));
  else dictPagina=dictPagina.replace(/<<\s*/,'<< /Annots ['+idAnnot+' 0 R] ');
  sostituiti.set(numPagina,dictPagina);
  const pezzi=[];let lunghezza=0;const scrivi=x=>{const b=typeof x==='string'?latinPdf(x):x;pezzi.push(b);lunghezza+=b.length};
  const posizioni=new Map();
  scrivi('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
  for(const num of Array.from(dentro).sort((a,b)=>a-b)){
    const o=pdf.oggetti.get(num);posizioni.set(num,lunghezza);scrivi(num+' 0 obj');
    const pagina=nums.includes(num);
    if(sostituiti.has(num)){let d=sostituiti.get(num);if(pagina)d=sistemaParent(d,nPages);scrivi('\n'+d+'\n')}
    else if(o.inline!==undefined){let d=o.inline;if(pagina)d=sistemaParent(d,nPages);scrivi('\n'+d+'\n')}
    else if(pagina)scrivi('\n'+sistemaParent(pdf.corpo(num),nPages)+'\n');
    else scrivi(pdf.bytes.subarray(o.inizio,o.fine));
    scrivi('endobj\n');
  }
  const oggetto=(id,testa,flusso)=>{posizioni.set(id,lunghezza);scrivi(`${id} 0 obj\n${testa}`);if(flusso){scrivi('\nstream\n');scrivi(flusso);scrivi('\nendstream')}scrivi('\nendobj\n')};
  const r4=x=>(Math.round(x*100)/100);
  oggetto(idAnnot,`<< /Type /Annot /Subtype /Stamp /Rect [${r4(vx0)} ${r4(vy0)} ${r4(vx1)} ${r4(vy1)}] /F 4 /P ${numPagina} 0 R /NM (firma-${Date.now()}) /Contents (Firmato) /AP << /N ${idForma} 0 R >> >>`);
  const cont=await comprimiFlate(latinPdf(dis.contenuto));
  oggetto(idForma,`<< /Type /XObject /Subtype /Form /BBox [0 0 ${r4(w)} ${r4(h)}] /Resources << /Font << /FH ${FONT_HELVETICA_PDF} >>${dis.immagini.length?' /XObject << '+dis.immagini.map(im=>`/${im.nome} ${im.id} 0 R`).join(' ')+' >>':''} >> /Length ${cont.dati.length}${cont.flate?' /Filter /FlateDecode':''} >>`,cont.dati);
  for(const im of dis.immagini){
    oggetto(im.idMaschera,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8${im.alfa.flate?' /Filter /FlateDecode':''} /Length ${im.alfa.dati.length} >>`,im.alfa.dati);
    oggetto(im.id,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${im.idMaschera} 0 R${im.rgb.flate?' /Filter /FlateDecode':''} /Length ${im.rgb.dati.length} >>`,im.rgb.dati);
  }
  oggetto(nPages,`<< /Type /Pages /Count ${nums.length} /Kids [${nums.map(x=>x+' 0 R').join(' ')}] >>`);
  oggetto(nCatalogo,`<< /Type /Catalog /Pages ${nPages} 0 R >>`);
  const inizioXref=lunghezza;const totale=nCatalogo+1;
  let xref='xref\n0 '+totale+'\n0000000000 65535 f \n';for(let k=1;k<totale;k++){const p=posizioni.get(k);xref+=p!==undefined?String(p).padStart(10,'0')+' 00000 n \n':'0000000000 65535 f \n'}
  scrivi(xref);scrivi('trailer\n<< /Size '+totale+' /Root '+nCatalogo+' 0 R >>\nstartxref\n'+inizioXref+'\n%%EOF\n');
  return new Blob(pezzi,{type:'application/pdf'});
}
// Firma su una foto: la foto alla sua risoluzione originale (JPEG così com'è), il disegno sopra
async function pdfFirmatoDaFoto(file,r){
  const w=r.pagina.larghezza,h=r.pagina.altezza;
  let jpeg,px,py;const img=await caricaImmagine(file);px=img.naturalWidth||img.width;py=img.naturalHeight||img.height;
  if(/jpe?g/i.test(file.type)||/\.jpe?g$/i.test(file.name||''))jpeg=new Uint8Array(await file.arrayBuffer());
  else{const c=document.createElement('canvas');c.width=px;c.height=py;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,px,py);g.drawImage(img,0,0);jpeg=await canvasInJpeg(c,0.95)}
  const dis=await disegnoOggettiPdf(r.oggetti,w,h);
  const pezzi=[];let lunghezza=0;const posizioni=new Map();const scrivi=x=>{const b=typeof x==='string'?latinPdf(x):x;pezzi.push(b);lunghezza+=b.length};
  const oggetto=(id,testa,flusso)=>{posizioni.set(id,lunghezza);scrivi(`${id} 0 obj\n${testa}`);if(flusso){scrivi('\nstream\n');scrivi(flusso);scrivi('\nendstream')}scrivi('\nendobj\n')};
  let n=5;for(const im of dis.immagini){im.idMaschera=++n;im.id=++n}const tot=n+1;
  const r4=x=>Math.round(x*100)/100;
  scrivi('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  oggetto(1,'<< /Type /Catalog /Pages 2 0 R >>');oggetto(2,'<< /Type /Pages /Count 1 /Kids [3 0 R] >>');
  oggetto(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${r4(w)} ${r4(h)}] /Contents 4 0 R /Resources << /Font << /FH ${FONT_HELVETICA_PDF} >> /XObject << /Foto 5 0 R${dis.immagini.map(im=>` /${im.nome} ${im.id} 0 R`).join('')} >> >> >>`);
  const cont=await comprimiFlate(latinPdf(`q ${r4(w)} 0 0 ${r4(h)} 0 0 cm /Foto Do Q\n`+dis.contenuto));
  oggetto(4,`<< /Length ${cont.dati.length}${cont.flate?' /Filter /FlateDecode':''} >>`,cont.dati);
  oggetto(5,`<< /Type /XObject /Subtype /Image /Width ${px} /Height ${py} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,jpeg);
  for(const im of dis.immagini){
    oggetto(im.idMaschera,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8${im.alfa.flate?' /Filter /FlateDecode':''} /Length ${im.alfa.dati.length} >>`,im.alfa.dati);
    oggetto(im.id,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${im.idMaschera} 0 R${im.rgb.flate?' /Filter /FlateDecode':''} /Length ${im.rgb.dati.length} >>`,im.rgb.dati);
  }
  const x=lunghezza;let xref='xref\n0 '+tot+'\n0000000000 65535 f \n';for(let k=1;k<tot;k++)xref+=String(posizioni.get(k)).padStart(10,'0')+' 00000 n \n';
  scrivi(xref);scrivi('trailer\n<< /Size '+tot+' /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF\n');
  return new Blob(pezzi,{type:'application/pdf'});
}
