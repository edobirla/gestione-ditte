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
    // le lettere messe una a una si riuniscono in una parola sola se stanno sulla stessa riga e vicine
    if(ult&&ult.t==='testo'&&Math.abs(ult.y-(altezza-y))<0.6&&Math.abs(ult.dim-dim)<0.6&&x-ult.xFine<dim*0.9&&x>=ult.xFine-dim*0.2){
      ult.testo+=(x-ult.xFine>dim*0.22?' ':'')+testo;ult.xFine=x+testo.length*dim*0.5;return;
    }
    elementi.push({t:'testo',x,y:altezza-y,dim,testo,grassetto,xFine:x+testo.length*dim*0.5});
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
