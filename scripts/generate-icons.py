"""Regenerate Audiskope icons: python3 -m pip install Pillow; pnpm run icons."""
from pathlib import Path
from PIL import Image
import json
ROOT = Path(__file__).resolve().parents[1] / 'assets/icons'
MASTER = ROOT / 'variants/Default.png'
def mark(size, transparent=False, monochrome=False):
    with Image.open(MASTER) as source:
        return source.convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
def save(im,p):
    p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
master=mark(1024)
save(master,Path('app-icon-1024.png'))
for n in [16,24,32,48,64,128,256,512,1024]:save(mark(n),Path(f'desktop/png/{n}.png'))
save(master,Path('desktop/icon.ico'))
# Pillow emits the standard ICNS representations from the 1024px master.
save(master,Path('desktop/icon.icns'))
entries=[]
for idiom, sizes in [('iphone',[(20,[2,3]),(29,[2,3]),(40,[2,3]),(60,[2,3])]),('ipad',[(20,[1,2]),(29,[1,2]),(40,[1,2]),(76,[1,2]),(83.5,[2])]),('ios-marketing',[(1024,[1])])]:
    for points,scales in sizes:
        for scale in scales:
            name=f'{idiom}-{points}@{scale}x.png'
            save(mark(int(points*scale)),Path('ios/AppIcon.appiconset')/name)
            entries.append({'idiom':idiom,'size':f'{points}x{points}','scale':f'{scale}x','filename':name})
(ROOT/'ios/AppIcon.appiconset/Contents.json').write_text(json.dumps({'images':entries,'info':{'version':1,'author':'xcode'}},indent=2)+'\n')
for density,n in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    save(mark(n),Path(f'android/res/mipmap-{density}/ic_launcher.png'))
save(mark(512),Path('android/play-store-512.png'))
for n in [16,32,180,192,512]:save(mark(n),Path(f'web/icon-{n}.png'))
save(master,Path('web/favicon.ico'))
print('Generated desktop, iOS, Android and web icons.')

# Keep all supplied appearances in separate reusable Xcode image sets.
for variant in ['Default', 'Dark', 'TintedDark', 'TintedLight', 'ClearDark', 'ClearLight']:
    folder = ROOT / 'ios' / 'Appearances.xcassets' / (variant + '.imageset')
    folder.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(ROOT / 'variants' / (variant + '.png'), folder / 'icon.png')
    (folder / 'Contents.json').write_text(json.dumps({'images': [{'idiom': 'universal', 'filename': 'icon.png'}], 'info': {'version': 1, 'author': 'xcode'}}, indent=2) + '\n')
# Adaptive Android foreground: preserve the provided artwork within the safe zone.
foreground = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
foreground.alpha_composite(mark(264), (84, 84))
save(foreground, Path('android/res/drawable-nodpi/ic_launcher_artwork.png'))
