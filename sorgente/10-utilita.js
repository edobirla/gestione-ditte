// ---------------------------------------------------------------------
// Sicurezza HTML. Ogni valore che finisce nel DOM passa da qui.
// html`...` è un template tag che mette in sicurezza le interpolazioni;
// grezzo(str) marca una stringa già sicura (HTML prodotto da noi).
// ---------------------------------------------------------------------
function h(v){
  if(v===null||v===undefined) return '';
  return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
class Grezzo{constructor(s){this.s=s}toString(){return this.s}}
function grezzo(s){return new Grezzo(s==null?'':String(s))}
function html(parti,...valori){
  let out='';
  for(let i=0;i<parti.length;i++){
    out+=parti[i];
    if(i<valori.length){
      const v=valori[i];
      if(v instanceof Grezzo) out+=v.s;
      else if(Array.isArray(v)) out+=v.map(x=>x instanceof Grezzo?x.s:h(x)).join('');
      else out+=h(v);
    }
  }
  return new Grezzo(out);
}
// Nome dell’impresa configurata, per le frasi e i nomi di file che la nominano.
function nomeImpresa(corto){const r=(stato&&stato.azienda&&stato.azienda.ragioneSociale)||'';return corto?r.replace(/\s*(S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?)\s*$/i,'').trim()||r:r}
function icona(nome,classe){return grezzo(`<svg class="ic ${classe||''}" aria-hidden="true"><use href="#i-${nome}"/></svg>`)}
function daCompilare(testo){return grezzo(`<span class="da-compilare">[${h(testo||'DA COMPILARE')}]</span>`)}
function valoreODaCompilare(v,formatta){
  if(v===null||v===undefined||v==='') return daCompilare();
  return formatta?formatta(v):h(v);
}
function el(sel,radice){return (radice||document).querySelector(sel)}
function tutti(sel,radice){return Array.from((radice||document).querySelectorAll(sel))}
function creaEl(htmlStr){const t=document.createElement('template');t.innerHTML=String(htmlStr).trim();return t.content.firstElementChild}

// ---------------------------------------------------------------------
// Identificatori
// ---------------------------------------------------------------------
function nuovoId(prefisso){
  const r=(typeof crypto!=='undefined'&&crypto.getRandomValues)?Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>b.toString(16).padStart(2,'0')).join(''):Math.random().toString(16).slice(2,14);
  return (prefisso?prefisso+'_':'')+Date.now().toString(36)+r;
}

