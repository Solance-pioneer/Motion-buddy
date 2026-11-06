#!/usr/bin/env python3
"""Original Motion Buddy creative asset batch. No app/repository edits.
Python 3 + numpy + Pillow + cairosvg. Sources/masters remain portable.
"""
from pathlib import Path
import hashlib,json,math,struct,wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SR=48000; TAU=2*math.pi

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def db(v):return 20*math.log10(v) if v>1e-12 else None

def tone(t,start,duration,f0,f1,gain=1):
    x=np.zeros_like(t); m=(t>=start)&(t<start+duration); u=t[m]-start
    env=np.sin(math.pi*u/duration)**2
    ph=TAU*(f0*u+.5*(f1-f0)*u*u/duration)
    x[m]=gain*env*(np.sin(ph)+.09*np.sin(2*ph))
    return x

def finish(x,target=-21,ceiling=-13):
    active=np.abs(x)>1e-9
    x[active]-=float(x[active].mean())
    m=np.abs(x)>1e-4
    x*=min(10**(target/20)/np.sqrt(np.mean(x[m]**2)),10**(ceiling/20)/np.max(np.abs(x)))
    n=min(int(.006*SR),len(x)//8)
    x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n)
    x[0]=x[-1]=0
    return x

def lpf(x,cutoff):
    a=math.exp(-TAU*cutoff/SR);out=np.empty_like(x);acc=0.
    for i,v in enumerate(x):acc=(1-a)*v+a*acc;out[i]=acc
    return out

def write32(p,x):
    b=np.asarray(x,dtype='<f4').tobytes()
    p.write_bytes(b'RIFF'+struct.pack('<I',36+len(b))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,3,1,SR,SR*4,4,32)+b'data'+struct.pack('<I',len(b))+b)

