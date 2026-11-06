"""Original Motion Buddy procedural SFX, authored for this project.
Python standard library only. No sampled audio or third-party artwork.
Run with python3; reproduces the unapproved sound-design audition.
"""
from pathlib import Path
import math, random, wave, struct, json, hashlib, zipfile
SR=22050
OUT=Path(__file__).resolve().parent
TAU=2*math.pi

def chirplet(t,start,duration,f0,f1):
    u=t-start
    if not 0 <= u < duration: return 0.0
    phase=TAU*(f0*u + .5*(f1-f0)*u*u/duration)
    return math.sin(math.pi*u/duration)**2*(math.sin(phase)+.12*math.sin(2*phase))

def make(kind,duration):
    rng=random.Random(761106)
    n=round(duration*SR)
    phase=0.; noise=0.; values=[]
    for i in range(n):
        t=i/SR
        if kind=='scan':
            v=sum(chirplet(t,.025+.145*k,.09,760+160*k,820+160*k) for k in range(3))
        elif kind=='giggle':
            v=sum(chirplet(t,.025+.185*k,.15,390+45*k,640+40*k) + .28*chirplet(t,.025+.185*k,.15,195+22.5*k,320+20*k) for k in range(3))
        elif kind=='surprise':
            f=260+780*math.exp(-10*t)+95*math.sin(TAU*7*t)*math.exp(-5*t)
            phase+=TAU*f/SR
            v=math.exp(-4.8*t)*(math.sin(phase)+.22*math.sin(2*phase))
        elif kind=='yawn':
            f=155+85*math.sin(math.pi*t/duration)
            phase+=TAU*f/SR
            noise=.94*noise+.06*rng.uniform(-1,1)
            v=math.sin(math.pi*t/duration)**2*(.75*math.sin(phase)+.12*math.sin(2*phase)+.3*noise)
        elif kind=='wink':
            v=chirplet(t,.015,.12,1250,1650)+.7*chirplet(t,.135,.12,1800,2150)
        elif kind=='dizzy':
            wobble=TAU*(3.8*t-1.15*t*t)
            f=390+135*math.sin(wobble)
            phase+=TAU*f/SR
            v=math.sin(math.pi*t/duration)**1.5*(math.sin(phase)+.14*math.sin(phase*2))
        else: raise ValueError(kind)
        fade_in=min(1.,t/.005)
        fade_out=min(1.,max(0.,(n-1-i)/SR)/.025)
        values.append(v*fade_in*fade_out)
    peak=max(abs(v) for v in values)
    assert peak>0
    gain=.42/peak
    samples=[round(v*gain*32767) for v in values]
    samples[0]=samples[-1]=0
    return samples

def wav(path,samples):
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(struct.pack('<'+'h'*len(samples),*samples))

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    specs=[('38','scan',.50,'Three gentle ascending scan ticks'),('04','giggle',.68,'Three soft electronic giggle pulses'),('40','surprise',.50,'Springy surprised pitch drop'),('42','yawn',.90,'Soft low synthetic yawn swell'),('48','wink',.34,'Short two-note wink sparkle'),('15','dizzy',1.20,'Slowing wobbly electronic tone')]
    records=[]; audition=[0]*(12*SR)
    for index,(candidate,kind,duration,description) in enumerate(specs):
        samples=make(kind,duration)
        path=OUT/f'{index+1:02d}_{candidate}_{kind}_ORIGINAL_DRAFT.wav'
        wav(path,samples)
        offset=index*2*SR
        audition[offset:offset+len(samples)]=samples
        records.append({'audition_number':index+1,'candidate_number':candidate,'name':kind,'description':description,'start_seconds':index*2,'duration_seconds':len(samples)/SR,'sample_rate_hz':SR,'peak_dbfs':20*math.log10(max(abs(v) for v in samples)/32767),'status':'unreviewed','file':path.name,'sha256':sha(path)})
    aud=OUT/'Motion-Buddy-six-original-sound-drafts.wav'
    wav(aud,audition)
    manifest={'status':'DRAFT_NOT_APPROVED_NOT_INTEGRATED','provenance':'Original procedural synthesis; generator in this folder. Python standard library, no sampled audio inputs.','existing_approved_chirp':'Untouched; not included or replaced.','audition_file':aud.name,'audition_sha256':sha(aud),'duration_seconds':12,'slots_seconds':2,'sounds':records,'checks':'PCM structure, duration, endpoints, non-silence and peak level checked; no human listening test claimed.'}
    (OUT/'sound-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (OUT/'README.txt').write_text('Original Motion Buddy sound-design drafts, not approved or integrated.\nListen to the 12-second audition: Scan at 0s, Giggle 2s, Surprise 4s, Yawn 6s, Wink 8s, Dizzy 10s.\nAll individual WAVs are original procedural synthesis; generator is included. No existing chirp or external sampled audio was used.\nProposed character pairings only; approval remains with Michael. The approved chirp is unchanged.\n')
    archive=OUT/'motion-buddy-original-sound-source-and-wavs.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for path in sorted(OUT.iterdir()):
            if path.is_file() and path != archive: z.write(path,path.name)
    for rec in records:
        path=OUT/rec['file']
        with wave.open(str(path),'rb') as w:
            assert w.getframerate()==SR and w.getnchannels()==1 and w.getsampwidth()==2
            raw=w.readframes(w.getnframes())
        vals=struct.unpack('<'+'h'*(len(raw)//2),raw)
        assert vals[0]==0 and vals[-1]==0 and max(abs(v) for v in vals)>0
        assert max(abs(v) for v in vals)<32767
        assert rec['sha256']==sha(path)
    with zipfile.ZipFile(archive) as z: assert z.testzip() is None
    print(json.dumps({'audition':str(aud),'source_archive':str(archive),'manifest':str(OUT/'sound-manifest.json'),'audition_bytes':aud.stat().st_size,'duration_seconds':12,'sounds':[{k:r[k] for k in ['audition_number','candidate_number','name','start_seconds','duration_seconds','peak_dbfs']} for r in records]},indent=2))
if __name__=='__main__': main()
