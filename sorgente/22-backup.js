// ---------------------------------------------------------------------
// ZIP scritto e letto a mano (metodo STORE: nessuna compressione, nessuna libreria).
// Serve per backup, pacchetto committenza e file XLSX. Uno ZIP normale si apre ovunque.
// ---------------------------------------------------------------------
const TABELLA_CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(bytes,crc){crc=(crc===undefined?0:crc)^0xFFFFFFFF;for(let i=0;i<bytes.length;i++)crc=TABELLA_CRC[(crc^bytes[i])&0xFF]^(crc>>>8);return (crc^0xFFFFFFFF)>>>0}
const codificatoreUtf8=new TextEncoder(),decodificatoreUtf8=new TextDecoder('utf-8');
function dataDos(d){d=d||new Date();const t=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF;const g=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;return {t,g}}
// voci: [{nome:'cartella/file.ext', dati: Uint8Array|Blob|string}]
async function creaZip(voci,avanzamento){
  const parti=[];const centrale=[];let offset=0;const {t,g}=dataDos();
  for(let i=0;i<voci.length;i++){
    const v=voci[i];
    let bytes;
    if(typeof v.dati==='string') bytes=codificatoreUtf8.encode(v.dati);
    else if(v.dati instanceof Blob) bytes=new Uint8Array(await leggiComeArrayBuffer(v.dati));
    else bytes=v.dati;
    const nome=codificatoreUtf8.encode(v.nome);
    const crc=crc32(bytes);
    const loc=new DataView(new ArrayBuffer(30));
    loc.setUint32(0,0x04034b50,true);loc.setUint16(4,20,true);loc.setUint16(6,0x0800,true);loc.setUint16(8,0,true);loc.setUint16(10,t,true);loc.setUint16(12,g,true);loc.setUint32(14,crc,true);loc.setUint32(18,bytes.length,true);loc.setUint32(22,bytes.length,true);loc.setUint16(26,nome.length,true);loc.setUint16(28,0,true);
    parti.push(loc.buffer,nome,bytes);
    const cen=new DataView(new ArrayBuffer(46));
    cen.setUint32(0,0x02014b50,true);cen.setUint16(4,20,true);cen.setUint16(6,20,true);cen.setUint16(8,0x0800,true);cen.setUint16(10,0,true);cen.setUint16(12,t,true);cen.setUint16(14,g,true);cen.setUint32(16,crc,true);cen.setUint32(20,bytes.length,true);cen.setUint32(24,bytes.length,true);cen.setUint16(28,nome.length,true);cen.setUint16(30,0,true);cen.setUint16(32,0,true);cen.setUint16(34,0,true);cen.setUint16(36,0,true);cen.setUint32(38,0,true);cen.setUint32(42,offset,true);
    centrale.push(cen.buffer,nome);
    offset+=30+nome.length+bytes.length;
    if(avanzamento) await avanzamento(i+1,voci.length,v.nome);
  }
  const dimCentrale=centrale.reduce((s,x)=>s+(x.byteLength||x.length),0);
  const fine=new DataView(new ArrayBuffer(22));
  fine.setUint32(0,0x06054b50,true);fine.setUint16(4,0,true);fine.setUint16(6,0,true);fine.setUint16(8,voci.length,true);fine.setUint16(10,voci.length,true);fine.setUint32(12,dimCentrale,true);fine.setUint32(16,offset,true);fine.setUint16(20,0,true);
  return new Blob([...parti,...centrale,fine.buffer],{type:'application/zip'});
}
// Lettura: elenca le voci dalla directory centrale; estrai(voce) restituisce i byte.
async function leggiZip(blob){
  const buf=await leggiComeArrayBuffer(blob);const dv=new DataView(buf);const u8=new Uint8Array(buf);
  let eocd=-1;for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-70000);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break}}
  if(eocd<0) throw new Error('Non è un file ZIP valido');
  const n=dv.getUint16(eocd+10,true);let off=dv.getUint32(eocd+16,true);
  const voci=[];
  for(let i=0;i<n;i++){
    if(dv.getUint32(off,true)!==0x02014b50) throw new Error('Directory ZIP danneggiata');
    const metodo=dv.getUint16(off+10,true),dimCompressa=dv.getUint32(off+20,true),dim=dv.getUint32(off+24,true),ln=dv.getUint16(off+28,true),le=dv.getUint16(off+30,true),lc=dv.getUint16(off+32,true),offLoc=dv.getUint32(off+42,true);
    const nome=decodificatoreUtf8.decode(u8.subarray(off+46,off+46+ln));
    voci.push({nome,metodo,dimCompressa,dim,offLoc});
    off+=46+ln+le+lc;
  }
  async function estrai(v){
    const lnl=dv.getUint16(v.offLoc+26,true),lel=dv.getUint16(v.offLoc+28,true);
    const inizio=v.offLoc+30+lnl+lel;
    const dati=u8.subarray(inizio,inizio+v.dimCompressa);
    if(v.metodo===0) return dati;
    if(v.metodo===8) return await inflate(dati,v.dim);
    throw new Error('Metodo di compressione non supportato: '+v.metodo);
  }
  return {voci,estrai,testo:async v=>decodificatoreUtf8.decode(await estrai(v))};
}
async function inflate(dati,dimAttesa){
  if(typeof DecompressionStream==='function'){
    try{ const ds=new DecompressionStream('deflate-raw'); const w=ds.writable.getWriter(); w.write(dati); w.close(); const out=new Uint8Array(await new Response(ds.readable).arrayBuffer()); return out; }catch(e){}
  }
  return inflateRaw(dati,dimAttesa);
}

