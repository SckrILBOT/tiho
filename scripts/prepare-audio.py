"""Prepare credited field recordings as circular loops and a local-file-safe lazy bundle."""
from pathlib import Path
import subprocess, json, base64
import numpy as np
import imageio_ffmpeg

root=Path(__file__).resolve().parents[1]
assets=root/'public/assets/audio'
ff=imageio_ffmpeg.get_ffmpeg_exe()
rate=22050
bundle={}
report={}
for name,start,duration,fade in [('train',0,None,1.1),('rain',12,48,3),('wind',0,None,2)]:
    raw=subprocess.check_output([ff,'-v','error','-i',str(assets/f'{name}-source.ogg'),'-f','f32le','-ar',str(rate),'-ac','2','-'])
    samples=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
    samples=samples[int(start*rate):int((start+duration)*rate) if duration else None]
    n=int(fade*rate)
    blend=(.5-.5*np.cos(np.linspace(0,np.pi,n)))[:,None]
    seam=samples[-n:]*(1-blend)+samples[:n]*blend
    loop=np.concatenate([samples[n:-n],seam])
    loop-=loop.mean(axis=0)
    loop*=min(10**(-23/20)/np.sqrt(np.mean(loop**2)),.85/np.max(np.abs(loop)))
    output=assets/f'{name}.mp3'
    subprocess.run([ff,'-y','-v','error','-f','f32le','-ar',str(rate),'-ac','2','-i','-','-c:a','libmp3lame','-b:a','96k',str(output)],input=loop.astype('<f4').tobytes(),check=True)
    bundle[name]=base64.b64encode(output.read_bytes()).decode()
    report[name]={'seconds':len(loop)/rate,'crossfadeSeconds':fade,'peak':float(np.max(np.abs(loop))),'seamStep':float(np.max(np.abs(loop[0]-loop[-1]))),'bytes':output.stat().st_size}
(root/'public/audio-data.js').write_text('window.tihoAudioData='+json.dumps(bundle,separators=(',',':'))+';\n',encoding='utf-8')
(assets/'preparation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
