// ---------------------------------------------------------------------
// ESPORTA: download e condivisione (foglio di sistema su iOS), CSV, XLSX scritto a mano,
// Markdown per il resto del flusso di lavoro, pacchetto committenza.
// ---------------------------------------------------------------------
function scaricaBlob(blob,nome){
  const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=nome;a.rel='noopener';document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},4000);
}
async function condividiOScarica(blob,nome,opz){
  opz=opz||{};
  const file=new File([blob],nome,{type:blob.type||'application/octet-stream'});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file],title:nome,text:opz.testo||''}); return 'condiviso'; }
    catch(e){ if(e&&e.name==='AbortError') return 'annullato'; }
  }
  scaricaBlob(blob,nome);
  if(eIos()) avviso('Il foglio di condivisione non è disponibile qui: il file è stato scaricato in File → Download.',{durata:6000});
  return 'scaricato';
}
function scaricaTesto(testo,nome,mime){const b=new Blob(['﻿'+testo],{type:(mime||'text/plain')+';charset=utf-8'});return condividiOScarica(b,nome)}
function csvDaRighe(righe){return righe.map(r=>r.map(v=>{if(v===null||v===undefined)return '';let s=typeof v==='number'?fNum(v,Number.isInteger(v)?0:2):String(v);if(/[;"\n]/.test(s))s='"'+s.replace(/"/g,'""')+'"';return s}).join(';')).join('\r\n')}
function scaricaCsv(righe,nome){return scaricaTesto(csvDaRighe(righe),nome,'text/csv')}
function mostraTestoEsportato(titolo,testo,nomeFile){
  return dialogo({titolo,largo:true,corpo:html`<p class="piccolo secondario">Pronto da copiare o da salvare come file «${nomeFile}».</p><textarea rows="18" class="mono" readonly style="width:100%;font-size:12px">${testo}</textarea>`,pulsanti:[{testo:'Copia',fn:()=>{copiaNegliAppunti(testo).then(()=>avviso('Copiato'));return false}},{testo:eIos()?'Condividi':'Scarica',classe:'primario',fn:()=>{scaricaTesto(testo,nomeFile,'text/markdown');return false}},{testo:'Chiudi',valore:true}]});
}
// ---- XLSX minimale: [Content_Types], rels, workbook, styles, fogli con stringhe in linea ----
// fogli: [{nome, righe:[[cella...]], larghezze:{A:30,...}, unioni:['A1:B2']}]; cella: valore | {v, f, s} con s = indice stile
const STILI_XLSX=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFBF2CF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf><xf numFmtId="4" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normale" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
const XS={normale:0,grassetto:1,testa:2,cella:3,festivo:4,euro:5,nome:6};
function colXlsx(i){let s='';i++;while(i>0){const r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26)}return s}
function xmlSafe(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'')}
function foglioXml(f){
  const righe=f.righe.map((r,ri)=>{const celle=r.map((c,ci)=>{if(c===null||c===undefined||c==='')return '';const ref=colXlsx(ci)+(ri+1);const o=(typeof c==='object'&&!(c instanceof Date))?c:{v:c};const s=o.s?` s="${o.s}"`:'';if(o.f)return `<c r="${ref}"${s}><f>${xmlSafe(o.f)}</f></c>`;if(typeof o.v==='number')return `<c r="${ref}"${s}><v>${o.v}</v></c>`;if(o.v===null||o.v===undefined||o.v==='')return s?`<c r="${ref}"${s}/>`:'';return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xmlSafe(o.v)}</t></is></c>`}).join('');return `<row r="${ri+1}">${celle}</row>`}).join('');
  const cols=f.larghezze?'<cols>'+Object.entries(f.larghezze).map(([k,w])=>{const i=k.charCodeAt(0)-64;return `<col min="${i}" max="${i}" width="${w}" customWidth="1"/>`}).join('')+'</cols>':'';
  const unioni=f.unioni&&f.unioni.length?`<mergeCells count="${f.unioni.length}">${f.unioni.map(u=>`<mergeCell ref="${u}"/>`).join('')}</mergeCells>`:'';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${f.orizzontale?'<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>':''}${cols}<sheetData>${righe}</sheetData>${unioni}${f.orizzontale?'<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>':''}</worksheet>`;
}
async function creaXlsx(fogli){
  const voci=[];
  voci.push({nome:'[Content_Types].xml',dati:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${fogli.map((f,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`});
  voci.push({nome:'_rels/.rels',dati:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`});
  voci.push({nome:'docProps/core.xml',dati:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Gestionale Pavimass</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`});
  voci.push({nome:'docProps/app.xml',dati:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Gestionale Pavimass</Application></Properties>`});
  voci.push({nome:'xl/workbook.xml',dati:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${fogli.map((f,i)=>`<sheet name="${xmlSafe(f.nome.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`});
  voci.push({nome:'xl/_rels/workbook.xml.rels',dati:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fogli.map((f,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${fogli.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`});
  voci.push({nome:'xl/styles.xml',dati:STILI_XLSX});
  fogli.forEach((f,i)=>voci.push({nome:`xl/worksheets/sheet${i+1}.xml`,dati:foglioXml(f)}));
  const blob=await creaZip(voci);
  return new Blob([blob],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
// Libro presenze annuale nel formato del commercialista: un foglio per mese + foglio codici
async function esportaPresenzeXlsx(anno){
  const fogli=[];
  for(let mese=1;mese<=12;mese++){
    const m=meseP(anno,mese)||{persone:{}};const persone=personePresenze(anno,mese);const n=giorniNelMese(anno,mese);const fest=festivitaAnno(anno,stato.impostazioni.festivitaLocali);const k=chiaveMese(anno,mese);
    const righe=[];const unioni=[];
    const st=g=>eFineSettimana(anno,mese,g)?XS.cella:fest.has(k+'-'+pad2(g))?XS.festivo:XS.cella;
    righe.push([]);righe[0][11]={v:capitalizza(nomeMese(mese)),s:XS.grassetto};
    righe.push([{v:'Soci',s:XS.grassetto},'','',{v:'Presenze',s:XS.grassetto},'','','','','','','','',{v:capitalizza(nomeMese(mese)),s:XS.grassetto},'','','','','','',{v:anno,s:XS.grassetto}]);
    righe.push(['','','',{v:'Giorni  -  Ore  -  Località lavori - committente',s:XS.grassetto}]);
    const testaGiorni=(extra)=>{const r=['','',''];for(let g=1;g<=31;g++)r.push(g<=n?{v:g,s:XS.testa}:{v:'',s:XS.testa});r.push({v:extra[0]||'',s:XS.testa},{v:extra[1]||'importo',s:XS.testa});return r};
    righe.push(testaGiorni(['','importo']));
    const rigaVal=(p,mp,riga,etichetta,ultime)=>{const r=[etichetta==='ore'||etichetta==='trasferte'?{v:nomePersona(p),s:XS.nome}:'',{v:etichetta,s:XS.cella},''];for(let g=1;g<=31;g++){if(g>n){r.push('');continue}const c=(mp.giorni||{})[String(g)]||{};let v='';if(riga==='ore'){const x=valoreCella(c);v=x==null?'':x}else v=c[riga]||'';r.push({v,s:st(g)})}r.push(...(ultime||['','']));return r};
    const soci=persone.filter(p=>(p.sezionePresenze||'dipendenti')==='soci'),dip=persone.filter(p=>(p.sezionePresenze||'dipendenti')!=='soci');
    for(const p of soci){const mp=m.persone[p.id]||{giorni:{}};const calc=calcolaMesePersona(mp,p);const r0=righe.length+1;
      if(p.soloTrasferte){righe.push(rigaVal(p,mp,'trasferta','trasferte',['',{v:calc.importo||0,s:XS.euro}]));righe.push(rigaVal(p,mp,'cantiere','cantiere'));righe.push(rigaVal(p,mp,'committente','committente'));}
      else{righe.push(rigaVal(p,mp,'ore','ore',[{f:`SUM(D${r0}:AH${r0})`,s:XS.normale},{v:calc.importo||0,s:XS.euro}]));righe.push(rigaVal(p,mp,'cantiere','cantiere'));righe.push(rigaVal(p,mp,'committente','committente'));}
      unioni.push(`A${r0}:A${r0+2}`);}
    righe.push([{v:'Dipendenti',s:XS.grassetto}]);righe[righe.length-1].push(...testaGiorni(['ore','importo']).slice(1));
    for(const p of dip){const mp=m.persone[p.id]||{giorni:{}};const calc=calcolaMesePersona(mp,p);const r0=righe.length+1;righe.push(rigaVal(p,mp,'ore','ore',[{f:`SUM(D${r0}:AH${r0})`,s:XS.normale},{v:calc.importo||0,s:XS.euro}]));righe.push(rigaVal(p,mp,'cantiere','cantiere'));righe.push(rigaVal(p,mp,'committente','commitente'));unioni.push(`A${r0}:A${r0+2}`)}
    fogli.push({nome:nomeMese(mese),righe,unioni,larghezze:{A:24,B:12,C:3},orizzontale:true});
  }
  const cod=[[{v:'Codici da utilizzare nel libro delle presenze',s:XS.grassetto}],[]];for(const [c,x] of Object.entries(CODICI_ASSENZA))cod.push([{v:x.nome.toUpperCase()+(x.massimaleOreAnno?` (${x.massimaleOreAnno} ORE ALL'ANNO)`:x.massimaleGiorniAnno?` (${x.massimaleGiorniAnno} GG ALL'ANNO)`:''),s:XS.normale},'','','',{v:c,s:XS.grassetto}]);
  fogli.push({nome:'codici',righe:cod,larghezze:{A:34}});
  const blob=await creaXlsx(fogli);
  await condividiOScarica(blob,nomeFileData('Libro presenze '+anno,'xlsx'));
}
function esportaPresenzeCsv(anno,mese){
  const m=meseP(anno,mese)||{persone:{}};const persone=personePresenze(anno,mese);const n=giorniNelMese(anno,mese);
  const righe=[['Persona','Riga',...Array.from({length:n},(_,i)=>i+1),'Ore','Importo']];
  for(const p of persone){const mp=m.persone[p.id]||{giorni:{}};const calc=calcolaMesePersona(mp,p);const rr=riga=>Array.from({length:n},(_,i)=>{const c=(mp.giorni||{})[String(i+1)]||{};if(riga==='ore'){const v=valoreCella(c);return v==null?'':v}return c[riga]||''});
    if(p.soloTrasferte)righe.push([nomePersona(p),'trasferte',...rr('trasferta'),'',calc.importo]);else{righe.push([nomePersona(p),'ore',...rr('ore'),calc.oreGriglia,calc.importo]);righe.push(['','cantiere',...rr('cantiere')]);righe.push(['','committente',...rr('committente')])}}
  scaricaCsv(righe,nomeFileData('Presenze '+capitalizza(nomeMese(mese))+' '+anno,'csv'));
}
function riepilogoPresenzeMarkdown(anno,mese){
  const rie=riepilogoMese(anno,mese);
  let t=`# Riepilogo presenze ${capitalizza(nomeMese(mese))} ${anno}\n*Last updated: ${oggi()}*\n\n| Operaio | Ore | M | I | PE | FS | FE | AS | CI | Importo |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for(const x of rie.perPersona){const c=x.calc;t+=`| ${nomePersona(x.p)} | ${x.p.soloTrasferte?'—':fOre(c.oreGriglia)} | ${['M','I','PE','FS','FE','AS','CI'].map(k=>c.perCodice[k]||0).join(' | ')} | ${fEuro(c.importo||0,0)} |\n`}
  t+=`\n**Totale ore in griglia:** ${fOre(rie.oreTotali)} · **Importo complessivo:** ${fEuro(rie.importoTotale,0)}\n\nCodici: M malattia · I infortunio · PE permesso · FS festività · FE ferie · AS assenza · CI cassa integrazione. Importi arrotondati a multipli di 10 secondo la regola aziendale.\n`;
  return t;
}
async function esportaPreventivoXlsx(p){
  const righe=[[{v:'art',s:XS.testa},{v:'descrizione sintetica',s:XS.testa},{v:'descrizione estesa',s:XS.testa},{v:'um',s:XS.testa},{v:'q.tà',s:XS.testa},{v:'pu',s:XS.testa},{v:'importo',s:XS.testa},{v:'note',s:XS.testa}]];
  p.righe.forEach((r,i)=>{const n=i+2;righe.push([r.codice||'',r.descrizione||'',r.descrizioneEstesa||'',r.um||'',r.quantita!=null?r.quantita:'',r.prezzo!=null&&r.prezzo!==''?r.prezzo:'',r.prezzo!=null&&r.prezzo!==''&&!r.esclusa?{f:`E${n}*F${n}`}:'',r.esclusa?'SOLO POSA — esclusa fornitura':(r.note||'')])});
  righe.push([{v:'TOTALE',s:XS.grassetto},'','','','','',{f:`SUM(G2:G${righe.length})`,s:XS.euro},'']);
  const blob=await creaXlsx([{nome:'Preventivo',righe,larghezze:{A:14,B:50,C:60,D:6,E:10,F:12,G:14,H:30}}]);
  await condividiOScarica(blob,nomeFileData('Preventivo '+p.numero+' '+p.anno,'xlsx'));
}
// ---- Markdown per il resto del flusso ----
const SIMBOLO_STATO={valido:'✅',pianificare:'⚠️',scadenza:'⚠️',scaduto:'❌',mancante:'❌',riferimento:'📄'};
function scadenzarioMarkdown(){
  const sc=riepilogoScadenze();const oggiIso=oggi();
  const rigaDoc=x=>{const f=(x.doc.file||[]).map(id=>(fileMeta(id)||{}).nome).filter(Boolean).join(', ');const exp=x.info.data?(x.info.stimata?'~':'')+fData(x.info.data):(x.doc.senzaScadenza?'No expiry':'da verificare');return `| ${(x.tipo||{}).nome||''}${x.doc.titolo?' — '+x.doc.titolo:''} | ${fData(x.doc.dataEmissione)||'—'} | ${x.info.stato==='scaduto'||x.info.stato==='scadenza'?'**'+exp+'**':exp} | ${SIMBOLO_STATO[x.info.stato]}${x.info.stato==='scaduto'?' SCADUTO':''} | ${f?'`'+f+'`':'—'} |`};
  let t=`# Worker & Company Expiry Tracker\n*Last updated: ${oggiIso}*\n\n## Legend\n- ✅ Valid\n- ⚠️ Expiring within ${sc.soglie.pianificare} days\n- ❌ Expired or Missing\n- 📄 No fixed expiry / reference document\n\n## Renewal Rules (reference)\n| Course | Renewal | Duration |\n|--------|---------|----------|\n`;
  for(const tp of stato.tipiDocumento.filter(x=>x.ambito==='persona'&&x.validitaMesi&&x.categoria==='formazione')) t+=`| ${tp.nome} | ${tp.validitaMesi%12===0?(tp.validitaMesi===12?'every year':'every '+(tp.validitaMesi/12)+' years'):'every '+tp.validitaMesi+' months'} | — |\n`;
  t+=`\n---\n\n## Company Documents\n\n| Document | Issue Date | Expiry | Status | File |\n|----------|-----------|--------|--------|------|\n`;
  for(const x of sc.righe.filter(r=>!r.persona)) t+=rigaDoc(x)+'\n';
  t+=`\n---\n\n## Workers\n\n`;
  for(const p of stato.persone.filter(p=>p.attivo)){const righe=sc.righe.filter(r=>r.persona&&r.persona.id===p.id);const idn=idoneita(p);t+=`### ${nomePersona(p)} — ${p.mansione||''}${(p.qualifiche||[]).length?' · '+p.qualifiche.map(q=>QUALIFICHE[q]||q).join(' · '):''}\nC.F.: ${p.cf||'—'} · nato ${p.dataNascita?fData(p.dataNascita):'—'} ${p.luogoNascita||''}\n\n| Document | Issue Date | Expiry | Status | File |\n|----------|-----------|--------|--------|------|\n`;for(const x of righe)t+=rigaDoc(x)+'\n';for(const m of idn.dettagliTutti.filter(d=>d.stato==='mancante'))t+=`| ${m.nome} | — | — | ❌ MANCANTE | — |\n`;t+='\n---\n\n'}
  t+=`## ❌ Expired / Missing (action required)\n\n| What | Who | Expired On |\n|------|-----|-----------|\n`;
  for(const x of sc.scaduti) t+=`| ${(x.tipo||{}).nome} | ${x.soggetto} | ${fData(x.info.data)} |\n`;
  for(const m of sc.mancanti) t+=`| ${m.nome} | ${nomePersona(m.persona)} | MAI FATTO |\n`;
  t+=`\n## ⚠️ Expiring within ${sc.soglie.pianificare} days (from ${oggiIso})\n\n| What | Who | Expires | Days Left |\n|------|-----|---------|-----------|\n`;
  for(const x of [...sc.entro60,...sc.entro90].sort((a,b)=>a.info.giorni-b.info.giorni)) t+=`| ${(x.tipo||{}).nome} | ${x.soggetto} | ${x.info.stimata?'~':''}${fData(x.info.data)} | ${x.info.stimata?'~':''}${x.info.giorni} |\n`;
  return t;
}
function cantiereMarkdown(c){
  const f=(k)=>{const t=testoFigura(c,FIGURE_CANTIERE.find(x=>x.chiave===k));return t?t.nome+(t.righe.length?' – '+t.righe.join(' – '):''):'[DA COMPILARE]'};
  let t=`# ${c.nome} ${c.anno} – Cantiere\n*Last updated: ${oggi()}*\n\n## Site Details\n\n- **Opera:** ${c.descrizione||'[DA COMPILARE]'}\n- **Indirizzo:** ${indirizzoTesto(c.indirizzo)||'[DA COMPILARE]'}\n- **Comune / CAP:** ${c.indirizzo.comune||'[DA COMPILARE]'}${c.indirizzo.provincia?' ('+c.indirizzo.provincia+')':''} / ${c.indirizzo.cap||'[DA COMPILARE]'}\n- **Stato:** ${STATI_CANTIERE[c.stato]}\n- **Lavorazioni:** ${(c.lavorazioni||[]).map(id=>(stato.lavorazioni.find(l=>l.id===id)||{}).nome).join('; ')||'[DA COMPILARE]'}\n- **Entità presunta uomini/giorno:** ${c.uominiGiorno||'[DA COMPILARE]'}\n- **Orari:** ${c.orari||'[DA COMPILARE]'}\n- **Importo Pavimass:** ${c.importoContratto?fEuro(c.importoContratto):'[DA COMPILARE]'}\n\n## Key Figures\n\n- **Committente:** ${f('committenteId')}\n- **Impresa affidataria:** ${f('affidatariaId')}\n- **Progettista:** ${f('progettistaId')}\n- **Direttore dei lavori:** ${f('direttoreLavoriId')}\n- **CSE esecuzione:** ${f('cseId')}\n- **CSE progettazione:** ${f('cspId')}\n\n## Pavimass Dates\n\n- **Inizio lavori:** ${c.dataInizio?fData(c.dataInizio):(c.periodoTesto||'[DA COMPILARE]')}\n- **Fine lavori:** ${c.dataFine?fData(c.dataFine):'[DA COMPILARE]'}\n- **Preposto:** ${c.prepostoId?nomePersona(persona(c.prepostoId)):'[DA COMPILARE]'}\n- **Operai in cantiere:** ${(c.operai||[]).map(id=>nomePersona(persona(id))).join(', ')||'[DA COMPILARE]'}\n${c.psc&&(c.psc.data||c.psc.periodoTesto)?`- **PSC:** ${dataValida(c.psc.data)?fData(c.psc.data):c.psc.periodoTesto}${c.psc.redattore?' · '+c.psc.redattore:''}\n`:''}${c.denuncia&&c.denuncia.data?`- **Denuncia apertura cantiere:** ${fData(c.denuncia.data)} (${fData(c.denuncia.dal)} → ${fData(c.denuncia.al)}), importo complessivo ${fEuro(c.denuncia.importoComplessivo)}, Pavimass ${fEuro(c.denuncia.importoPavimass)}\n`:''}\n## Documents\n\n`;
  for(const d of c.documentiProdotti||[]) t+=`- **${d.tipo}:** ${d.titolo}${d.revisione?' (rev. '+d.revisione+')':''} – ${fData(d.data)}${d.note?' – '+d.note:''}\n`;
  for(const p of stato.pos.filter(x=>x.cantiereId===c.id)) t+=`- **POS rev. ${p.revisione}:** emesso ${fData(p.dataEmissione)}${p.dataRevisione&&p.dataRevisione!==p.dataEmissione?', revisione '+fData(p.dataRevisione):''} – ${p.lavorazioni.length} lavorazioni, ${p.operai.length} operai\n`;
  for(const i of c.invii||[]) t+=`- **Invio ${fData(i.data.slice(0,10))}** a ${i.destinatario||'—'}: ${i.contenuto.length} documenti${i.mancanti.length?' (mancanti: '+i.mancanti.join(', ')+')':''}\n`;
  if(!(c.documentiProdotti||[]).length&&!stato.pos.some(x=>x.cantiereId===c.id)) t+='- (nessun documento prodotto)\n';
  return t;
}
function indiceCantieriMarkdown(){
  const riga=c=>`- **${c.anno}/${c.nome}** – ${nomeCliente(c.affidatariaId)?'Pavimass subcontracted by '+nomeCliente(c.affidatariaId):''}${nomeCliente(c.committenteId)?' | Committente: '+nomeCliente(c.committenteId):''}${c.dataInizio?' | Start: '+fData(c.dataInizio):''}${c.dataFine?' | End: '+fData(c.dataFine):''}${!c.dataInizio&&c.periodoTesto?' | '+c.periodoTesto:''}${stato.pos.filter(p=>p.cantiereId===c.id).length?' | POS rev. '+Math.max(...stato.pos.filter(p=>p.cantiereId===c.id).map(p=>p.revisione)):''}\n`;
  let t=`# Cantieri – Master Index\n*Last updated: ${oggi()}*\n\n## Active Sites\n\n`;
  for(const c of stato.cantieri.filter(c=>['attivo','sospeso','preventivo'].includes(c.stato))) t+=riga(c);
  t+=`\n## Completed Sites\n\n`;
  for(const c of stato.cantieri.filter(c=>['chiuso','archiviato'].includes(c.stato))) t+=riga(c);
  return t;
}
AZIONI['esporta-scadenzario-md']=()=>mostraTestoEsportato('Scadenzario in Markdown',scadenzarioMarkdown(),nomeFileData('Scadenzario Pavimass','md'));
AZIONI['esporta-scadenzario-csv']=()=>{const sc=riepilogoScadenze();const righe=[['Chi','Documento','Titolo','Emissione','Scadenza','Stimata','Stato','Giorni','File']];for(const x of sc.righe)righe.push([x.soggetto,(x.tipo||{}).nome||'',x.doc.titolo||'',fData(x.doc.dataEmissione),fData(x.info.data),x.info.stimata?'sì':'',STATI_DOC[x.info.stato].etichetta,x.info.giorni,(x.doc.file||[]).map(id=>(fileMeta(id)||{}).nome).join(' | ')]);for(const m of sc.mancanti)righe.push([nomePersona(m.persona),m.nome,'','','','','Mancante','','']);scaricaCsv(righe,nomeFileData('Scadenzario Pavimass','csv'))};
AZIONI['esporta-cantiere-md']=d=>{const c=cantiere(d.id);mostraTestoEsportato('Scheda cantiere in Markdown',cantiereMarkdown(c),nomeFileData('Cantiere '+pulisciNomeFile(c.nome),'md'))};
AZIONI['esporta-indice-cantieri-md']=()=>mostraTestoEsportato('Indice cantieri in Markdown',indiceCantieriMarkdown(),nomeFileData('Indice cantieri','md'));
AZIONI['esporta-schema']=()=>mostraTestoEsportato('Documentazione dello schema dati',documentazioneSchema(),nomeFileData('Schema dati Gestionale Pavimass','md'));

// ---------------------------------------------------------------------
// Pacchetto documenti per la committenza: revisione obbligatoria, poi ZIP con cartelle numerate.
// ---------------------------------------------------------------------
function vistaPacchetto(c,r){
  if(!c) return html`<div class="vuoto">${icona('attenzione')}<h3>Cantiere non trovato</h3></div>`;
  const ck=checklistCantiere(c);
  const operai=(c.operai||[]).map(id=>persona(id)).filter(Boolean);
  // blocchi di conformità: UNILAV mancante/scaduto o permesso di soggiorno scaduto
  const blocchi=[];
  for(const p of operai){for(const t of ['unilav','permesso_soggiorno']){const tipo=tipoDoc(t);if(!tipoApplicabile(tipo,p))continue;const m=migliorDocumento(documentiPersona(p.id).filter(d=>d.tipoId===t),tipo,oggi(),soglie());if(!m||m.info.stato==='scaduto'||!(m.doc.file||[]).length)blocchi.push({p,tipo,motivo:!m?'mancante':m.info.stato==='scaduto'?'scaduto il '+fData(m.info.data):'senza file'})}}
  const righe=ck.voci.filter(v=>v.stato!=='na').map((v,i)=>({i,v,file:v.doc?(v.doc.file||[]).map(id=>fileMeta(id)).filter(Boolean):[],generato:v.modelloId?(c.documentiProdotti||[]).find(d=>d.modelloId===v.modelloId):null}));
  const sc=ui.pacchetto&&ui.pacchetto.cantiereId===c.id?ui.pacchetto:(ui.pacchetto={cantiereId:c.id,forzati:{},esclusi:{}});
  const includibile=x=>x.v.stato==='ok'||(x.v.stato==='scaduto'&&sc.forzati[x.i])||(x.v.stato==='preparare'&&x.generato);
  return html`<div class="briciole"><a href="#/cantieri">Cantieri</a> › <a href="#/cantieri/${c.id}">${c.nome}</a> › Pacchetto committenza</div>
  <div class="testata"><div><h1>Pacchetto per la committenza</h1><div class="sotto">${c.nome} · ${nomeCliente(c.committenteId)||daCompilare('committente')} · affidataria ${nomeCliente(c.affidatariaId)||daCompilare()}</div></div><div class="azioni"><button class="pulsante" data-azione="checklist-copia" data-id="${c.id}">${icona('copia')}Copia checklist</button><button class="pulsante primario" data-azione="pacchetto-genera" data-id="${c.id}" ${blocchi.length?'disabled':''}>${icona('pacchetto')}Genera lo ZIP (${righe.filter(includibile).length} documenti)</button></div></div>
  ${blocchi.length?html`<div class="avviso-inline critico">${icona('blocco')}<div class="corpo"><b>Blocco di conformità.</b> ${blocchi.map(b=>html`${nomePersona(b.p)}: ${b.tipo.nome} ${b.motivo}`).reduce((a,b)=>html`${a} · ${b}`)}. Mandare questi operai alla committenza è un rischio: togli le persone dal cantiere o regolarizza i documenti prima di generare il pacchetto.</div></div>`:''}
  <div class="scheda"><h3>Revisione obbligatoria</h3><p class="secondario piccolo">Ogni riga dice cosa entrerà nello ZIP, a chi si riferisce, quale file verrà usato, la scadenza e lo stato. I documenti scaduti non entrano, se non forzando con una motivazione. Le dichiarazioni entrano se sono state compilate e stampate in PDF e il PDF è stato allegato; altrimenti entrano come pagina HTML pronta da stampare e firmare.</p>
  <div class="tabella-scorri"><table class="tabella densa"><thead><tr><th>Entra</th><th>Documento</th><th>Soggetto</th><th>File</th><th>Scadenza</th><th>Stato</th></tr></thead><tbody>
  ${righe.map(x=>{const v=x.v;const st=STATI_CHECKLIST[v.stato];const entra=includibile(x)&&!sc.esclusi[x.i];return html`<tr class="${v.stato==='scaduto'?'riga-scaduto':v.stato==='ok'?'riga-valido':''}"><td>${includibile(x)?html`<input type="checkbox" data-pacchetto-escludi="${x.i}" ${entra?'checked':''} aria-label="Includi">`:v.stato==='scaduto'?html`<button class="pulsante piccolo pericolo" data-azione="pacchetto-forza" data-i="${x.i}">Forza</button>`:html`<span class="silenzioso">—</span>`}</td><td><b>${v.nome}</b>${sc.forzati[x.i]?html`<br><span class="piccolo da-compilare">forzato: ${sc.forzati[x.i]}</span>`:''}</td><td>${v.soggetto}</td><td class="piccolo">${x.file.length?x.file.map(f=>html`${f.nome} <span class="secondario">(${fPeso(f.dimensione)})</span><br>`):x.generato?html`<span class="secondario">${x.generato.fileId?(fileMeta(x.generato.fileId)||{}).nome:'compilata il '+fData(x.generato.data)+' (senza PDF: entra come HTML)'}</span>`:v.stato==='preparare'?html`<button class="pulsante piccolo" data-azione="dichiarazione-compila" data-cantiere="${c.id}" data-modello="${v.modelloId||''}">Compila</button>`:html`<span class="da-compilare">nessun file</span>`}</td><td>${v.info&&v.info.data?html`<span class="${v.info.stato==='scaduto'?'da-compilare':''}">${fData(v.info.data)}${v.info.stimata?' ~':''}</span>`:''}</td><td><span class="pillola ${st.cl}">${icona(st.ic,'piccola')}${st.t}</span></td></tr>`})}
  </tbody></table></div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.pacchettoEscludi!==undefined&&ui.pacchetto){ui.pacchetto.esclusi[+t.dataset.pacchettoEscludi]=!t.checked;render()}});
AZIONI['pacchetto-forza']=async d=>{const m=await chiediTesto('Includere un documento scaduto',{etichetta:'Motivazione (resterà nello storico dell\'invio)',obbligatorio:true,aiuto:'Es. rinnovo già richiesto, attestato in arrivo'});if(!m)return;ui.pacchetto.forzati[+d.i]=m;render()};
AZIONI['pacchetto-genera']=async d=>{
  const c=cantiere(d.id);const ck=checklistCantiere(c);const sc=ui.pacchetto||{forzati:{},esclusi:{}};
  const righe=ck.voci.filter(v=>v.stato!=='na').map((v,i)=>({i,v,generato:v.modelloId?(c.documentiProdotti||[]).find(x=>x.modelloId===v.modelloId):null}));
  const inclusi=righe.filter(x=>!sc.esclusi[x.i]&&(x.v.stato==='ok'||(x.v.stato==='scaduto'&&sc.forzati[x.i])||(x.v.stato==='preparare'&&x.generato)));
  const mancanti=righe.filter(x=>!inclusi.includes(x)).map(x=>x.v.nome+' — '+x.v.soggetto+' ('+STATI_CHECKLIST[x.v.stato].t+')');
  const dest=await dialogoModulo('Registra l\'invio',[{nome:'destinatario',etichetta:'Destinatario',obbligatorio:true,segnaposto:'es. Geom. Manetti (CSE), LGC ufficio sicurezza'},{nome:'mezzo',etichetta:'Mezzo',tipo:'select',vuoto:false,opzioni:[{v:'mail',t:'Mail'},{v:'pec',t:'PEC'},{v:'whatsapp',t:'WhatsApp'},{v:'portale',t:'Portale della committenza'},{v:'altro',t:'Altro'}]},{nome:'note',etichetta:'Note',tipo:'textarea',largo:true}],{destinatario:nomeProfessionista(c.cseId)||nomeCliente(c.affidatariaId)||'',mezzo:'mail'},{ok:'Genera lo ZIP',intro:html`<p>Lo ZIP conterrà <b>${inclusi.length}</b> documenti. ${mancanti.length?html`<span class="da-compilare">${mancanti.length} voci mancano</span> e resteranno segnate nello storico dell'invio.`:'Niente manca.'}</p>`});
  if(!dest) return;
  const prog=dialogoAvanzamento('Preparazione del pacchetto',{annullabile:true});
  const voci=[];const indice=[];const usati=new Set();
  const cartelle={Impresa:'01 Documenti impresa',Operai:'02 Documenti operai','Sicurezza cantiere':'03 Sicurezza cantiere',Dichiarazioni:'04 Dichiarazioni','Richieste dalla committenza':'05 Altri documenti richiesti'};
  const pulisci=s=>pulisciNomeFile(s).replace(/\s+/g,' ').trim();
  try{
    for(let i=0;i<inclusi.length;i++){
      const x=inclusi[i];const v=x.v;if(prog.annullato)break;await prog.aggiorna(i,inclusi.length,v.nome);
      let cartella=cartelle[v.gruppo]||'05 Altri documenti richiesti';
      if(v.gruppo==='Operai'&&v.persona) cartella+='/'+pulisci(nomePersona(v.persona));
      const scad=v.info&&v.info.data?fData(v.info.data):'';
      if(v.doc&&(v.doc.file||[]).length){
        for(const fid of v.doc.file){const m=fileMeta(fid);if(!m)continue;const b=await leggiFile(m.hash);if(!b)continue;const est=estensioneDi(m.nome)||'pdf';let nome=pulisci(v.nome+(v.doc.dataEmissione?' '+fDataBreve(v.doc.dataEmissione).replace(/\//g,'-'):''))+'.'+est;let k=cartella+'/'+nome;let n=2;while(usati.has(k)){k=cartella+'/'+nome.replace(/\.[^.]+$/,' '+n+'$&');n++}usati.add(k);voci.push({nome:k,dati:b});indice.push({cartella,nome:k.split('/').pop(),documento:v.nome,soggetto:v.soggetto,scadenza:scad,stato:STATI_CHECKLIST[v.stato].t+(sc.forzati[x.i]?' — FORZATO: '+sc.forzati[x.i]:'')})}
      } else if(x.generato){
        if(x.generato.fileId){const m=fileMeta(x.generato.fileId);const b=await leggiFile(m.hash);if(b){const k=cartella+'/'+pulisci(v.nome)+'.'+(estensioneDi(m.nome)||'pdf');voci.push({nome:k,dati:b});indice.push({cartella,nome:k.split('/').pop(),documento:v.nome,soggetto:v.soggetto,scadenza:'',stato:'compilata il '+fData(x.generato.data)})}}
        else { const g=perId('generati',x.generato.generatoId); const pagine=g?g.pagine:impagina(docDichiarazione(stato.modelli.dichiarazioni.find(m=>m.id===v.modelloId),c,{data:x.generato.data})); const htmlDoc=`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>${h(v.nome)}</title><style>${stileStampaPerHtml()}</style></head><body>${risolviImmagini(pagine.join(''))}</body></html>`; const k=cartella+'/'+pulisci(v.nome)+' (da stampare in PDF).html'; voci.push({nome:k,dati:htmlDoc}); indice.push({cartella,nome:k.split('/').pop(),documento:v.nome,soggetto:v.soggetto,scadenza:'',stato:'compilata il '+fData(x.generato.data)+' — da aprire nel browser, stampare in PDF e firmare'}) }
      }
    }
    // indice
    const a=stato.azienda;
    let txt=`PACCHETTO DOCUMENTI — ${a.ragioneSociale}\nCantiere: ${c.nome} — ${indirizzoTesto(c.indirizzo)}\nCommittente: ${nomeCliente(c.committenteId)||'[DA COMPILARE]'} · Impresa affidataria: ${nomeCliente(c.affidatariaId)||'[DA COMPILARE]'}\nPreparato il ${fData(oggi())} per ${dest.destinatario}\n\nCARTELLE\n  01 Documenti impresa — visura, DURC, patente a crediti, DVR, nomine\n  02 Documenti operai — una sottocartella per persona\n  03 Sicurezza cantiere — POS, PSC, nomine di cantiere\n  04 Dichiarazioni — autocertificazioni compilate e firmate\n  05 Altri documenti richiesti\n\nELENCO (${indice.length} file)\n`;
    let ultima='';for(const r of indice){if(r.cartella!==ultima){txt+=`\n[${r.cartella}]\n`;ultima=r.cartella}txt+=`  ${r.nome}\n      ${r.documento} — ${r.soggetto}${r.scadenza?' — scadenza '+r.scadenza:''} — ${r.stato}\n`}
    if(mancanti.length) txt+=`\nNON INCLUSI (mancanti al momento dell'invio)\n`+mancanti.map(m=>'  - '+m).join('\n')+'\n';
    txt+=`\nNota: le dichiarazioni con firma grafica non sostituiscono la firma digitale ove richiesta.\n`;
    voci.unshift({nome:'00 Indice.txt',dati:txt});
    voci.push({nome:'00 Indice.csv',dati:csvDaRighe([['Cartella','File','Documento','Soggetto','Scadenza','Stato'],...indice.map(r=>[r.cartella,r.nome,r.documento,r.soggetto,r.scadenza,r.stato])])});
    const blob=await creaZip(voci);
    prog.chiudi();
    const nome=nomeFileData('Documenti '+pulisci(c.nome)+' Pavimass','zip');
    esegui('Registrato invio pacchetto '+c.nome,s=>{s.cantieri.find(x=>x.id===c.id).invii.push({id:nuovoId('inv'),data:new Date().toISOString(),destinatario:dest.destinatario,mezzo:dest.mezzo,note:dest.note,contenuto:indice.map(r=>r.cartella+'/'+r.nome+' — '+r.documento+' ('+r.soggetto+')'+(r.scadenza?' scad. '+r.scadenza:'')),mancanti,forzati:Object.entries(sc.forzati).map(([i,m])=>(righe[+i]||{v:{nome:'?'}}).v.nome+': '+m),peso:blob.size,nomeFile:nome})},{senzaRender:true});
    ui.pacchetto=null;
    const esito=await condividiOScarica(blob,nome,{testo:'Documentazione Pavimass per il cantiere '+c.nome});
    informa('Pacchetto pronto',html`<p><b>${nome}</b> · ${fPeso(blob.size)} · ${indice.length} file in cartelle numerate, con indice.</p>${blob.size>20*1024*1024?html`<p class="da-compilare">Pesa più di 20 MB: difficilmente passa via mail. Meglio WeTransfer, AirDrop, iCloud Drive o WhatsApp.</p>`:''}<p class="piccolo secondario">L'invio è registrato nel diario del cantiere con l'elenco esatto di cosa conteneva e cosa mancava.</p>`);
    vai('cantieri/'+c.id);
  }catch(e){prog.chiudi();segnalaErrore(e,'Pacchetto non generato')}
};
// CSS minimo per i documenti HTML dentro lo ZIP (stesse regole di stampa dell'applicazione)
function stileStampaPerHtml(){const s=Array.from(document.styleSheets).find(x=>!x.href);let out='';try{for(const r of s.cssRules){if(/\.pagina|\.doc|\.carta-intestata|@media print|\.testa-pagina|\.pie-pagina|\.blocco-firma|\.da-compilare/.test(r.cssText))out+=r.cssText+'\n'}}catch(e){}return out+'body{margin:0;background:#888}.pagina{margin:10px auto}'}