def write16(p,x):
    q=np.round(x*32767).astype('<i2')
    with wave.open(str(p),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(q.tobytes())
    return q.astype(float)/32767

def metrics(x):
    m=np.abs(x)>1e-4
    return {'seconds':len(x)/SR,'peak_dbfs':db(float(np.max(np.abs(x)))),'active_rms_dbfs':db(float(np.sqrt(np.mean(x[m]**2)))),'dc_offset':float(x.mean()),'first_sample':float(x[0]),'last_sample':float(x[-1])}

def loop_wave(t,T=2.8):
    # f(t)=330-60*cos(2*pi*t/T). Integral over T is 924 whole cycles.
    # Both phase and envelope continue through loop point, with no silent tail.
    phase=TAU*330*t-60*T*np.sin(TAU*t/T)
    amp=.94+.06*np.cos(TAU*t/T)
    return amp*(np.sin(phase)+.14*np.sin(2*phase)+.035*np.sin(3*phase))

def audio():
    for d in ['audio/masters','audio/app','audio/audition']:(ROOT/d).mkdir(parents=True,exist_ok=True)
    t=np.arange(round(2.8*SR))/SR
    raw=loop_wave(t)
    scale=10**(-21.5/20)/float(np.sqrt(np.mean(raw*raw)))
    loop=raw*scale
    periodic_error=float(np.max(np.abs(loop_wave(t+2.8)*scale-loop)))
    assert periodic_error<1e-10
    near=np.array([-2.,-1.,0.,1.,2.])/SR
    seam=loop_wave(near)*scale
    assert abs(seam[2])<1e-12
    # The first post-wrap difference is the same smooth one-sample transition
    # as the preceding and following differences, not an artificial zero-tail jump.
    seam_step=float(abs(seam[2]-seam[1]))
    assert np.max(np.abs(np.diff(seam,2)))<1e-4
    sounds=[('curious_contact_loop',loop,True,'Sustained curious contact tone; native sample loop at 0..2.8s, external gain ramps only')]
    t=np.arange(round(.34*SR))/SR
    sounds.append(('pet_soft_squeak',finish(tone(t,.02,.28,340,590)) ,False,'Gentle single squeeze squeak'))
    t=np.arange(round(.48*SR))/SR
    sounds.append(('pet_round_chirp',finish(tone(t,.02,.17,480,590)+tone(t,.23,.19,520,430,.85)),False,'Rounded two-part contented chirp'))
    t=np.arange(round(.78*SR))/SR
    sounds.append(('pet_content_wobble',finish(tone(t,.03,.65,255,330)+.25*tone(t,.16,.40,340,280)),False,'Low soft satisfied warble, no speech'))
    t=np.arange(round(.48*SR))/SR
    rng=np.random.default_rng(61126)
    noise=lpf(rng.normal(size=len(t)),950)
    ninja=finish(.22*noise*np.sin(math.pi*t/.48)**2+tone(t,.14,.25,620,300,.25),-23,-15)
    sounds.append(('ninja_soft_swish',ninja,False,'Original quiet cloth-like digital swish'))
    t=np.arange(round(1.30*SR))/SR
    hero=sum(tone(t,s,d,f,f,g) for s,d,f,g in [(0.02,.22,293.66,.65),(.29,.25,349.23,.7),(.58,.26,440,.75),(.89,.34,659.25,.8)])
    sounds.append(('hero_original_flourish',finish(hero,-21,-13),False,'Original four-note electronic flourish; no reference tune or theme imitation'))
    t=np.arange(round(1.25*SR))/SR
    wind=lpf(rng.normal(size=len(t)),650)
    wind-=lpf(wind,100)
    racer=wind*np.sin(math.pi*t/1.25)**1.6+.15*tone(t,.08,1.05,155,225)
    sounds.append(('racer_soft_wind',finish(racer,-24,-14),False,'Low soft wind rush; no real vehicle recording'))
    t=np.arange(round(1.05*SR))/SR
    ghost=tone(t,.04,.45,392,415,.8)+tone(t,.54,.45,329.63,311,.7)
    sounds.append(('ghost_cute_boo',finish(ghost,-23,-14),False,'Two soft bell-like drifting notes; no jump scare or vocal boo'))
    records=[]
    for key,x,isloop,desc in sounds:
        assert np.isfinite(x).all() and abs(x.mean())<1e-4 and np.max(np.abs(x))<.3
        master=ROOT/'audio/masters'/f'{key}_master_f32_48k.wav'
        app=ROOT/'audio/app'/f'{key}_app_pcm16_48k.wav'
        write32(master,x);q=write16(app,x)
        assert np.max(np.abs(q-x))<=1/32767
        with wave.open(str(app),'rb') as w:
            assert (w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes())==(1,2,SR,len(x))
        rec={'key':key,'description':desc,'loop':isloop,'master':{'path':str(master.relative_to(ROOT)),'sha256':sha(master)},'app':{'path':str(app.relative_to(ROOT)),'sha256':sha(app),'format':'PCM16 mono 48kHz','metrics':metrics(q)}}
        if isloop:
            rec['loop_qa']={'start_seconds':0,'end_seconds':2.8,'whole_fundamental_cycles':924,'analytic_periodic_max_error':periodic_error,'wrap_step_amplitude':seam_step,'loop_endpoint_note':'Last sample is NOT forced to zero: it is the correct pre-wrap waveform sample. Use uncompressed PCM buffer looping, not repeated ended/restart calls. No baked fade/silent tail.'}
        records.append(rec)
    # Audition: two uninterrupted loop cycles, then separate petting and scenario cues.
    sample=records[0]
    parts=[];cues=[];cursor=0.
    a=np.tile(loop,2);n=int(.15*SR);a[:n]*=np.linspace(0,1,n);a[-n:]*=np.linspace(1,0,n)
    parts.append(a);cues.append({'key':'curious_contact_loop_two_cycles','start_seconds':0,'duration_seconds':5.6});cursor=5.6
    for key,x,isloop,desc in sounds[1:]:
        gap=np.zeros(round(.5*SR));parts.extend([gap,x]);cursor+=.5
        cues.append({'key':key,'start_seconds':round(cursor,4),'duration_seconds':len(x)/SR});cursor+=len(x)/SR
    aud=ROOT/'audio/audition'/'Motion-Buddy-playful-audio-audition.wav'
    write16(aud,np.concatenate(parts))
    return records,{'path':str(aud.relative_to(ROOT)),'sha256':sha(aud),'cues':cues,'duration_seconds':cursor}

FEATURES='<rect x="94" y="140" width="62" height="44" rx="23" fill="white"/><rect x="204" y="140" width="62" height="44" rx="23" fill="white"/><path d="M171 216 Q180 222 189 216" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>'
OVERLAYS={
'ninja': '<path d="M69 189 Q55 80 180 70 Q303 80 291 189 L274 248 Q180 271 86 248Z" fill="#23262e"/><path d="M79 132 Q180 100 281 132 L275 187 Q180 203 85 187Z" fill="#050608"/><path d="M66 113 Q180 88 294 113 L291 137 Q180 111 69 137Z" fill="#b65b61"/><path d="M288 116 Q330 96 337 127 L300 133 L330 153 L295 145Z" fill="#b65b61"/><path d="M92 203 Q180 186 268 203 L258 246 Q180 261 102 246Z" fill="#303440"/>',
'cord_hero': '<path d="M80 130 Q180 90 280 130 L265 198 Q180 183 95 198Z" fill="#62458b"/><path d="M145 122 Q180 103 212 123 L203 133 Q178 118 155 135Z" fill="#eed28d"/><path d="M266 171 L294 166 L286 191 L268 190Z" fill="#9b78c5"/>',
'racer': '<rect x="48" y="64" width="264" height="225" rx="105" fill="#e7e3d6"/><path d="M164 67 L191 65 L207 115 L177 113Z" fill="#d77f43"/><rect x="65" y="121" width="230" height="126" rx="55" fill="#080a0c"/><path d="M76 130 Q180 105 284 130" fill="none" stroke="#aeb9ba" stroke-width="7" stroke-linecap="round"/><path d="M114 266 L247 266" stroke="#a6aaa8" stroke-width="5" stroke-linecap="round"/>',
'sheet_ghost': '<path d="M65 282 L68 155 Q72 60 180 57 Q288 60 292 155 L295 282 Q276 263 259 282 Q239 263 219 282 Q199 264 180 282 Q160 264 140 282 Q120 263 101 282 Q83 264 65 282Z" fill="#edece5"/><rect x="79" y="122" width="202" height="117" rx="57" fill="#08090a"/><path d="M92 252 Q99 257 103 266 M267 252 Q260 257 256 266" fill="none" stroke="#c3c5c2" stroke-width="3" stroke-linecap="round"/>'}

def visuals():
    from PIL import Image,ImageDraw,ImageFont
    import cairosvg,io
    (ROOT/'costumes/svg').mkdir(parents=True,exist_ok=True)
    (ROOT/'costumes/preview').mkdir(parents=True,exist_ok=True)
    font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    titlefont=ImageFont.truetype(font,25);labelfont=ImageFont.truetype(font,19);small=ImageFont.truetype(font,15)
    board=Image.new('RGB',(1040,620),'#161a22');d=ImageDraw.Draw(board)
    d.text((30,20),'Buddy dress-up — original costume concepts',font=titlefont,fill='#f2f1eb')
    d.text((30,59),'Same eyes underneath. Temporary costumes; always return to plain Buddy.',font=small,fill='#aeb6c5')
    descriptions={'ninja':('Ninja peek','Fade · swish · peek · return'),'cord_hero':('Upside-down hero','Cord drop · flourish · flip back'),'racer':('Little racer','Helmet · soft wind · wobble'),'sheet_ghost':('Sheet ghost','Vanish · float · friendly return')}
    records=[]
    for i,(key,overlay) in enumerate(OVERLAYS.items()):
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360">{overlay}</svg>'
        p=ROOT/'costumes/svg'/f'{key}_overlay.svg';p.write_text(svg)
        # Source SVG contains costume only. Preview registers unchanged features on top.
        composed=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360"><rect width="360" height="360" fill="black"/>{overlay}{FEATURES}</svg>'
        im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=composed.encode()))).convert('RGB')
        # Hero's actual storyboard pose is upside down; thread remains world-vertical.
        if key=='cord_hero':
            composed=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360"><rect width="360" height="360" fill="black"/><path d="M247 0V158 Q247 174 258 183" stroke="#b7a4d8" stroke-width="3" fill="none"/><g transform="rotate(180 180 180)">{OVERLAYS[key].replace("<path d=\"M180 0V94\" stroke=\"#b7a4d8\" stroke-width=\"3\"/>","")}{FEATURES}</g></svg>'
            im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=composed.encode()))).convert('RGB')
        q=ROOT/'costumes/preview'/f'{key}_registered.png';im.save(q)
        x=28+i*253;y=110
        board.paste(im.resize((231,231)),(x,y))
        d.text((x,y+248),descriptions[key][0],font=labelfont,fill='#f4f1ea')
        # Two lines leave the direction legible at chat size.
        chunks=descriptions[key][1].split(' · ')
        d.text((x,y+281),' · '.join(chunks[:2]),font=small,fill='#b7c0d0')
        d.text((x,y+304),' · '.join(chunks[2:]),font=small,fill='#b7c0d0')
        records.append({'key':key,'svg':str(p.relative_to(ROOT)),'sha256':sha(p),'preview':str(q.relative_to(ROOT)),'layer':'behind existing eye/mouth features; contains no replacement eyes','source_viewbox':[0,0,360,360]})
    d.text((30,494),'These are static costume concepts, not implemented animations.',font=labelfont,fill='#e3d1a0')
    d.text((30,532),'Ninja and ghost never flash; race wind stays soft. Hero/music are original—not Spider-Man.',font=small,fill='#b7c0d0')
    d.text((30,562),'Further ideas: moon-bounce astronaut · bubble diver · a magician hat with a surprise sneeze.',font=small,fill='#b7c0d0')
    board.save(ROOT/'costumes'/'Motion-Buddy-costume-direction-board.png')
    return records

