// ---------------------------------------------------------------------
// Archivio documenti: i blob vivono nello store IndexedDB 'file' con chiave = impronta SHA-256.
// Nello stato restano i metadati (stato.file). Stesso contenuto → stessa chiave → nessun doppione.
// ---------------------------------------------------------------------
async function impronta(blob){
  const buf=await leggiComeArrayBuffer(blob);
  if(window.crypto&&crypto.subtle&&crypto.subtle.digest){
    try{ const d=await crypto.subtle.digest('SHA-256',buf); return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,'0')).join(''); }catch(e){}
  }
  return sha256Js(new Uint8Array(buf));
}
// SHA-256 in JavaScript puro, riserva per i contesti dove crypto.subtle non c'è (alcuni file://).
function sha256Js(bytes){
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l=bytes.length;const bitLen=l*8;const padLen=((l+9+63)>>6)<<6;const m=new Uint8Array(padLen);m.set(bytes);m[l]=0x80;
  const dv=new DataView(m.buffer);dv.setUint32(padLen-4,bitLen>>>0);dv.setUint32(padLen-8,Math.floor(bitLen/4294967296));
  const w=new Uint32Array(64);
  for(let i=0;i<padLen;i+=64){
    for(let j=0;j<16;j++)w[j]=dv.getUint32(i+j*4);
    for(let j=16;j<64;j++){const s0=((w[j-15]>>>7)|(w[j-15]<<25))^((w[j-15]>>>18)|(w[j-15]<<14))^(w[j-15]>>>3);const s1=((w[j-2]>>>17)|(w[j-2]<<15))^((w[j-2]>>>19)|(w[j-2]<<13))^(w[j-2]>>>10);w[j]=(w[j-16]+s0+w[j-7]+s1)>>>0}
    let [a,b,c,d,e,f,g,hh]=H;
    for(let j=0;j<64;j++){const S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));const ch=(e&f)^(~e&g);const t1=(hh+S1+ch+K[j]+w[j])>>>0;const S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));const maj=(a&b)^(a&c)^(b&c);const t2=(S0+maj)>>>0;hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0}
    H=[(H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+hh)>>>0];
  }
  return H.map(x=>x.toString(16).padStart(8,'0')).join('');
}

