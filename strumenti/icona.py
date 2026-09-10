#!/usr/bin/env python3
"""Disegna l'icona dell'applicazione come PNG, senza librerie esterne.

Serve per l'installazione come app: il manifesto e l'icona di iPhone e iPad vogliono dei PNG veri,
e il file dell'applicazione dev'essere uno solo, quindi le icone ci finiscono dentro come data URL.
Un quadrato blu con gli angoli tondi e sopra un foglio bianco con l'angolo piegato.
"""
import zlib, struct, base64

BLU=(52,38,242); BIANCO=(255,255,255); TENUE=(201,196,253)

def disegna(lato):
    px=[[BLU for _ in range(lato)] for _ in range(lato)]
    r=lato*0.22
    for y in range(lato):
        for x in range(lato):
            # angoli tondi: fuori dal raggio si lascia trasparente col colore di fondo pieno
            cx=min(max(x+0.5,r),lato-r); cy=min(max(y+0.5,r),lato-r)
            if (x+0.5-cx)**2+(y+0.5-cy)**2>r*r: px[y][x]=BLU
    m=lato*0.24; w=lato-m*2; h=w*1.18; top=(lato-h)/2; ang=w*0.30
    for y in range(lato):
        for x in range(lato):
            fx=x+0.5-m; fy=y+0.5-top
            if not (0<=fx<w and 0<=fy<h): continue
            # angolo piegato in alto a destra
            if fx>w-ang and fy<ang and (fx-(w-ang))>fy: px[y][x]=TENUE
            else: px[y][x]=BIANCO
    # tre righe di testo
    for i in range(3):
        y0=top+h*0.42+i*h*0.17; alt=max(2,lato*0.045); largh=w*(0.42 if i==2 else 0.72)
        for y in range(int(y0),int(y0+alt)):
            for x in range(int(m+w*0.14),int(m+w*0.14+largh)):
                if 0<=x<lato and 0<=y<lato: px[y][x]=BLU
    return px

def png(px):
    lato=len(px)
    grezzo=b''.join(b'\x00'+b''.join(struct.pack('3B',*p) for p in riga) for riga in px)
    def pezzo(tipo,dati):
        c=tipo+dati
        return struct.pack('>I',len(dati))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
    return (b'\x89PNG\r\n\x1a\n'
            +pezzo(b'IHDR',struct.pack('>IIBBBBB',lato,lato,8,2,0,0,0))
            +pezzo(b'IDAT',zlib.compress(grezzo,9))
            +pezzo(b'IEND',b''))

def dataUrl(lato):
    return 'data:image/png;base64,'+base64.b64encode(png(disegna(lato))).decode()

if __name__=='__main__':
    import sys
    open(sys.argv[1] if len(sys.argv)>1 else 'icona.png','wb').write(png(disegna(512)))
    print('scritta icona 512×512')
