from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[1] / 'public' / 'assets'
for source, target, trim in [('transom-rigid.png','transom-rigid.webp',True),('trees-atlas.png','trees-atlas.webp',False)]:
    image = Image.open(assets / 'generated-source' / source)
    if trim:
        bounds = image.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
        image = image.crop(bounds)
    image.save(assets / target,'WEBP',quality=91,method=6,exact=True)
    print(target,image.size,(assets / target).stat().st_size)