// Salva un blob nell'archivio. Restituisce il record dei metadati (nuovo o esistente).
// Non modifica lo stato da solo: chi chiama lo fa dentro esegui(). Per comodità, se `dentroEsegui`
// è falso, aggiunge il metadato con un esegui silenzioso.
async function salvaFile(blob,meta,opz){
  opz=opz||{};
  const hash=await impronta(blob);
  let rec=stato.file.find(f=>f.hash===hash);
  const esisteBlob=await idbGet('file',hash);
  if(!esisteBlob){
    try{ await idbPut('file',hash,blob); }
    catch(e){ if(e&&(e.name==='QuotaExceededError'||/quota/i.test(String(e)))) throw new Error('Spazio esaurito nel browser: non posso salvare il file. Libera spazio (Documenti → Peso) o fai un backup e alleggerisci l\'archivio.'); throw e; }
  }
  if(rec){ rec.cestinato=null; return {rec,duplicato:true}; }
  rec={id:nuovoId('f'),hash,nome:meta.nome||blob.name||'documento',mime:blob.type||meta.mime||mimeDaNome(meta.nome||''),dimensione:blob.size,dimensioneOriginale:meta.dimensioneOriginale||blob.size,compresso:!!meta.compresso,larghezza:meta.larghezza||null,altezza:meta.altezza||null,creato:new Date().toISOString(),cestinato:null};
  if(opz.dentroEsegui){ stato.file.push(rec); }
  else esegui('Archiviato '+rec.nome,s=>{s.file.push(rec)},{senzaRender:true,silenzioso:true});
  return {rec,duplicato:false};
}
async function leggiFile(idOHash){
  const m=fileMeta(idOHash); const hash=m?m.hash:idOHash;
  const b=await idbGet('file',hash);
  return b||null;
}
const cacheUrl=new Map();
async function urlFile(idOHash){
  const m=fileMeta(idOHash); const hash=m?m.hash:idOHash;
  if(cacheUrl.has(hash)) return cacheUrl.get(hash);
  const b=await leggiFile(hash); if(!b) return null;
  const u=URL.createObjectURL(b); cacheUrl.set(hash,u); return u;
}
function liberaUrl(){for(const u of cacheUrl.values())URL.revokeObjectURL(u);cacheUrl.clear()}
// Riferimenti a un file: documenti, buste paga, fogli ore, movimenti, cantieri, azienda
function riferimentiFile(fileId){
  const out=[];
  for(const d of stato.documenti) if((d.file||[]).includes(fileId)) out.push({tipo:'documento',id:d.id});
  for(const b of stato.bustePaga) if(b.fileId===fileId) out.push({tipo:'busta',id:b.id});
  for(const m of stato.movimenti) if(m.fileId===fileId) out.push({tipo:'movimento',id:m.id});
  for(const b of stato.bonifici) if(b.fileId===fileId) out.push({tipo:'bonifico',id:b.id});
  for(const c of stato.cantieri){ if(c.psc&&c.psc.fileId===fileId) out.push({tipo:'cantiere',id:c.id}); for(const dp of c.documentiProdotti||[]) if(dp.fileId===fileId) out.push({tipo:'cantiere',id:c.id}); }
  for(const k of Object.keys(stato.presenze||{})) for(const pid of Object.keys(stato.presenze[k].persone||{})) if(stato.presenze[k].persone[pid].foglioOreId===fileId) out.push({tipo:'presenze',id:k});
  for(const p of stato.persone){ if(p.fotoId===fileId||p.firmaId===fileId) out.push({tipo:'persona',id:p.id}); }
  return out;
}
// Cestino: i file senza più riferimenti restano 30 giorni, poi si eliminano davvero.
function cestinaFileOrfani(s){
  const oggiIso=new Date().toISOString();
  for(const f of s.file){ if(!f.cestinato&&riferimentiFileIn(s,f.id).length===0) f.cestinato=oggiIso; else if(f.cestinato&&riferimentiFileIn(s,f.id).length>0) f.cestinato=null; }
}
function riferimentiFileIn(s,fileId){const salva=stato;stato=s;try{return riferimentiFile(fileId)}finally{stato=salva}}
async function svuotaCestinoScaduto(giorni){
  giorni=giorni===undefined?30:giorni;
  const limite=Date.now()-giorni*86400000;
  const daEliminare=stato.file.filter(f=>f.cestinato&&new Date(f.cestinato).getTime()<limite);
  if(!daEliminare.length) return 0;
  for(const f of daEliminare){ await idbDel('file',f.hash); }
  esegui('Svuotato il cestino ('+daEliminare.length+' file)',s=>{s.file=s.file.filter(f=>!daEliminare.find(x=>x.id===f.id))},{senzaRender:true,silenzioso:true});
  return daEliminare.length;
}
async function eliminaFileDefinitivo(fileId){
  const m=fileMeta(fileId); if(!m) return;
  await idbDel('file',m.hash);
  esegui('Eliminato definitivamente '+m.nome,s=>{s.file=s.file.filter(f=>f.id!==m.id)},{senzaRender:true,silenzioso:true});
}
// Verifica di coerenza: metadati senza blob (archivio corrotto) e blob senza metadati (orfani)
async function verificaArchivio(){
  const chiavi=new Set(await idbChiavi('file'));
  const senzaBlob=stato.file.filter(f=>!chiavi.has(f.hash));
  const hashNoti=new Set(stato.file.map(f=>f.hash));
  const orfani=Array.from(chiavi).filter(k=>!hashNoti.has(k));
  return {senzaBlob,orfani};
}

