// ---------------------------------------------------------------------
// BILANCI: un anno per riga, come nelle cartelle dell'azienda. Per ogni esercizio il bilancio con la
// nota integrativa, il verbale dell'assemblea che lo approva e la ricevuta del deposito in Camera di
// Commercio; il resto (relazioni, prospetti) va in «Altri file».
// stato.bilanci[anno] = {bilancio:fileId, verbale:fileId, ricevuta:fileId, altri:[fileId], note}
// ---------------------------------------------------------------------
const POSTI_BILANCIO=[['bilancio','Bilancio e nota integrativa'],['verbale','Verbale di assemblea'],['ricevuta','Ricevuta di deposito']];
// dal nome del file: a quale posto va e di che esercizio è (2015, «31-12-2015», «20171231»…)
function postoBilancioDaNome(nome){const n=nome.toLowerCase();return /verbale|assemblea/.test(n)?'verbale':/ricevut|rcv|deposito/.test(n)?'ricevuta':/bilancio|nota integrativa|b712/.test(n)?'bilancio':'altri'}
function annoBilancioDaNome(nome){const m=nome.match(/(?:^|\D)(20[0-4]\d)(?:\D|$)/)||nome.match(/(20[0-4]\d)1231/);return m?+m[1]:null}
function fileBilancio(anno){const b=(stato.bilanci||{})[anno]||{};return [...POSTI_BILANCIO.map(([k])=>b[k]),...(b.altri||[])].filter(Boolean)}
function contenutoBilanci(){
  const B=stato.bilanci||{};const ultimo=new Date().getFullYear()-1;
  const anni=[...new Set([ultimo,...Object.keys(B).map(Number)])].sort((a,b)=>b-a);
  const cella=(anno,k,id)=>{const m=id&&fileMeta(id);return m?html`<span class="riga stretta"><button class="pulsante piccolo" data-azione="file-apri" data-id="${m.id}" title="${m.nome}">${icona(ePdf(m.mime,m.nome)?'pdf':'file','piccola')}Apri</button><button class="pulsante piccolo discreto icona" data-azione="bilancio-togli" data-anno="${anno}" data-posto="${k}" data-id="${m.id}" title="Togli questo file">${icona('chiudi','piccola')}</button></span>`:html`<button class="pulsante piccolo discreto" data-azione="bilancio-carica" data-anno="${anno}" data-posto="${k}">${icona('carica','piccola')}Carica</button>`};
  return html`<div class="strumenti-tabella"><span class="piccolo silenzioso">Trascina o scegli più file insieme: dal nome capisco l'anno e se è bilancio, verbale o ricevuta, poi controlli tu.</span><span class="spazio"></span><button class="pulsante primario" data-azione="bilanci-carica">${icona('carica','piccola')}Carica file</button></div>
  <div class="guscio"><div class="scheda scheda-tabella"><table class="tabella"><thead><tr><th>Esercizio</th>${POSTI_BILANCIO.map(([,t])=>html`<th>${t}</th>`)}<th>Altri file</th></tr></thead><tbody>
  ${anni.map(a=>{const b=B[a]||{};const manca=POSTI_BILANCIO.filter(([k])=>!b[k]).length;return html`<tr><td><b>${a}</b><br>${manca?html`<span class="piccolo ${a===ultimo?'warn-t':'silenzioso'}">${manca===3?'niente caricato':'mancano '+manca}</span>`:html`<span class="pillola valido">completo</span>`}${b.note?html`<div class="piccolo silenzioso">${b.note}</div>`:''}</td>
    ${POSTI_BILANCIO.map(([k])=>html`<td>${cella(a,k,b[k])}</td>`)}
    <td><span class="riga stretta" style="flex-wrap:wrap">${(b.altri||[]).map(id=>{const m=fileMeta(id);return m?html`<button class="pulsante piccolo discreto" data-azione="file-apri" data-id="${id}" title="${m.nome}">${tronca(m.nome.replace(/\.[^.]+$/,''),16)}</button>`:''})}<button class="pulsante piccolo discreto icona" data-azione="bilancio-carica" data-anno="${a}" data-posto="altri" title="Aggiungi un file">${icona('piu','piccola')}</button><button class="pulsante piccolo discreto icona" data-azione="bilancio-nota" data-anno="${a}" title="Nota">${icona('modifica','piccola')}</button></span></td></tr>`})}
  </tbody></table></div></div>`;
}
function mettiFileBilancio(s,anno,posto,id){s.bilanci=s.bilanci||{};const b=s.bilanci[anno]=s.bilanci[anno]||{altri:[]};b.altri=b.altri||[];if(posto==='altri'){if(!b.altri.includes(id))b.altri.push(id)}else{if(b[posto]&&b[posto]!==id)b.altri.push(b[posto]);b[posto]=id}}
AZIONI['bilancio-carica']=async d=>{const fs=await scegliFile({multipli:false,accetta:'.pdf,image/*,.doc,.docx'});if(!fs.length)return;const r=await acquisisciFile(fs[0],{});esegui('Bilancio '+d.anno,s=>mettiFileBilancio(s,d.anno,d.posto,r.rec.id))};
AZIONI['bilancio-togli']=async d=>{if(!(await conferma('Togliere questo file dal bilancio '+d.anno+'? Finisce nel cestino per 30 giorni.',{pericolo:true,ok:'Togli'})))return;esegui('Tolto file dal bilancio '+d.anno,s=>{const b=s.bilanci[d.anno];if(d.posto==='altri')b.altri=b.altri.filter(x=>x!==d.id);else b[d.posto]=null;cestinaFileOrfani(s)})};
AZIONI['bilancio-nota']=async d=>{const b=(stato.bilanci||{})[d.anno]||{};const t=await chiediTesto('Nota sul bilancio '+d.anno,{multiriga:true,valore:b.note||'',etichetta:'Per esempio: approvato il…, depositato il…, utile portato a nuovo'});if(t===null)return;esegui('Nota bilancio '+d.anno,s=>{s.bilanci=s.bilanci||{};const x=s.bilanci[d.anno]=s.bilanci[d.anno]||{altri:[]};x.note=t.trim()||null})};
AZIONI['bilanci-carica']=async()=>{const fs=await scegliFile({accetta:'.pdf,image/*,.doc,.docx'});if(fs.length)await caricaBilanci(fs)};
async function caricaBilanci(fs){
  const ultimo=new Date().getFullYear()-1;
  const righe=fs.map((f,i)=>({i,f,anno:annoBilancioDaNome((f.webkitRelativePath||'')+' '+f.name)||ultimo,posto:postoBilancioDaNome(f.name)}));
  const ok=await dialogo({titolo:'Carica bilanci',largo:true,corpo:html`<p class="piccolo secondario">Controlla anno e posto di ogni file: li ho proposti dal nome.</p><table class="tabella densa"><thead><tr><th>File</th><th>Esercizio</th><th>Posto</th></tr></thead><tbody>${righe.map(r=>html`<tr><td class="taglia" style="max-width:260px" title="${r.f.name}">${r.f.name}</td><td><input type="number" data-bil-anno="${r.i}" value="${r.anno}" style="width:90px"></td><td><select data-bil-posto="${r.i}">${[...POSTI_BILANCIO,['altri','Altri file']].map(([k,t])=>html`<option value="${k}" ${k===r.posto?'selected':''}>${t}</option>`)}</select></td></tr>`)}</tbody></table>`,
    pulsanti:[{testo:'Annulla',valore:false},{testo:'Carica',classe:'primario',primario:true,fn:v=>{for(const r of righe){r.anno=+v.querySelector(`[data-bil-anno="${r.i}"]`).value||ultimo;r.posto=v.querySelector(`[data-bil-posto="${r.i}"]`).value}return true}}]});
  if(!ok) return;
  const esiti=[];for(const r of righe){const e=await acquisisciFile(r.f,{});esiti.push([r,e.rec.id])}
  esegui('Caricati '+plurale(esiti.length,'file','file')+' nei bilanci',s=>{for(const [r,id] of esiti)mettiFileBilancio(s,r.anno,r.posto,id)});
}
