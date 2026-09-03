#!/usr/bin/env python3
"""Travasa il modello POS (.docx) in JSON strutturato per l'applicazione.

Uso: python3 estrai_pos.py <POS_Pavimass_Template_v4.docx> <cartella_output>
Produce pos_testo.json: sezioni -> blocchi (paragrafi, elenchi, tabelle, immagini).
Il testo viene copiato parola per parola. Le tabelle dinamiche (che l'applicazione
riempie con i dati del cantiere) sono sostituite da marcatori {"t":"dinamico"}.
"""
import re, sys, json, zipfile, xml.etree.ElementTree as ET
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A='{http://schemas.openxmlformats.org/drawingml/2006/main}'
WP='{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
R='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
docx=sys.argv[1]; out=sys.argv[2]
z=zipfile.ZipFile(docx)
rels={m.group(1):m.group(2) for m in re.finditer(r'<Relationship Id="(rId\d+)"[^>]*Target="([^"]+)"',z.read('word/_rels/document.xml.rels').decode())}
body=ET.fromstring(z.read('word/document.xml')).find(W+'body')
numxml=ET.fromstring(z.read('word/numbering.xml'))
# numId -> abstractNumId -> lvl -> numFmt
abs_={}
for an in numxml.findall(W+'abstractNum'):
    lv={}
    for l in an.findall(W+'lvl'):
        f=l.find(W+'numFmt'); t=l.find(W+'lvlText')
        lv[l.get(W+'ilvl')]=(f.get(W+'val') if f is not None else 'bullet', t.get(W+'val') if t is not None else '')
    abs_[an.get(W+'abstractNumId')]=lv
nums={}
for n in numxml.findall(W+'num'):
    a=n.find(W+'abstractNumId'); nums[n.get(W+'numId')]=abs_.get(a.get(W+'val'),{})
def tipo_elenco(numId,lvl):
    fmt,_=nums.get(numId,{}).get(lvl,('bullet',''))
    if fmt in('bullet','none'): return 'punto'
    if fmt.startswith('lower') or fmt.startswith('upper'): return 'lettera'
    return 'numero'

def runs(p):
    """Restituisce lista di [testo, flag] con flag fra b,i,u."""
    out=[]
    for el in p.iter():
        if el.tag==W+'r':
            rpr=el.find(W+'rPr'); f=''
            if rpr is not None:
                b=rpr.find(W+'b'); i=rpr.find(W+'i'); u=rpr.find(W+'u')
                if b is not None and b.get(W+'val') not in('0','false'): f+='b'
                if i is not None and i.get(W+'val') not in('0','false'): f+='i'
                if u is not None and u.get(W+'val') not in('none',): f+='u'
            t=''
            for c in el:
                if c.tag==W+'t': t+=c.text or ''
                elif c.tag==W+'tab': t+='\t'
                elif c.tag==W+'br': t+='\n'
            if t: 
                if out and out[-1][1]==f: out[-1][0]+=t
                else: out.append([t,f])
    return out
def ptext(p): return ''.join(r[0] for r in runs(p))
def imgs(el):
    o=[]
    for d in el.iter(WP+'inline'):
        b=d.find('.//'+A+'blip'); e=d.find(WP+'extent')
        if b is not None:
            o.append({'t':'img','src':re.sub(r'^media/','',rels.get(b.get(R+'embed'),'')).split('.')[0],'w':round(int(e.get('cx'))/360000,1),'h':round(int(e.get('cy'))/360000,1)})
    for d in el.iter(WP+'anchor'):
        b=d.find('.//'+A+'blip'); e=d.find(WP+'extent')
        if b is not None:
            o.append({'t':'img','src':re.sub(r'^media/','',rels.get(b.get(R+'embed'),'')).split('.')[0],'w':round(int(e.get('cx'))/360000,1),'h':round(int(e.get('cy'))/360000,1)})
    return o
