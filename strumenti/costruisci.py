#!/usr/bin/env python3
"""Assembla i pezzi di sorgente/ nel file unico 'Gestionale Pavimass.html'.
Ordine: numerico per nome. *.css -> <style>, 02-guscio.html -> corpo, *.js -> <script> nell'ordine."""
import os,re,sys
base=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=os.path.join(base,'sorgente'); parts=sorted(os.listdir(src))
css=[];html=[];js=[]
for p in parts:
    t=open(os.path.join(src,p),encoding='utf8').read()
    if p.endswith('.css'): css.append(t)
    elif p.endswith('.html'): html.append(t)
    elif p.endswith('.js'):
        nome=re.sub(r'^\d+-','',p[:-3])
        js.append('\n/* ═══════════════════════════════════════════════════════════════════\n   SEZIONE JS · %s\n   ═══════════════════════════════════════════════════════════════════ */\n%s'%(nome.upper(),t))
mappa=open(os.path.join(src,'00-mappa.txt'),encoding='utf8').read() if os.path.exists(os.path.join(src,'00-mappa.txt')) else ''
out='<!DOCTYPE html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<title>Gestionale Pavimass</title>\n<!--\n%s-->\n<style>\n%s\n</style>\n</head>\n<body>\n%s\n<script>\n"use strict";\n%s\n</script>\n</body>\n</html>\n'%(mappa,'\n'.join(css),'\n'.join(html),'\n'.join(js))
dest=os.path.join(base,'Gestionale Pavimass.html')
open(dest,'w',encoding='utf8').write(out)
print('scritto',dest,len(out),'byte',out.count('\n'),'righe')
