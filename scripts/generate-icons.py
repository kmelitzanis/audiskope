"""Regenerate Audiskope icons: python3 -m pip install Pillow; npm run icons."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
ROOT = Path(__file__).resolve().parents[1] / 'assets/icons'
BG = '#17191c'
BLUE = '#21b9ed'
def mark(size, transparent=False, monochrome=False):
    scale = 4
    im = Image.new('RGBA', (size*scale, size*scale), (0,0,0,0) if transparent else BG)
    d = ImageDraw.Draw(im)
    for x,h in [(0.30,0.12),(0.40,0.32),(0.50,0.48),(0.60,0.36),(0.70,0.16)]:
        xx=x*size*scale; hh=h*size*scale; w=0.025*size*scale
        d.rounded_rectangle((xx-w/2,(size*scale-hh)/2,xx+w/2,(size*scale+hh)/2), radius=w/2, fill='white' if monochrome else BLUE)
    return im.resize((size,size),Image.Resampling.LANCZOS)
def save(im,p):
    p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
master=mark(1024)
save(master.convert('RGB'),Path('app-icon-1024.png'))
for n in [16,24,32,48,64,128,256,512,1024]:save(mark(n),Path(f'desktop/png/{n}.png'))
save(master,Path('desktop/icon.ico'))
# Pillow emits the standard ICNS representations from the 1024px master.
save(master,Path('desktop/icon.icns'))
entries=[]
for idiom, sizes in [('iphone',[(20,[2,3]),(29,[2,3]),(40,[2,3]),(60,[2,3])]),('ipad',[(20,[1,2]),(29,[1,2]),(40,[1,2]),(76,[1,2]),(83.5,[2])]),('ios-marketing',[(1024,[1])])]:
    for points,scales in sizes:
        for scale in scales:
            name=f'{idiom}-{points}@{scale}x.png'
            save(mark(int(points*scale)).convert('RGB'),Path('ios/AppIcon.appiconset')/name)
            entries.append({'idiom':idiom,'size':f'{points}x{points}','scale':f'{scale}x','filename':name})
(ROOT/'ios/AppIcon.appiconset/Contents.json').write_text(json.dumps({'images':entries,'info':{'version':1,'author':'xcode'}},indent=2)+'\n')
for density,n in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    save(mark(n),Path(f'android/res/mipmap-{density}/ic_launcher.png'))
save(mark(512).convert('RGB'),Path('android/play-store-512.png'))
for n in [16,32,180,192,512]:save(mark(n).convert('RGB'),Path(f'web/icon-{n}.png'))
save(master,Path('web/favicon.ico'))
print('Generated desktop, iOS, Android and web icons.')
