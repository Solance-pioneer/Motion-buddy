#!/usr/bin/env python3
"""Small original race-mode art and synthetic cue patch. No recorded V8 claim."""
from pathlib import Path
import numpy as np
import json,hashlib,struct,wave,zipfile,io,math,xml.etree.ElementTree as ET
from PIL import Image
import cairosvg
R=Path(__file__).resolve().parents[1];SR=48000
for d in ['audio/app','audio/masters','svg','preview']:(R/d).mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def wrap(b):return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 100 100">'+b+'</svg>'
flag='<g stroke="#aab8c7" stroke-linejoin="round"><path d="M9 8V49" fill="none" stroke-width="1.4"/><path d="M9 8Q17 4 27 8L27 28Q17 24 9 28Z" fill="url(#racecheck)" stroke-width=".8"/></g>'
defs='<defs><pattern id="racecheck" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#f1eee3"/><path d="M0 0H4V4H0Z M4 4H8V8H4Z" fill="#26313c"/></pattern></defs>'
flags=defs+flag+'<g transform="translate(100 0) scale(-1 1)">'+flag+'</g>'
(R/'svg/race_flags.svg').write_text(wrap(flags))
points=[(4,54),(11,63),(17,75),(6,84),(16,91),(3,37),(13,46),(88,54),(95,63),(84,72),(93,84),(83,91),(96,39),(86,46),(37,5),(48,11),(59,5),(65,13)]
colors=['#efbb60','#70b6bf','#d88da0','#b7a2d9'];pieces=[]
for i,(x,y) in enumerate(points):pieces.append('<rect id="confetti_'+str(i)+'" x="'+str(x)+'" y="'+str(y)+'" width="1.3" height="2.8" rx=".25" transform="rotate('+str((i*37)%100-50)+' '+str(x)+' '+str(y)+')" fill="'+colors[i%4]+'"/>')
confetti=''.join(pieces);(R/'svg/race_confetti.svg').write_text(wrap(confetti))
features=''.join(ET.tostring(c,encoding='unicode') for c in list(ET.parse('/workspace/motion-buddy-live-face-reference-v1/curious-rest-reference.svg').getroot()) if c.attrib.get('data-part')=='glance')
cairosvg.svg2png(bytestring=wrap('<rect width="100" height="100" fill="black"/>'+flags+confetti+features).encode(),write_to=str(R/'preview/Race-intro-static-art.png'))
audio=[]
for i,(key,dur,f0,f1) in enumerate([('race_activate_rev',1.05,68,155),('car_accel_rev_a',.70,78,175),('car_accel_rev_b',.62,92,205),('car_brake_soft_a',.42,790,510),('car_brake_soft_b',.52,680,430)]):
    t=np.arange(round(dur*SR))/SR;ph=2*np.pi*(f0*t+.5*(f1-f0)*t*t/dur);env=np.sin(np.pi*t/dur)**1.25
    if 'brake' in key:
        rng=np.random.default_rng(1142+i);raw=rng.normal(size=len(t));F=np.fft.rfft(raw);freq=np.fft.rfftfreq(len(t),1/SR);F*=np.clip((freq-350)/200,0,1)*np.clip((1700-freq)/600,0,1);noise=np.fft.irfft(F,n=len(t));noise/=max(abs(noise));x=env*(.5*np.sin(ph)+.12*noise+.32*np.sin(2*np.pi*125*t)*np.exp(-t/.10))
    else:x=env*(.90+.10*np.sin(2*np.pi*24*t))*(np.sin(ph)+.32*np.sin(2*ph)+.12*np.sin(3*ph)+.04*np.sin(4*ph))
    x-=x.mean();n=384;x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n);x*=10**(-16/20)/max(abs(x));x[0]=x[-1]=0;assert np.isfinite(x).all() and max(abs(x))<.16
    master=R/f'audio/masters/{key}_master_f32_48k.wav';b=np.asarray(x,dtype='<f4').tobytes();master.write_bytes(b'RIFF'+struct.pack('<I',36+len(b))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,3,1,SR,SR*4,4,32)+b'data'+struct.pack('<I',len(b))+b)
    app=R/f'audio/app/{key}_app_pcm16_48k.wav';q=np.round(x*32767).astype('<i2')
    with wave.open(str(app),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(q.tobytes())
    with wave.open(str(app),'rb') as w:assert (w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes())==(1,2,SR,len(x))
    y=q.astype(float)/32767;assert q[0]==q[-1]==0 and max(abs(y-x))<=1/32767
    audio.append({'key':key,'app':str(app.relative_to(R)),'master':str(master.relative_to(R)),'seconds':len(x)/SR,'loop':False,'peak_dbfs':20*math.log10(max(abs(y))),'rms_dbfs':20*math.log10(np.sqrt(np.mean(y*y)))})
bounds={}
for p in (R/'svg').glob('*.svg'):
    ET.parse(p);im=Image.open(io.BytesIO(cairosvg.svg2png(url=str(p))));bounds[p.name]=im.getbbox();assert bounds[p.name] and bounds[p.name][0]>0 and bounds[p.name][1]>0 and bounds[p.name][2]<400 and bounds[p.name][3]<400
spec={'pack':'motion-buddy-race-mode-v1','scope':'One brief original race activation visual and synthetic finite audio variants. No app/button/sensor code, no recorded V8 file.','registration':{'viewbox':[0,0,100,100],'layer':'WORLD-space backdrop below existing Buddy; not face-local. SVGs contain no eyes/mouth. Preview canonical face is static reference ONLY.','intro_seconds':1.25,'fade_times_seconds':[0,.12,.90,1.25],'motion':'Flags fixed, opacity fade only. Confetti may drift down<=5 canonical units and horizontally<=1 over1.25s; no strobe/flashing. Remove by1.25s, no particle system needed.','reduced_motion':'Static flags+confetti with opacity fade only.','trigger':'Once on explicit Race-mode activation, not every tilt/update. Never lock car input while art plays. Turning Race off, mute audio, hidden/pagehide or exit cleans sources/timers/art.'},'audio':audio,'cue_policy':'race_activate_rev plays once at activation0; then nothing loops. Acceleration/braking: choose one of two short variants per distinct CONDITION ENTRY (not every frame).>=1.5s global sound cooldown; require neutral>=.30s before rearming same event. No immediate repeat; do not stack activation rev with reaction sound. Current mute and cleanup apply. Do not reuse full seven-second scripted racer track for live car reactions.','motion_variants':{'acceleration':['Small push-back stretch: scaleX.94 scaleY1.06 translateY+5 in face100 units, ease .15s.','Smaller excited lean: scaleX.97 scaleY1.04 rotate+2deg translateY+3, ease .15s.'],'braking':['Soft forward squash: scaleX1.10 scaleY.88 translateY-3, ease .12s then neutral .35s.','Small recoil: scaleX1.07 scaleY.92 translateY-2 then scaleX.98 scaleY1.03 rebound over .40s.'],'instruction':'Creative small targets, Code adapts current bounds/calibration. Rotate variations on event entry; preserve face paths/colours and banking. Reduced motion static expression or minimal scale, no bob.'},'v8_limitation':'ALL supplied sounds are original SYNTHETIC placeholders, NOT a V8 recording or acoustically verified V8 model. Scout is researching a real recording separately; do not describe these as the requested recorded V8. External asset still requires Mike review before download under current project rule. Originals need no additional approval wait.','provenance':'Original handwritten checker flags/confetti geometry and original mathematical engine/brake synthesis; no brand, recording, sample, copied theme, external image or download.','ui_handoff':'Mike requests a more DISCREET Teleport button (latest direction overrides earlier prominence) and a distinct Race toggle. Code owns UI implementation, preserve discoverability/accessibility.','qa':{'audio_headers_counts_finite_headroom_quantization_zero_endpoints':'pass','svg_xml_bounds':'pass','raster_bounds':bounds,'not_performed':['human listening','app integration/runtime','phone/sensor testing','deployment']}}
(R/'README.md').write_text('One bounded race-mode original asset patch. Flags/confetti+five short finite synthetic cues; NOT recorded V8. Source/float masters/PCM16 app copies. Play once/event, never continuous tilt audio. Code implements Race toggle, discreet Teleport, car reactions using existing app. No listening/app/phone/deployment claim.\n')
spec['files']={str(p.relative_to(R)):sha(p) for p in sorted(R.rglob('*')) if p.is_file() and p.name!='integration-manifest.json'};(R/'integration-manifest.json').write_text(json.dumps(spec,indent=2)+'\n')
zpath=R.with_suffix('.zip')
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(R.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(R.parent))
with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
assert all(sha(R/k)==v for k,v in spec['files'].items())
print(json.dumps({'zip':str(zpath),'bytes':zpath.stat().st_size,'sha256':sha(zpath),'audio':audio,'qa':spec['qa']},indent=2))
