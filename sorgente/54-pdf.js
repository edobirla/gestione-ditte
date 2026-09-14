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
  for(const [num,o] of pdf.oggetti){
    if(!/\/Subtype\s*\/Image/.test(o.dict)) continue;
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
    if(sostituzioni.has(n)){
      const c=sostituzioni.get(n);
      const nuovo=new Uint8Array(await c.blob.arrayBuffer());
      let dict=o.dict;
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
