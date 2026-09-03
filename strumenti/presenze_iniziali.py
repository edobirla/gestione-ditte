#!/usr/bin/env python3
"""Converte il libro presenze Excel 2026 (Pavimass Resources/Libro Presenze/2026.xlsx) nel blocco JS PRESENZE_INIZIALI.
Uso: python3 presenze_iniziali.py <2026.xlsx> <output.js>"""
import sys,json,openpyxl
xlsx,out=sys.argv[1:3]
MAPPA={'Birla Ovidiu':'p_ovidiu','Birla Elena':'p_elena','Gostima Edvalt':'p_edvalt','Raciula Marian':'p_marian','Birla Edoardo':'p_edoardo','Jallow Ebrima':'p_ebrima','Diop Ibra':'p_ibra','Saleh Mohamed':'p_saleh','Mohamed Ahmed':'p_ahmed','Vasilyev Alexey':'p_alexey'}
wb=openpyxl.load_workbook(xlsx,data_only=False)
mesi=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
res={}
for mi,name in enumerate(mesi,1):
    ws=wb[name]; persone={}
    # riga 5: Birla Ovidiu trasferte
    giorni={}
    for c in range(4,35):
        v=ws.cell(5,c).value
        if v not in (None,''): giorni[str(c-3)]={'trasferta':str(v).strip()}
    if giorni: persone['p_ovidiu']={'giorni':giorni,'aggiustamenti':[],'importoForzato':True,'importoManuale':ws.cell(5,35).value,'note':'Importato dal libro presenze Excel 2026'}
    r=39
    while r<=60:
        nome=ws.cell(r,1).value
        if nome and nome.strip() in MAPPA:
            pid=MAPPA[nome.strip()]; giorni={}
            for c in range(4,35):
                g=str(c-3); cella={}
                v=ws.cell(r,c).value
                if isinstance(v,(int,float)): cella['ore']=v
                elif v not in (None,''): cella['codice']=str(v).strip().upper()
                v=ws.cell(r+1,c).value
                if v not in (None,''): cella['cantiere']=str(v).strip()
                v=ws.cell(r+2,c).value
                if v not in (None,''): cella['committente']=str(v).strip()
                if cella: giorni[g]=cella
            if giorni:
                imp=ws.cell(r,36).value
                mp={'giorni':giorni,'aggiustamenti':[],'note':'Importato dal libro presenze Excel 2026'}
                if isinstance(imp,(int,float)): mp['importoForzato']=True; mp['importoManuale']=imp
                persone[pid]=mp
        r+=3
    if persone: res['2026-%02d'%mi]={'persone':persone}
js='// Presenze reali gennaio–agosto 2026, importate dal libro presenze Excel con strumenti/presenze_iniziali.py.\n// Gli importi sono quelli scritti nel foglio (importoForzato): le ore dichiarate sul cartaceo non erano nel file.\nconst PRESENZE_INIZIALI='+json.dumps(res,ensure_ascii=False,separators=(',',':'))+';\n'
open(out,'w').write(js); print('PRESENZE_INIZIALI',len(js),'byte, mesi:',list(res.keys()))