// ---------------------------------------------------------------------
// Date. In memoria sempre "AAAA-MM-GG"; a schermo "gg/mm/aaaa".
// Le date sono trattate a mezzanotte locale: mai UTC, per non sbagliare di un giorno.
// ---------------------------------------------------------------------
function pad2(n){return String(n).padStart(2,'0')}
function dataIso(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function oggi(){return dataIso(new Date())}
function daIso(iso){ if(!iso) return null; const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso); if(!m) return null; return new Date(+m[1],+m[2]-1,+m[3]); }
function dataValida(iso){const d=daIso(iso);return !!d&&!isNaN(d.getTime())}
function fData(iso){ const d=daIso(iso); if(!d) return ''; return pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear(); }
function fDataBreve(iso){ const d=daIso(iso); if(!d) return ''; return pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2); }
function fDataOra(iso){ if(!iso) return ''; const d=new Date(iso); if(isNaN(d)) return ''; return pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
const NOMI_MESI=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const NOMI_MESI_BREVI=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const NOMI_GIORNI=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
const NOMI_GIORNI_BREVI=['dom','lun','mar','mer','gio','ven','sab'];
function nomeMese(m){return NOMI_MESI[m-1]||''}
function fMeseAnno(anno,mese){return capitalizza(nomeMese(mese))+' '+anno}
function fDataLunga(iso){const d=daIso(iso);if(!d)return '';return d.getDate()+' '+nomeMese(d.getMonth()+1)+' '+d.getFullYear()}
function aggiungiGiorni(iso,n){const d=daIso(iso);if(!d)return null;d.setDate(d.getDate()+n);return dataIso(d)}
function aggiungiMesi(iso,n){const d=daIso(iso);if(!d)return null;const g=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const max=giorniNelMese(d.getFullYear(),d.getMonth()+1);d.setDate(Math.min(g,max));return dataIso(d)}
function giorniTra(a,b){const da=daIso(a),db=daIso(b);if(!da||!db)return null;return Math.round((db-da)/86400000)}
function giorniNelMese(anno,mese){return new Date(anno,mese,0).getDate()}
function chiaveMese(anno,mese){return anno+'-'+pad2(mese)}
function daChiaveMese(k){const m=/^(\d{4})-(\d{2})$/.exec(k||'');return m?{anno:+m[1],mese:+m[2]}:null}
function meseSuccessivo(anno,mese){return mese===12?{anno:anno+1,mese:1}:{anno,mese:mese+1}}
function mesePrecedente(anno,mese){return mese===1?{anno:anno-1,mese:12}:{anno,mese:mese-1}}
function giornoSettimana(anno,mese,giorno){return new Date(anno,mese-1,giorno).getDay()}
function eFineSettimana(anno,mese,giorno){const g=giornoSettimana(anno,mese,giorno);return g===0||g===6}
// Pasqua con l'algoritmo di Gauss (valido per il calendario gregoriano); il lunedì dell'Angelo è il giorno dopo.
function pasqua(anno){
  const a=anno%19,b=Math.floor(anno/100),c=anno%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),hh=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-hh-k)%7,m=Math.floor((a+11*hh+22*l)/451);
  const mese=Math.floor((hh+l-7*m+114)/31),giorno=((hh+l-7*m+114)%31)+1;
  return dataIso(new Date(anno,mese-1,giorno));
}
function festivitaAnno(anno,locali){
  const fisse=['01-01','01-06','04-25','05-01','06-02','08-15','11-01','12-08','12-25','12-26'].map(md=>anno+'-'+md);
  const pasquetta=aggiungiGiorni(pasqua(anno),1);
  const loc=(locali||[]).map(f=>typeof f==='string'?f:f.data).filter(Boolean).map(f=>f.length===5?anno+'-'+f:f).filter(f=>f.startsWith(anno+'-'));
  return new Set([...fisse,pasquetta,...loc]);
}
function eFestivo(iso,locali){const d=daIso(iso);if(!d)return false;return festivitaAnno(d.getFullYear(),locali).has(iso)}
function eLavorativo(iso,locali){const d=daIso(iso);if(!d)return false;const g=d.getDay();return g!==0&&g!==6&&!eFestivo(iso,locali)}
function giorniLavorativiMese(anno,mese,locali){const n=giorniNelMese(anno,mese);const out=[];for(let g=1;g<=n;g++){const iso=chiaveMese(anno,mese)+'-'+pad2(g);if(eLavorativo(iso,locali))out.push(g)}return out}
// Interpreta date scritte in modi diversi (input utente, nomi di file): gg/mm/aaaa, gg-mm-aa, AA.MM.GG, AAAA-MM-GG
function interpretaData(s){
  if(!s) return null; s=String(s).trim();
  let m;
  if((m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return normalizzaData(+m[1],+m[2],+m[3]);
  // con i punti vale la convenzione dei nomi di file: AA.MM.GG e AA.MM (26.07.01 = 1 luglio 2026)
  if((m=/^(\d{2})\.(\d{2})\.(\d{2})$/.exec(s))) return normalizzaData(2000+ +m[1],+m[2],+m[3]);
  if((m=/^(\d{2})\.(\d{2})$/.exec(s))) return normalizzaData(2000+ +m[1],+m[2],1);
  if((m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s))){let a=+m[3];if(a<100)a+=2000;return normalizzaData(a,+m[2],+m[1])}
  return null;
}
function normalizzaData(a,m,g){ if(m<1||m>12||g<1||g>giorniNelMese(a,m)) return null; return a+'-'+pad2(m)+'-'+pad2(g); }

// ---------------------------------------------------------------------
// Numeri e valute: un solo insieme di funzioni, usato ovunque.
// ---------------------------------------------------------------------
function fNum(n,dec){ if(n===null||n===undefined||n===''||isNaN(n)) return ''; dec=dec===undefined?2:dec; const neg=n<0; const s=Math.abs(+n).toFixed(dec); const [int,fr]=s.split('.'); const intF=int.replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return (neg?'-':'')+intF+(dec>0?','+fr:''); }
function fEuro(n,dec){ if(n===null||n===undefined||n===''||isNaN(n)) return ''; return fNum(n,dec===undefined?2:dec)+' €'; }
function fEuroInt(n){return fEuro(n,0)}
function fPct(n,dec){ if(n===null||n===undefined||isNaN(n)) return ''; return fNum(n,dec===undefined?1:dec)+' %'; }
function fOre(n){ if(n===null||n===undefined||n===''||isNaN(n)) return ''; return (Math.round(+n*100)/100).toString().replace('.',','); }
function fPeso(b){ if(b==null||isNaN(b)) return ''; if(b<1024) return b+' B'; if(b<1024*1024) return fNum(b/1024,0)+' KB'; return fNum(b/1024/1024,b<10*1024*1024?1:0)+' MB'; }
function fGiorni(n){ if(n===null||n===undefined) return ''; if(n===0) return 'oggi'; if(n===1) return 'domani'; if(n===-1) return 'ieri'; return n>0?`fra ${n} giorni`:`${-n} giorni fa`; }
// Accetta "1.234,50", "1234.50", "1 234,5", "€ 12"
function leggiNumero(s){
  if(typeof s==='number') return s;
  if(s===null||s===undefined) return null;
  s=String(s).trim().replace(/[€\s]/g,'');
  if(!s) return null;
  if(/,\d{1,2}$/.test(s)) s=s.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  else s=s.replace(',','.');
  const n=parseFloat(s); return isNaN(n)?null:n;
}
function somma(arr,fn){return arr.reduce((t,x)=>t+(+(fn?fn(x):x)||0),0)}
function media(arr){return arr.length?somma(arr)/arr.length:null}
function arrotonda2(n){return Math.round((+n||0)*100)/100}

// ---------------------------------------------------------------------
// Testo
// ---------------------------------------------------------------------
function normalizzaTesto(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function capitalizza(s){s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1)}
function iniziali(nome){return String(nome||'').split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('')}
function plurale(n,sing,plur){return n===1?`${n} ${sing}`:`${n} ${plur}`}
function tronca(s,n){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s}
function confrontaTesto(a,b){return String(a||'').localeCompare(String(b||''),'it',{sensitivity:'base',numeric:true})}
function ordina(arr,chiave,dir){
  const k=typeof chiave==='function'?chiave:x=>x[chiave]; const d=dir==='desc'?-1:1;
  return arr.slice().sort((a,b)=>{const va=k(a),vb=k(b);if(va==null&&vb==null)return 0;if(va==null)return 1;if(vb==null)return -1;if(typeof va==='number'&&typeof vb==='number')return (va-vb)*d;return confrontaTesto(va,vb)*d});
}
function raggruppa(arr,fn){const m=new Map();for(const x of arr){const k=fn(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return m}
function unici(arr){return Array.from(new Set(arr))}

// ---------------------------------------------------------------------
// Validazioni fiscali
// ---------------------------------------------------------------------
function validaCodiceFiscale(cf){
  if(!cf) return {ok:false,errore:'Codice fiscale mancante'};
  cf=cf.toUpperCase().trim();
  if(!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf)) return {ok:false,errore:'Formato non valido (16 caratteri)'};
  const dispari={'0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,'9':21,A:1,B:0,C:5,D:7,E:9,F:13,G:15,H:17,I:19,J:21,K:2,L:4,M:18,N:20,O:11,P:3,Q:6,R:8,S:12,T:14,U:16,V:10,W:22,X:25,Y:24,Z:23};
  let s=0;
  for(let i=0;i<15;i++){const c=cf[i];if(i%2===0)s+=dispari[c];else s+=/\d/.test(c)?+c:c.charCodeAt(0)-65}
  const atteso=String.fromCharCode(65+s%26);
  return atteso===cf[15]?{ok:true}:{ok:false,errore:'Carattere di controllo errato (atteso '+atteso+')'};
}
function validaPartitaIva(p){
  if(!p) return {ok:false,errore:'Partita IVA mancante'};
  p=String(p).replace(/\s/g,'');
  if(!/^\d{11}$/.test(p)) return {ok:false,errore:'Servono 11 cifre'};
  let s=0;for(let i=0;i<11;i++){let n=+p[i];if(i%2===1){n*=2;if(n>9)n-=9}s+=n}
  return s%10===0?{ok:true}:{ok:false,errore:'Cifra di controllo errata'};
}
function validaEmail(e){return !e||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}

// ---------------------------------------------------------------------
// Arrotondamento aziendale degli importi mensili: multipli di 10.
// Resto 0–3 → per difetto, resto 4–9 → per eccesso. 1425→1430, 901→900, 2442→2440.
// NON è l'arrotondamento matematico (che darebbe 1425→1430 ma 2445→2450 e 904→900).
// ---------------------------------------------------------------------
function arrotondaAziendale(n){
  if(n===null||n===undefined||isNaN(n)) return null;
  const intero=Math.round(+n); const resto=((intero%10)+10)%10; const base=intero-resto;
  return resto<=3?base:base+10;
}

// ---------------------------------------------------------------------
// Varie
// ---------------------------------------------------------------------
function attesa(ms){return new Promise(r=>setTimeout(r,ms))}
function debounce(fn,ms){let t;return function(...a){clearTimeout(t);t=setTimeout(()=>fn.apply(this,a),ms)}}
function eIos(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function eMobile(){return window.matchMedia('(max-width: 760px)').matches}
function eMac(){return /Mac/.test(navigator.platform)}
function copiaNegliAppunti(testo){
  if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(testo).then(()=>true).catch(()=>copiaFallback(testo));
  return Promise.resolve(copiaFallback(testo));
}
function copiaFallback(testo){const ta=document.createElement('textarea');ta.value=testo;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();return ok}
// Nome dei file prodotti: parole separate da spazi, trattini solo nella data (gg-mm-aa)
function nomeFileData(base,estensione,iso){const d=daIso(iso||oggi());const data=pad2(d.getDate())+'-'+pad2(d.getMonth()+1)+'-'+String(d.getFullYear()).slice(2);return `${base} ${data}.${estensione}`}
function pulisciNomeFile(s){return String(s||'').replace(/[\\/:*?"<>|_]+/g,' ').replace(/\s+/g,' ').trim()}
function estensioneDi(nome){const m=/\.([a-z0-9]+)$/i.exec(nome||'');return m?m[1].toLowerCase():''}
function mimeDaNome(nome){const e=estensioneDi(nome);return {pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',heic:'image/heic',heif:'image/heif',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',csv:'text/csv',txt:'text/plain',md:'text/markdown',zip:'application/zip',json:'application/json'}[e]||'application/octet-stream'}
function leggiComeTesto(blob){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ko(r.error);r.readAsText(blob)})}
function leggiComeArrayBuffer(blob){return blob.arrayBuffer?blob.arrayBuffer():new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ko(r.error);r.readAsArrayBuffer(blob)})}
function leggiComeDataUrl(blob){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ko(r.error);r.readAsDataURL(blob)})}
function dataUrlABlob(dataUrl){const [testa,dati]=dataUrl.split(',');const mime=/data:([^;]+)/.exec(testa)[1];const bin=atob(dati);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:mime})}
function clona(o){return typeof structuredClone==='function'?structuredClone(o):JSON.parse(JSON.stringify(o))}
function vuotoSe(v,alt){return (v===null||v===undefined||v==='')?alt:v}
function indirizzoTesto(ind){ if(!ind) return ''; const parti=[]; if(ind.via) parti.push(ind.via); const loc=[ind.cap,ind.comune].filter(Boolean).join(' '); const prov=ind.provincia?` (${ind.provincia})`:''; if(loc||prov) parti.push(loc+prov); if(ind.frazione) parti.push('Fraz. '+ind.frazione); return parti.join(', '); }
function nomePersona(p){return p?[p.cognome,p.nome].filter(Boolean).join(' '):''}
function nomeNomeCognome(p){return p?[p.nome,p.cognome].filter(Boolean).join(' '):''}
