"""One-off migration from the approved split layout to the approved fullscreen entry."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'public/index.html'
s=p.read_text(encoding='utf-8')
start=s.index('        <section class="welcome reading-column"')
end=s.index('        <aside class="compartment-panel"',start)
s=s[:start]+s[end:]
start=s.index('          <div class="scene-header">')
end=s.index('          <figure class="scene"',start)
s=s[:start]+s[end:]
s=s.replace('aria-labelledby="compartment-title scene-caption"','aria-labelledby="compartment-title"')
s=s.replace('<div class="scene-stage">','''<div class="scene-stage">
              <h2 id="compartment-title" class="sr-only">Ночное купе</h2>
              <nav class="scene-nav" aria-label="Навигация по купе">
                <a class="scene-brand" href="#compartment" aria-label="Тихо — к началу">Тихо</a>
                <a href="#settle-in">Как устроиться</a>
              </nav>''',1)
s=s.replace('viewBox="475 0 1161 941" width="1161" height="941"','viewBox="0 0 1672 941" width="1672" height="941" preserveAspectRatio="xMidYMid slice"',1)
s=s.replace('''            </div>
            <figcaption id="scene-caption">''','''              <div class="scene-edge-controls" hidden data-scene-edge>
                <a class="scene-down" href="#scene-caption"><span>Управление и детали</span><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M10 3v13m-5-5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></a>
                <button type="button" class="scene-sound" data-audio-compact aria-label="Включить звук" aria-pressed="false"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8q4 4 0 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path class="sound-muted-mark" d="m17 5 5 14" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span data-compact-label>Звук</span></button>
              </div>
            </div>
            <figcaption id="scene-caption" tabindex="-1">
              <div class="scene-caption-intro"><span class="section-overline">Твоё место у окна</span>''',1)
s=s.replace('''              <div class="scene-controls"''','''              </div>
              <div class="scene-settings"><div class="scene-controls"''',1)
s=s.replace('''              <noscript>''','''              </div>
              <noscript>''',1)
s=s.replace('href="#page-title"','href="#compartment"')
s=s.replace('''    <dialog class="notebook-dialog"''','''    <dialog class="welcome entry-dialog" id="entry-dialog" aria-labelledby="page-title" aria-describedby="entry-description">
      <button class="entry-close" type="button" data-entry-close aria-label="Осмотреть купе без звука">×</button>
      <div class="welcome-copy">
        <h1 id="page-title">Тихо</h1>
        <p class="welcome-line">Место, где легче<br>сосредоточиться</p>
        <p class="welcome-description" id="entry-description">Ночной поезд, дождь за окном<br>и время для своего дела.</p>
        <button class="button" type="button" data-enter autofocus>Войти в купе</button>
        <p class="welcome-footnote">Поезд и дождь включатся после входа.</p>
      </div>
    </dialog>
    <dialog class="notebook-dialog"''',1)
p.write_text(s,encoding='utf-8')

p=root/'public/styles.css';s=p.read_text(encoding='utf-8')
a=s.index('.journey {');b=s.index('.scene-hotspots {',a)
s=s[:a]+'''.journey { display: grid; grid-template-columns: 1fr 1fr; }
.reading-column { min-width: 0; padding-right: clamp(28px,6vw,110px); padding-left: clamp(28px,6vw,110px); }
.text-link { display: inline-flex; align-items: center; min-height: 44px; text-decoration: underline; }
.button { display: inline-flex; align-items: center; justify-content: center; min-height: 58px; padding: 13px 30px; border: 0; background: var(--amber); color: var(--button-ink); font-weight: 500; text-decoration: none; text-align: center; }
.compartment-panel { grid-column: 1 / -1; min-width: 0; background: var(--scene-ground); }
.scene { min-width: 0; scroll-margin-top: 0; }
.scene-stage { position: relative; width: 100%; height: 100svh; min-height: 360px; overflow: hidden; line-height: 0; background: #101923; }
.scene-art { display: block; width: 100%; height: 100%; max-height: none; }
.scene-nav { position: absolute; z-index: 2; inset: 24px 40px auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; line-height: 1.5; }
.scene-nav a { display: inline-flex; min-height: 44px; align-items: center; text-decoration: none; text-shadow: 0 2px 12px #000; }
.scene-nav > a:last-child { font-size: 14px; }
.scene-brand { font-family: var(--font-display); font-size: 32px; letter-spacing: -.05em; }
.scene-edge-controls { position: absolute; z-index: 2; inset: auto 32px 24px; display: flex; align-items: end; justify-content: space-between; gap: 20px; pointer-events: none; line-height: 1.5; }
.scene-edge-controls[hidden] { display: none; }
.scene-edge-controls > * { pointer-events: auto; }
.scene-down { display: inline-flex; align-items: center; gap: 14px; min-height: 44px; padding: 8px 12px; color: var(--ink); font-size: 14px; text-decoration: none; background: rgb(8 15 22 / 70%); }
.scene-sound { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px 16px; border: 0; background: rgb(8 15 22 / 78%); color: var(--ink); font-size: 14px; }
.scene-sound[aria-pressed="true"] .sound-muted-mark { display: none; }
.scene figcaption { display: grid; grid-template-columns: 1fr 1.3fr; align-items: start; gap: 64px; padding: 64px clamp(28px,6vw,110px) 72px; scroll-margin-top: 0; }
.scene-caption-intro > p { margin-top: 14px; font-family: var(--font-display); font-size: clamp(28px,3vw,42px); line-height: 1.25; letter-spacing: -.03em; }
.scene-caption-intro .section-overline { display: block; font-size: 14px; color: var(--muted); }
.scene-hint { display: block; max-width: 40ch; margin-top: 18px; color: var(--muted); font-size: 16px; line-height: 1.6; }
.entry-dialog { width: min(480px,calc(100% - 40px)); max-height: calc(100svh - 40px); overflow-y: auto; margin: auto; padding: 48px; border: 0; background: rgb(12 19 27 / 96%); color: var(--ink); text-align: center; }
.entry-dialog::backdrop { background: rgb(3 8 14 / 38%); }
.entry-close { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; color: var(--muted); font-size: 28px; line-height: 1; }
.welcome h1 { font-family: var(--font-display); font-size: 100px; line-height: 1.08; letter-spacing: -.06em; }
.welcome-line { margin-top: 24px; font-size: 24px; line-height: 1.35; letter-spacing: -.02em; }
.welcome-description { margin-top: 20px; color: var(--muted); font-size: 16px; line-height: 1.65; }
.welcome .button { width: 100%; margin-top: 32px; }
.welcome-footnote { margin-top: 16px; color: var(--muted); font-size: 13px; line-height: 1.5; }
body.has-entry-open { overflow: hidden; }

'''+s[b:]
s=s.replace('.scene .scene-control > span','.scene-control > span').replace('.scene .scene-control .control-state','.scene-control .control-state')
s=s.replace('gap: 8px; margin-top: 16px;','gap: 8px; margin-top: 0;',1)
s=s.replace('.scene figcaption .audio-status { font-size: 13px; }','.scene figcaption .audio-status { font-size: 13px; margin: 0; }')
a=s.index('.for-your-work {');b=s.index('@media (hover: hover)',a)
s=s[:a]+'''.for-your-work, .settle-in { padding-top: 96px; padding-bottom: 96px; }
.for-your-work { background: #101923; }
.section-lead { margin-top: 28px; font-size: var(--text-lead); line-height: 1.5; }
.for-your-work > p:not(.section-lead):not(.image-caption) { margin-top: 24px; }
.notebook-detail { width: 75%; max-width: 320px; margin: 48px 0 18px; }
.image-caption { color: var(--muted); font-size: var(--text-small); }
.settle-in > p { margin-top: 28px; }
.object-guide { display: grid; gap: 28px; margin-top: 36px; }
.object-guide dt { margin-bottom: 8px; font-weight: 500; }
.object-guide dd { color: var(--muted); }
.settle-in > .text-link { margin-top: 28px; }
.return-section { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 80px; padding: 96px clamp(28px,6vw,110px); background: var(--blue-field); }
.return-copy p { margin-top: 24px; }
.return-copy .button { margin-top: 32px; }
.return-landscape { width: 100%; aspect-ratio: 1.6; object-fit: cover; object-position: 49% 58%; }
.site-footer { display: flex; align-items: center; justify-content: space-between; gap: 32px; padding: 40px clamp(28px,6vw,110px); }
.footer-name { display: inline-flex; align-items: center; min-height: 44px; font-family: var(--font-display); font-size: var(--text-heading); line-height: 1.2; letter-spacing: -.04em; text-decoration: none; }
.site-footer p, .site-footer > .text-link { color: var(--muted); font-size: var(--text-small); }

'''+s[b:]
a=s.index('@media (min-width: 901px)');b=s.index('@media (prefers-reduced-motion: reduce)',a)
s=s[:a]+'''@media (max-width: 900px) {
  .scene figcaption { grid-template-columns: 1fr; gap: 32px; padding: 48px 32px; }
  .scene-nav { inset: 16px 24px auto; }
  .scene-edge-controls { inset: auto 24px 20px; }
  .for-your-work, .settle-in { padding: 64px 32px; }
  .return-section { gap: 40px; padding: 64px 32px; }
  .site-footer { flex-wrap: wrap; padding: 32px; }
}
@media (max-width: 599px) {
  :root { --text-heading: 2rem; --text-lead: 1.375rem; }
  body { line-height: 1.6; }
  .journey { display: block; }
  .scene-nav { inset: max(12px,env(safe-area-inset-top)) 20px auto; }
  .scene-brand { font-size: 28px; }
  .scene-nav > a:last-child { font-size: 13px; }
  .scene-edge-controls { inset: auto 16px max(16px,env(safe-area-inset-bottom)); gap: 12px; }
  .scene-down { gap: 8px; font-size: 13px; padding: 8px 10px; }
  .scene-sound { padding: 10px 12px; }
  .scene-sound > span { display: none; }
  .scene figcaption { padding: 40px 24px 48px; gap: 28px; }
  .scene-controls { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .scene-caption-intro > p { font-size: 30px; }
  .scene-hint { font-size: 14px; }
  .entry-dialog { padding: 42px 28px 32px; }
  .welcome h1 { font-size: 82px; }
  .welcome-line { margin-top: 20px; font-size: 21px; }
  .welcome-description { font-size: 14px; }
  .welcome .button { margin-top: 24px; }
  .notebook-dialog { padding: 24px; }
  .notebook-heading h2 { font-size: 28px; }
  .for-your-work, .settle-in { padding: 56px 24px; }
  .notebook-detail { width: 78%; margin-top: 36px; }
  .return-section { grid-template-columns: 1fr; gap: 36px; padding: 56px 24px; }
  .site-footer { gap: 20px; padding: 28px 24px; }
  .site-footer p { order: 3; width: 100%; }
}
@media (max-height: 580px) {
  .entry-dialog { padding: 24px 40px; }
  .welcome h1 { font-size: 64px; }
  .welcome-line { margin-top: 12px; font-size: 20px; }
  .welcome-description { margin-top: 12px; font-size: 14px; }
  .welcome .button { margin-top: 18px; }
  .welcome-footnote { margin-top: 10px; }
}

'''+s[b:]
p.write_text(s,encoding='utf-8')
