"""Optimize generated assets and assemble code-native SVG masks; never rewrite source art."""
from pathlib import Path
from PIL import Image
import base64
import hashlib
import json
import re
from scene_details import build_details

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public' / 'assets'
PREVIEWS = ROOT / 'previews'
PREVIEWS.mkdir(exist_ok=True)
SOURCE_HASH = 'e0a9a2e73b6fa11fd0a4c23d6346e2763fd267dea7eb495c99a90fdb5e5c57da'
assert hashlib.sha256((ASSETS / 'compartment-source.png').read_bytes()).hexdigest() == SOURCE_HASH

records = {}
def optimize(source, target, max_width=None, trim=False):
    image = Image.open(ASSETS / source)
    original_size = image.size
    box = None
    if trim:
        # Ignore near-invisible alpha noise when finding bounds, preserve alpha inside crop.
        box = image.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        box = (max(0, box[0]-4), max(0, box[1]-4), min(image.width, box[2]+4), min(image.height, box[3]+4))
        image = image.crop(box)
    if max_width and image.width > max_width:
        image = image.resize((max_width, round(image.height * max_width / image.width)), Image.Resampling.LANCZOS)
    image.save(ASSETS / target, 'WEBP', quality=90, method=6, exact=True)
    records[target] = {'source':source, 'sourceSize':original_size, 'crop':box,
                       'size':image.size, 'bytes':(ASSETS / target).stat().st_size,
                       'alpha': image.getchannel('A').getextrema() if image.mode == 'RGBA' else None}

optimize('compartment-source.png', 'compartment.webp')
optimize('compartment-source.png', 'compartment-960.webp', 960)
optimize('generated-source/forest.png', 'forest-panorama.webp')
optimize('generated-source/lamp.png', 'lamp-off.webp', 640, True)
optimize('generated-source/notebook-clean-attempt.png', 'notebook.webp', 640, True)
optimize('generated-source/lamp-reference-v2.png', 'lamp-lit-v2.webp', 640, True)
optimize('generated-source/notebook-reference-v2.png', 'notebook-v2.webp', 640, True)

# All geometry uses the unchanged source-art coordinate system, 1672 x 941.
GLASS = 'M568 128 Q568 72 614 85 L1232 250 Q1254 256 1254 284 L1254 550 Q1254 577 1227 584 L600 653 Q568 658 568 620 Z'
APERTURE = 'M550 128 Q550 53 616 67 L1240 232 Q1276 242 1276 281 L1276 555 Q1276 599 1233 607 L600 682 Q548 688 548 627 Z'
TRANSOM = 'M580 0 L790 0 L1223 169 Q1247 179 1247 205 L1245 228 L1076 178 L1074 161 Q1073 156 1068 154 L997 130 Q986 126 985 138 L580 3 Z'
unit_code=(ROOT / 'public' / 'window-unit.js').read_text(encoding='utf-8')
unit_quad=json.loads(re.search(r'const mountingQuad=(\[.*?\]);',unit_code).group(1))
TRANSOM_APERTURE = ' '.join(('M' if i==0 else 'L')+f'{x} {y}' for i,(x,y) in enumerate(unit_quad))+' Z'
RECT = 'M0 0 H1672 V941 H0 Z'
def data_url(name):
    return 'data:image/webp;base64,' + base64.b64encode((ASSETS / name).read_bytes()).decode('ascii')

