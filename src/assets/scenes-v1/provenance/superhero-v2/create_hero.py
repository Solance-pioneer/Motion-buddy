#!/usr/bin/env python3
"""Original seven-second superhero art/music revision. No app/repository edits."""
from pathlib import Path
import numpy as np
import math,struct,wave,json,hashlib,zipfile,io,xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageFont
import cairosvg
R=Path(__file__).resolve().parents[1];SR=48000
for d in ['svg','audio/app','audio/masters','board']:(R/d).mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def wrap(b):return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -5 150 145" width="450" height="435" overflow="visible">'+b+'</svg>'
head='<circle cx="50" cy="45" r="43" fill="#124868" stroke="#387d9a" stroke-width="1.2"/>'
mask='<path d="M13 28Q32 10 50 23Q68 10 87 28L83 53Q68 64 50 51Q32 64 17 53Z" fill="#182333" stroke="#f0c56a" stroke-width="1.5" stroke-linejoin="round"/>'
capes=[
'M25 59C43 70 61 69 75 59C86 80 101 98 115 117C87 111 74 131 54 126C30 120 18 128 5 121C18 105 22 82 25 59Z',
'M25 59C43 70 61 69 75 59C91 75 110 82 123 103C97 101 85 125 64 127C38 131 25 118 9 124C19 104 22 82 25 59Z',
'M25 59C43 70 61 69 75 59C83 84 91 105 108 125C87 117 74 119 53 124C31 130 20 123 2 115C17 101 22 82 25 59Z']
features=''.join(ET.tostring(c,encoding='unicode') for c in list(ET.parse('/workspace/motion-buddy-live-face-reference-v1/curious-rest-reference.svg').getroot()) if c.attrib.get('data-part')=='glance')
board=Image.new('RGB',(1050,420),'#10141c');d=ImageDraw.Draw(board);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for key,b in [('round_head',head),('eye_mask',mask)]: (R/f'svg/{key}.svg').write_text(wrap(b))
for i,path in enumerate(capes):
    cape='<path d="'+path+'" fill="#bd3d47" stroke="#ee7470" stroke-width="1.4" stroke-linejoin="round"/>'
    (R/f'svg/cape_{i}.svg').write_text(wrap(cape))
    scene=wrap('<rect x="-20" y="-5" width="150" height="145" fill="black"/>'+cape+head+mask+features)
    pic=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=scene.encode(),output_width=330,output_height=319))).convert('RGB');board.paste(pic,(10+i*350,48));d.text((20+i*350,20),'Cape pose '+str(i+1)+' - static',font=font,fill='white')
d.text((20,384),'Original costume. Canonical eyes/mouth shown only as reference, not supplied replacements.',font=font,fill='#c5cbd5');board.save(R/'board/Superhero-round-mask-cape-static.png')
# Full seven-second original melody/harmony. Warm synthetic brass attack, no samples/themes.
t=np.arange(7*SR)/SR;x=np.zeros_like(t)
notes=[(.08,.70,62),(.82,.66,67),(1.52,.50,66),(2.10,.82,71),(3.04,.72,69),(3.82,.52,66),(4.42,.74,74),(5.30,1.52,69)]
for start,dur,midi in notes:
    m=(t>=start)&(t<start+dur);u=t[m]-start;freq=440*2**((midi-69)/12)
    env=(1-np.exp(-u/.055))*np.minimum(1,(dur-u)/.17)
    ph=2*np.pi*freq*u;x[m]+=.50*env*(np.sin(ph)+.16*np.sin(2*ph)+.065*np.sin(3*ph))
for start,dur,chord in [(0,2.10,[50,57,62,66]),(2.10,2.10,[47,54,59,62]),(4.2,1.1,[45,52,57,61]),(5.3,1.7,[50,57,62,66])]:
    m=(t>=start)&(t<start+dur);u=t[m]-start;env=np.sin(np.pi*u/dur)**.6
    for midi in chord:x[m]+=.065*env*np.sin(2*np.pi*440*2**((midi-69)/12)*u)
