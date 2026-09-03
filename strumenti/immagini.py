#!/usr/bin/env python3
"""Genera il blocco JavaScript IMMAGINI (base64) da incorporare nel file HTML.
Uso: python3 immagini.py <logo.png> <firma.png> <cartella_img_pos> <output.js>"""
import sys,base64,io,os,json
from PIL import Image
logo,firma,cart,out=sys.argv[1:5]
def b64(path,fmt=None):
    return 'data:image/%s;base64,'%(fmt or path.rsplit('.',1)[1].lower().replace('jpg','jpeg'))+base64.b64encode(open(path,'rb').read()).decode()
im=Image.open(logo); im.thumbnail((1100,1100)); buf=io.BytesIO(); im.save(buf,'PNG',optimize=True)
res={'logo':'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()}
res['firmaTimbro']=b64(os.path.join(cart,'image1.png'))   # timbro + firma del legale rappresentante (dal modello POS)
res['firmaRls']=b64(os.path.join(cart,'image4.png'))      # firma RLS Gostima Edvalt (dal modello POS)
res['firmaRspp']=b64(os.path.join(cart,'image49.png'))    # firma RSPP (dal modello POS)
res['firmaLegale']=b64(os.path.join(cart,'image5.png'))   # firma semplice legale rappresentante (dal modello POS)
pos={}
for f in sorted(os.listdir(cart)):
    if f in('image1.png','image4.png','image5.png','image49.png'): continue
    k=f.rsplit('.',1)[0]; pos[k]=b64(os.path.join(cart,f))
res['pos']=pos
js='// Immagini incorporate (generate da strumenti/immagini.py). logo = Logo Pavimass.png; firmaTimbro = Firme/pavimass.png ad alta risoluzione; pos.* = immagini del modello POS.\nconst IMMAGINI='+json.dumps(res,separators=(',',':'))+';\n'
open(out,'w').write(js); print('IMMAGINI',len(js),'byte,',len(pos),'immagini POS')