source_url = data_url('compartment.webp')
def svg(body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941" viewBox="0 0 1672 941"><defs>{defs}</defs>{body}</svg>'

def plate(name, path):
    defs = f'<clipPath id="cut"><path d="{path}" clip-rule="evenodd" fill-rule="evenodd"/></clipPath>'
    doc = svg(f'<image width="1672" height="941" href="{source_url}" clip-path="url(#cut)"/>', defs)
    (ASSETS / name).write_text(doc, encoding='utf-8')

# Separating a source-image region with SVG geometry preserves its exact pixels.
cutouts=f'<mask id="unit-cutouts" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941"><rect width="1672" height="941" fill="white"/><path d="{GLASS}" fill="black"/><path d="{TRANSOM_APERTURE}" fill="black"/></mask>'
(ASSETS / 'compartment-foreground.svg').write_text(svg(f'<image width="1672" height="941" href="{source_url}" mask="url(#unit-cutouts)"/>',cutouts),encoding='utf-8')
plate('transom-sash.svg', TRANSOM_APERTURE)
plate('window-sash.svg', f'{APERTURE} {GLASS}')
for name, path in [('window-glass-mask.svg', GLASS), ('window-aperture-mask.svg', APERTURE), ('transom-mask.svg', TRANSOM)]:
    (ASSETS / name).write_text(svg(f'<path d="{path}" fill="white"/>'), encoding='utf-8')

manifest = {
    'coordinateSystem': {'width':1672, 'height':941},
    'sourceSha256':SOURCE_HASH,
    'images':records,
    'paths': {'glass':GLASS, 'aperture':APERTURE, 'transom':TRANSOM, 'transomAperture':TRANSOM_APERTURE},
    'objects': {
        'lamp': {'asset':'lamp-lit-v2.webp', 'x':1409, 'y':191, 'width':145, 'height':123,
                 'cordAnchor':[1537,290], 'cordEnd':[1537,427], 'hitArea':[1399,181,166,256]},
        'notebook': {'asset':'notebook-v2.webp', 'x':1030, 'y':676, 'width':255, 'height':91,
                     'hitArea':[1020,666,275,111]},
        'window': {'hitArea':[600,10,640,230], 'material':'compartment.webp original painted rail', 'renderer':'window-unit.js shared 3D frame, rebate, seal, sash and glass', 'angle':42, 'mainPane':'fixed'}
    },
    'landscape': {'asset':'forest-panorama.webp', 'x':440, 'y':-70, 'width':2172, 'height':724,
                  'clip':'window-aperture-mask.svg', 'transomClip':'transom-mask.svg',
                  'renderer':'scene-engine.js continuous independent sprites', 'atlas':'trees-atlas.webp', 'speeds':[26,115,420], 'loop':'No whole-image swap or crossfade; individual sprites replaced off-screen'},
    'reference': {'path':'references/compartment-layout.png', 'usage':'Visual reference only; no pixels from this image are used in the page', 'lampState':'lit-static'},
    'layerOrder':['forest','compartment-foreground','rain-in-glass','window-unit','curtain-foreground','wall-and-table-light','lamp','cord','notebook-contact-shadow','notebook'],
    'layout':'fullscreen scene, modal entry, controls below',
    'crops': {'camera':'Computed from stage ratio in app.js; source 1672x941; landscape centered, portrait right edge 1534; crop without distortion'},
    'mobileNotes':'Portrait moves the lamp left with its cord and lighting, and fits the notebook on the table with uniform scaling. Hit areas follow the prop transforms and are clipped to the viewport.',
    'status': {'assetsPrepared':True, 'motionImplemented':True, 'visualWindowTiltVerified':True, 'physicalWindowOpeningVerified':False}
}
(ASSETS / 'scene-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def scene(viewbox, guides=False):
    defs = f'<clipPath id="exterior"><path d="{GLASS}"/><path d="{TRANSOM_APERTURE}"/></clipPath>'
    details_defs, details_body = build_details(ASSETS, embedded=True)
    defs += details_defs
    body = f'<image x="440" y="-70" width="2172" height="724" href="{data_url("forest-panorama.webp")}" clip-path="url(#exterior)"/>'
    # Use assembled layers, no repainting or geometry change in the approved interior.
    body += f'<image width="1672" height="941" href="data:image/svg+xml;base64,{base64.b64encode((ASSETS / "compartment-foreground.svg").read_bytes()).decode()}"/>'
    body += f'<image width="1672" height="941" href="data:image/svg+xml;base64,{base64.b64encode((ASSETS / "transom-sash.svg").read_bytes()).decode()}"/>'
    body += details_body
    if guides:
        body += f'<path d="{GLASS}" fill="none" stroke="#61c4c5" stroke-width="3"/>'
        body += '<text x="700" y="420" fill="#d4eeee" font-size="24">Маска стекла</text>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-label="Сборка ассетов купе"><defs>{defs}</defs>{body}</svg>'

(PREVIEWS / 'scene-assembled.svg').write_text(scene('0 0 1672 941'), encoding='utf-8')
(PREVIEWS / 'scene-masks.svg').write_text(scene('0 0 1672 941', True), encoding='utf-8')
parts = []
for title, csswidth, viewbox in [('Сцена · весь исходный кадр', 1100, '0 0 1672 941'), ('1440 px · правая колонка 60 %',864,'475 0 1161 941'), ('768 px · сцена под текстом',768,'475 0 1158 941'), ('390 px · сцена под текстом',390,'470 0 1112 941')]:
    parts.append(f'<section><h2>{title}</h2><div style="max-width:{csswidth}px">{scene(viewbox)}</div></section>')
html = '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Тихо — проверка ассетов</title><style>body{margin:0;padding:28px;background:#101923;color:#e7e5df;font:17px/1.5 system-ui,sans-serif}h1{font-size:30px}h2{font-size:21px;margin:0 0 14px}p{max-width:850px}section{margin:48px 0}svg{width:100%;height:auto;display:block}img{max-width:100%}.objects{display:flex;gap:40px;flex-wrap:wrap;align-items:center}.objects img{max-height:220px;max-width:320px}code{font-size:14px}</style><h1>«Тихо» — подготовка ассетов</h1><p>Технический просмотр изображений и кадрирования. Лампа светит как на референсе Игоря. Управление, движение и звук пока не реализованы.</p>'+''.join(parts)+'<section><h2>Маска стекла</h2>'+scene('0 0 1672 941',True)+'</section><section><h2>Отдельные объекты с альфа-каналом</h2><div class="objects"><img src="../public/assets/lamp-lit-v2.webp" alt="Латунная лампа"><img src="../public/assets/notebook-v2.webp" alt="Синий блокнот"></div></section></html>'
(PREVIEWS / 'assets.html').write_text(html, encoding='utf-8')
details_defs, details_body = build_details(ASSETS)
index_path = ROOT / 'public' / 'index.html'
page = index_path.read_text(encoding='utf-8')
start, rest = page.split('<!-- scene-details:start -->', 1)
old, end = rest.split('<!-- scene-details:end -->', 1)
page = start + '<!-- scene-details:start -->\n<defs>' + details_defs + '</defs>\n' + details_body + '\n<!-- scene-details:end -->' + end
page = page.replace('src="./assets/notebook.webp" width="640" height="381"', f'src="./assets/notebook-v2.webp" width="640" height="{records["notebook-v2.webp"]["size"][1]}"')
index_path.write_text(page, encoding='utf-8')
print(json.dumps(records, ensure_ascii=False, indent=2))
