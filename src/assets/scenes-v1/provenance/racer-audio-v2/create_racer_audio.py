#!/usr/bin/env python3
"""Original finite racer sound design: rev/drive away/return/brake. No samples."""
from pathlib import Path
import numpy as np
import math,struct,wave,json,hashlib,zipfile
R=Path(__file__).resolve().parents[1];SR=48000;N=7*SR;t=np.arange(N)/SR
for d in ['audio/app','audio/masters']:(R/d).mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
# Smooth low engine with a rising rev, receding pass, return and deceleration.
f=np.interp(t,[0,.35,.85,2.1,2.7,3.5,4.2,5.0,5.8,6.5,7],[70,82,92,195,158,145,180,165,100,65,65])
ph=2*np.pi*np.cumsum(f)/SR
engine=sum(g*np.sin(k*ph) for k,g in [(1,1),(2,.36),(3,.16),(4,.07),(5,.025)])
amplitude=np.interp(t,[0,.12,.65,1.0,1.8,2.5,2.9,3.4,3.8,4.5,5.2,5.8,6.35,6.7,7],[0,.16,.24,.40,.64,.10,.025,.025,.08,.30,.52,.25,.04,0,0])
x=engine*amplitude*(.94+.06*np.sin(2*np.pi*17*t))
# One stylised rounded tyre squeal on the returning brake, band-limited/no alarm spike.
a,b=5.50,6.45;m=(t>=a)&(t<b);u=t[m]-a;dur=b-a
rng=np.random.default_rng(202611071117);noise=rng.normal(size=len(u));F=np.fft.rfft(noise);freq=np.fft.rfftfreq(len(u),1/SR)
weight=np.clip((freq-500)/250,0,1)*np.clip((2100-freq)/500,0,1);noise=np.fft.irfft(F*weight,n=len(u));noise/=max(abs(noise))
squeal_phase=2*np.pi*np.cumsum(1010+140*np.sin(2*np.pi*2.2*u)-180*u/dur)/SR
x[m]+=.26*np.sin(np.pi*u/dur)**1.6*(.74*np.sin(squeal_phase)+.26*noise)
x-=x.mean();fade=960;x[:fade]*=np.linspace(0,1,fade);x[-fade:]*=np.linspace(1,0,fade);x*=10**(-15/20)/max(abs(x));x[0]=x[-1]=0
assert len(x)==N and np.isfinite(x).all() and max(abs(x))<.18
master=R/'audio/masters/racer_accelerate_return_brake_master_f32_48k.wav';data=np.asarray(x,dtype='<f4').tobytes();master.write_bytes(b'RIFF'+struct.pack('<I',36+len(data))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,3,1,SR,SR*4,4,32)+b'data'+struct.pack('<I',len(data))+data)
app=R/'audio/app/racer_accelerate_return_brake_app_pcm16_48k.wav';q=np.round(x*32767).astype('<i2')
with wave.open(str(app),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(q.tobytes())
with wave.open(str(app),'rb') as w:assert (w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes())==(1,2,SR,N)
y=q.astype(float)/32767;assert q[0]==q[-1]==0 and max(abs(y-x))<=1/32767
spec={'pack':'motion-buddy-racer-audio-v2','scope':'ONLY one replacement racer sound cue; no app/art/other scene changes','duration_seconds':7,'app':str(app.relative_to(R)),'master':str(master.relative_to(R)),'format':'PCM16 mono48k app, float32 mono48k master','samples':N,'loop':False,'cue_start_seconds':0,'timeline':[{'start':0,'end':.65,'action':'Helmet appears; low engine wakes up.'},{'start':.65,'end':2.5,'action':'Accelerate and move Buddy+helmet together away/offscreen.'},{'start':2.5,'end':3.5,'action':'Quiet distant engine; travel turnaround.'},{'start':3.5,'end':5.5,'action':'Return pass, engine grows and slows.'},{'start':5.5,'end':6.45,'action':'One bounded stylised tyre screech while braking back to centre.'},{'start':6.45,'end':7,'action':'Settle; costume clears and exact plain Buddy returns.'}],'playback':'One finite source at racer scene0, replacing old racer_soft_wind. Do NOT layer old wind, duplicate screeches, loop or retrigger from sensor/touch. Preserve immediate mute, hidden/pagehide cleanup, fixed scene lock and seven-second deadline. Reduced motion keeps helmet static/crossfades with same single sound cue if unmuted.','mouth_occlusion':'Code should hide/occlude live mouth ONLY when costume region physically covers it (e.g.racing full helmet), not globally alter Buddy or hide mouth on open-face costumes. Parent helmet/mask and face under same scene motion.','provenance':'Original deterministic additive engine and band-limited synthetic tyre sound created by this source. No recordings/samples/voices/brands/copied themes/external downloads.','qa':{'headers_sample_count_quantization_zero_endpoints':'pass','finite_no_clipping':'pass','peak_dbfs':20*math.log10(max(abs(y))),'rms_dbfs':20*math.log10(np.sqrt(np.mean(y*y))),'max_adjacent_sample_step':float(np.max(abs(np.diff(y)))),'not_performed':['human listening','app integration/runtime','phone testing','deployment']}}
(R/'README.md').write_text('Original seven-second racer cue: acceleration, distant turnaround, returning engine and one bounded tyre squeal. Replace old wind sound, not additive. See integration-manifest.json for motion cue timings and scene-specific mouth occlusion note. Source/float master/app PCM16 retained. No human listening, app, phone or deployment claim.\n')
spec['files']={str(p.relative_to(R)):sha(p) for p in sorted(R.rglob('*')) if p.is_file() and p.name!='integration-manifest.json'};(R/'integration-manifest.json').write_text(json.dumps(spec,indent=2)+'\n')
zpath=R.with_suffix('.zip')
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(R.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(R.parent))
with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
assert all(sha(R/k)==v for k,v in spec['files'].items())
print(json.dumps({'zip':str(zpath),'bytes':zpath.stat().st_size,'sha256':sha(zpath),'app':str(app),'duration_seconds':7,'qa':spec['qa']},indent=2))
