// ---------------------------------------------------------------------
// RESA DI UNA PAGINA PDF DENTRO L'APPLICAZIONE.
// Non è un visualizzatore PDF: è una ricostruzione. Si leggono le posizioni del testo e le righe e i
// riquadri disegnati, e si ridisegnano come elementi HTML posizionati. Basta per lavorarci sopra:
// vedere il modulo, capire dove va scritto, mettere testo e firma dove servono e stampare il tutto
// con il motore di stampa dell'applicazione. Un visualizzatore vero vorrebbe dire scrivere un
// interprete PostScript con i font incorporati, un'altra scala di lavoro.
// ponytail: ricostruzione, non resa fedele — se un giorno serve la fedeltà al pixel serve tutt'altro.
// ---------------------------------------------------------------------
function moltiplicaMatrici(a,b){
  return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3], a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]];
}
function applicaMatrice(m,x,y){return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]]}
// Legge il contenuto di una pagina e restituisce testo e tratti con le loro coordinate (origine in
// alto a sinistra, come sullo schermo: il PDF le ha in basso a sinistra).
function elementiPagina(c,fonts,altezza){
  const elementi=[];
  let ctm=[1,0,0,1,0,0];const pila=[];
  let tm=[1,0,0,1,0,0],tlm=[1,0,0,1,0,0];
  let font=null,corpo=10,grassetto=false;
  let xMin=0,yMin=0,xMax=0,yMax=0,haPercorso=false;
  const tok=/\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|\/[^\s\/\[\]<>(]+|-?\d*\.?\d+|[A-Za-z'"*]+/g;
  const pila_op=[];let m;
  const num=(n)=>pila_op.filter(x=>typeof x==='number').slice(-n);
  const decodifica=(s)=>{
    let codici=[];
    if(s[0]==='<'){const hx=s.slice(1,-1).replace(/\s/g,'');const passo=font&&font.due?4:2;for(let i=0;i<hx.length;i+=passo)codici.push(parseInt(hx.slice(i,i+passo),16))}
    else{const raw=s.slice(1,-1).replace(/\\([nrtbf()\\]|[0-7]{1,3})/g,(mm,g)=>({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','(':'(',')':')','\\':'\\'}[g]!==undefined?{n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','(':'(',')':')','\\':'\\'}[g]:String.fromCharCode(parseInt(g,8))));for(let i=0;i<raw.length;i++)codici.push(raw.charCodeAt(i))}
    return codici.map(cd=>{if(font&&font.mappa&&font.mappa.has(cd))return font.mappa.get(cd);if(font&&font.due)return '';return String.fromCharCode(cd)}).join('');
  };
  const scrivi=(testo)=>{
    if(!testo) return;
    const m2=moltiplicaMatrici(tm,ctm);
    const [x,y]=[m2[4],m2[5]];
    const scala=Math.sqrt(Math.abs(m2[0]*m2[3]-m2[1]*m2[2]))||1;
    const dim=corpo*scala;
    if(dim<1||dim>200) return;
    const ult=elementi[elementi.length-1];
    if(ult&&ult.t==='testo'&&Math.abs(ult.y-(altezza-y))<0.6&&Math.abs(ult.dim-dim)<0.7){
      const salto=x-ult.xUltimo;
      if(salto>=-dim*0.1&&salto<dim*0.95){ult.testo+=testo;ult.xUltimo=x;return}
      if(salto>=0&&salto<dim*2.1){ult.testo+=' '+testo;ult.xUltimo=x;return}
    }
    elementi.push({t:'testo',x,y:altezza-y,dim,testo,grassetto,xUltimo:x});
  };
  const chiudiPercorso=(riempi)=>{
    if(!haPercorso)return;
    const w=xMax-xMin,h=yMax-yMin;
    // solo le righe e i riquadri: le curve e i disegni complessi non servono a un modulo da compilare
    if(w>=0.7&&h<=2.2) elementi.push({t:'tratto',x:xMin,y:altezza-yMax,w,h:Math.max(0.6,h)});
    else if(h>=0.7&&w<=2.2) elementi.push({t:'tratto',x:xMin,y:altezza-yMax,w:Math.max(0.6,w),h});
    else if(w>3&&h>3&&!riempi) elementi.push({t:'riquadro',x:xMin,y:altezza-yMax,w,h});
    haPercorso=false;
  };
  const punto=(x,y)=>{const [px,py]=applicaMatrice(ctm,x,y);if(!haPercorso){xMin=xMax=px;yMin=yMax=py;haPercorso=true}else{xMin=Math.min(xMin,px);xMax=Math.max(xMax,px);yMin=Math.min(yMin,py);yMax=Math.max(yMax,py)}};
  while((m=tok.exec(c))){
    const t=m[0];
    if(/^-?\d*\.?\d+$/.test(t)){pila_op.push(parseFloat(t));continue}
    if(t[0]==='('||t[0]==='<'||t==='['||t===']'||t[0]==='/'){pila_op.push(t);continue}
    switch(t){
      case 'q': pila.push(ctm.slice()); break;
      case 'Q': if(pila.length)ctm=pila.pop(); break;
      case 'cm': {const n=num(6);if(n.length===6)ctm=moltiplicaMatrici(n,ctm);break}
      case 'BT': tm=tlm=[1,0,0,1,0,0]; break;
      case 'Tf': {const nome=pila_op.filter(x=>typeof x==='string'&&x[0]==='/').pop();font=nome?fonts.get(nome.slice(1))||null:null;grassetto=!!(nome&&/bold|grassetto|,B\b/i.test(nome));const n=num(1);if(n.length&&n[0]>0)corpo=n[0];break}
      case 'Td': {const n=num(2);if(n.length===2){tlm=moltiplicaMatrici([1,0,0,1,n[0],n[1]],tlm);tm=tlm.slice()}break}
      case 'TD': {const n=num(2);if(n.length===2){tlm=moltiplicaMatrici([1,0,0,1,n[0],n[1]],tlm);tm=tlm.slice()}break}
      case 'Tm': {const n=num(6);if(n.length===6){tlm=n.slice();tm=n.slice()}break}
      case 'T*': tlm=moltiplicaMatrici([1,0,0,1,0,-corpo*1.15],tlm);tm=tlm.slice(); break;
      case 'Tj': case "'": case '"': {const s=pila_op.filter(x=>typeof x==='string'&&(x[0]==='('||x[0]==='<')).pop();if(s)scrivi(decodifica(s));break}
      case 'TJ': {let testo='';for(const x of pila_op){if(typeof x==='string'&&(x[0]==='('||x[0]==='<'))testo+=decodifica(x);else if(typeof x==='number'&&x<-180)testo+=' '}scrivi(testo);break}
      case 'm': case 'l': {const n=num(2);if(n.length===2)punto(n[0],n[1]);break}
      case 'c': {const n=num(6);if(n.length===6){punto(n[0],n[1]);punto(n[4],n[5])}break}
      case 're': {const n=num(4);if(n.length===4){punto(n[0],n[1]);punto(n[0]+n[2],n[1]+n[3])}break}
      case 'S': case 's': chiudiPercorso(false); break;
      case 'f': case 'F': case 'f*': case 'B': case 'B*': chiudiPercorso(true); break;
      case 'n': haPercorso=false; break;
    }
    pila_op.length=0;
  }
  return elementi;
}
// Pagina scansionata: il foglio è una fotografia dentro il PDF. Non c'è niente da ricostruire, ma
// l'immagine si può tirare fuori così com'è (le scansioni sono quasi sempre JPEG) e ci si lavora
// sopra come su una foto.
async function immagineDiPagina(pdf,dictPagina){
  const rr=/\/Resources\s+(\d+)\s+0\s+R/.exec(dictPagina);
  const res=rr?pdf.dictDi(+rr[1]):dictPagina;
  let xo='';const xm=/\/XObject\s+(\d+)\s+0\s+R/.exec(res);
  if(xm)xo=pdf.dictDi(+xm[1]);else{const xi=/\/XObject\s*<<([\s\S]*?)>>/.exec(res);if(xi)xo=xi[1]}
  let migliore=null;
  const re=/\/[^\s\/\]<>]+\s+(\d+)\s+0\s+R/g;let m;
  while((m=re.exec(xo))){
    const o=pdf.oggetti.get(+m[1]);if(!o||!/\/Subtype\s*\/Image/.test(o.dict))continue;
    if(!/\/DCTDecode/.test(o.dict))continue; // solo JPEG: gli altri vorrebbero un decodificatore
    const w=+((/\/Width\s+(\d+)/.exec(o.dict)||[])[1]||0);
    if(!migliore||w>migliore.w) migliore={o,w};
  }
  if(!migliore) return null;
  const dati=await pdf.flusso(migliore.o);
  if(!dati) return null;
  return leggiComeDataUrl(new Blob([dati],{type:'image/jpeg'}));
}
// Ricostruisce una pagina: misure in punti PDF (1/72"), che è anche l'unità del motore di stampa.
async function rendiPaginaPdf(blob,indice){
  const pdf=await analizzaPdf(blob);
  if(!pdf.pagine.length) throw new Error('il PDF non contiene pagine leggibili');
  const i=Math.min(Math.max(0,indice||0),pdf.pagine.length-1);
  const c=await pdf.contenutoPagina(i);
  if(!c) throw new Error('pagina non leggibile');
  const mb=/\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/.exec(c.dict)||[0,0,0,595.28,841.89];
  const larghezza=Math.abs(+mb[3]-+mb[1]),altezza=Math.abs(+mb[4]-+mb[2]);
  const elementi=elementiPagina(c.contenuto,c.fonts,altezza);
  // se non c'è testo da ricostruire, il foglio è una scansione: si usa la fotografia che sta dentro
  const scansione=elementi.filter(e=>e.t==='testo').length?null:await immagineDiPagina(pdf,c.dict);
  return {larghezza,altezza,elementi,scansione,pagine:pdf.pagine.length,indice:i};
}

// ---------------------------------------------------------------------
// ESTRAZIONE DI PAGINE IN UN NUOVO PDF.
// Serve per le buste paga: dal PDF unico del commercialista si ricava un file per operaio con le
// sole pagine sue. Le pagine non si ridisegnano: si copiano dal file originale byte per byte, con
// tutto quello a cui fanno riferimento (font, immagini, contenuti). Si tengono i numeri d'oggetto
// originali, così i riferimenti interni restano validi e non c'è niente da riscrivere: si aggiungono
// solo un nuovo catalogo e un nuovo albero delle pagine.
// ---------------------------------------------------------------------
function byte(s){const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&0xff;return b}
async function estraiPaginePdf(blob,indici){
  const pdf=await analizzaPdf(blob);
  const scelte=indici.map(i=>pdf.pagine[i]).filter(Boolean);
  if(!scelte.length) throw new Error('nessuna pagina da estrarre');
  // 1) chiusura: tutto ciò che le pagine richiamano, e ciò che quello richiama a sua volta
  const dentro=new Set();
  const numeriPagina=new Set(scelte.map(p=>p.num));
  const coda=scelte.map(p=>p.num);
  while(coda.length){
    const n=coda.pop();
    if(dentro.has(n)||!pdf.oggetti.has(n)) continue;
    dentro.add(n);
    // il /Parent di una pagina porta all'albero originale, che elenca TUTTE le pagine del file:
    // seguirlo si porterebbe dietro l'intero documento. Le pagine scelte avranno un albero nuovo.
    const c=pdf.corpo(n).replace(/\/Parent\s+\d+\s+0\s+R/g,'');
    const re=/(\d+)\s+0\s+R/g;let m;
    while((m=re.exec(c))) if(!dentro.has(+m[1])) coda.push(+m[1]);
  }
  let massimo=0;for(const n of dentro) massimo=Math.max(massimo,n);
  const nPages=massimo+1,nCatalogo=massimo+2;
  // 2) scrittura: stessi numeri d'oggetto, nuovo albero delle pagine
  const pezzi=[];let lunghezza=0;
  const scrivi=(x)=>{const b=typeof x==='string'?byte(x):x;pezzi.push(b);lunghezza+=b.length};
  scrivi('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
  const posizioni=new Map();
  for(const n of Array.from(dentro).sort((a,b)=>a-b)){
    const o=pdf.oggetti.get(n);
    posizioni.set(n,lunghezza);
    scrivi(n+' 0 obj');
    if(o.inline!==undefined){
      let d=o.inline;
      if(numeriPagina.has(n)) d=sistemaParent(d,nPages);
      scrivi('\n'+d+'\n');
    } else if(numeriPagina.has(n)){
      scrivi('\n'+sistemaParent(pdf.corpo(n),nPages)+'\n');
    } else {
      scrivi(pdf.bytes.subarray(o.inizio,o.fine));
    }
    scrivi('endobj\n');
  }
  posizioni.set(nPages,lunghezza);
  scrivi(nPages+' 0 obj\n<< /Type /Pages /Count '+scelte.length+' /Kids ['+scelte.map(p=>p.num+' 0 R').join(' ')+'] >>\nendobj\n');
  posizioni.set(nCatalogo,lunghezza);
  scrivi(nCatalogo+' 0 obj\n<< /Type /Catalog /Pages '+nPages+' 0 R >>\nendobj\n');
  // 3) tabella dei riferimenti incrociati: una riga per oggetto, quelli assenti marcati liberi
  const inizioXref=lunghezza;
  const totale=nCatalogo+1;
  let xref='xref\n0 '+totale+'\n0000000000 65535 f \n';
  for(let n=1;n<totale;n++){
    const p=posizioni.get(n);
    xref+=p!==undefined?String(p).padStart(10,'0')+' 00000 n \n':'0000000000 65535 f \n';
  }
  scrivi(xref);
  scrivi('trailer\n<< /Size '+totale+' /Root '+nCatalogo+' 0 R >>\nstartxref\n'+inizioXref+'\n%%EOF\n');
  return new Blob(pezzi,{type:'application/pdf'});
}
function sistemaParent(corpo,nPages){
  return /\/Parent\s+\d+\s+0\s+R/.test(corpo)
    ? corpo.replace(/\/Parent\s+\d+\s+0\s+R/,'/Parent '+nPages+' 0 R')
    : corpo.replace(/<<\s*/,'<< /Parent '+nPages+' 0 R ');
}