// ---------------------------------------------------------------------
// Backup: uno ZIP con dati.json + documenti/<impronta>.<est>
// ---------------------------------------------------------------------
async function eseguiBackup(opz){
  opz=opz||{};
  const soloDati=!!opz.soloDati;
  await salvaSubito();
  const dati=clona(stato);
  const manifesto={applicazione:'Gestionale Pavimass',versioneSchema:VERSIONE_SCHEMA,quando:new Date().toISOString(),soloDati,numeroFile:0,dispositivo:stato.impostazioni.dispositivo||''};
  const voci=[];
  const fileVivi=soloDati?[]:stato.file.filter(f=>!f.cestinato);
  manifesto.numeroFile=fileVivi.length;
  voci.push({nome:'manifesto.json',dati:JSON.stringify(manifesto,null,1)});
  voci.push({nome:'dati.json',dati:JSON.stringify(dati)});
  voci.push({nome:'LEGGIMI.txt',dati:'Backup del Gestionale Pavimass del '+fDataOra(manifesto.quando)+'.\nPer ripristinarlo: apri Gestionale Pavimass.html → Impostazioni → Ripristina backup.\nLa cartella documenti/ contiene i file originali, nominati con la loro impronta; l\'elenco con i nomi veri è in indice documenti.txt.\n'});
  let indice='';
  for(const f of fileVivi){
    const b=await leggiFile(f.hash);
    if(!b) continue;
    const est=estensioneDi(f.nome)||'bin';
    voci.push({nome:'documenti/'+f.hash+'.'+est,dati:b});
    indice+=f.hash+'.'+est+'\t'+f.nome+'\t'+fPeso(f.dimensione)+'\n';
  }
  voci.push({nome:'indice documenti.txt',dati:indice});
  const blob=await creaZip(voci,opz.avanzamento);
  const nome=nomeFileData(soloDati?'Backup dati Pavimass':'Backup Pavimass','zip');
  return {blob,nome,manifesto};
}
function registraBackupFatto(){
  esegui('Backup eseguito',s=>{s.impostazioni.ultimoBackup=new Date().toISOString();s.impostazioni.modificheDopoBackup=0},{silenzioso:true,senzaRender:true});
  // il backup stesso non è una modifica: azzera il contatore appena incrementato
  stato.impostazioni.modificheDopoBackup=0; salvaStato(); aggiornaSpie();
}
// Legge un backup e restituisce {dati, manifesto, zip, voci documenti} senza applicare nulla
async function leggiBackup(file){
  const zip=await leggiZip(file);
  const vDati=zip.voci.find(v=>v.nome==='dati.json'); if(!vDati) throw new Error('Nel file non c\'è dati.json: non è un backup del gestionale');
  const dati=JSON.parse(await zip.testo(vDati));
  const vMan=zip.voci.find(v=>v.nome==='manifesto.json');
  const manifesto=vMan?JSON.parse(await zip.testo(vMan)):{versioneSchema:dati.versioneSchema||0};
  const documenti=zip.voci.filter(v=>v.nome.startsWith('documenti/')&&v.dim>0);
  return {dati,manifesto,zip,documenti};
}
// Ripristino completo: sostituisce tutto. Chi chiama ha già chiesto conferma e fatto un'istantanea.
async function ripristinaBackup(letto,avanzamento){
  const {dati,zip,documenti}=letto;
  const nuovo=migraStato(clona(dati));
  // documenti: si scrivono per impronta (chiave = nome file senza estensione)
  let i=0;
  for(const v of documenti){
    const hash=v.nome.slice(10).split('.')[0];
    const gia=await idbGet('file',hash);
    if(!gia){ const bytes=await zip.estrai(v); const meta=(nuovo.file||[]).find(f=>f.hash===hash); await idbPut('file',hash,new Blob([bytes],{type:meta?meta.mime:mimeDaNome(v.nome)})); }
    i++; if(avanzamento) await avanzamento(i,documenti.length);
  }
  delete nuovo.__migrato;
  storia.annulla.length=0;storia.ripristina.length=0;
  stato=nuovo;
  stato.impostazioni.ultimoRipristino=new Date().toISOString();
  await salvaSubito();
  liberaUrl();
  return stato;
}
// Fusione: confronta il backup del collaboratore con lo stato attuale e propone le differenze.
// Ogni elemento con id: nuovo (non esiste qui), modificato (esiste, ultimaModifica diversa), uguale.
const COLLEZIONI_FONDIBILI=['persone','documenti','file','clienti','professionisti','cantieri','pos','bustePaga','listino','preventivi','movimenti','generati'];
function confrontaPerFusione(altro){
  const diff=[];
  for(const coll of COLLEZIONI_FONDIBILI){
    const mie=new Map((stato[coll]||[]).map(x=>[x.id,x]));
    for(const x of (altro[coll]||[])){
      const mio=mie.get(x.id);
      if(!mio) diff.push({coll,id:x.id,tipo:'nuovo',loro:x,etichetta:etichettaElemento(coll,x)});
      else if(JSON.stringify(mio)!==JSON.stringify(x)) diff.push({coll,id:x.id,tipo:'modificato',loro:x,mio,etichetta:etichettaElemento(coll,x)});
    }
  }
  // presenze: per mese
  for(const k of Object.keys(altro.presenze||{})){
    const mio=(stato.presenze||{})[k];
    if(!mio) diff.push({coll:'presenze',id:k,tipo:'nuovo',loro:altro.presenze[k],etichetta:'Presenze '+k});
    else if(JSON.stringify(mio)!==JSON.stringify(altro.presenze[k])) diff.push({coll:'presenze',id:k,tipo:'modificato',loro:altro.presenze[k],mio,etichetta:'Presenze '+k});
  }
  return diff;
}
function etichettaElemento(coll,x){
  switch(coll){
    case 'persone': return 'Persona: '+nomePersona(x);
    case 'documenti': { const t=(stato.tipiDocumento.find(tt=>tt.id===x.tipoId)||{}).nome||x.tipoId; return 'Documento: '+t+(x.titolo?' · '+x.titolo:''); }
    case 'file': return 'File: '+x.nome;
    case 'clienti': return 'Cliente: '+x.ragioneSociale;
    case 'professionisti': return 'Professionista: '+x.nome;
    case 'cantieri': return 'Cantiere: '+x.nome;
    case 'pos': return 'POS rev. '+x.revisione;
    case 'bustePaga': return 'Busta paga '+x.anno+'-'+pad2(x.mese);
    case 'listino': return 'Listino: '+(x.codice||'')+' '+(x.descrizione||'');
    case 'preventivi': return 'Preventivo '+(x.numero||'')+'/'+(x.anno||'');
    case 'movimenti': return 'Movimento '+(x.numero||'')+' '+(x.controparte||'');
    case 'generati': return 'Documento generato: '+(x.titolo||'');
    default: return coll+' '+x.id;
  }
}
async function applicaFusione(letto,scelte,avanzamento){
  const {zip,documenti}=letto;
  const fileNecessari=new Set(scelte.filter(d=>d.coll==='file').map(d=>d.loro.hash));
  let i=0;
  for(const v of documenti){
    const hash=v.nome.slice(10).split('.')[0];
    if(!fileNecessari.has(hash)) continue;
    if(!(await idbGet('file',hash))){ const bytes=await zip.estrai(v); await idbPut('file',hash,new Blob([bytes],{type:mimeDaNome(v.nome)})); }
    i++; if(avanzamento) await avanzamento(i,fileNecessari.size);
  }
  esegui('Fusione del backup ('+scelte.length+' elementi)',s=>{
    for(const d of scelte){
      if(d.coll==='presenze'){ s.presenze[d.id]=clona(d.loro); continue; }
      const arr=s[d.coll]; const idx=arr.findIndex(x=>x.id===d.id);
      if(idx>=0) arr[idx]=clona(d.loro); else arr.push(clona(d.loro));
    }
  });
}

