// ---------------------------------------------------------------------
// PDF: estrazione del testo senza librerie (per proporre i dati del PSC) e inflate in JavaScript
// (riserva quando DecompressionStream non c'è). Copre i casi comuni: flussi FlateDecode, font con
// ToUnicode, codifiche semplici. Per le scansioni senza testo restituisce vuoto: si chiedono i dati.
// ---------------------------------------------------------------------
// ---- inflate (DEFLATE grezzo, RFC 1951) ----
function inflateRaw(dati,dimAttesa){
  let out=new Uint8Array(dimAttesa&&dimAttesa>0?dimAttesa:Math.max(1024,dati.length*4));let outLen=0;
  const assicura=n=>{if(outLen+n>out.length){const nu=new Uint8Array(Math.max(out.length*2,outLen+n));nu.set(out.subarray(0,outLen));out=nu}};
  let pos=0,bitBuf=0,bitCnt=0;
  const bits=n=>{while(bitCnt<n){if(pos>=dati.length)throw new Error('Flusso DEFLATE troncato');bitBuf|=dati[pos++]<<bitCnt;bitCnt+=8}const v=bitBuf&((1<<n)-1);bitBuf>>>=n;bitCnt-=n;return v};
  const costruisci=(lunghezze)=>{const max=Math.max(...lunghezze);const cnt=new Array(max+1).fill(0);for(const l of lunghezze)if(l)cnt[l]++;const next=[0];let code=0;for(let i=1;i<=max;i++){code=(code+cnt[i-1])<<1;next[i]=code}const map=new Map();for(let i=0;i<lunghezze.length;i++){const l=lunghezze[i];if(!l)continue;let c=next[l]++;let rev=0;for(let k=0;k<l;k++){rev=(rev<<1)|(c&1);c>>=1}map.set(l*65536+rev,i)}return {map,max}};
  const decodifica=t=>{let code=0;for(let l=1;l<=t.max;l++){code|=bits(1)<<(l-1);const s=t.map.get(l*65536+code);if(s!==undefined)return s}throw new Error('Codice Huffman non valido')};
  const LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  let fissoL=null,fissoD=null;
  let fine=false;
  while(!fine){
    fine=bits(1)===1;const tipo=bits(2);
    if(tipo===0){bitBuf=0;bitCnt=0;const len=dati[pos]|(dati[pos+1]<<8);pos+=4;assicura(len);out.set(dati.subarray(pos,pos+len),outLen);outLen+=len;pos+=len;continue}
    let tl,td;
    if(tipo===1){if(!fissoL){const l=new Array(288).fill(8);for(let i=144;i<256;i++)l[i]=9;for(let i=256;i<280;i++)l[i]=7;fissoL=costruisci(l);fissoD=costruisci(new Array(30).fill(5))}tl=fissoL;td=fissoD}
    else if(tipo===2){const hlit=bits(5)+257,hdist=bits(5)+1,hclen=bits(4)+4;const ord=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];const cl=new Array(19).fill(0);for(let i=0;i<hclen;i++)cl[ord[i]]=bits(3);const tc=costruisci(cl);const lens=[];while(lens.length<hlit+hdist){const s=decodifica(tc);if(s<16)lens.push(s);else if(s===16){const p=lens[lens.length-1];const n=3+bits(2);for(let i=0;i<n;i++)lens.push(p)}else if(s===17){const n=3+bits(3);for(let i=0;i<n;i++)lens.push(0)}else{const n=11+bits(7);for(let i=0;i<n;i++)lens.push(0)}}tl=costruisci(lens.slice(0,hlit));td=costruisci(lens.slice(hlit))}
    else throw new Error('Tipo di blocco DEFLATE non valido');
    while(true){const s=decodifica(tl);if(s<256){assicura(1);out[outLen++]=s}else if(s===256)break;else{const li=s-257;const len=LB[li]+bits(LE[li]);const di=decodifica(td);const dist=DB[di]+bits(DE[di]);assicura(len);for(let i=0;i<len;i++){out[outLen]=out[outLen-dist];outLen++}}}
  }
  return out.subarray(0,outLen);
}
// zlib (RFC 1950) = 2 byte di testa + deflate + adler
async function inflateZlib(dati){
  if(dati.length>2&&(dati[0]&0x0f)===8&&((dati[0]<<8)|dati[1])%31===0){
    if(typeof DecompressionStream==='function'){try{const ds=new DecompressionStream('deflate');const w=ds.writable.getWriter();w.write(dati);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer())}catch(e){}}
    return inflateRaw(dati.subarray(2));
  }
  return inflateRaw(dati);
}
// ---- lettura PDF ----
function latin1(bytes,da,a){let s='';const CH=8192;for(let i=da;i<a;i+=CH)s+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(a,i+CH)));return s}
async function estraiTestoPdf(blob,avanzamento){
  const bytes=new Uint8Array(await leggiComeArrayBuffer(blob));
  const testo=latin1(bytes,0,bytes.length);
  // 1) tutti gli oggetti "n g obj ... endobj" (senza fidarsi della xref)
  const oggetti=new Map();
  const re=/(\d+)\s+(\d+)\s+obj\b/g;let m;
  while((m=re.exec(testo))){const inizio=m.index+m[0].length;const fine=testo.indexOf('endobj',inizio);if(fine<0)break;oggetti.set(+m[1],{inizio,fine,dict:testo.slice(inizio,Math.min(fine,inizio+4000))});re.lastIndex=fine}
  const flusso=async(o)=>{const si=testo.indexOf('stream',o.inizio);if(si<0||si>o.fine)return null;let ds=si+6;if(testo[ds]==='\r')ds++;if(testo[ds]==='\n')ds++;const lm=/\/Length\s+(\d+)(?:\s+0\s+R)?/.exec(o.dict);let len=lm?+lm[1]:null;if(lm&&/R/.test(lm[0])){const lo=oggetti.get(+lm[1]);len=lo?parseInt(testo.slice(lo.inizio,lo.fine)):null}let de=len!=null?ds+len:testo.indexOf('endstream',ds);if(de>o.fine||de<ds)de=testo.indexOf('endstream',ds);let dati=bytes.subarray(ds,de);const filtri=(o.dict.match(/\/Filter\s*(?:\[([^\]]*)\]|\/(\w+))/)||[]);const f=(filtri[1]||filtri[2]||'');if(/FlateDecode/.test(f)){try{dati=await inflateZlib(dati)}catch(e){return null}}else if(f&&!/DCT|JPX|CCITT/.test(f)){return null}return dati};
  // 2) espandi gli object stream (PDF 1.5+)
  for(const [num,o] of Array.from(oggetti.entries())){if(!/\/Type\s*\/ObjStm/.test(o.dict))continue;const d=await flusso(o);if(!d)continue;const s=latin1(d,0,d.length);const nm=/\/N\s+(\d+)/.exec(o.dict),fm=/\/First\s+(\d+)/.exec(o.dict);if(!nm||!fm)continue;const testa=s.slice(0,+fm[1]).trim().split(/\s+/).map(Number);for(let i=0;i<+nm[1];i++){const on=testa[i*2],off=testa[i*2+1];const next=i+1<+nm[1]?testa[i*2+3]:s.length-+fm[1];const corpo=s.slice(+fm[1]+off,+fm[1]+next);if(!oggetti.has(on))oggetti.set(on,{inizio:0,fine:0,dict:corpo.slice(0,4000),inline:corpo})}}
  const dictDi=n=>{const o=oggetti.get(n);return o?(o.inline!==undefined?o.inline:o.dict):''};
  // 3) pagine
  const pagine=[];for(const [num,o] of oggetti){const d=o.inline!==undefined?o.inline:o.dict;if(/\/Type\s*\/Page\b/.test(d)&&!/\/Type\s*\/Pages/.test(d))pagine.push({num,dict:d})}
  pagine.sort((a,b)=>a.num-b.num);
  // 4) font → mappa codice → testo
  const cacheFont=new Map();
  const mappaFont=async(ref)=>{if(cacheFont.has(ref))return cacheFont.get(ref);const d=dictDi(ref);const f={due:/\/Subtype\s*\/Type0/.test(d),mappa:null};const tu=/\/ToUnicode\s+(\d+)\s+0\s+R/.exec(d);if(tu){const o=oggetti.get(+tu[1]);const dati=o?(o.inline!==undefined?codificatoreUtf8.encode(o.inline):await flusso(o)):null;if(dati){f.mappa=leggiCMap(latin1(dati,0,dati.length))}}if(!f.mappa&&/\/Encoding\s*\/(WinAnsi|MacRoman|Standard)/.test(d)){f.mappa=null}cacheFont.set(ref,f);return f};
  const risorseFont=async(dict)=>{const out=new Map();let res=dict;const rr=/\/Resources\s+(\d+)\s+0\s+R/.exec(dict);if(rr)res=dictDi(+rr[1]);let fontDict='';const fm=/\/Font\s+(\d+)\s+0\s+R/.exec(res);if(fm)fontDict=dictDi(+fm[1]);else{const fi=/\/Font\s*<<([\s\S]*?)>>/.exec(res);if(fi)fontDict=fi[1]}const rf=/\/(\w+)\s+(\d+)\s+0\s+R/g;let x;while((x=rf.exec(fontDict)))out.set(x[1],await mappaFont(+x[2]));return out};
  let tutto='';const paginaTesti=[];
  for(let i=0;i<pagine.length;i++){
    const p=pagine[i];if(avanzamento)await avanzamento(i+1,pagine.length);
    const fonts=await risorseFont(p.dict);
    let contenuti=[];const cm=/\/Contents\s*(?:\[([^\]]*)\]|(\d+)\s+0\s+R)/.exec(p.dict);if(cm){const refs=cm[1]?Array.from(cm[1].matchAll(/(\d+)\s+0\s+R/g)).map(x=>+x[1]):[+cm[2]];for(const r of refs){const o=oggetti.get(r);if(!o)continue;const d=await flusso(o);if(d)contenuti.push(latin1(d,0,d.length))}}
    const testoPagina=estraiTestoContenuto(contenuti.join('\n'),fonts);
    paginaTesti.push(testoPagina);
    tutto+=testoPagina+'\n\n';
  }
  return {testo:tutto,pagine:paginaTesti};
}
function leggiCMap(s){
  const mappa=new Map();let m;
  const reChar=/beginbfchar([\s\S]*?)endbfchar/g;while((m=reChar.exec(s))){const re2=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;let x;while((x=re2.exec(m[1]))){mappa.set(parseInt(x[1],16),hexAUnicode(x[2]))}}
  const reRange=/beginbfrange([\s\S]*?)endbfrange/g;while((m=reRange.exec(s))){const re2=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]*)\])/g;let x;while((x=re2.exec(m[1]))){const a=parseInt(x[1],16),b=parseInt(x[2],16);if(x[4]){const arr=Array.from(x[4].matchAll(/<([0-9a-fA-F]+)>/g)).map(y=>hexAUnicode(y[1]));for(let c=a,i=0;c<=b&&i<arr.length;c++,i++)mappa.set(c,arr[i])}else{const base=parseInt(x[3],16);for(let c=a;c<=b&&c-a<65536;c++)mappa.set(c,String.fromCodePoint(base+(c-a)))}}}
  return mappa;
}
function hexAUnicode(hx){let s='';for(let i=0;i+3<hx.length+1;i+=4){const cp=parseInt(hx.slice(i,i+4),16);if(!isNaN(cp))s+=String.fromCharCode(cp)}return s.replace(/[\uD800-\uDFFF]/g,'')}
function estraiTestoContenuto(c,fonts){
  let out='';let font=null;let ultimaY=null;let corpo=10;// dimensione del carattere corrente: serve a distinguere un vero a-capo da una parola posizionata
  const tok=/\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|\/[^\s\/\[\]<>(]+|-?\d*\.?\d+|[A-Za-z'"*]+/g;
  const stack=[];let m;
  const decodifica=(s)=>{let codici=[];if(s[0]==='<'){const hx=s.slice(1,-1).replace(/\s/g,'');const passo=font&&font.due?4:2;for(let i=0;i<hx.length;i+=passo)codici.push(parseInt(hx.slice(i,i+passo),16))}else{const raw=s.slice(1,-1).replace(/\\([nrtbf()\\]|\d{1,3})/g,(x,e)=>({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','(':'(',')':')','\\':'\\'})[e]||String.fromCharCode(parseInt(e,8)));if(font&&font.due){for(let i=0;i<raw.length;i+=2)codici.push((raw.charCodeAt(i)<<8)|raw.charCodeAt(i+1))}else for(let i=0;i<raw.length;i++)codici.push(raw.charCodeAt(i))}
    return codici.map(cd=>{if(font&&font.mappa&&font.mappa.has(cd))return font.mappa.get(cd);if(font&&font.due)return '';return String.fromCharCode(cd)}).join('')};
  while((m=tok.exec(c))){const t=m[0];
    if(t==='Tf'){const nome=stack.filter(x=>typeof x==='string'&&x[0]==='/').pop();font=nome?fonts.get(nome.slice(1))||null:null;const nn=stack.filter(x=>typeof x==='number');if(nn.length&&nn[nn.length-1]>0)corpo=nn[nn.length-1];stack.length=0;continue}
    if(t==='Tj'||t==="'"||t==='"'){const s=stack.filter(x=>typeof x==='string'&&(x[0]==='('||x[0]==='<')).pop();if(t!=='Tj')out+='\n';if(s)out+=decodifica(s);stack.length=0;continue}
    if(t==='TJ'){let inArr=false;for(const x of stack){if(x==='[')inArr=true;else if(x===']')inArr=false;else if(typeof x==='string'&&(x[0]==='('||x[0]==='<'))out+=decodifica(x);else if(typeof x==='number'&&x<-180)out+=' '}stack.length=0;continue}
    if(t==='Td'||t==='TD'){const n=stack.filter(x=>typeof x==='number');const ty=n[n.length-1];if(ty!==undefined&&Math.abs(ty)>Math.max(2,corpo*0.6))out+='\n';else out+=' ';if(ty!==undefined&&ultimaY!==null)ultimaY+=ty;stack.length=0;continue}
    if(t==='Tm'){const n=stack.filter(x=>typeof x==='number');const y=n[n.length-1];const sc=Math.abs(n[n.length-3]||1);const soglia=Math.max(2,corpo*sc*0.6);if(ultimaY!==null&&y!==undefined&&Math.abs(y-ultimaY)>soglia)out+='\n';else out+=' ';if(y!==undefined)ultimaY=y;stack.length=0;continue}
    if(t==='T*'){out+='\n';stack.length=0;continue}
    if(t==='ET'){out+='\n';stack.length=0;continue}
    if(/^-?\d*\.?\d+$/.test(t))stack.push(parseFloat(t));else if(/^[A-Za-z'"*]+$/.test(t)){if(stack.length>40)stack.length=0;}else stack.push(t);
  }
  return out.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n');
}
// ---- proposte dal testo del PSC (mai imposte) ----
function proponiDatiDaPsc(testo){
  const t=testo.replace(/\r/g,'');
  const righe=t.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
  const out={};
  const pulisci=v=>v.replace(/^[\s:：.\-–]+/,'').replace(/[;,.:\-–\s]+$/,'').replace(/\s{2,}/g,' ').trim();
  const plausibile=v=>v&&v.length>=3&&v.length<=140&&/^[A-ZÀ-Ü0-9"«(]/.test(v)&&!/^(che|il|la|le|i|gli|del|della|di|da|per|con|non|sulla|sul|nel|nella|e|ed|o)\b/i.test(v);
  // Cerca "Etichetta: valore" (anche sulla riga successiva). Senza i due punti accetta solo etichette lunghe e valori plausibili.
  const cerca=(etichette,opz)=>{opz=opz||{};
    for(const et of etichette){const reColon=new RegExp('^'+et+'\\s*[:：]\\s*(.*)$','i');
      for(let i=0;i<righe.length;i++){const m=reColon.exec(righe[i]);if(m){let v=pulisci(m[1]);if(!v&&righe[i+1])v=pulisci(righe[i+1]);if(plausibile(v))return v}}}
    if(opz.soloColon) return null;
    for(const et of etichette){if(et.replace(/\\/g,'').length<8)continue;const re=new RegExp('^'+et+'\\s+(.*)$','i');
      for(let i=0;i<righe.length;i++){const m=re.exec(righe[i]);if(m){const v=pulisci(m[1]);if(plausibile(v)&&!/^(è|e |sono|deve|dovrà|per |che )/i.test(m[1]))return v}}}
    return null;};
  out.committente=cerca(['committente','committenza','il committente']);
  out.affidataria=cerca(['impresa affidataria','affidataria','impresa esecutrice principale','appaltatore'],{soloColon:true});
  const ind=cerca(['indirizzo del cantiere','ubicazione del cantiere','indirizzo cantiere','cantiere sito in','ubicazione','indirizzo']);
  if(ind){out.indirizzo=ind;const capM=/\b(\d{5})\b/.exec(ind);if(capM)out.cap=capM[1];const cm=/(?:\d{5}\s+)?([A-ZÀ-Ü][a-zà-ü']+(?:\s+[A-ZÀ-Ü][a-zà-ü']+)*)\s*\(([A-Z]{2})\)/.exec(ind);if(cm){out.comune=cm[1];out.provincia=cm[2]}}
  if(!out.comune){const c=cerca(['comune'],{soloColon:true});if(c&&c.length<40){const cm=/^([^(]+?)\s*(?:\(([A-Z]{2})\))?$/.exec(c);if(cm){out.comune=cm[1].trim();if(cm[2])out.provincia=cm[2]}}}
  if(!out.comune){const m=/\bComune di ([A-ZÀ-Ü][a-zà-ü']+(?:\s+[A-ZÀ-Ü][a-zà-ü']+){0,2})\s*(?:\(([A-Z]{2})\))?/.exec(t);if(m){out.comune=m[1];if(m[2])out.provincia=m[2]}}
  if(!out.cap){const c=cerca(['cap','c\\.a\\.p\\.'],{soloColon:true});if(c&&/^\d{5}/.test(c))out.cap=c.slice(0,5)}
  out.progettista=cerca(['progettista','progettazione architettonica','progettista architettonico']);
  out.direttoreLavori=cerca(['direttore dei lavori','direzione lavori','direttore lavori','d\\.l\\.']);
  out.cse=cerca(['coordinatore per la sicurezza in fase di esecuzione','coordinatore in fase di esecuzione','coordinatore per l\'esecuzione','coordinatore della sicurezza in fase di esecuzione','coordinatore per la sicurezza in fase di progettazione ed esecuzione','coordinatore sicurezza esecuzione','cse','c\\.s\\.e\\.']);
  out.csp=cerca(['coordinatore per la sicurezza in fase di progettazione','coordinatore in fase di progettazione','coordinatore per la progettazione','coordinatore sicurezza progettazione','csp','c\\.s\\.p\\.']);
  if(!out.csp&&out.cse&&/progettazione ed? esecuzione|progettazione e esecuzione/i.test(t))out.csp=out.cse;
  const dm=/(?:revisione|data|emesso|emissione)\s*[:：]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4})/i.exec(t);
  if(dm){const d=interpretaData(dm[1]);if(d)out.dataPsc=d;else{const mm=/(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i.exec(dm[1]);if(mm)out.dataPsc=mm[2]+'-'+pad2(NOMI_MESI.indexOf(mm[1].toLowerCase())+1)+'-01'}}
  out.redattore=cerca(['redatto da','il coordinatore','redattore'],{soloColon:true});
  for(const k of Object.keys(out)){if(!out[k]||(typeof out[k]==='string'&&out[k].length>140))delete out[k]}
  return out;
}