// ---- compressione immagini: documenti da leggere, non fotografie d'arte ----
// Ridimensiona a max `maxLato` px e scende di qualità finché il JPEG sta sotto `obiettivo` byte.
async function comprimiImmagine(blob,opz){
  opz=Object.assign({maxLato:2000,obiettivo:300*1024,qualitaMin:0.45},opz||{});
  const img=await caricaImmagine(blob);
  let w=img.width,hh=img.height;
  const scala=Math.min(1,opz.maxLato/Math.max(w,hh));
  w=Math.round(w*scala);hh=Math.round(hh*scala);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=hh;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,hh);ctx.drawImage(img,0,0,w,hh);
  let q=0.82,out=null;
  for(let i=0;i<8;i++){
    out=await canvasABlob(canvas,'image/jpeg',q);
    if(out.size<=opz.obiettivo||q<=opz.qualitaMin) break;
    q=Math.max(opz.qualitaMin,q-0.1);
  }
  // se ancora troppo grande, riduci le dimensioni
  let tentativi=0;
  while(out.size>opz.obiettivo&&tentativi<3&&Math.max(w,hh)>1200){
    w=Math.round(w*0.8);hh=Math.round(hh*0.8);canvas.width=w;canvas.height=hh;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,hh);ctx.drawImage(img,0,0,w,hh);
    out=await canvasABlob(canvas,'image/jpeg',q);tentativi++;
  }
  if(img.close) img.close();
  return {blob:out,larghezza:w,altezza:hh,qualita:q,originale:{larghezza:img.width,altezza:img.height,dimensione:blob.size}};
}
function canvasABlob(canvas,tipo,q){return new Promise((ok,ko)=>{if(canvas.toBlob)canvas.toBlob(b=>b?ok(b):ko(new Error('Conversione immagine non riuscita')),tipo,q);else ok(dataUrlABlob(canvas.toDataURL(tipo,q)))})}
async function caricaImmagine(blob){
  if(window.createImageBitmap){ try{ return await createImageBitmap(blob); }catch(e){} }
  return new Promise((ok,ko)=>{const u=URL.createObjectURL(blob);const i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);ko(new Error('Immagine non leggibile'))};i.src=u});
}
function eImmagine(mime,nome){return /^image\//.test(mime||'')||/\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(nome||'')}
function ePdf(mime,nome){return mime==='application/pdf'||/\.pdf$/i.test(nome||'')}
const SOGLIA_PDF_PESANTE=2*1024*1024;

// Acquisizione di un file in ingresso: comprime se immagine, avvisa se PDF pesante.
// Restituisce {rec, duplicato, compressione:{prima,dopo,...}|null, avviso}
async function acquisisciFile(file,opz){
  opz=opz||{};
  let blob=file,meta={nome:file.name},compressione=null,avvisoTesto=null;
  if(eImmagine(file.type,file.name)&&!opz.senzaCompressione){
    try{
      const c=await comprimiImmagine(file,opz.compressione);
      if(c.blob.size<file.size*0.9){
        compressione={prima:file.size,dopo:c.blob.size,larghezza:c.larghezza,altezza:c.altezza,originale:file};
        blob=c.blob;meta={nome:file.name.replace(/\.(heic|heif|png|webp|bmp)$/i,'.jpg'),dimensioneOriginale:file.size,compresso:true,larghezza:c.larghezza,altezza:c.altezza};
      }
    }catch(e){ avvisoTesto='Immagine non ricomprimibile ('+(e.message||e)+'): archiviata come originale'; }
  }
  if(ePdf(file.type,file.name)&&file.size>SOGLIA_PDF_PESANTE) avvisoTesto=`PDF pesante (${fPeso(file.size)}): meglio una scansione più leggera, in bianco e nero o a 150 dpi`;
  const {rec,duplicato}=await salvaFile(blob,meta,{dentroEsegui:opz.dentroEsegui});
  return {rec,duplicato,compressione,avviso:avvisoTesto};
}

// ---- peso dell'archivio ----
function pesoArchivio(){
  const perSoggetto=new Map();const perTipo=new Map();let totale=0,cestino=0;
  const vivi=stato.file.filter(f=>!f.cestinato);
  for(const f of stato.file) if(f.cestinato) cestino+=f.dimensione;
  for(const f of vivi){
    totale+=f.dimensione;
    const refs=riferimentiFile(f.id);
    let sogg='Altro',tipo='Altro';
    const r=refs[0];
    if(r){
      if(r.tipo==='documento'){const d=perId('documenti',r.id);if(d){sogg=d.soggettoTipo==='azienda'?'Azienda':d.soggettoTipo==='persona'?nomePersona(persona(d.soggettoId)):d.soggettoTipo==='cantiere'?'Cantiere '+nomeCantiere(d.soggettoId):d.soggettoTipo==='mezzo'?'Mezzo '+nomeMezzo(perId('mezzi',d.soggettoId)):'Cliente '+nomeCliente(d.soggettoId);const t=tipoDoc(d.tipoId);tipo=t?t.nome:'Documento'}}
      else if(r.tipo==='busta'){const b=perId('bustePaga',r.id);sogg=b?nomePersona(persona(b.personaId)):'Buste paga';tipo='Busta paga'}
      else if(r.tipo==='movimento'){sogg='Budget';tipo='Fattura'}
      else if(r.tipo==='bonifico'){sogg='Bonifici';tipo='Conferma bonifico'}
      else if(r.tipo==='cantiere'){sogg='Cantiere '+nomeCantiere(r.id);tipo='Documento di cantiere'}
      else if(r.tipo==='presenze'){sogg='Presenze';tipo='Foglio ore'}
      else if(r.tipo==='persona'){sogg=nomePersona(persona(r.id));tipo='Foto/firma'}
    }
    perSoggetto.set(sogg,(perSoggetto.get(sogg)||0)+f.dimensione);
    perTipo.set(tipo,(perTipo.get(tipo)||0)+f.dimensione);
  }
  const pesanti=ordina(vivi,'dimensione','desc').slice(0,10);
  return {totale,cestino,numero:vivi.length,perSoggetto:Array.from(perSoggetto,([nome,peso])=>({nome,peso})).sort((a,b)=>b.peso-a.peso),perTipo:Array.from(perTipo,([nome,peso])=>({nome,peso})).sort((a,b)=>b.peso-a.peso),pesanti};
}
async function stimaQuota(){
  try{ if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();return {usato:e.usage,quota:e.quota}} }catch(err){}
  return null;
}
async function chiediPersistenza(){
  try{ if(navigator.storage&&navigator.storage.persist){ const gia=navigator.storage.persisted?await navigator.storage.persisted():false; if(gia) return true; return await navigator.storage.persist(); } }catch(e){}
  return null;
}