// Documentazione dello schema dati (Markdown) — per leggere/scrivere il backup senza l'applicazione
// Perché il parametro: dalle Impostazioni si documenta lo stato vivo; per il file SCHEMA DATI.md consegnato si passa datiIniziali() così gli esempi restano puliti.
function documentazioneSchema(st){
  const s=st||stato;
  const es=(v)=>JSON.stringify(v,null,2);
  const campione=(arr,n)=>arr&&arr.length?es(Object.fromEntries(Object.entries(arr[0]).map(([k,v])=>[k,Array.isArray(v)?(v.length?[v[0]]:[]):v]))):'(nessun elemento)';
  return `# Schema dati — Gestionale Pavimass
*Versione schema: ${VERSIONE_SCHEMA} · generato il ${fData(oggi())}*

Il backup è uno ZIP con:
- \`manifesto.json\`: versione dello schema, data, numero di documenti.
- \`dati.json\`: l'intero stato applicativo (questo documento ne descrive la forma).
- \`documenti/<impronta>.<estensione>\`: i file veri. L'impronta è lo SHA-256 del contenuto ed è la chiave in \`dati.json → file[].hash\`.
- \`indice documenti.txt\`: elenco impronta → nome originale.

Convenzioni: date \`AAAA-MM-GG\`; importi in euro (numeri, **sempre imponibile**); le relazioni sono per \`id\`.
Un backup con versione precedente viene migrato all'apertura (\`migrazioni\` nel codice, sezione STATO): i campi mancanti vengono integrati con i valori predefiniti.

## Collezioni

| Chiave | Contenuto | Esempio (primo elemento) |
|---|---|---|
| \`azienda\` | anagrafica Pavimass, figure di sicurezza, immagini | vedi sotto |
| \`persone[]\` | operai, soci, amministrativi | vedi sotto |
| \`tipiDocumento[]\` | catalogo tipi con validità e obbligatorietà | vedi sotto |
| \`documenti[]\` | documenti di persona/azienda/cantiere: date, file allegati | vedi sotto |
| \`file[]\` | metadati dei blob (hash, nome, peso, cestinato) | vedi sotto |
| \`clienti[]\`, \`professionisti[]\` | anagrafiche | |
| \`lavorazioni[]\` | le sette lavorazioni | |
| \`cantieri[]\` | cantieri con figure, squadra, PSC, denuncia, invii, diario | |
| \`pos[]\` | POS generati (dati congelati per la ristampa identica) | |
| \`modelli\` | dichiarazioni (testo con segnaposto), testo POS personalizzato | |
| \`presenze\` | oggetto \`{"AAAA-MM": {persone: {personaId: {giorni:{"1":{ore|codice,cantiere,committente}}, aggiustamenti, importoForzato, importoManuale, foglioOreId, note}}}}\` | |
| \`bustePaga[]\`, \`regoleBuste[]\` | buste per persona/anno/mese; regole apprese nome file → persona | |
| \`listino[]\`, \`preventivi[]\` | listino e preventivi con righe | |
| \`movimenti[]\` | entrate/uscite/note di credito con quote per cantiere | |
| \`generati[]\` | storico dei documenti generati (HTML congelato) | |
| \`impostazioni\` | preferenze, soglie, backup, chiave API (solo locale) | |
| \`cestino[]\` | elementi eliminati recuperabili | |

### azienda
\`\`\`json
${es(Object.fromEntries(Object.entries(s.azienda).filter(([k])=>!/immagin|logo|firma|timbro/i.test(k))))}
\`\`\`
### persone[0]
\`\`\`json
${campione(s.persone)}
\`\`\`
### tipiDocumento[0]
\`\`\`json
${campione(s.tipiDocumento)}
\`\`\`
\`obbligatorio\` vale: \`si\`, \`no\`, \`extraUE\`, \`preposto\`, \`rls\`, \`rspp\`, \`antincendio\`, \`primoSoccorso\`, \`ple\`, \`ponteggi\`, \`ruolo\`.
### documenti[0]
\`\`\`json
${campione(s.documenti)}
\`\`\`
\`soggettoTipo\` vale \`persona\`, \`azienda\`, \`cantiere\`, \`cliente\`. Se \`dataScadenza\` manca e il tipo ha \`validitaMesi\`, la scadenza è stimata da \`dataEmissione\`.
### file[0]
\`\`\`json
${campione(s.file)}
\`\`\`
### clienti[0]
\`\`\`json
${campione(s.clienti)}
\`\`\`
### cantieri[0]
\`\`\`json
${campione(s.cantieri)}
\`\`\`
### movimenti[0]
\`\`\`json
${campione(s.movimenti)}
\`\`\`
\`tipo\` vale \`entrata\`, \`uscita\`, \`nota_credito\`. \`quote[]\` ripartisce l'imponibile fra cantieri; la somma deve coincidere con \`imponibile\`. \`categoria\`: materiali, subappalto, trasporti, noleggi, spese_generali, manodopera, altro.
### preventivi[0]
\`\`\`json
${campione(s.preventivi)}
\`\`\`
### presenze (un mese)
\`\`\`json
${(()=>{const k=Object.keys(s.presenze||{})[0];if(!k)return '(nessun mese)';const m=s.presenze[k];const pid=Object.keys(m.persone)[0];const mp=m.persone[pid];const gg=Object.keys(mp.giorni).slice(0,2);return es({[k]:{persone:{[pid]:{...mp,giorni:Object.fromEntries(gg.map(g=>[g,mp.giorni[g]]))}}}})})()}
\`\`\`
Codici di assenza: M malattia, I infortunio, PE permesso (max 88 ore/anno), FS festività (solo in giorno feriale), FE ferie (max 20 giorni/anno), AS assenza, CI cassa integrazione.
Importo mensile = arrotondaAziendale(ore in griglia × tariffaOraria + Σ aggiustamenti + importoFisso); arrotondamento a multipli di 10 con resto 0–3 per difetto, 4–9 per eccesso.
### impostazioni
\`\`\`json
${es(s.impostazioni)}
\`\`\`
`;
}
