"""Physical light, contact shadows and independently generated scene objects."""
import base64

def build_details(assets, embedded=False):
    def image_url(name):
        if embedded:
            return 'data:image/webp;base64,' + base64.b64encode((assets / name).read_bytes()).decode('ascii')
        return './assets/' + name

    definitions = '''
      <radialGradient id="lamp-wall-light">
        <stop offset="0" stop-color="#ef9a38" stop-opacity=".56"/>
        <stop offset=".38" stop-color="#e9902f" stop-opacity=".32"/>
        <stop offset=".76" stop-color="#d9842b" stop-opacity=".09"/>
        <stop offset="1" stop-color="#d9842b" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="lamp-table-light">
        <stop offset="0" stop-color="#efa148" stop-opacity=".46"/>
        <stop offset=".45" stop-color="#e39842" stop-opacity=".24"/>
        <stop offset="1" stop-color="#c68131" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="wall-surface"><path d="M1362 95 H1672 V476 L1553 481 Q1493 486 1483 547 V650 L1363 627 Z"/></clipPath>
      <clipPath id="table-surface"><path d="M520 773 L1340 625 L1566 665 L1564 702 L1039 916 L515 811 Z"/></clipPath>
      <filter id="lamp-contact-shadow" x="-25%" y="-25%" width="160%" height="160%" color-interpolation-filters="sRGB">
        <feDropShadow dx="2.4" dy="3.2" stdDeviation="1.8" flood-color="#0b0908" flood-opacity=".72"/>
      </filter>
      <filter id="notebook-contact-shadow" x="-25%" y="-60%" width="150%" height="220%">
        <feGaussianBlur stdDeviation="2.2"/>
      </filter>
    '''
    body = f'''
      <g class="scene-warm-light" aria-hidden="true" style="mix-blend-mode:screen">
        <ellipse class="lamp-wall-glow" cx="1465" cy="382" rx="112" ry="169" fill="url(#lamp-wall-light)" clip-path="url(#wall-surface)"/>
        <ellipse class="lamp-table-glow" cx="1340" cy="717" rx="290" ry="85" transform="rotate(-8 1340 717)" fill="url(#lamp-table-light)" clip-path="url(#table-surface)"/>
      </g>
      <g class="scene-lamp-prop">
      <image class="scene-lamp" x="1409" y="191" width="145" height="123" href="{image_url('lamp-lit-v2.webp')}" filter="url(#lamp-contact-shadow)"/>
      <ellipse class="scene-bulb-cover" cx="1454" cy="304" rx="40" ry="7.6" fill="#19242e" opacity="0" aria-hidden="true"/>
      <g class="scene-cord" aria-hidden="true">
        <line class="cord-line" x1="1538" y1="290" x2="1538" y2="409" stroke="#21160f" stroke-width="3.2" opacity=".72"/>
        <line class="cord-line" x1="1537" y1="290" x2="1537" y2="409" stroke="#927043" stroke-width="1.5"/>
        <g class="cord-knob"><path d="M1535 408 Q1537 405 1539 408 L1541 420 Q1541 427 1537 427 Q1533 427 1533 420 Z" fill="#60482d" stroke="#ad8651" stroke-width=".9"/></g>
      </g>
      </g>
      <g class="scene-notebook-prop">
      <path class="scene-notebook-shadow" d="M1035 715 L1177 756 L1280 727 L1287 738 L1177 771 L1029 729 Z" fill="#090d12" opacity=".72" filter="url(#notebook-contact-shadow)"/>
      <image class="scene-notebook" x="1030" y="676" width="255" height="91" href="{image_url('notebook-v2.webp')}"/>
      </g>
    '''
    return definitions, body
