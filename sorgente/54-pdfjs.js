// ---------------------------------------------------------------------
// pdf.js (Mozilla, licenza Apache 2.0, sorgente/lib/): il lettore PDF di Firefox, incorporato compresso.
// Mostra bene qualsiasi PDF (moduli, scansioni, file fatti con programmi diversi) nell'assistente di
// firma e trasforma in immagini le pagine da unire in un solo PDF. Si scompatta solo la prima volta che serve.
// ---------------------------------------------------------------------
const PDFJS_LIB='/*LIBGZ:pdf.min.js*/',PDFJS_WORKER='/*LIBGZ:pdf.worker.min.js*/';
let _pdfjs=null;
function pdfjs(){
  if(_pdfjs) return _pdfjs;
  const url=async b64=>{const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const s=new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));return URL.createObjectURL(new Blob([await new Response(s).arrayBuffer()],{type:'text/javascript'}))};
  _pdfjs=(async()=>{
    const lib=await url(PDFJS_LIB);
    await new Promise((ok,ko)=>{const s=document.createElement('script');s.src=lib;s.onload=ok;s.onerror=()=>ko(new Error('il lettore PDF non si è caricato'));document.head.appendChild(s)});
    const L=window.pdfjsLib;L.GlobalWorkerOptions.workerSrc=await url(PDFJS_WORKER);return L;
  })().catch(e=>{_pdfjs=null;throw e});
  return _pdfjs;
}
async function apriPdfJs(blob){const L=await pdfjs();return L.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false}).promise}
// Una pagina come immagine (canvas) alla risoluzione chiesta, con le misure in punti e il testo con le
// posizioni (per proporre dove compilare): stesso formato degli elementi del vecchio lettore.
async function paginaPdfJs(doc,indice,scala){
  const p=await doc.getPage(indice+1);const v1=p.getViewport({scale:1});const v=p.getViewport({scale:scala||2});
  const c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
  await p.render({canvasContext:g,viewport:v}).promise;
  const elementi=[];try{const tc=await p.getTextContent();for(const it of tc.items){if(!it.str||!it.str.trim())continue;const [a,b,,d,e,f]=it.transform;const dim=Math.hypot(a,b)||Math.abs(d)||10;elementi.push({t:'testo',testo:it.str,x:e,y:v1.height-f,dim})}}catch(e){}
  return {canvas:c,larghezza:v1.width,altezza:v1.height,elementi};
}
// PDF fatto di immagini, una per pagina (JPEG), con le misure di pagina in punti
async function pdfDaImmagini(pagine){
  const parti=[];let pos=0;const offs=[];
  const latin=s=>{const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&255;return b};
  const scrivi=x=>{const b=typeof x==='string'?latin(x):x;parti.push(b);pos+=b.length};
  const oggetto=(id,testa,flusso)=>{offs[id]=pos;scrivi(`${id} 0 obj\n${testa}`);if(flusso){scrivi('\nstream\n');scrivi(flusso);scrivi('\nendstream')}scrivi('\nendobj\n')};
  scrivi('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  const ids=pagine.map((p,i)=>({img:3+i*3,cont:4+i*3,pag:5+i*3}));const n=2+pagine.length*3;
  oggetto(1,'<< /Type /Catalog /Pages 2 0 R >>');
  oggetto(2,`<< /Type /Pages /Count ${pagine.length} /Kids [${ids.map(x=>x.pag+' 0 R').join(' ')}] >>`);
  pagine.forEach((p,i)=>{const w=+p.w.toFixed(2),h=+p.h.toFixed(2);
    oggetto(ids[i].img,`<< /Type /XObject /Subtype /Image /Width ${p.px} /Height ${p.py} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`,p.jpeg);
    const c=`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;oggetto(ids[i].cont,`<< /Length ${c.length} >>`,latin(c));
    oggetto(ids[i].pag,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${ids[i].cont} 0 R /Resources << /XObject << /Im0 ${ids[i].img} 0 R >> >> >>`)});
  const x=pos;scrivi(`xref\n0 ${n+1}\n0000000000 65535 f \n`+Array.from({length:n},(_,i)=>String(offs[i+1]||0).padStart(10,'0')+' 00000 n \n').join(''));
  scrivi(`trailer\n<< /Size ${n+1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`);
  return new Blob(parti,{type:'application/pdf'});
}
async function canvasInJpeg(c,q){const b=await new Promise(r=>c.toBlob(r,'image/jpeg',q||0.85));return new Uint8Array(await b.arrayBuffer())}
// Più file (PDF e foto) in un solo PDF: ogni pagina dei PDF e ogni foto diventa una pagina. Le foto vanno
// su un A4 (verticale o orizzontale come la foto), le pagine dei PDF tengono le loro misure.
async function unisciInPdf(blobs){
  const pagine=[];
  for(const b of blobs){
    if(ePdf(b.type,b.name)){const doc=await apriPdfJs(b);for(let i=0;i<doc.numPages;i++){const p=await paginaPdfJs(doc,i,2.2);pagine.push({jpeg:await canvasInJpeg(p.canvas),px:p.canvas.width,py:p.canvas.height,w:p.larghezza,h:p.altezza})}}
    else{const img=await caricaImmagine(b);const oriz=img.width>img.height;const W=oriz?841.89:595.28,H=oriz?595.28:841.89;const m=28;const s=Math.min((W-2*m)/img.width,(H-2*m)/img.height);
      const sc=Math.min(2.5,2200/Math.max(W,H));const c=document.createElement('canvas');c.width=Math.round(W*sc);c.height=Math.round(H*sc);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
      const dw=img.width*s,dh=img.height*s;g.drawImage(img,(W-dw)/2*sc,(H-dh)/2*sc,dw*sc,dh*sc);pagine.push({jpeg:await canvasInJpeg(c),px:c.width,py:c.height,w:W,h:H})}
  }
  return pdfDaImmagini(pagine);
}
