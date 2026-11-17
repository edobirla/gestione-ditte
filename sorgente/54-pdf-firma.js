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
      const vet=vettoreFirma(im,Math.max(dw,dh));
      if(vet){righe.push(`q ${n2(dw)} 0 0 ${n2(dh)} ${n2(o.x+(o.w-dw)/2)} ${n2(h-o.y-(o.h+dh)/2)} cm\n${vet.pdf}\nQ`);continue}
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
function firmaNitida(im,latoPt,maxLato){
  const lato=Math.max(im.width,im.height);const f=Math.max(1,Math.min(8,latoPt/72*600/lato,(maxLato||3000)/lato));
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
// ---- firme e timbri vettoriali ----
// Una firma caricata è un'immagine di poche centinaia di pixel: stampata, anche ingrandita bene, resta
// sfocata. Qui si ridisegna come vettore: si ingrandisce con il bordo ripulito (firmaNitida), si dividono
// i colori in pochi strati (inchiostro, colore del logo, bianco), e il contorno di ogni strato si ricalca
// con i quadrati marcianti (bordo interpolato al decimo di pixel) e si semplifica. Il risultato è un
// tracciato PDF/SVG: nitido a qualsiasi stampante. Se l'immagine non è a colori piatti (foto, sfumature)
// la funzione rinuncia e resta l'immagine.
const cacheVettori=new Map();
const VETTORI_SVG=new Map(); // data URL dell'SVG → vettore, per riconoscerlo quando si fa il PDF
// le immagini che sono firme o timbri: quelle dell'azienda e quelle delle persone
function srcFirme(){const out=new Set();for(const k of ['firmaTimbro','timbro','firmaLegale','firmaRls','firmaRspp'])if(immagineAzienda(k))out.add(immagineAzienda(k));
  for(const k of Object.keys(stato.azienda))if(/^img_.*(firma|timbro)/i.test(k)&&stato.azienda[k])out.add(stato.azienda[k]);for(const p of stato.persone)if(p.firmaImg)out.add(p.firmaImg);return out}
// Nell'anteprima e nella stampa le firme diventano SVG (lo storico dei documenti resta con le immagini)
async function vettorializzaFirmeIn(radice){
  const firme=srcFirme();
  for(const img of Array.from(radice.querySelectorAll('img'))){const src=img.getAttribute('src');if(!firme.has(src))continue;
    try{if(!img.complete||!img.naturalWidth)await new Promise(r=>{img.onload=img.onerror=r});const vet=vettoreFirma(img,0);if(!vet)continue;
      const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(vet.svg);VETTORI_SVG.set(url,vet);img.src=url}catch(e){}}
}
function vettoreFirma(im,latoPt){
  const chiave=(im.currentSrc||im.src||'').slice(-200)+'|'+(im.naturalWidth||im.width)+'x'+(im.naturalHeight||im.height);
  if(cacheVettori.has(chiave))return cacheVettori.get(chiave);
  let out=null;try{out=tracciaFirma(im,latoPt)}catch(e){console.warn('vettore firma',e)}
  cacheVettori.set(chiave,out);return out;
}
function tracciaFirma(im,latoPt){
  // lavora a ~1600 px sul lato lungo: abbastanza per 600 dpi su una firma di 7 cm, ancora veloce
  const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;if(!iw||!ih)return null;
  const {cw,ch,dati}=firmaNitida(im,1600/600*72,1600);
  const N=cw*ch;let opachi=0;for(let i=0;i<N;i++)if(dati[i*4+3]>=160)opachi++;
  if(opachi<30||opachi>N*0.97)return null; // vuota, o senza trasparenza (non è una firma scontornata)
  // colori: k-medie sui pixel pieni, al massimo 5 colori distinti
  const passo=Math.max(1,Math.floor(opachi/20000));const camp=[];let c_=0;for(let i=0;i<N;i++)if(dati[i*4+3]>=160&&(c_++%passo===0))camp.push([dati[i*4],dati[i*4+1],dati[i*4+2]]);
  const d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
  let cen=[camp[0].slice()];while(cen.length<6){let best=null,bd=0;for(const p of camp){let m=1e9;for(const c of cen)m=Math.min(m,d2(p,c));if(m>bd){bd=m;best=p}}if(bd<45*45)break;cen.push(best.slice())}
  for(let it=0;it<8;it++){const s=cen.map(()=>[0,0,0,0]);for(const p of camp){let k=0,m=1e9;cen.forEach((c,j)=>{const d=d2(p,c);if(d<m){m=d;k=j}});s[k][0]+=p[0];s[k][1]+=p[1];s[k][2]+=p[2];s[k][3]++}cen=s.filter(x=>x[3]>camp.length*0.003).map(x=>[x[0]/x[3],x[1]/x[3],x[2]/x[3]])}
  for(let i=0;i<cen.length;i++)for(let j=cen.length-1;j>i;j--)if(d2(cen[i],cen[j])<40*40)cen.splice(j,1);
  if(!cen.length||cen.length>5)return null;
  let err=0;for(const p of camp){let m=1e9;for(const c of cen)m=Math.min(m,d2(p,c));err+=Math.sqrt(m)}if(err/camp.length>24)return null; // sfumature: meglio l'immagine
  // strati dal più chiaro al più scuro: ogni strato copre anche quelli più scuri, così fra un colore e l'altro non restano fessure
  const lum=c=>0.3*c[0]+0.59*c[1]+0.11*c[2];cen.sort((a,b)=>lum(b)-lum(a));
  const rango=new Uint8Array(N);for(let i=0;i<N;i++){if(!dati[i*4+3])continue;const p=[dati[i*4],dati[i*4+1],dati[i*4+2]];let k=0,m=1e9;cen.forEach((c,j)=>{const d=d2(p,c);if(d<m){m=d;k=j}});rango[i]=k}
  // un pixel isolato dell'originale (bordo sfumato del tratto preso per un altro colore) non diventa un puntino
  const fs=cw/iw;const minArea=Math.max(1.5,1.2*fs*fs);
  const strati=[];
  for(let k=0;k<cen.length;k++){
    const F=new Float32Array(N);for(let i=0;i<N;i++)F[i]=rango[i]>=k?dati[i*4+3]/255:0;
    const campo=k?sfocaCampo(F,cw,ch):F;
    const anelli=quadratiMarcianti(campo,cw,ch,0.5).map(a=>semplificaAnello(a,0.35)).filter(a=>a.length>=3&&Math.abs(areaAnello(a))>(k?minArea:1.5));
    if(anelli.length)strati.push({colore:cen[k].map(v=>Math.round(v)),anelli});
  }
  if(!strati.length)return null;
  const f4=v=>(Math.round(v*10000)/10000).toString();
  // PDF: nel quadrato unitario (y verso l'alto), da usare dentro «q w 0 0 h x y cm … Q»
  const pdf=strati.map(s=>`${s.colore.map(v=>f4(v/255)).join(' ')} rg\n`+s.anelli.map(a=>a.map(([x,y],i)=>`${f4(x/cw)} ${f4(1-y/ch)} ${i?'l':'m'}`).join(' ')+' h').join('\n')+' f*').join('\n');
  const f1=v=>(Math.round(v*10)/10).toString();
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw} ${ch}" width="${iw}" height="${ih}" preserveAspectRatio="none">${strati.map(s=>`<path fill="rgb(${s.colore.join(',')})" fill-rule="evenodd" d="${s.anelli.map(a=>'M'+a.map(([x,y])=>f1(x)+' '+f1(y)).join('L')+'Z').join('')}"/>`).join('')}</svg>`;
  return {pdf,svg,w:cw,h:ch};
}
function sfocaCampo(F,w,h){const o=new Float32Array(F.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=h)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;s+=F[yy*w+xx];n++}}o[y*w+x]=s/n}return o}
// Contorni chiusi del campo alla soglia t, in coordinate di pixel (bordo interpolato). Il campo si
// considera circondato da zeri, così ogni contorno si chiude.
function quadratiMarcianti(F,w,h,t){
  const GW=w+2,GH=h+2;const v=(i,j)=>(i<1||j<1||i>w||j>h)?0:F[(j-1)*w+(i-1)];
  const vicini=new Map();const lega=(a,b)=>{let x=vicini.get(a);if(!x)vicini.set(a,x=[]);x.push(b);let y=vicini.get(b);if(!y)vicini.set(b,y=[]);y.push(a)};
  const Hid=(i,j)=>(j*GW+i)*2,Vid=(i,j)=>(j*GW+i)*2+1;
  for(let j=0;j<GH-1;j++)for(let i=0;i<GW-1;i++){
    const a=v(i,j),b=v(i+1,j),c=v(i+1,j+1),d=v(i,j+1);
    const caso=(a>=t?8:0)|(b>=t?4:0)|(c>=t?2:0)|(d>=t?1:0);if(caso===0||caso===15)continue;
    const T=Hid(i,j),B=Hid(i,j+1),L=Vid(i,j),R=Vid(i+1,j);
    switch(caso){
      case 1:case 14:lega(L,B);break;case 2:case 13:lega(B,R);break;case 3:case 12:lega(L,R);break;
      case 4:case 11:lega(T,R);break;case 6:case 9:lega(T,B);break;case 7:case 8:lega(L,T);break;
      case 5:if((a+b+c+d)/4>=t){lega(L,T);lega(B,R)}else{lega(T,R);lega(L,B)}break;
      case 10:if((a+b+c+d)/4>=t){lega(T,R);lega(L,B)}else{lega(L,T);lega(B,R)}break;
    }
  }
  const punto=id=>{const e=id&1,k=id>>1,i=k%GW,j=(k-i)/GW;const a=v(i,j),b=e?v(i,j+1):v(i+1,j);const f=Math.abs(b-a)<1e-6?0.5:(t-a)/(b-a);return e?[i-0.5,j+f-0.5]:[i+f-0.5,j-0.5]};
  const visti=new Set(),anelli=[];
  for(const inizio of vicini.keys()){if(visti.has(inizio))continue;const anello=[];let prec=-1,cur=inizio;
    for(let guardia=0;guardia<5e6;guardia++){visti.add(cur);anello.push(punto(cur));const nn=vicini.get(cur);const nx=nn[0]!==prec?nn[0]:nn[1];prec=cur;cur=nx;if(cur===inizio||cur===undefined||visti.has(cur))break}
    if(anello.length>2)anelli.push(anello)}
  return anelli;
}
function semplificaAnello(p,tol){
  if(p.length<8)return p;
  // Douglas-Peucker su una linea chiusa: si taglia nel punto più lontano dal primo
  let far=0,fd=0;for(let i=1;i<p.length;i++){const d=(p[i][0]-p[0][0])**2+(p[i][1]-p[0][1])**2;if(d>fd){fd=d;far=i}}
  const dp=(a)=>{const tieni=new Uint8Array(a.length);tieni[0]=tieni[a.length-1]=1;const pila=[[0,a.length-1]];while(pila.length){const [s,e]=pila.pop();const [x1,y1]=a[s],[x2,y2]=a[e];const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1e-9;let m=-1,md=0;for(let i=s+1;i<e;i++){const d=Math.abs(dy*(a[i][0]-x1)-dx*(a[i][1]-y1))/L;if(d>md){md=d;m=i}}if(md>tol){tieni[m]=1;pila.push([s,m],[m,e])}}return a.filter((_,i)=>tieni[i])};
  const uno=dp(p.slice(0,far+1)),due=dp(p.slice(far).concat([p[0]]));
  return uno.concat(due.slice(1,-1));
}
function areaAnello(p){let s=0;for(let i=0,j=p.length-1;i<p.length;j=i++)s+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]);return s/2}
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
