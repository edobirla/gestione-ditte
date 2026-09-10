#!/usr/bin/env python3
"""Costruisce l'applicazione senza dati e la pubblica sul ramo `main` come index.html.

Nel repository ci sono due rami con due scopi diversi:
  - `sorgenti` (questo): il codice, gli strumenti, la documentazione. È il ramo su cui si lavora.
  - `main`: solo index.html e .gitignore. È quello che GitHub Pages pubblica e da cui si installa
    l'applicazione sul telefono e sul computer.

Il ramo `main` NON si aggiorna cambiando ramo: `git switch main` svuoterebbe la cartella di lavoro
(git toglie i file che sul ramo di destinazione non esistono, e su `main` non esiste nulla tranne
index.html). Qui si usa una cartella di lavoro temporanea, così la cartella vera non viene toccata.

    python3 strumenti/pubblica.py
"""
import os, subprocess, sys, tempfile, shutil

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def git(*args, **kw):
    return subprocess.run(['git', *args], cwd=kw.get('cwd', base), capture_output=True, text=True, check=False)

# 1) costruisci l'applicazione senza i dati di nessuna ditta
esito = subprocess.run([sys.executable, os.path.join(base, 'strumenti', 'costruisci.py'), '--vuoto'],
                       cwd=base, capture_output=True, text=True)
print(esito.stdout.strip() or esito.stderr.strip())
if esito.returncode:
    sys.exit('costruzione non riuscita')

sorgente_html = os.path.join(base, 'index.html')
if not os.path.exists(sorgente_html):
    sys.exit('index.html non è stato costruito')

# 2) controlla che dentro non siano finiti dati di una ditta
import re
testo = open(sorgente_html, encoding='utf8').read()
spie = {'codice fiscale': r'\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b', 'IBAN': r'\bIT\d{2}[A-Z0-9]{13,}'}
ammessi = {'RSSMRA85M01H501Q', 'RSSMRA85M01H501X'}  # i valori di prova di autoverifica()
for nome, regola in spie.items():
    trovati = [x for x in re.findall(regola, testo) if x not in ammessi]
    if trovati:
        sys.exit(f'FERMO: in index.html c\'è un {nome} ({trovati[0]}). Non lo pubblico.')

# 3) aggiorna `main` in una cartella di lavoro temporanea
tmp = tempfile.mkdtemp(prefix='pubblica-')
try:
    r = git('worktree', 'add', '--quiet', tmp, 'main')
    if r.returncode:
        sys.exit('non riesco ad aprire il ramo main: ' + r.stderr.strip())
    shutil.copyfile(sorgente_html, os.path.join(tmp, 'index.html'))
    git('add', 'index.html', cwd=tmp)
    if not git('diff', '--cached', '--quiet', cwd=tmp).returncode:
        print('index.html non è cambiato: niente da pubblicare')
    else:
        git('commit', '--quiet', '-m', 'Aggiornata l\'applicazione pubblicata', cwd=tmp)
        r = git('push', 'origin', 'main', cwd=tmp)
        print(r.stderr.strip() or 'pubblicato su main')
finally:
    git('worktree', 'remove', '--force', tmp)
