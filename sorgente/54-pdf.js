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
// ---- decifratura PDF (Standard Security Handler, password utente vuota) ----
// Molti PDF "ufficiali" (visure camerali, certificati) sono protetti da modifica ma liberi da
// leggere: hanno comunque la password utente vuota da applicare secondo lo standard, altrimenti
// ogni flusso resta un blocco di rumore e l'inflate fallisce (o peggio, non fallisce e produce
// spazzatura). Serve solo MD5 e RC4 fatti a mano: l'AES lo fa il browser (Web Crypto).
function md5(bytes){
  const K=new Int32Array(64);for(let i=0;i<64;i++)K[i]=(Math.floor(Math.abs(Math.sin(i+1))*4294967296))|0;
  const S=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const msgLen=bytes.length;
  let totale=Math.ceil((msgLen+9)/64)*64;
  const buf=new Uint8Array(totale);buf.set(bytes,0);buf[msgLen]=0x80;
  const dv=new DataView(buf.buffer);
  dv.setUint32(totale-8,(msgLen*8)>>>0,true);dv.setUint32(totale-4,Math.floor(msgLen/536870912),true);
  let a0=0x67452301,b0=0xefcdab89|0,c0=0x98badcfe|0,d0=0x10325476;
  const rotl=(x,n)=>(x<<n)|(x>>>(32-n));
  for(let off=0;off<totale;off+=64){
    const M=new Int32Array(16);for(let i=0;i<16;i++)M[i]=dv.getInt32(off+i*4,true);
    let A=a0,B=b0,C=c0,D=d0;
    for(let i=0;i<64;i++){
      let F,g;
      if(i<16){F=(B&C)|(~B&D);g=i} else if(i<32){F=(D&B)|(~D&C);g=(5*i+1)%16}
      else if(i<48){F=B^C^D;g=(3*i+5)%16} else {F=C^(B|~D);g=(7*i)%16}
      F=(F+A+K[i]+M[g])|0; A=D;D=C;C=B; B=(B+rotl(F,S[i]))|0;
    }
    a0=(a0+A)|0;b0=(b0+B)|0;c0=(c0+C)|0;d0=(d0+D)|0;
  }
  const out=new Uint8Array(16);const od=new DataView(out.buffer);
  od.setInt32(0,a0,true);od.setInt32(4,b0,true);od.setInt32(8,c0,true);od.setInt32(12,d0,true);
  return out;
}
function rc4(chiave,dati){
  const S=new Uint8Array(256);for(let i=0;i<256;i++)S[i]=i;
  let j=0;for(let i=0;i<256;i++){j=(j+S[i]+chiave[i%chiave.length])&255;const t=S[i];S[i]=S[j];S[j]=t}
  const out=new Uint8Array(dati.length);let i=0;j=0;
  for(let k=0;k<dati.length;k++){i=(i+1)&255;j=(j+S[i])&255;const t=S[i];S[i]=S[j];S[j]=t;out[k]=dati[k]^S[(S[i]+S[j])&255]}
  return out;
}
async function aesCbcDecifra(chiave,dati){
  if(dati.length<=16) return new Uint8Array(0);
  try{
    const k=await crypto.subtle.importKey('raw',chiave,{name:'AES-CBC'},false,['decrypt']);
    return new Uint8Array(await crypto.subtle.decrypt({name:'AES-CBC',iv:dati.subarray(0,16)},k,dati.subarray(16)));
  }catch(e){return new Uint8Array(0)}
}
const PDF_PAD=Uint8Array.from([0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A]);
// Algoritmo 2 (spec PDF 1.7): chiave del file da password utente vuota + /O + /P + /ID + parametri
function chiaveFilePdf(O,P,idPrimo,keyLenByte,revisione,cifraMetadati){
  const coda=(revisione>=4&&!cifraMetadati)?Uint8Array.from([0xff,0xff,0xff,0xff]):new Uint8Array(0);
  const buf=new Uint8Array(PDF_PAD.length+O.length+4+idPrimo.length+coda.length);
  let off=0;buf.set(PDF_PAD,off);off+=PDF_PAD.length;buf.set(O,off);off+=O.length;
  new DataView(buf.buffer,off,4).setInt32(0,P,true);off+=4;
  buf.set(idPrimo,off);off+=idPrimo.length;buf.set(coda,off);
  let hash=md5(buf);
  if(revisione>=3) for(let i=0;i<50;i++) hash=md5(hash.subarray(0,keyLenByte));
  return hash.subarray(0,keyLenByte);
}
// Algoritmo 1: chiave per-oggetto, derivata dalla chiave del file più numero e generazione
function chiaveOggettoPdf(fileKey,num,gen,aes){
  const extra=aes?4:0;
  const buf=new Uint8Array(fileKey.length+5+extra);
  buf.set(fileKey,0);
  buf[fileKey.length]=num&255;buf[fileKey.length+1]=(num>>8)&255;buf[fileKey.length+2]=(num>>16)&255;
  buf[fileKey.length+3]=gen&255;buf[fileKey.length+4]=(gen>>8)&255;
  if(aes) buf.set([0x73,0x41,0x6C,0x54],fileKey.length+5); // "sAlT"
  return md5(buf).subarray(0,Math.min(fileKey.length+5,16));
}
// Legge una stringa PDF "(...)" (con le sue barre di escape) o "<esadecimale>" come byte grezzi
function stringaPdfByte(dict,nome){
  const mTonda=new RegExp('/'+nome+'\\s*\\(((?:\\\\.|[^\\\\)])*)\\)').exec(dict);
  if(mTonda){const raw=mTonda[1];const out=[];for(let i=0;i<raw.length;i++){if(raw[i]==='\\'){const c=raw[i+1];if(c==='n'){out.push(10);i++}else if(c==='r'){out.push(13);i++}else if(c==='t'){out.push(9);i++}else if(/[0-7]/.test(c||'')){const oct=(raw.substr(i+1,3).match(/^[0-7]{1,3}/)||[''])[0];out.push(parseInt(oct,8));i+=oct.length}else{out.push(raw.charCodeAt(i+1));i++}}else out.push(raw.charCodeAt(i)&0xff)}return Uint8Array.from(out)}
  const mHex=new RegExp('/'+nome+'\\s*<([0-9a-fA-F]*)>').exec(dict);
  if(mHex){const hex=mHex[1];const out=new Uint8Array(Math.floor(hex.length/2));for(let i=0;i<out.length;i++)out[i]=parseInt(hex.substr(i*2,2),16);return out}
  return null;
}
// Prepara la funzione di decifratura di un PDF protetto, se lo è: null altrimenti (caso comune)
function preparaDecifraPdf(testo,oggetti){
  const trailerRe=/trailer\s*<<([\s\S]*?)>>/g;let tm,trailer=null;while((tm=trailerRe.exec(testo)))trailer=tm[1];
  if(!trailer) return null;
  const encM=/\/Encrypt\s+(\d+)\s+0\s+R/.exec(trailer);
  const idM=/\/ID\s*\[\s*<([0-9a-fA-F]*)>/.exec(trailer);
  if(!encM||!idM) return null;
  const encObj=oggetti.get(+encM[1]);if(!encObj) return null;
  const ed=encObj.dict;
  if(/\/Filter\s*\/(?!Standard\b)\w+/.test(ed)) return null; // gestori non standard: non gestiti
  const O=stringaPdfByte(ed,'O'),U=stringaPdfByte(ed,'U');
  if(!O||!U) return null;
  const P=parseInt((/\/P\s+(-?\d+)/.exec(ed)||[])[1]||'0',10);
  const R=+((/\/R\s+(\d+)/.exec(ed)||[])[1]||2);
  const V=+((/\/V\s+(\d+)/.exec(ed)||[])[1]||1);
  const lunghezzaBit=+((/\/Length\s+(\d+)/.exec(ed)||[])[1]||40);
  const cifraMetadati=(/\/EncryptMetadata\s+false/.test(ed))?false:true;
  const aes=/AESV2|AESV3/.test(ed);
  if(V>=5) return null; // AES-256/R6: algoritmo diverso (SHA-256), non implementato
  const hex=idM[1];const idPrimo=new Uint8Array(Math.floor(hex.length/2));for(let i=0;i<idPrimo.length;i++)idPrimo[i]=parseInt(hex.substr(i*2,2),16);
  const fileKey=chiaveFilePdf(O,P,idPrimo,Math.max(5,Math.floor(lunghezzaBit/8)),R,cifraMetadati);
  return async(num,gen,dati)=>{const ok=chiaveOggettoPdf(fileKey,num,gen,aes);return aes?await aesCbcDecifra(ok,dati):rc4(ok,dati)};
}
// ---- lettura PDF ----
function latin1(bytes,da,a){let s='';const CH=8192;for(let i=da;i<a;i+=CH)s+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(a,i+CH)));return s}
// Apre il PDF una volta sola e restituisce gli strumenti per leggerlo: oggetti, flussi, pagine,
// font e l'espansione dei Form. Lo usano sia l'estrazione del testo sia la resa della pagina.
async function analizzaPdf(blob){
  const bytes=new Uint8Array(await leggiComeArrayBuffer(blob));
  const testo=latin1(bytes,0,bytes.length);
  // 1) tutti gli oggetti "n g obj ... endobj" (senza fidarsi della xref)
  const oggetti=new Map();
  const re=/(\d+)\s+(\d+)\s+obj\b/g;let m;
  while((m=re.exec(testo))){const inizio=m.index+m[0].length;const fine=testo.indexOf('endobj',inizio);if(fine<0)break;oggetti.set(+m[1],{inizio,fine,dict:testo.slice(inizio,Math.min(fine,inizio+4000)),num:+m[1],gen:+m[2]});re.lastIndex=fine}
  const decifra=preparaDecifraPdf(testo,oggetti);
  const flusso=async(o)=>{const si=testo.indexOf('stream',o.inizio);if(si<0||si>o.fine)return null;let ds=si+6;if(testo[ds]==='\r')ds++;if(testo[ds]==='\n')ds++;const lm=/\/Length\s+(\d+)(?:\s+0\s+R)?/.exec(o.dict);let len=lm?+lm[1]:null;if(lm&&/R/.test(lm[0])){const lo=oggetti.get(+lm[1]);len=lo?parseInt(testo.slice(lo.inizio,lo.fine)):null}let de=len!=null?ds+len:testo.indexOf('endstream',ds);if(de>o.fine||de<ds)de=testo.indexOf('endstream',ds);let dati=bytes.subarray(ds,de);if(decifra&&o.num!==undefined){try{dati=await decifra(o.num,o.gen||0,dati)}catch(e){return null}}const filtri=(o.dict.match(/\/Filter\s*(?:\[([^\]]*)\]|\/(\w+))/)||[]);const f=(filtri[1]||filtri[2]||'');if(/FlateDecode/.test(f)){try{dati=await inflateZlib(dati)}catch(e){return null}}else if(f&&!/DCT|JPX|CCITT/.test(f)){return null}return dati};
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
  // Il testo può non stare nel contenuto della pagina: molti generatori (TeamSystem, per esempio)
  // mettono tutta la pagina dentro un XObject di tipo Form richiamato con "/Fm1 Do". Senza seguirlo
  // la pagina risulta vuota — è il motivo per cui le buste paga non si riuscivano a leggere.
  const risorseDi=(dict)=>{const rr=/\/Resources\s+(\d+)\s+0\s+R/.exec(dict);if(rr)return dictDi(+rr[1]);const ri=/\/Resources\s*<<([\s\S]*?)>>\s*(?:\/|>>)/.exec(dict);return ri?ri[0]:dict};
  const formDi=(res)=>{const out=new Map();let xo='';const xm=/\/XObject\s+(\d+)\s+0\s+R/.exec(res);if(xm)xo=dictDi(+xm[1]);else{const xi=/\/XObject\s*<<([\s\S]*?)>>/.exec(res);if(xi)xo=xi[1]}const rf=/\/([^\s\/\]<>]+)\s+(\d+)\s+0\s+R/g;let x;while((x=rf.exec(xo)))out.set(x[1],+x[2]);return out};
  // Espande i "Do" dei Form dentro il contenuto e raccoglie i font di ogni risorsa incontrata
  const espandi=async(contenuto,dict,fonts,profondita)=>{
    if(profondita>4) return contenuto;
    const res=risorseDi(dict);
    const forms=formDi(res);
    if(!forms.size) return contenuto;
    const re=/\/([^\s\/\[\]<>]+)\s+Do\b/g;let m,out='',ultimo=0;
    while((m=re.exec(contenuto))){
      out+=contenuto.slice(ultimo,m.index);ultimo=m.index+m[0].length;
      const ref=forms.get(m[1]);if(ref===undefined)continue;
      const o=oggetti.get(ref);if(!o||!/\/Subtype\s*\/Form/.test(o.dict))continue;
      const dati=await flusso(o);if(!dati)continue;
      for(const [k,v] of await risorseFont(o.dict)) if(!fonts.has(k)) fonts.set(k,v);
      out+='\nq\n'+await espandi(latin1(dati,0,dati.length),o.dict,fonts,profondita+1)+'\nQ\n';
    }
    return out+contenuto.slice(ultimo);
  };
  // contenuto completo di una pagina, con i Form già espansi, e i suoi font
  const contenutoPagina=async(i)=>{
    const p=pagine[i];if(!p)return null;
    const fonts=await risorseFont(p.dict);
    let contenuti=[];const cm=/\/Contents\s*(?:\[([^\]]*)\]|(\d+)\s+0\s+R)/.exec(p.dict);if(cm){const refs=cm[1]?Array.from(cm[1].matchAll(/(\d+)\s+0\s+R/g)).map(x=>+x[1]):[+cm[2]];for(const r of refs){const o=oggetti.get(r);if(!o)continue;const d=await flusso(o);if(d)contenuti.push(latin1(d,0,d.length))}}
    return {contenuto:await espandi(contenuti.join('\n'),p.dict,fonts,0),fonts,dict:p.dict};
  };
  const corpo=(n)=>{const o=oggetti.get(n);return o?(o.inline!==undefined?o.inline:testo.slice(o.inizio,o.fine)):''};
  return {pagine,contenutoPagina,oggetti,flusso,dictDi,corpo,bytes,cifrato:!!decifra};
}
async function estraiTestoPdf(blob,avanzamento){
  const pdf=await analizzaPdf(blob);
  let tutto='';const paginaTesti=[];
  for(let i=0;i<pdf.pagine.length;i++){
    if(avanzamento)await avanzamento(i+1,pdf.pagine.length);
    const c=await pdf.contenutoPagina(i);
    const testoPagina=c?estraiTestoContenuto(c.contenuto,c.fonts):'';
    paginaTesti.push(testoPagina);
    tutto+=testoPagina+'\n\n';
  }
  return {testo:tutto,pagine:paginaTesti};
}
// ---------------------------------------------------------------------
// RIDUZIONE PESO DI UN PDF: quasi sempre il peso sta nelle fotografie incorporate (una scansione o
// una foto incollata, mai ricompressa). Si ricomprimono con lo stesso motore delle immagini
// dell'archivio e si riscrive il PDF con le stesse pagine e la stessa struttura, sostituendo solo
// quei flussi — stesso principio già usato per estraiPaginePdf.
// ponytail: non tocca i PDF cifrati (andrebbe riscritta anche la cifratura) né quelli con object
// stream (rischierebbe di perdere oggetti che stanno solo lì dentro): in quei casi restituisce null.
async function comprimiPdf(blob,opz){
  opz=Object.assign({maxLato:1600,obiettivoKb:150},opz||{});
  const pdf=await analizzaPdf(blob);
  if(pdf.cifrato) return null;
  if(Array.from(pdf.oggetti.values()).some(o=>o.inline!==undefined)) return null;
  const sostituzioni=new Map();
  // Le trasparenze (SMask/Mask, tipiche delle firme incollate come immagine) e le maschere a 1 bit non si
  // toccano: diventate JPEG a colori non sono più maschere valide e l'immagine che ritagliano sparisce.
  const maschere=new Set();
  for(const o of pdf.oggetti.values()) for(const m of o.dict.matchAll(/\/S?Mask\s+(\d+)\s+\d+\s+R/g)) maschere.add(+m[1]);
  for(const [num,o] of pdf.oggetti){
    if(!/\/Subtype\s*\/Image/.test(o.dict)) continue;
    if(maschere.has(num)||/\/ImageMask\s+true/.test(o.dict)||/\/Mask\s*\[/.test(o.dict)) continue;
    // Immagini CMYK (rare ma non rarissime da alcuni scanner): il canvas del browser non le
    // decodifica in modo affidabile, spesso vengono fuori nere o con i colori invertiti. Meglio
    // lasciarle come sono che rischiare di rovinare il documento per risparmiare qualche KB.
    if(componentiColorSpace(pdf,o.dict)===4) continue;
    const dati=await pdf.flusso(o); if(!dati||!dati.length) continue;
    let sorgente=null;const eraJpeg=/\/DCTDecode/.test(o.dict);
    if(eraJpeg) sorgente=new Blob([dati],{type:'image/jpeg'});
    else if(/\/FlateDecode/.test(o.dict)){ const durl=await bitmapGrezzoADataUrl(dati,o.dict,pdf); if(durl) sorgente=dataUrlABlob(durl); }
    if(!sorgente||sorgente.size<40*1024) continue; // le immagini piccole non valgono lo sforzo
    try{
      const c=await comprimiImmagine(sorgente,{maxLato:opz.maxLato,obiettivo:opz.obiettivoKb*1024,qualitaMin:0.4});
      if(c.blob.size<sorgente.size*0.85){ c.eraJpeg=eraJpeg; sostituzioni.set(num,c); }
    }catch(e){}
  }
  if(!sostituzioni.size) return null;
  return riscriviPdfConImmagini(pdf,sostituzioni);
}
// Alcuni programmi (UPDF, per esempio) salvano la trasparenza di una firma incollata come JPEG a colori:
// lo standard la vuole in scala di grigi, e Safari e gli altri lettori allora non disegnano la firma (o la
// disegnano a righe). Si rifà quella maschera in grigio, il resto del file resta byte per byte com'era.
// null se non c'è niente da riparare o se il file non si può riscrivere (cifrato, object stream).
async function riparaMascherePdf(blob){
  const pdf=await analizzaPdf(blob);
  if(pdf.cifrato||Array.from(pdf.oggetti.values()).some(o=>o.inline!==undefined)) return null;
  const maschere=new Set();for(const o of pdf.oggetti.values()) for(const m of o.dict.matchAll(/\/SMask\s+(\d+)\s+\d+\s+R/g)) maschere.add(+m[1]);
  const sostituzioni=new Map();
  for(const n of maschere){
    const o=pdf.oggetti.get(n);if(!o||!/\/DCTDecode/.test(o.dict)||componentiColorSpace(pdf,o.dict)!==3) continue;
    const img=await caricaImmagine(new Blob([await pdf.flusso(o)],{type:'image/jpeg'}));
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0);
    const px=g.getImageData(0,0,w,h).data;const grigio=new Uint8Array(w*h);for(let i=0,k=0;k<grigio.length;i+=4,k++)grigio[k]=px[i];
    const f=await comprimiFlate(grigio);
    sostituzioni.set(n,{dict:`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8${f.flate?' /Filter /FlateDecode':''} /Length ${f.dati.length} >>`,grezzo:f.dati});
  }
  return sostituzioni.size?riscriviPdfConImmagini(pdf,sostituzioni):null;
}
// o.dict è catturato da analizzaPdf come "fino a 4000 caratteri dall'inizio dell'oggetto", per
// motivi di prestazioni: per un'immagine con uno stream grande, questo include davvero anche i
// primi migliaia di byte grezzi dello stream stesso (tutto quello che segue "stream\n" finché non
// si arriva a 4000 caratteri). Per farci normali .test()/.exec() non è mai stato un problema: il
// dizionario vero viene comunque per primo. Qui però il dizionario si RISCRIVE per intero, quindi
// quella coda va tolta: altrimenti finisce incollata fra il nostro "stream\n" e i byte nuovi,
// spostando tutto quello che segue e rovinando l'immagine (l'ha fatta uscire nera).
function dizionarioVero(s){
  let profondita=0;
  for(let i=0;i<s.length-1;i++){
    if(s[i]==='<'&&s[i+1]==='<'){profondita++;i++;continue}
    if(s[i]==='>'&&s[i+1]==='>'){profondita--;i++;if(profondita===0)return s.slice(0,i+1)}
  }
  return s;
}
async function riscriviPdfConImmagini(pdf,sostituzioni){
  const testoOriginale=latin1(pdf.bytes,0,pdf.bytes.length);
  const pezzi=[];let lunghezza=0;
  const scrivi=(x)=>{const b=typeof x==='string'?byte(x):x;pezzi.push(b);lunghezza+=b.length};
  scrivi('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
  const posizioni=new Map();
  const numeri=Array.from(pdf.oggetti.keys()).sort((a,b)=>a-b);
  for(const n of numeri){
    const o=pdf.oggetti.get(n);
    posizioni.set(n,lunghezza);
    if(sostituzioni.has(n)&&sostituzioni.get(n).grezzo){
      const c=sostituzioni.get(n);scrivi(n+' 0 obj\n'+c.dict+'\nstream\n');scrivi(c.grezzo);scrivi('\nendstream\nendobj\n');
    }else if(sostituzioni.has(n)){
      const c=sostituzioni.get(n);
      const nuovo=new Uint8Array(await c.blob.arrayBuffer());
      let dict=dizionarioVero(o.dict);
      dict=dict.replace(/\/Filter\s*(?:\[[^\]]*\]|\/\w+)/,'/Filter/DCTDecode');
      dict=dict.replace(/\/DecodeParms\s*(?:\[[^\]]*\]|<<[\s\S]*?>>)/,'');
      // Un /Decode sull'originale va tolto solo se la fonte era già un JPEG: il decoder nativo del
      // browser lo ignora (decodifica lo standard JPEG e basta), quindi il pixel che otteniamo è già
      // "finale" e un vecchio Decode invertirebbe di nuovo. Se invece la fonte era un bitmap grezzo,
      // bitmapGrezzoADataUrl legge i byte così come sono (senza applicare Decode): lasciarlo intatto
      // fa sì che un lettore lo applichi uguale a prima, con lo stesso risultato di sempre.
      if(c.eraJpeg) dict=dict.replace(/\/Decode\s*\[[^\]]*\]/,'');
      dict=dict.replace(/\/Length\s+\d+(\s+0\s+R)?/,'/Length '+nuovo.length);
      dict=dict.replace(/\/Width\s+\d+/,'/Width '+c.larghezza).replace(/\/Height\s+\d+/,'/Height '+c.altezza);
      dict=dict.replace(/\/ColorSpace\s*(?:\[[^\]]*\]|\/\w+|\d+\s+0\s+R)/,'/ColorSpace/DeviceRGB'); // il canvas produce sempre RGB
      scrivi(n+' 0 obj\n'+dict+'\nstream\n');scrivi(nuovo);scrivi('\nendstream\nendobj\n');
    }else{
      scrivi(n+' 0 obj');scrivi(pdf.bytes.subarray(o.inizio,o.fine));scrivi('endobj\n');
    }
  }
  const inizioXref=lunghezza;
  const totale=numeri[numeri.length-1]+1;
  let xref='xref\n0 '+totale+'\n0000000000 65535 f \n';
  for(let n=1;n<totale;n++){const p=posizioni.get(n);xref+=p!==undefined?String(p).padStart(10,'0')+' 00000 n \n':'0000000000 65535 f \n'}
  scrivi(xref);
  const trailerM=/trailer\s*<<([\s\S]*?)>>/g;let tm,trailer=null;while((tm=trailerM.exec(testoOriginale)))trailer=tm[1];
  const rootM=trailer&&/\/Root\s+(\d+)\s+0\s+R/.exec(trailer);
  scrivi('trailer\n<< /Size '+totale+(rootM?' /Root '+rootM[1]+' 0 R':'')+' >>\nstartxref\n'+inizioXref+'\n%%EOF\n');
  return new Blob(pezzi,{type:'application/pdf'});
}
function leggiCMap(s){
  const mappa=new Map();let m;
  const reChar=/beginbfchar([\s\S]*?)endbfchar/g;while((m=reChar.exec(s))){const re2=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;let x;while((x=re2.exec(m[1]))){mappa.set(parseInt(x[1],16),hexAUnicode(x[2]))}}
  const reRange=/beginbfrange([\s\S]*?)endbfrange/g;while((m=reRange.exec(s))){const re2=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]*)\])/g;let x;while((x=re2.exec(m[1]))){const a=parseInt(x[1],16),b=parseInt(x[2],16);if(x[4]){const arr=Array.from(x[4].matchAll(/<([0-9a-fA-F]+)>/g)).map(y=>hexAUnicode(y[1]));for(let c=a,i=0;c<=b&&i<arr.length;c++,i++)mappa.set(c,arr[i])}else{const base=parseInt(x[3],16);for(let c=a;c<=b&&c-a<65536;c++)mappa.set(c,String.fromCodePoint(base+(c-a)))}}}
  return mappa;
}
function hexAUnicode(hx){let s='';for(let i=0;i+3<hx.length+1;i+=4){const cp=parseInt(hx.slice(i,i+4),16);if(!isNaN(cp))s+=String.fromCharCode(cp)}return s.replace(/[\uD800-\uDFFF]/g,'')}
function estraiTestoContenuto(c,fonts){
  let out='';let font=null;let ultimaY=null;let ultimaX=null;let corpo=10;// dimensione del carattere corrente: serve a distinguere un vero a-capo da una parola posizionata
  // Alcuni generatori posizionano una lettera alla volta (le buste paga TeamSystem lo fanno): se si
  // mette uno spazio a ogni riposizionamento esce "D i t t a". Lo spazio si mette solo quando il
  // salto orizzontale è più largo di un carattere intero, cioè quando è davvero un'altra colonna.
  const SALTO_SPAZIO=0.9;
  let daBT=0;
  const tok=/\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|\/[^\s\/\[\]<>(]+|-?\d*\.?\d+|[A-Za-z'"*]+/g;
  const stack=[];let m;
  const decodifica=(s)=>{let codici=[];if(s[0]==='<'){const hx=s.slice(1,-1).replace(/\s/g,'');const passo=font&&font.due?4:2;for(let i=0;i<hx.length;i+=passo)codici.push(parseInt(hx.slice(i,i+passo),16))}else{const raw=s.slice(1,-1).replace(/\\([nrtbf()\\]|\d{1,3})/g,(x,e)=>({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','(':'(',')':')','\\':'\\'})[e]||String.fromCharCode(parseInt(e,8)));if(font&&font.due){for(let i=0;i<raw.length;i+=2)codici.push((raw.charCodeAt(i)<<8)|raw.charCodeAt(i+1))}else for(let i=0;i<raw.length;i++)codici.push(raw.charCodeAt(i))}
    return codici.map(cd=>{if(font&&font.mappa&&font.mappa.has(cd))return font.mappa.get(cd);if(font&&font.due)return '';return String.fromCharCode(cd)}).join('')};
  while((m=tok.exec(c))){const t=m[0];
    if(t==='Tf'){const nome=stack.filter(x=>typeof x==='string'&&x[0]==='/').pop();font=nome?fonts.get(nome.slice(1))||null:null;const nn=stack.filter(x=>typeof x==='number');if(nn.length&&nn[nn.length-1]>0)corpo=nn[nn.length-1];stack.length=0;continue}
    if(t==='Tj'||t==="'"||t==='"'){const s=stack.filter(x=>typeof x==='string'&&(x[0]==='('||x[0]==='<')).pop();if(t!=='Tj')out+='\n';if(s)out+=decodifica(s);stack.length=0;continue}
    if(t==='TJ'){let inArr=false;for(const x of stack){if(x==='[')inArr=true;else if(x===']')inArr=false;else if(typeof x==='string'&&(x[0]==='('||x[0]==='<'))out+=decodifica(x);else if(typeof x==='number'&&x<-180)out+=' '}stack.length=0;continue}
    if(t==='Td'||t==='TD'){const n=stack.filter(x=>typeof x==='number');const tx=n[n.length-2],ty=n[n.length-1];if(ty!==undefined&&Math.abs(ty)>Math.max(2,corpo*0.6))out+='\n';else if(tx!==undefined&&Math.abs(tx)>corpo*SALTO_SPAZIO)out+=' ';if(ty!==undefined&&ultimaY!==null)ultimaY+=ty;if(tx!==undefined&&ultimaX!==null)ultimaX+=tx;stack.length=0;continue}
    if(t==='Tm'){const n=stack.filter(x=>typeof x==='number');const y=n[n.length-1];const x=n[n.length-2];const sc=Math.abs(n[n.length-3]||1);const soglia=Math.max(2,corpo*sc*0.6);if(ultimaY!==null&&y!==undefined&&Math.abs(y-ultimaY)>soglia)out+='\n';else if(ultimaX!==null&&x!==undefined&&Math.abs(x-ultimaX)>corpo*sc*SALTO_SPAZIO)out+=' ';if(y!==undefined)ultimaY=y;if(x!==undefined)ultimaX=x;stack.length=0;continue}
    if(t==='T*'){out+='\n';stack.length=0;continue}
    if(t==='BT'){daBT=out.length;stack.length=0;continue}
    // ET a capo solo se fra BT ed ET c'è stato più di un carattere: le buste paga aprono e chiudono
    // un blocco di testo per ogni singola lettera, e un a-capo per lettera spezzava tutte le parole
    if(t==='ET'){if(out.length-daBT>1)out+='\n';stack.length=0;continue}
    if(/^-?\d*\.?\d+$/.test(t))stack.push(parseFloat(t));else if(/^[A-Za-z'"*]+$/.test(t)){if(stack.length>40)stack.length=0;}else stack.push(t);
  }
  return out.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n');
}
// ---- proposte dal testo del PSC (mai imposte) ----
// Il testo arriva riga per riga (righePdfJs): nelle tabelle dell'anagrafica etichetta e valore stanno
// sulla stessa riga separati da « | », oppure l'etichetta è un titolo e il nome sta nelle righe sotto
// («Nome e cognome | Arch. …»). Provato sui PSC veri dell'archivio dell'azienda (63 piani, studi diversi).
function proponiDatiDaPsc(testo){
  const MESI='gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre';
  const righe=String(testo||'').replace(/\r/g,'').split('\n').map(x=>x.replace(/[ \t ]+/g,' ').trim())
    .filter(x=>x&&!/\.{5,}|…{3,}|_{6,}/.test(x)); // indice con i puntini e righe da firmare
  const out={};
  const pulisci=v=>String(v||'').replace(/^[\s:：|.\-–—_]+/,'').replace(/[\s:：|;,.\-–—_]+$/,'').replace(/\s*\|\s*/g,' ').replace(/\s{2,}/g,' ').trim();
  const RE_SOTTO=/^(?:nome\s+e\s+cognome|cognome\s+e\s+nome|nominativo(?:\s+o\s+ragione\s+sociale)?|ragione\s+sociale|denominazione|nome|ditta|soggetto|studio|societ[aà]|tecnico|professionista)\b\s*[:：|]?\s*/i;
  const RE_RECAPITO=/^(?:indirizzo|citt[aà]|comune|via|tel|telefono|fax|cell|e-?mail|mail|pec|c\.?\s?f\.?|cod(?:ice)?\.?\s*fisc|p\.?\s?iva|partita|qualifica|sede|recapit|ordine|iscri|albo|n\.\s|cap\b|prov)/i;
  const prosa=v=>/\b(dovr[aà]|deve|devono|provveder|sar[aà]n?n?o?|nominat[oa]|incaricat|ai sensi|art\.|d\.?lgs|comma|affinch|qualora|ovvero|nonch[eé]|il quale|la quale|che\s)\b/i.test(v);
  const RE_FIGURA=/^(?:\d+(?:\.\d+)*\s*[-.)]?\s*)?(?:il\s+|la\s+|dati\s+)?(committent|responsabile\s+dei\s+lavori|progettist|direttore\s+(?:dei\s+)?lavori|direzione\s+(?:dei\s+)?lavori|coordinatore|c\.?\s?s\.?\s?[pe]\.?\b|impresa|appaltator|ente\s+appaltante|stazione\s+appaltante|indirizzo|ubicazione|data|importo|durata)/i;
  // valori: persona (con titolo o 2-5 parole maiuscole) o società
  const TITOLI='(?:arch|ing|geom|dott|dr|per\\.?\\s*ind|p\\.?\\s*i|ingegnere|architetto|geometra|perito(?:\\s+edile|\\s+industriale)?|avv|prof)\\.?';
  const RE_SOC=/\b(s\.?\s?r\.?\s?l\.?s?|s\.?\s?p\.?\s?a\.?|s\.?\s?n\.?\s?c\.?|s\.?\s?a\.?\s?s\.?|soc\.?\s*coop|cooperativa|consorzio|societ[aà]|s\.?\s?c\.?\s?a\.?\s?r\.?\s?l|onlus|fondazione|comune di|provincia di|regione|universit[aà]|azienda|ministero|istituto|asl|usl|condominio|parrocchia|diocesi|banca|immobiliare|group|holding)\b/i;
  // parole che stanno nei titoli dei capitoli, non nei nomi di persone o di ditte
  const RE_NON_NOME=/\b(coordinat\w*|sicurezza|piano|progett(?:o|azione)|relazione|indice|dati|identificativ\w*|imprese|fase|decreto|legislativo|d\.?\s?lgs|esecutivo|identificazione|descrizione|oggetto|committent\w*|nominare|definire|pag\.?|manutenzione|resp\.?|tecnico|operativo|cantiere|tavola|edizione|allegat\w*|elaborat\w*|sommario|capitolo|premessa|revisione|documento|cognome|nominativo|figure|ruolo|firma|timbro|sezione|scheda|elenco|lavoratori|appalto|opere|intervento|stima|costi|planimetria|cronoprogramma|organizzazione|prescrizioni|rischi|misure|direzione|dispositivi|protezione|collettiva|architettonic\w*|fascicolo|p\.?s\.?c|ordine|universit\w*|direttore|lavori)\b|^(?:loc\.?|localit\w*|via|viale|piazza|strada|corso)\b|[:(_]/i;
  const tagliaRecapiti=v=>pulisci(String(v).replace(/\bpag\.?\s*\d+\s*\/\s*\d+/ig,'').replace(/-{3,}.*$/,'').replace(/\(\s*c\.?\s?f\.?.*$/i,'').replace(/\s+r\.?\s?u\.?\s?p\.?\b.*$/i,'').replace(/\s+\d{3,}[\d\s\/.]*.*$/,'').split(/[-–—]\s*(?=via\b|viale\b|piazza\b|loc\.?\b)/i)[0].split(/\s+(?:[-–—,]\s*)?(?:con\s+sede|sede\s+(?:legale|in)|residente|domiciliat|via\s|v\.le|viale|piazza|p\.zza|loc\.|localit[aà]|corso|c\.f\.|cod\.?\s*fisc|codice\s+fiscale|p\.?\s?iva|partita\s+iva|tel\.?|telefono|cell|fax|e-?mail|pec|iscritt|nato\s+a|legalmente|in\s+persona|rappresentat|n\.\s*\d)\b/i)[0].split(/\s+[-–—]\s+(?=\d|[A-Z][a-z]+\s*\()/)[0]);
  const persona=v=>{v=tagliaRecapiti(String(v).split(/\s*\(/)[0]).split(/\s[-–—]\s|,\s/)[0].replace(/^(?:sig\.?r?a?\.?|signor[ae]?)\s+/i,'').trim();if(!v||v.length<5||v.length>70||prosa(v)||/\d/.test(v)||RE_NON_NOME.test(v)||/^(?:e|ed|di|del|della|il|la)\s/i.test(v))return null;
    const senzaTitoli=v.replace(new RegExp('\\b'+TITOLI+'(?=\\s|$)','ig'),'').trim();if(!/[A-Za-zÀ-ÿ]{3,}/.test(senzaTitoli))return null;
    if(new RegExp('^'+TITOLI+'\\s','i').test(v)||RE_SOC.test(v))return v;
    const w=v.split(' ');if(w.length>=2&&w.length<=6&&w.every(x=>/^[A-ZÀ-Ü][A-Za-zÀ-ÿ'’.\-]*$/.test(x)||/^(?:de|di|del|della|da|dal|van|von|e)$/i.test(x)))return v;return null};
  const societa=v=>{v=tagliaRecapiti(String(v).split(/\s[–—]\s/)[0]).split(/\s+[A-Za-zà-ü]+\s*:/)[0].trim();if(/^[(a-z]/.test(v)||/[_:]/.test(v)||/\b(rev|revisione|data|pag|persona\s+di|coordinamento|scuola|redattore|descrizione|progetto|individuazione|soggetti|architettonic\w*)\b/i.test(v)||/^[A-ZÀ-Ü' ]+\([A-Z]{2}\)$/.test(v))return null;if(!v||v.length<3||v.length>90||prosa(v)||/^\d|^(?:via|viale|piazza|loc)\b/i.test(v)||/^(?:s\.?\s?[rp]\.?\s?[la]\.?|soc\.?)$/i.test(v)||/\b(coordinat\w*|sicurezza|piano|progettazione|relazione|indice|oggetto|committent\w*|tavola|edizione|allegat\w*|elaborat\w*|sommario|capitolo|premessa|cantiere|nominare|definire)\b/i.test(v))return null;return v};
  const etichettaVuota=v=>!v||/^[:：|\-–\s]*$/.test(v);
  // trova le righe che cominciano con l'etichetta e prende il valore accanto o sotto
  const cerca=(reEt,tipo,opz)=>{opz=opz||{};const val=tipo==='persona'?persona:tipo==='societa'?societa:x=>{x=pulisci(x);return x&&x.length<=160&&!prosa(x)?x:null};
    for(let i=0;i<righe.length;i++){
      const r=righe[i];const m=reEt.exec(r);if(!m||m.index>(opz.ovunque?200:4))continue;
      if(opz.escludi&&opz.escludi.test(r))continue;
      let resto=r.slice(m.index+m[0].length);
      // l'etichetta deve finire lì: «Committente: X», «Committente | X», «COMMITTENTE» da solo; non «committente o il responsabile …»
      if(!etichettaVuota(resto)&&!/^\s*(?:\d\s*)?[:：|(]/.test(resto)&&!/^\s+[A-ZÀ-Ü"«]/.test(resto))continue;
      resto=resto.replace(/^\s*\d\s*(?=[:：|])/,'').replace(/^\s*\([^)]*\)\s*/,'');
      const sub=pulisci(resto).replace(RE_SOTTO,'');
      if(sub){const v=val(sub);if(v)return v;if(r.length>60&&!/\|/.test(r))continue}
      // sotto: «Nome e cognome | X» o direttamente il nome; ci si ferma alla figura successiva
      for(let k=i+1;k<righe.length&&k<=i+6;k++){const s=righe[k];
        if(RE_SOTTO.test(s)){const v=val(pulisci(s.replace(RE_SOTTO,'')));if(v)return v;continue}
        if(RE_RECAPITO.test(s))continue;
        if(RE_FIGURA.test(s)&&!opz.valoreFigura)break;
        if(s.length>120)break;
        const v=val(s);if(v)return v;
      }
    }
    return null};
  const CO='coordinatore\\s+(?:per\\s+la\\s+|della\\s+|alla\\s+|in\\s+materia\\s+di\\s+)?(?:sicurezza\\s+)?(?:e\\s+(?:la\\s+)?salute\\s+)?(?:in\\s+|nella\\s+|per\\s+la\\s+|per\\s+l[\'’]\\s*|della\\s+)?(?:fase\\s+(?:di\\s+|della\\s+)?)?';
  const ambedue=new RegExp('^(?:\\d[\\d.]*\\s*)?(?:il\\s+)?(?:'+CO+'progettazione\\s+(?:ed?|&|\\/)\\s*(?:in\\s+fase\\s+di\\s+)?esecuzione|c\\.?\\s?s\\.?\\s?p\\.?\\s*(?:ed?|\\/|-)\\s*c\\.?\\s?s\\.?\\s?e\\.?)(?:\\s+dei\\s+lavori|\\s+\\(c\\.?s\\.?[pe]\\.?\\))?','i');
  const both=cerca(ambedue,'persona');if(both){out.csp=both;out.cse=both}
  out.cse=out.cse||cerca(new RegExp('^(?:\\d[\\d.]*\\s*)?(?:il\\s+)?(?:'+CO+'(?:esecuzione|realizzazione)(?:\\s+dei\\s+lavori|\\s+dell[\'’]\\s*opera)?|c\\.?\\s?s\\.?\\s?e\\.?(?![a-z]))(?:\\s*\\(c\\.?s\\.?e\\.?\\))?','i'),'persona');
  out.csp=out.csp||cerca(new RegExp('^(?:\\d[\\d.]*\\s*)?(?:il\\s+)?(?:'+CO+'progettazione(?:\\s+dei\\s+lavori|\\s+dell[\'’]\\s*opera)?|c\\.?\\s?s\\.?\\s?p\\.?(?![a-z]))(?:\\s*\\(c\\.?s\\.?p\\.?\\))?','i'),'persona');
  if(!out.csp&&out.cse&&righe.some(r=>/progettazione\s+(?:ed?|&|\/)\s*(?:in\s+fase\s+di\s+)?esecuzione/i.test(r)))out.csp=out.cse;
  out.direttoreLavori=cerca(/^(?:\d[\d.]*\s*)?(?:il\s+)?(?:progettista\s*(?:e|\/)\s*)?(?:direttore|direzione)\s+(?:dei\s+)?lavori(?:\s+(?:architettonic[io]|generale|opere\s+edili|edile))?|^d\.\s?l\.(?=\s*[:|])/i,'persona',{escludi:/strutturale|impiant|tecnico|operativ|cantiere/i});
  out.progettista=cerca(/^(?:\d[\d.]*\s*)?(?:il\s+)?(?:progettist[ai](?:\s*\/\s*direttore\s+dei\s+lavori)?(?:\s+(?:architettonic[oi]|generale|opere\s+edili|edile|dell[\'’]\s*opera))?|progettazione\s+architettonica|progetto\s+architettonico)/i,'persona',{escludi:/strutturale|impiant|termotecnic|elettric|antincendio|acustic|geolog/i})
    ||cerca(/^(?:\d[\d.]*\s*)?(?:il\s+)?progettist[ai]/i,'persona');
  out.committente=cerca(/^(?:\d[\d.]*\s*)?(?:dati\s+(?:del\s+)?)?(?:il\s+)?(?:committent[ei](?:\s*\d)?|committenza|ente\s+appaltante|stazione\s+appaltante|propriet[aà])(?:\s+dei\s+lavori)?/i,'societa',{escludi:/tipo\s+di\s+committen|responsabile\s+dei\s+lavori\s+e/i});
  out.affidataria=cerca(/^(?:\d[\d.]*\s*)?(?:l[\'’]\s*)?(?:impresa\s+(?:affidataria|appaltatrice|aggiudicataria|principale|generale)|appaltatore|general\s+contractor|impresa\s+esecutrice\s+principale)/i,'societa');
  if(out.affidataria&&!RE_SOC.test(out.affidataria))delete out.affidataria;
  if(out.committente&&/^(?:privat[ao]|pubblic[ao])$/i.test(out.committente))delete out.committente;
  // indirizzo del cantiere: sulla riga, oppure «Via/Località | …» e «Città/Comune | …» sotto
  const reInd=/^(?:\d[\d.]*\s*)?(?:indirizzo|ubicazione|localizzazione|luogo|sede|ubicato\s+in|sito\s+in)\s+(?:del\s+|dell[\'’]\s*)?(?:cantiere|lavori|opera|intervento|area)|^(?:\d[\d.]*\s*)?(?:cantiere\s+(?:sito\s+)?in|cantiere(?=\s*[:|])|ubicazione(?=\s*[:|])|localit[aà]\s+(?:del\s+)?cantiere)/i;
  for(let i=0;i<righe.length&&!out.indirizzo;i++){const m=reInd.exec(righe[i]);if(!m||m.index>4)continue;let v=pulisci(righe[i].slice(m[0].length));const extra=[];
    for(let k=i+1;k<righe.length&&k<=i+4;k++){const s=righe[k];const mm=/^(via|localit[aà]|indirizzo|citt[aà]|comune|frazione|cap|provincia|prov\.?)\b\s*[:：|]?\s*(.*)$/i.exec(s);if(!mm)break;const x=pulisci(mm[2]);if(x)extra.push(x)}
    if((!v||v.length<4)&&extra.length)v=extra.join(', ');else if(v&&extra.length&&!/\d{5}|\([A-Z]{2}\)|comune/i.test(v))v=v+', '+extra.filter(x=>!v.includes(x)).join(', ');
    const indOk=x=>x&&x.length>=4&&x.length<=160&&!prosa(x)&&/^[A-ZÀ-Üa-z0-9"«]/.test(x)&&/\b(via|v\.le|viale|piazza|p\.?\s?zz?a|loc\.?|localit[aà]|corso|strada|largo|vicolo|frazione|fraz\.|comune|zona|area|s\.?s\.|s\.?p\.|borgo|podere|contrada)\b|\d{5}|\([A-Z]{2}\)/i.test(x)&&!/^(?:di|del|della|e|ed|il|la|degli|delle|dei)\b/i.test(x);
    const pulInd=x=>{if(!x)return null;x=x.replace(/^(?:ubicazione|indirizzo(?:\s+(?:del\s+)?cantiere)?|via\s*\/\s*piazza|localit[aà])\s*[:：|]?\s*/i,'').split(/\s+committente\b/i)[0].trim();if(/committente/i.test(x)||(/^[a-z]/.test(x)&&!/^(via|viale|piazza|loc|localit|corso|strada|largo|frazione)\b/i.test(x)))return null;return indOk(x)?x:null};
    v=pulInd(v)||pulInd(pulisci(righe[i+1]||''));
    if(v)out.indirizzo=v.replace(/^il\s+cantiere\s+[eè]\s+sito\s+in\s+/i,'')}
  if(out.indirizzo){const ind=out.indirizzo;const capM=/\b(\d{5})\b/.exec(ind);if(capM)out.cap=capM[1];
    const pr=/\(\s*([A-Z]{2})\s*\)|\b([A-Z]{2})\s*$/.exec(ind);if(pr)out.provincia=pr[1]||pr[2];
    const W="(?:d['’])?[A-ZÀ-Ü][A-Za-zà-ü'’]+",P='(?:di|del|della|in|sul|sulla|val|de|dei|delle|al|a|d[\'’]\\w+)';
    const com=/comune\s+di\s+([A-ZÀ-Üa-zà-ü'’ ]+?)(?=\s*(?:\(|,|-|–|$|\d))/i.exec(ind)||new RegExp('(?:\\d{5}\\s+)('+W+'(?:\\s+(?:'+W+'|'+P+'))*)').exec(ind)||new RegExp('('+W+'(?:\\s+(?:'+W+'|'+P+'))*)\\s*(?:\\d{5}\\s*)?\\(\\s*[A-Za-z]{2,}\\s*\\)').exec(ind)||new RegExp('(?:[-–,]\\s*)('+W+'(?:\\s+(?:'+W+'|'+P+'))*)\\s*(?:\\d{5})?\\s*$').exec(ind);
    if(com){const c=com[1].trim().split(/\s+/).slice(-5).join(' ');if(c.length>=3&&!/^(via|loc|localit|piazza|viale|corso|strada|area|zona)\b/i.test(c))out.comune=c.toLowerCase().replace(/(^|[\s'’-])([a-zà-ü])/g,(x,a,b)=>a+b.toUpperCase()).replace(/\b(Di|Del|Della|In|Sul|Sulla|De|Dei|Delle|Al|A)\b/g,x=>x.toLowerCase()).replace(/^./,x=>x.toUpperCase())}}
  if(!out.comune){for(const r of righe.slice(0,400)){const m=/^(?:comune|citt[aà])\s*[:：|]\s*([A-ZÀ-Üa-zà-ü'’ ]{3,40}?)\s*(?:\(([A-Z]{2})\))?$/i.exec(r);if(m){out.comune=m[1].trim().toLowerCase().replace(/(^|[\s'’-])([a-zà-ü])/g,(x,a,b)=>a+b.toUpperCase()).replace(/\b(Di|Del|Della|In|Sul|Sulla)\b/g,x=>x.toLowerCase());if(m[2])out.provincia=m[2];break}}}
  // date
  const data=v=>{if(!v)return null;let m=/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2,4})/.exec(v);if(m){const a=m[3].length===2?'20'+m[3]:m[3];const d=a+'-'+pad2(+m[2])+'-'+pad2(+m[1]);return +m[2]>=1&&+m[2]<=12&&+m[1]>=1&&+m[1]<=31?d:null}
    m=new RegExp('(\\d{1,2})?\\s*(?:°)?\\s*('+MESI+')\\s+(\\d{4})','i').exec(v);if(m)return m[3]+'-'+pad2(MESI.split('|').indexOf(m[2].toLowerCase())+1)+'-'+pad2(+(m[1]||1));return null};
  const cercaData=re=>{for(let i=0;i<righe.length;i++){const m=re.exec(righe[i]);if(!m||m.index>4)continue;const d=data(righe[i].slice(m.index+m[0].length))||data(righe[i+1]||'');if(d)return d}return null};
  out.dataInizio=cercaData(/(?:data\s+(?:presunta\s+)?(?:di\s+)?inizio(?:\s+dei)?\s+lavori|inizio\s+(?:dei\s+)?lavori)(?:\s*\(?\s*presunt[ao]\s*\)?)?/i);
  out.dataFine=cercaData(/(?:data\s+(?:presunta\s+)?(?:di\s+)?fine(?:\s+dei)?\s+lavori|fine\s+(?:presunta\s+)?(?:dei\s+)?lavori|ultimazione\s+(?:dei\s+)?lavori)(?:\s*\(?\s*presunt[ao]\s*\)?)?/i);
  if(out.dataInizio&&!out.dataFine){for(const r of righe){const m=/^durata\b[^|:]*[:|]?\s*(?:presunta\s*)?(?:dei\s+lavori\s*)?[:|]?\s*(\d{1,4})\s*(?:gg|giorni)\b/i.exec(r);if(m){const d=new Date(out.dataInizio+'T12:00:00');d.setDate(d.getDate()+ +m[1]);out.dataFine=d.toISOString().slice(0,10);break}}}
  // data del PSC: «Rev. 0 del …», «data: …», o la data in copertina
  const prime=righe.slice(0,80);
  const legge=/d\.?\s?lgs|\bd\.?i\.?\s+del|interministeriale|allegat|decreto|legge|\bl\.\s?\d|n\.\s?81|testo\s+unico|\bart\.|g\.?u\.|gazzetta|circolare|d\.?p\.?r|d\.?m\./i;
  for(const r of prime){if(legge.test(r))continue;const m=/(?:rev(?:isione)?\.?\s*(?:n\.?\s*)?\d*\s*(?:del|-|:)|\bdata\s*(?:di\s+)?(?:emissione|redazione|revisione)?\s*[:|]|emess[oa]\s+il|redatto\s+il)\s*(.{6,30})/i.exec(r);const d=m&&data(m[1]);if(d){out.dataPsc=d;break}}
  if(!out.dataPsc){for(const r of prime){if(/inizio|fine|durata|nato|nata/i.test(r)||legge.test(r))continue;const d=data(r);if(d&&+d.slice(0,4)>=2000){out.dataPsc=d;break}}}
  out.redattore=out.csp||null;
  out.descrizione=cerca(/^(?:\d[\d.]*\s*)?(?:oggetto\s+(?:dei\s+lavori|dell[\'’]\s*appalto|dell[\'’]\s*intervento|del\s+progetto)|descrizione\s+(?:sintetica\s+)?dell[\'’]\s*(?:opera|intervento)|natura\s+dell[\'’]\s*opera|oggetto|lavori\s+di)(?=\s*[:|])/i,'testo');
  const testoT=righe.join('\n');
  const cig=/\bC\.?\s?I\.?\s?G\.?\s*(?:n\.?|n°|nr\.?)?\s*[:：|]?\s*((?=[A-Z]*\d)[A-Z0-9]{10})\b/i.exec(testoT);if(cig)out.cig=cig[1].toUpperCase();
  const cup=/\bC\.?\s?U\.?\s?P\.?\s*(?:n\.?|n°|nr\.?)?\s*[:：|]?\s*((?=[A-Z]*\d)[A-Z0-9]{15})\b/i.exec(testoT);if(cup)out.cup=cup[1].toUpperCase();
  for(const r of righe){const m=/^(?:\d[\d.]*\s*)?importo\s+(?:complessivo\s+|totale\s+|presunto\s+)*(?:dei\s+|del\s+|delle\s+)?(?:lavori|appalto|opere)?[^\d€|:]{0,40}[:|]?\s*(?:€|euro)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+,\d{2})/i.exec(r);if(m){const n=leggiNumero(m[1]);if(n>=1000){out.importoLavori=n;break}}}
  // nel campo indirizzo va solo la via: comune, CAP e provincia hanno i loro campi
  if(out.indirizzo&&out.comune){const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');let v=out.indirizzo.replace(new RegExp('(?:comune\\s+di\\s+)?'+esc(out.comune),'i'),'').replace(/\b\d{5}\b/,'').replace(/\(\s*[A-Za-z]{2,}\s*\)/,'').replace(/\s*[,–—-]\s*(?=[,–—-]|$)/g,'').replace(/^[\s,–—-]+|[\s,–—-]+$/g,'').replace(/\s{2,}/g,' ').trim();if(v.length>=3)out.indirizzo=v}
  for(const k of Object.keys(out)){if(out[k]==null||out[k]===''||(typeof out[k]==='string'&&out[k].length>160))delete out[k]}
  return out;
}
// Il testo del PSC per le proposte: righe ricomposte con pdf.js sulle prime 40 pagine (l'anagrafica
// sta sempre all'inizio); se pdf.js non riesce, l'estrattore interno.
async function testoPsc(blob,avanza){
  try{const r=await righePdfJs(blob,40);const t=r.pagine.join('\n');if(t.replace(/\s/g,'').length>=200)return t}catch(e){}
  try{return (await estraiTestoPdf(blob,avanza)).testo||''}catch(e){return ''}
}
