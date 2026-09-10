#!/usr/bin/env python3
"""Elenca le funzioni e le azioni sparite dai sorgenti rispetto a un commit precedente.

Serve a intercettare le cancellazioni silenziose: togliere una funzione intera lascia un file
sintatticamente valido, quindi né il controllo di sintassi né autoverifica() se ne accorgono.

    python3 strumenti/controlla_funzioni.py [commit-di-riferimento]   # predefinito: HEAD~1
"""
import subprocess,re,sys

rif=sys.argv[1] if len(sys.argv)>1 else 'HEAD~1'
def nomi(rev,f):
    s=subprocess.run(['git','show',f'{rev}:{f}'],capture_output=True,text=True).stdout
    return set(re.findall(r'^function\s+([A-Za-z_$][\w$]*)',s,re.M))|set(re.findall(r"^AZIONI\['([^']+)'\]",s,re.M))

files=[f for f in subprocess.run(['git','ls-files','sorgente'],capture_output=True,text=True).stdout.split() if f.endswith('.js')]
persi=0
for f in files:
    d=sorted(nomi(rif,f)-nomi('HEAD',f))
    if d: persi+=len(d); print(f'{f}: spariti {d}')
print('nessuna funzione persa rispetto a '+rif if not persi else f'ATTENZIONE: {persi} fra funzioni e azioni non ci sono più')
sys.exit(1 if persi else 0)