def pstyle(p):
    ppr=p.find(W+'pPr')
    if ppr is None: return '',None,None,None
    s=ppr.find(W+'pStyle'); st=s.get(W+'val') if s is not None else ''
    n=ppr.find(W+'numPr'); numId=lvl=None
    if n is not None:
        a=n.find(W+'numId'); b=n.find(W+'ilvl')
        numId=a.get(W+'val') if a is not None else None; lvl=b.get(W+'val') if b is not None else '0'
    jc=ppr.find(W+'jc'); al=jc.get(W+'val') if jc is not None else None
    return st,numId,lvl,al
def blocco_p(p):
    st,numId,lvl,al=pstyle(p)
    rs=runs(p); im=imgs(p)
    testo=''.join(r[0] for r in rs)
    if not testo.strip() and not im: return None
    b={'t':'p'}
    # elenco
    if numId is not None and numId!='0' and st not in ('StileTitolo1Verdana14pt','Titolo1','Titolo2'):
        b['t']='li'; b['liv']=int(lvl or 0); b['tipo']=tipo_elenco(numId,lvl or '0')
    elif st=='apuntato': b['t']='li'; b['liv']=0; b['tipo']='punto'
    if st in('atitolo1','atitolo2','atitolo3'): b['t']='h'; b['liv']={'atitolo1':3,'atitolo2':4,'atitolo3':3}[st]
    if al in('center','right'): b['al']=al
    # testo: se formattazione uniforme -> stringa, altrimenti runs
    rs=[[t.strip('\n') if False else t,f] for t,f in rs]
    flags=set(f for t,f in rs if t.strip())
    if len(flags)<=1:
        b['testo']=testo.strip()
        f=list(flags)[0] if flags else ''
        if f: b['f']=f
    else:
        # compatta spazi ai bordi
        b['r']=[[t,f] for t,f in rs]
    if im: b['img']=im
    return b
def blocco_tab(tbl):
    righe=[]
    grid=[int(g.get(W+'w')) for g in tbl.findall(W+'tblGrid/'+W+'gridCol')]
    for tr in tbl.findall(W+'tr'):
        celle=[]
        for tc in tr.findall(W+'tc'):
            c={'b':[]}
            pr=tc.find(W+'tcPr')
            if pr is not None:
                sh=pr.find(W+'shd'); gs=pr.find(W+'gridSpan'); vm=pr.find(W+'vMerge'); tw=pr.find(W+'tcW')
                if sh is not None and sh.get(W+'fill') not in(None,'auto','FFFFFF'): c['fill']=sh.get(W+'fill')
                if gs is not None: c['span']=int(gs.get(W+'val'))
                if vm is not None: c['vm']='restart' if vm.get(W+'val')=='restart' else 'continua'
            for ch in tc:
                if ch.tag==W+'p':
                    bp=blocco_p(ch)
                    if bp: c['b'].append(bp)
                elif ch.tag==W+'tbl': c['b'].append(blocco_tab(ch))
            celle.append(c)
        righe.append(celle)
    return {'t':'tab','righe':righe,'grid':grid}

# ---- scorri il corpo e produci blocchi con indice originale
blocchi=[]
for i,el in enumerate(body):
    tag=el.tag.replace(W,'')
    if tag=='p':
        b=blocco_p(el)
        brk=[x for x in el.iter(W+'br') if x.get(W+'type')=='page']
        if brk: blocchi.append({'i':i,'t':'pb'})
        if b: b['i']=i; blocchi.append(b)
    elif tag=='tbl':
        b=blocco_tab(el); b['i']=i; blocchi.append(b)
    elif tag=='sdt': blocchi.append({'i':i,'t':'indice'})

