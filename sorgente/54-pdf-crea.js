// ---------------------------------------------------------------------
// PDF dalle pagine stampabili, senza librerie. Le pagine si dispongono nel DOM come per la stampa e se ne
// copia la geometria in un PDF A4 vettoriale: sfondi e bordi, immagini (anche trasparenti), elenchi e
// testo parola per parola con i caratteri standard Helvetica, allargato o stretto per occupare lo stesso
// spazio della pagina a video. Così il PDF è identico all'anteprima, il testo resta selezionabile e
// funziona anche su Safari, dove l'HTML non si può trasformare in immagine.
// ---------------------------------------------------------------------
// larghezze dei caratteri standard PDF (Helvetica, grassetto, corsivo, grassetto corsivo) per i codici WinAnsi 32-255,
// in millesimi di em: servono a stringere o allargare ogni parola alla larghezza che ha a video
const LARGHEZZE_HELVETICA=[[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,0,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,0,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556],[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,0,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,0,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556]];
// testo in WinAnsi (cp1252) per i caratteri standard PDF: i caratteri che non ci sono diventano equivalenti semplici
const CP_WINANSI={8364:128,8218:130,8222:132,8230:133,8216:145,8217:146,8220:147,8221:148,8226:149,8211:150,8212:151,8482:153,338:140,339:156};
const SOST_WINANSI={8594:'->',8592:'<-',8804:'<=',8805:'>=',8203:'',160:' ',8239:' ',8201:' ',10003:'v'};
function pdfWinAnsi(t){let o='';for(const ch of String(t)){const c=ch.codePointAt(0);if(SOST_WINANSI[c]!==undefined){o+=SOST_WINANSI[c];continue}if(c<128||(c>=160&&c<=255))o+=String.fromCharCode(c);else if(CP_WINANSI[c])o+=String.fromCharCode(CP_WINANSI[c]);else o+='?'}return o}
function pdfEsc(s){return s.replace(/[\\()]/g,m=>'\\'+m)}
function larghezzaHelvetica(t,f,pt){const tab=LARGHEZZE_HELVETICA[f||0];let w=0;for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);w+=c>=32&&c<=255?tab[c-32]:500}return w/1000*pt}
async function pdfDaPagine(pagine){
  const cont=el('#stampa');const htmlPrima=cont.innerHTML,stilePrima=cont.style.cssText;
  cont.innerHTML=risolviImmagini(pagine.join(''));cont.style.cssText='display:block;position:absolute;left:-30000px;top:0;width:auto';
  try{
    await Promise.all(Array.from(cont.querySelectorAll('img')).map(i=>i.complete&&i.naturalWidth?null:new Promise(r=>{i.onload=i.onerror=r})));
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const pdf=scrittorePdf();
    for(const p of cont.querySelectorAll('.pagina')) await pdf.pagina(p);
    return await pdf.chiudi();
  }finally{cont.innerHTML=htmlPrima;cont.style.cssText=stilePrima}
}
function scrittorePdf(){
  const W=595.28,H=841.89;const FONT=['Helvetica','Helvetica-Bold','Helvetica-Oblique','Helvetica-BoldOblique'];
  const immagini=[];const cacheImg=new Map();const pagine=[];
  const n2=x=>(Math.round(x*100)/100).toString();
  const colore=s=>{const m=/rgba?\(([^)]+)\)/.exec(s||'');if(!m)return null;const v=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);const a=v.length>3?v[3]:1;if(!(a>0))return null;return v.slice(0,3).map(c=>(c*a+255*(1-a))/255)};
  const rgb=(c,op)=>c.map(n2).join(' ')+' '+op;
  const larghezza=(t,f,pt)=>{const tab=LARGHEZZE_HELVETICA[f];let w=0;for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);w+=c>=32&&c<=255?tab[c-32]:500}return w/1000*pt};
  const rettArrotondato=(x,y,w,h,r)=>{r=Math.min(r,w/2,h/2);const k=0.5523*r;return `${n2(x+r)} ${n2(y)} m ${n2(x+w-r)} ${n2(y)} l ${n2(x+w-r+k)} ${n2(y)} ${n2(x+w)} ${n2(y+r-k)} ${n2(x+w)} ${n2(y+r)} c ${n2(x+w)} ${n2(y+h-r)} l ${n2(x+w)} ${n2(y+h-r+k)} ${n2(x+w-r+k)} ${n2(y+h)} ${n2(x+w-r)} ${n2(y+h)} c ${n2(x+r)} ${n2(y+h)} l ${n2(x+r-k)} ${n2(y+h)} ${n2(x)} ${n2(y+h-r+k)} ${n2(x)} ${n2(y+h-r)} c ${n2(x)} ${n2(y+r)} l ${n2(x)} ${n2(y+r-k)} ${n2(x+r-k)} ${n2(y)} ${n2(x+r)} ${n2(y)} c h`};
  async function immagine(img,wPt,hPt){
    const st=getComputedStyle(img);const fit=st.objectFit;
    const iw=img.naturalWidth,ih=img.naturalHeight;if(!iw||!ih)return null;
    // con object-fit:contain l'immagine occupa solo una parte del riquadro: si disegna solo quella parte
    // (le fasce vuote ai lati, sfumate, uscivano come righe grigie)
    let dx=0,dy=0;if(fit==='contain'||fit==='scale-down'){const sc=Math.min(wPt/iw,hPt/ih);const nw=iw*sc,nh=ih*sc;dx=(wPt-nw)/2;dy=(hPt-nh)/2;wPt=nw;hPt=nh}
    const scala=4.2;// ~300 dpi
    const cw=Math.max(1,Math.min(2400,Math.round(wPt*scala))),ch=Math.max(1,Math.min(2400,Math.round(hPt*scala)));
    const chiave=img.currentSrc+'|'+cw+'|'+ch+'|'+fit;if(cacheImg.has(chiave))return Object.assign({},cacheImg.get(chiave),{dx,dy,dw:wPt,dh:hPt});
    const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const g=cv.getContext('2d');
    if(fit==='cover'){const s=Math.max(cw/iw,ch/ih);const sw=cw/s,sh=ch/s;g.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,0,0,cw,ch)}
    else g.drawImage(img,0,0,cw,ch);
    const dati=g.getImageData(0,0,cw,ch).data;let opaca=true;for(let i=3;i<dati.length;i+=4)if(dati[i]<255){opaca=false;break}
    let ogg;
    if(opaca){const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.86));ogg={w:cw,h:ch,jpeg:new Uint8Array(await blob.arrayBuffer())}}
    else{const rgbB=new Uint8Array(cw*ch*3),alfa=new Uint8Array(cw*ch);for(let i=0,j=0,k=0;i<dati.length;i+=4){rgbB[j++]=dati[i];rgbB[j++]=dati[i+1];rgbB[j++]=dati[i+2];alfa[k++]=dati[i+3]}ogg={w:cw,h:ch,rgb:await comprimiFlate(rgbB),alfa:await comprimiFlate(alfa)}}
    ogg.nome='Im'+(immagini.length+1);immagini.push(ogg);cacheImg.set(chiave,ogg);return Object.assign({},ogg,{dx,dy,dw:wPt,dh:hPt});
  }
  async function pagina(pag){
    const P=pag.getBoundingClientRect();const k=W/P.width;
    const X=x=>(x-P.left)*k,Y=y=>H-(y-P.top)*k;
    const fondi=[],testi=[],usate=new Set();
    const dentro=r=>r.width>0&&r.height>0&&r.right>P.left&&r.left<P.right&&r.bottom>P.top&&r.top<P.bottom;
    for(const e of pag.querySelectorAll('*')){
      const r=e.getBoundingClientRect();if(!dentro(r))continue;
      const st=getComputedStyle(e);if(st.visibility==='hidden'||st.display==='none')continue;
      const x=X(r.left),y=Y(r.bottom),w=r.width*k,h=r.height*k;
      const raggio=parseFloat(st.borderTopLeftRadius)*k||0;
      const fondo=colore(st.backgroundColor);
      if(fondo&&e!==pag)fondi.push(raggio?`${rgb(fondo,'rg')} ${rettArrotondato(x,y,w,h,raggio)} f`:`${rgb(fondo,'rg')} ${n2(x)} ${n2(y)} ${n2(w)} ${n2(h)} re f`);
      // bordi: lato per lato (tratteggiati e punteggiati come linee)
      const lati=[['Top',x,y+h,x+w,y+h],['Right',x+w,y,x+w,y+h],['Bottom',x,y,x+w,y],['Left',x,y,x,y+h]];
      const bw=lati.map(([l])=>parseFloat(st['border'+l+'Width'])*k||0);
      const uguali=bw.every(b=>b===bw[0])&&lati.every(([l])=>st['border'+l+'Style']===st.borderTopStyle&&st['border'+l+'Color']===st.borderTopColor);
      if(raggio&&uguali&&bw[0]>0&&st.borderTopStyle!=='none'){const c=colore(st.borderTopColor);if(c)fondi.push(`${rgb(c,'RG')} ${n2(bw[0])} w ${rettArrotondato(x+bw[0]/2,y+bw[0]/2,w-bw[0],h-bw[0],Math.max(0,raggio-bw[0]/2))} S`)}
      else lati.forEach(([l,x1,y1,x2,y2],i)=>{const s=st['border'+l+'Style'];if(!bw[i]||s==='none'||s==='hidden')return;const c=colore(st['border'+l+'Color']);if(!c)return;const o=bw[i]/2;const d=[[0,-o],[-o,0],[0,o],[o,0]][i];const tr=s==='dotted'?`[${n2(bw[i])} ${n2(bw[i]*2)}] 0 d 1 J `:s==='dashed'?`[${n2(bw[i]*3)} ${n2(bw[i]*2)}] 0 d `:'';fondi.push(`${rgb(c,'RG')} ${n2(bw[i])} w ${tr}${n2(x1+d[0])} ${n2(y1+d[1])} m ${n2(x2+d[0])} ${n2(y2+d[1])} l S [] 0 d 0 J`)});
      if(e.tagName==='IMG'&&e.naturalWidth){const im=await immagine(e,w,h);if(im){usate.add(immagini.find(o=>o.nome===im.nome));fondi.push(`q ${n2(im.dw)} 0 0 ${n2(im.dh)} ${n2(x+im.dx)} ${n2(y+h-im.dy-im.dh)} cm /${im.nome} Do Q`)}}
      // pallini e numeri degli elenchi, spunte delle liste .spunte (sono pseudo-elementi: non stanno nel DOM)
      if(e.tagName==='LI'){
        const fs=parseFloat(st.fontSize);const lh=st.lineHeight==='normal'?fs*1.2:parseFloat(st.lineHeight);const base=r.top+(lh-fs)/2+fs*0.8;
        if(e.parentNode.classList.contains('spunte')){const b=getComputedStyle(e,'::before');const c=colore(b.borderLeftColor)||[0.17,0.14,0.79];const mm=96/25.4;const x0=r.left+0.7*mm,y0=r.top+1.55*mm;fondi.push(`${rgb(c,'RG')} ${n2(0.8)} w ${n2(X(x0))} ${n2(Y(y0+0.9*mm))} m ${n2(X(x0+0.8*mm))} ${n2(Y(y0+1.7*mm))} l ${n2(X(x0+2.4*mm))} ${n2(Y(y0+0.1*mm))} l S`)}
        else if(st.display==='list-item'&&st.listStyleType!=='none'){
          const lista=e.parentNode;const pos=Array.from(lista.children).indexOf(e);const inizio=parseInt(lista.getAttribute('start')||'1',10);const n=inizio+pos;
          const tipo=st.listStyleType;const t=tipo==='decimal'?n+'.':tipo==='lower-alpha'?String.fromCharCode(96+n)+'.':tipo==='upper-alpha'?String.fromCharCode(64+n)+'.':'•';
          const m=getComputedStyle(e,'::marker');const c=colore(m.color)||colore(st.color)||[0,0,0];const bold=parseInt(m.fontWeight||st.fontWeight,10)>=600;const pt=fs*k;
          const lw=larghezza(t,bold?1:0,pt);testi.push(`BT /F${bold?2:1} ${n2(pt)} Tf ${rgb(c,'rg')} ${n2(X(r.left)-lw-pt*0.45)} ${n2(Y(base))} Td (${pdfEsc(pdfWinAnsi(t))}) Tj ET`);
        }
      }
    }
    // testo, una parola alla volta: la posizione e la larghezza sono quelle della pagina a video
    const tw=document.createTreeWalker(pag,NodeFilter.SHOW_TEXT);const rg=document.createRange();
    for(let nodo=tw.nextNode();nodo;nodo=tw.nextNode()){
      const t=nodo.nodeValue;if(!t.trim())continue;const par=nodo.parentElement;if(!par)continue;
      const st=getComputedStyle(par);if(st.visibility==='hidden')continue;
      const fs=parseFloat(st.fontSize);const pt=fs*k;const f=(parseInt(st.fontWeight,10)>=600?1:0)|(st.fontStyle==='italic'||st.fontStyle==='oblique'?2:0);const c=colore(st.color)||[0,0,0];
      const maiusc=st.textTransform==='uppercase';const re=/\S+/g;let m;
      while((m=re.exec(t))){rg.setStart(nodo,m.index);rg.setEnd(nodo,m.index+m[0].length);const rr=rg.getClientRects();if(!rr.length)continue;const r=rr[0];if(!dentro(r))continue;
        const parola=pdfWinAnsi(maiusc?m[0].toUpperCase():m[0]);if(!parola)continue;const lw=larghezza(parola,f,pt);if(!lw)continue;
        const tz=Math.max(40,Math.min(250,(r.width*k)/lw*100));const base=r.top+r.height*0.78;
        testi.push(`BT /F${f+1} ${n2(pt)} Tf ${rgb(c,'rg')} ${n2(tz)} Tz ${n2(X(r.left))} ${n2(Y(base))} Td (${pdfEsc(parola)}) Tj ET`)}
    }
    pagine.push({contenuto:fondi.join('\n')+'\n'+testi.join('\n'),immagini:Array.from(usate)});
  }
  async function chiudi(){
    const parti=[];let pos=0;const offs=[];const enc=new TextEncoder();
    const latin=s=>{const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&255;return b};
    const scrivi=x=>{const b=typeof x==='string'?latin(x):x;parti.push(b);pos+=b.length};
    // numeri degli oggetti: 1 catalogo, 2 pagine, 3-6 caratteri, poi immagini e pagine
    let n=6;for(const im of immagini){if(im.alfa)im.idMaschera=++n;im.id=++n}
    for(const p of pagine){p.idCont=++n;p.id=++n}
    const oggetto=(id,testa,flusso)=>{offs[id]=pos;scrivi(`${id} 0 obj\n${testa}`);if(flusso){scrivi('\nstream\n');scrivi(flusso);scrivi('\nendstream')}scrivi('\nendobj\n')};
    scrivi('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    oggetto(1,'<< /Type /Catalog /Pages 2 0 R >>');
    oggetto(2,`<< /Type /Pages /Count ${pagine.length} /Kids [${pagine.map(p=>p.id+' 0 R').join(' ')}] >>`);
    FONT.forEach((f,i)=>oggetto(3+i,`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
    for(const im of immagini){
      if(im.jpeg){oggetto(im.id,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>`,im.jpeg)}
      else{oggetto(im.idMaschera,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8${im.alfa.flate?' /Filter /FlateDecode':''} /Length ${im.alfa.dati.length} >>`,im.alfa.dati);
        oggetto(im.id,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${im.idMaschera} 0 R${im.rgb.flate?' /Filter /FlateDecode':''} /Length ${im.rgb.dati.length} >>`,im.rgb.dati)}
    }
    for(const p of pagine){
      const c=await comprimiFlate(latin(p.contenuto));
      oggetto(p.idCont,`<< /Length ${c.dati.length}${c.flate?' /Filter /FlateDecode':''} >>`,c.dati);
      oggetto(p.id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${p.idCont} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >>${p.immagini.length?' /XObject << '+p.immagini.map(im=>`/${im.nome} ${im.id} 0 R`).join(' ')+' >>':''} >> >>`);
    }
    const inizioXref=pos;
    scrivi(`xref\n0 ${n+1}\n0000000000 65535 f \n`+Array.from({length:n},(_,i)=>String(offs[i+1]||0).padStart(10,'0')+' 00000 n \n').join(''));
    scrivi(`trailer\n<< /Size ${n+1} /Root 1 0 R >>\nstartxref\n${inizioXref}\n%%EOF\n`);
    void enc;
    return new Blob(parti,{type:'application/pdf'});
  }
  return {pagina,chiudi};
}
// FlateDecode con CompressionStream (Safari 16.4+, Chrome, Firefox); senza, il dato resta non compresso
async function comprimiFlate(bytes){
  if(typeof CompressionStream==='undefined')return {dati:bytes,flate:false};
  const s=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return {dati:new Uint8Array(await new Response(s).arrayBuffer()),flate:true};
}
