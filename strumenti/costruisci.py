#!/usr/bin/env python3
"""Assembla i pezzi di sorgente/ nel file unico 'Gestionale Pavimass.html'.

Ordine: numerico per nome. *.css -> <style>, 02-guscio.html -> corpo, *.js -> <script> nell'ordine.

I dati di una ditta non stanno nell'applicazione: stanno in azienda/ (una cartella fuori dal
repository). Se c'è, viene inclusa e la prima apertura parte con i dati veri; con --vuoto non viene
inclusa mai, e si ottiene il file da dare a chiunque altro.

    python3 strumenti/costruisci.py            -> Gestionale Pavimass.html   (con azienda/)
    python3 strumenti/costruisci.py --vuoto    -> index.html                  (senza dati di nessuno)

Il file senza dati si chiama index.html perché è quello da pubblicare: aperto da un indirizzo web
si installa come applicazione (ha dentro il manifesto e le icone, non servono altri file).
"""
import os,re,sys,json
from urllib.parse import quote
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from icona import dataUrl

base=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
vuoto='--vuoto' in sys.argv

def pezzi(cartella):
    d=os.path.join(base,cartella)
    if not os.path.isdir(d): return []
    return [(cartella,p) for p in sorted(os.listdir(d))
            if p.endswith(('.css','.html','.js')) and os.path.isfile(os.path.join(d,p))]

parti=pezzi('sorgente')+([] if vuoto else pezzi('azienda'))
css=[];html=[];js=[]
for cartella,p in parti:
    t=open(os.path.join(base,cartella,p),encoding='utf8').read()
    if p.endswith('.css'): css.append(t)
    elif p.endswith('.html'): html.append(t)
    elif p.endswith('.js'):
        nome=re.sub(r'^\d+-','',p[:-3])
        js.append('\n/* ═══════════════════════════════════════════════════════════════════\n   SEZIONE JS · %s\n   ═══════════════════════════════════════════════════════════════════ */\n%s'%(nome.upper(),t))

def testaApp():
    i192,i512=dataUrl(192),dataUrl(512)
    manifesto={"name":"Gestionale","short_name":"Gestionale","start_url":".","scope":".","display":"standalone",
               "background_color":"#F5F5F9","theme_color":"#3426F2","lang":"it",
               "icons":[{"src":i192,"sizes":"192x192","type":"image/png","purpose":"any maskable"},
                        {"src":i512,"sizes":"512x512","type":"image/png","purpose":"any maskable"}]}
    m='data:application/manifest+json,'+quote(json.dumps(manifesto,ensure_ascii=False),safe='')
    return ('<link rel="manifest" href="%s">\n<link rel="apple-touch-icon" href="%s">\n'
            '<link rel="icon" type="image/png" href="%s">\n<meta name="theme-color" content="#3426F2">'%(m,i192,i192))

mappa=open(os.path.join(base,'sorgente','00-mappa.txt'),encoding='utf8').read() if os.path.exists(os.path.join(base,'sorgente','00-mappa.txt')) else ''
out='<!DOCTYPE html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<title>Gestionale</title>\n%s\n<!--\n%s-->\n<style>\n%s\n</style>\n</head>\n<body>\n%s\n<script>\n"use strict";\n%s\n</script>\n</body>\n</html>\n'%(testaApp(),mappa,'\n'.join(css),'\n'.join(html),'\n'.join(js))

dest=os.path.join(base,'index.html' if vuoto else 'Gestionale Pavimass.html')
open(dest,'w',encoding='utf8').write(out)
conAzienda=any(c=='azienda' for c,_ in parti)
print('scritto',dest,len(out),'byte',out.count('\n'),'righe','· con i dati dell\'azienda' if conAzienda else '· senza dati di nessuna ditta')