# ---- mappa: indice -> sezione. Definita a mano leggendo il documento (vedi pos_outline).
# (idx_inizio, id, numero, titolo, livello)
SEZ=[
 (2,'revisioni',None,'REGISTRO DELLE REVISIONI',1),
 (5,'indice',1,'INDICE',1),
 (14,'premessa',2,'PREMESSA',1),
 (29,'premessa_uso','2.1','Utilizzazione e Consultazione',2),
 (37,'premessa_revisione','2.2','Revisione del Piano',2),
 (49,'descrizione_opera',3,'DESCRIZIONE OPERA',1),
 (58,'anagrafica',4,'ANAGRAFICA DEL CANTIERE',1),
 (67,'figure','4.1','Figure del cantiere e della sicurezza',2),
 (72,'dati_impresa',5,'DATI IMPRESA',1),
 (75,'dati_impresa_esecutrice','5.1','Dati Impresa Esecutrice',2),
 (90,'mansioni',6,'SPECIFICHE MANSIONI, INERENTI LA SICUREZZA SVOLTE IN CANTIERE DA OGNI FIGURA NOMINATA',1),
 (294,'organizzazione',7,'ORGANIZZAZIONE DEL CANTIERE',1),
 (306,'misure_prevenzione',8,'PRINCIPALI MISURE DI PREVENZIONE',1),
 (454,'formazione',9,"ATTIVITA' FORMATIVA",1),
 (467,'sorveglianza',10,'SORVEGLIANZA SANITARIA',1),
 (507,'dpi',11,'DISPOSITIVI DI PROTEZIONE PERSONALE',1),
 (606,'segnaletica',12,'SEGNALETICA DI SICUREZZA',1),
 (623,'pronto_soccorso',13,'MISURE DI PRONTO SOCCORSO',1),
 (644,'numeri_utili','13.1','Indirizzi e numeri di telefono utili',2),
 (669,'presidi','13.2','Presidi Sanitari',2),
 (719,'valutazione_rischi',14,'VALUTAZIONE DEI RISCHI',1),
 (727,'metodologia','14.1','Metodologia Adottata',2),
 (762,'analisi_lavorazioni',15,'ANALISI DELLE LAVORAZIONI',1),
 (1113,'macchine',16,'MACCHINE ATTREZZATURE',1),
 (1324,'conclusioni',17,'CONCLUSIONI',1),
]
# Schede lavorazione dentro la sezione 15: (idx_titolo, idx_fine_esclusa, lavorazioni collegate [1..7], id)
SCHEDE=[
 (766,798,[2],'pavimenti_ceramica'),
 (798,846,[6],'battiscopa_ceramica'),
 (846,879,[5],'rivestimenti'),
 (879,926,[3],'pavimenti_legno'),
 (926,972,[6],'battiscopa_legno'),
 (972,1012,[4],'galleggiante'),
 (1012,1054,[1],'massetti'),
 (1060,1102,[7],'impermeabilizzazioni'),
]
# Schede macchina dentro la sezione 16: (idx_titolo, idx_fine, lavorazioni, id)
MACCHINE=[
 (1122,1132,[2,5,6],'taglia_piastrelle_manuale'),
 (1132,1140,[1,2,3,4,5,6,7],'attrezzi_manuali_taglio'),
 (1140,1149,[1,2,3,4,5,6,7],'smerigliatrice'),
 (1149,1158,[1,2,3,5,6,7],'trapano_miscelatore'),
 (1158,1168,[2,5,6],'taglierina_elettrica'),
 (1168,1176,[1,2,3,4,5,6,7],'aspirapolvere'),
 (1176,1195,[1,2,3,4,5,6,7],'autocarro_gru'),
 (1195,1205,[1],'pompa_cls_cellulare'),
 (1205,1213,[1],'pompa_sottofondi'),
 (1213,1223,[1],'livellatrice'),
 (1223,1230,[1,2,5],'betoniera'),
 (1230,1237,[7],'cannello_gas'),
 (1237,1244,[1,2,3,4,5,6,7],'carriola'),
 (1244,1252,[1],'compattatore'),
 (1252,1263,[1,7],'compressore'),
 (1263,1271,[1,2,3,4,5,6,7],'gruppo_elettrogeno'),
 (1271,1281,[1,2,5],'martello_demolitore'),
 (1281,1290,[3,4],'motosega'),
 (1290,1299,[1,2,4],'mototroncatrice'),
 (1299,1324,[3,4,6],'sparachiodi'),
]
# Tabelle dinamiche: indice originale -> nome marcatore
DINAMICHE={
 3:'tabella_revisioni', 60:'tabella_anagrafica', 69:'tabella_figure', 73:'tabella_affidataria_esecutrice',
 77:'tabella_dati_impresa', 224:'tabella_datore', 228:'tabella_dirigenti_preposti', 232:'tabella_spp',
 236:'tabella_medico', 240:'tabella_rls', 244:'tabella_emergenze', 259:'tabella_fasi', 263:'tabella_tipo_appalto',
 271:'tabella_lavoratori', 281:'tabella_subappalto_imprese', 291:'tabella_subappalto_autonomi',
 463:'tabella_formazione', 602:'tabella_dpi_dotazione', 1118:'tabella_elenco_macchine', 1335:'tabella_firme', 1342:'riga_data',
 1054:None, 1060:None, # tabella vuota e immagine fluttuante prima di impermeabilizzazioni
 6:'indice', 469:'paragrafo_medico', 296:'organizzazione_scelta', 297:None,
}
def sez_di(idx):
    cur=None
    for s in SEZ:
        if idx>=s[0]: cur=s
    return cur