x-=x.mean();n=4800;x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n);x*=10**(-13/20)/max(abs(x));x[0]=x[-1]=0
assert len(x)==336000 and np.isfinite(x).all() and max(abs(x))<.225
master=R/'audio/masters/hero_original_fanfare_master_f32_48k.wav';b=np.asarray(x,dtype='<f4').tobytes();master.write_bytes(b'RIFF'+struct.pack('<I',36+len(b))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,3,1,SR,SR*4,4,32)+b'data'+struct.pack('<I',len(b))+b)
app=R/'audio/app/hero_original_fanfare_app_pcm16_48k.wav';q=np.round(x*32767).astype('<i2')
with wave.open(str(app),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(q.tobytes())
with wave.open(str(app),'rb') as w:assert (w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes())==(1,2,48000,336000)
assert q[0]==q[-1]==0 and np.max(abs(q.astype(float)/32767-x))<=1/32767
bounds={}
for p in sorted((R/'svg').glob('*.svg')):
    ET.parse(p);im=Image.open(io.BytesIO(cairosvg.svg2png(url=str(p))));box=im.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<450 and box[3]<435;bounds[p.name]=box
spec={'pack':'motion-buddy-superhero-v2','replaces':'ONLY costume and music of existing cord_hero scene; other scenes/base Buddy untouched','duration_seconds':7,'registration':{'coordinate_space':'existing canonical 100x100 face coordinates; art SVG viewBox -20 -5 150 145 includes cape overflow, not a new face coordinate system','render':'Inline SVG/group paths use original coordinates. If image elements are required set x=-20 y=-5 width=150 height=145, NOT x=0/y=0/100x100. Parent cape/head/mask and canonical face in ONE existing scene transform; mask follows gaze/face exactly. Fit full x=-20..130 y=-5..140 art within stage before viewport clipping.','layering':['cape','round_head','eye_mask','existing live eyes/mouth'],'face':'No production eyes/mouth included. Board uses exact canonical curious-rest source for STATIC illustration only. No base-feature changes.'},'cape':{'path_frames':capes,'files':['svg/cape_0.svg','svg/cape_1.svg','svg/cape_2.svg'],'interpolation':'Same path topology: interpolate 0 -> 1 -> 0 -> 2 -> 0 across 1.3s, repeat ONLY while existing scene is active; flutter is visual, never restarts music or extends scene.','animation_window_seconds':[.65,6.30],'amplitude':'Full original path geometry; no strobe/fast shaking.','reduced_motion':'Hold cape_0 still; static round head/mask; crossfade on/off, same seven seconds.'},'music':{'app':str(app.relative_to(R)),'master':str(master.relative_to(R)),'seconds':7,'loop':False,'cue_seconds':0,'peak_dbfs':20*math.log10(max(abs(q.astype(float)/32767))),'rms_dbfs':20*math.log10(np.sqrt(np.mean((q.astype(float)/32767)**2))),'score_midi':notes,'chords':[[50,57,62,66],[47,54,59,62],[45,52,57,61],[50,57,62,66]],'instruction':'Replace previous 1.3s hero flourish, do not layer/double-trigger. One finite source, immediate mute, remove on hidden/pagehide/scene end.','provenance':'Original newly composed synthetic fanfare from score in generator; no copied melody, samples, voices or theme request.'},'policy':'Existing fixed seven-second scene lock, cleanup and exact plain Buddy restoration unchanged. No design approval wait; Mike requested implementation first. Preserve existing entrance/exit where practical, keep mask/cape readable.','qa':{'wav_headers_count_quantization_zero_endpoints':'pass','finite_headroom':'pass','svg_xml_bounds':'pass','raster_bounds':bounds,'not_performed':['human listening','runtime integration','phone testing','deployment']}}
(R/'README.md').write_text('One bounded superhero revision. Original round head accessory, eye mask, three same-topology cape paths and seven-second original fanfare. No production face replacement. Source/float master/PCM16 app file retained. See integration-manifest.json. No human listening, app, phone or deployment claims.\n')
spec['files']={str(p.relative_to(R)):sha(p) for p in sorted(R.rglob('*')) if p.is_file() and p.name!='integration-manifest.json'};(R/'integration-manifest.json').write_text(json.dumps(spec,indent=2)+'\n')
zpath=R.with_suffix('.zip')
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(R.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(R.parent))
with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
assert all(sha(R/k)==v for k,v in spec['files'].items())
print(json.dumps({'zip':str(zpath),'bytes':zpath.stat().st_size,'sha256':sha(zpath),'music':spec['music'],'qa':spec['qa']},indent=2))