def main():
    sounds,audition=audio();costumes=visuals()
    manifest={'status':'ORIGINAL_ASSET_HANDOFF_NOT_INTEGRATED','source':'src/create_playful_assets.py','source_sha256':sha(Path(__file__)),'provenance':'Original procedural sound synthesis and original vector shapes for Michael Dicker. No downloaded art/audio, existing character costume or reference melody. No public-release/licence grant implied.','sounds':sounds,'audition':audition,'costumes':costumes,'registration':{'viewbox':[0,0,360,360],'reference_eye_rects':[[94,140,62,44],[204,140,62,44]],'reference_mouth':'M171 216 Q180 222 189 216','instruction':'Register overlays to existing eyes/mouth; do not replace existing app face with these demo features. Hero thread should be world-space and separate from the local costume overlay.'},'qa':{'performed':['finite sample, DC, peak and PCM roundtrip assertions','analytic loop period and seam derivative assertions','SVG rasterization to registered concept images'],'not_performed':['human listening','phone/device test','app integration','runtime costume/gesture animation verification','deployment','full legal/trademark clearance']}}
    scene_spec_path=ROOT/'scene-policy-and-timings.json'
    if scene_spec_path.exists():
        manifest['scene_spec']=json.loads(scene_spec_path.read_text())
        manifest['scene_spec_source']='scene-policy-and-timings.json'
    (ROOT/'integration-manifest.json').write_text(json.dumps(manifest,indent=2,allow_nan=False)+'\n')
    print(json.dumps({'root':str(ROOT),'audio_files':len(sounds),'audition':audition,'loop_metrics':sounds[0]['app']['metrics'],'loop_qa':sounds[0]['loop_qa'],'costume_board':str(ROOT/'costumes'/'Motion-Buddy-costume-direction-board.png')},indent=2))
if __name__=='__main__':main()