sezioni=[]; per_id={}
for s in SEZ:
    o={'id':s[1],'numero':s[2],'titolo':s[3],'livello':s[4],'blocchi':[]}
    sezioni.append(o); per_id[s[1]]=o
schede={sid:{'id':sid,'lavorazioni':lav,'titolo':None,'blocchi':[]} for a,b,lav,sid in SCHEDE}
macch={sid:{'id':sid,'lavorazioni':lav,'titolo':None,'blocchi':[]} for a,b,lav,sid in MACCHINE}
titoli_sez={s[0] for s in SEZ}
for b in blocchi:
    i=b['i']
    if i<2: continue  # copertina e pagina firme: costruite dall'applicazione
    if i in titoli_sez: continue
    if i in DINAMICHE:
        nome=DINAMICHE[i]
        if nome is None: continue
        b={'t':'dinamico','nome':nome,'i':i}
    if b['t']=='pb': continue  # le rotture di pagina le decide l'impaginatore
    s=sez_di(i)
    dest=None
    if s and s[1]=='analisi_lavorazioni':
        for a,e,lav,sid in SCHEDE:
            if a<=i<e:
                dest=schede[sid]
                if i==a: dest['titolo']=b.get('testo'); b=None
                break
    if s and s[1]=='macchine':
        for a,e,lav,sid in MACCHINE:
            if a<=i<e:
                dest=macch[sid]
                if i==a: dest['titolo']=b.get('testo'); b=None
                break
    if b is None: continue
    del b['i']
    (dest['blocchi'] if dest else per_id[s[1]]['blocchi']).append(b)
per_id['analisi_lavorazioni']['schede']=[schede[sid] for a,b,l,sid in SCHEDE]
per_id['macchine']['schede']=[macch[sid] for a,b,l,sid in MACCHINE]
# Intestazione ripetuta e piè di pagina del modello
hdr=ET.fromstring(z.read('word/header1.xml'))
intest=[ptext(p).strip() for p in hdr.iter(W+'p') if ptext(p).strip()]
intest=[t for t in intest if len(t)<120][:5]
ftr=ET.fromstring(z.read('word/footer1.xml'))
pie=[ptext(p) for p in ftr.iter(W+'p') if ptext(p).strip()]
# Descrizione opera: elenco puntato per lavorazione (testo del modello)
res={'origine':docx.split('/')[-1],'intestazione':intest,'pie':pie,'sezioni':sezioni}
json.dump(res,open(out+'/pos_testo.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
print('sezioni',len(sezioni),'byte',len(json.dumps(res,ensure_ascii=False)))
for s in sezioni: print(' ',s['numero'],s['id'],len(s['blocchi']),'blocchi', (len(s.get('schede',[])) and '%d schede'%len(s['schede'])) or '')
