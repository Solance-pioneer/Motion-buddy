#!/usr/bin/env python3
"""Original Motion Buddy beeps: mathematical oscillators only, no voices/samples.
Run: python3 src/synthesize_voice_free.py
Optional: --bounce-centers 0.16,0.48,0.80 (seconds from reaction/audio start).
Sources/masters are separate from app copies. Never edits an app or old assets.
"""
from pathlib import Path
import argparse, hashlib, json, math, struct, wave
import numpy as np
SR=48000
ROOT=Path(__file__).resolve().parents[1]
TAU=2*math.pi

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def db(x): return 20*math.log10(x) if x>1e-12 else None

def tone(t,start,duration,f0,f1,gain=1.0,warble=0.0):
    u=t-start
    m=(u>=0)&(u<duration)
    v=u[m]
    # Raised-cosine envelope: soft attack/release; no percussion or vocal formants.
    env=np.sin(math.pi*v/duration)**2
    phase=TAU*(f0*v+0.5*(f1-f0)*v*v/duration)
    phase += warble*np.sin(TAU*9*v)*np.sin(math.pi*v/duration)
    x=np.zeros_like(t)
    x[m]=gain*env*(np.sin(phase)+0.055*np.sin(2*phase))
    return x

def finish(x):
    # Preserve silent gaps exactly. DC is tiny for these multi-cycle envelopes.
    m=np.abs(x)>1e-10
    if m.any(): x[m]-=float(x[m].mean())
    active=np.abs(x)>1e-4
    rms=float(np.sqrt(np.mean(x[active]**2)))
    scale=min(10**(-17.5/20)/rms,10**(-8.0/20)/float(np.max(np.abs(x))))
    x=x*scale
    # Absolutely silent endpoints and gentle file-edge fades.
    n=int(.004*SR)
    x[:n]*=np.linspace(0,1,n)
    x[-n:]*=np.linspace(1,0,n)
    x[0]=x[-1]=0
    return x

def wav32(p,x):
    b=np.asarray(x,dtype='<f4').tobytes()
    p.write_bytes(b'RIFF'+struct.pack('<I',36+len(b))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,3,1,SR,SR*4,4,32)+b'data'+struct.pack('<I',len(b))+b)

def wav16(p,x):
    a=np.round(np.clip(x,-1,1)*32767).astype('<i2')
    a[0]=a[-1]=0
    with wave.open(str(p),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(a.tobytes())

def metrics(x):
    active=np.abs(x)>1e-4
    return {'duration_seconds':len(x)/SR,'sample_peak_dbfs':db(float(np.max(np.abs(x)))),'active_rms_dbfs':db(float(np.sqrt(np.mean(x[active]**2)))),'rms_dbfs':db(float(np.sqrt(np.mean(x*x)))),'dc_offset':float(x.mean()),'start_sample':float(x[0]),'end_sample':float(x[-1])}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--bounce-centers',default='0.16,0.48,0.80')
    args=ap.parse_args()
    centers=[float(a) for a in args.bounce_centers.split(',')]
    assert len(centers)==3 and centers[0]>=.13 and all(b-a>=.24 for a,b in zip(centers,centers[1:]))
    for d in ['masters','app','audition']: (ROOT/d).mkdir(exist_ok=True)
    dur=round(centers[-1]+.25,3)
    t=np.arange(round(dur*SR))/SR
    x=np.zeros_like(t)
    events=[]
    for i,c in enumerate(centers):
        # Three rounded upward squeaks; slightly brighter each bounce, no words.
        x+=tone(t,c-.12,.24,440+70*i,640+90*i,gain=[.90,.97,1.0][i],warble=.10)
        events.append({'onset_seconds':round(c-.12,4),'energy_peak_seconds':c,'duration_seconds':.24})
    bounce=finish(x)
    t=np.arange(round(.92*SR))/SR
    proud=(tone(t,.025,.16,470,530,.76)+tone(t,.20,.16,590,660,.82)+tone(t,.375,.17,730,820,.88)+tone(t,.565,.29,860,1020,.95,warble=.08))
    proud=finish(proud)
    sounds=[('celebration_three_squeaks',bounce,{'pairs_with':'existing three-bounce clap face; keep animation','events':events,'timing_status':'provisional until coordinator confirms existing bounce times; regenerate with --bounce-centers if needed','trigger':'start once with celebration reaction; do not layer legacy voice or another beep'}),('proud_rise_beeps',proud,{'pairs_with':'existing wide-eyed/proud level-up face; keep animation','note_onsets_seconds':[.025,.20,.375,.565],'energy_peaks_seconds':[.105,.28,.46,.71],'trigger':'start once with proud reaction; final squeak resolves at proud held pose','timing_status':'align to existing reaction in integration; no current live-animation timing verification claimed'})]
    records=[]
    for key,x,mapping in sounds:
        assert np.isfinite(x).all()
        m=metrics(x)
        assert m['sample_peak_dbfs']<=-7.99 and abs(m['dc_offset'])<1e-4
        assert x[0]==0 and x[-1]==0
        master=ROOT/'masters'/f'{key}_master_f32_48k.wav'
        app=ROOT/'app'/f'{key}_app_pcm16_48k.wav'
        wav32(master,x);wav16(app,x)
        with wave.open(str(app),'rb') as w:
            assert (w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes())==(1,2,SR,len(x))
            q=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32767
        assert np.max(np.abs(q-x))<=1/32767 and np.max(np.abs(q))<.4
        records.append({'key':key,'mapping':mapping,'master':{'path':str(master.relative_to(ROOT)),'format':'IEEE float32 mono 48 kHz','sha256':sha(master),'metrics':m},'app':{'path':str(app.relative_to(ROOT)),'format':'PCM16 mono 48 kHz','sha256':sha(app),'metrics':metrics(q)}})
    lead=np.zeros(round(.20*SR));gap=np.zeros(round(.8*SR));tail=np.zeros(round(.25*SR))
    audition=np.concatenate([lead,bounce,gap,proud,tail])
    aud=ROOT/'audition'/'Motion-Buddy-voice-free-replacements.wav'
    wav16(aud,audition)
    manifest={'status':'CREATED_AND_NUMERICALLY_CHECKED_NOT_INTEGRATED','batch':'motion-buddy-voice-free-v1','provenance':'Original procedural oscillator/envelope synthesis for Michael Dicker. No voice, sampled inputs, downloads or external assets. No Japanese sound-alike imitation. numpy used as calculation tool, not audio content.','user_direction':'2026-11-06: remove all Japanese-source audio; keep beeps and squeaks matching animation excitement.','synthesis_source':'src/synthesize_voice_free.py','synthesis_source_sha256':sha(Path(__file__)),'sounds':records,'audition':{'path':str(aud.relative_to(ROOT)),'sha256':sha(aud),'duration_seconds':len(audition)/SR,'order':[{'key':sounds[0][0],'start_seconds':.2},{'key':sounds[1][0],'start_seconds':round(.2+len(bounce)/SR+.8,4)}]},'integration_requirements':['Remove every Japanese/Conte de Fees runtime asset, preload, playback route and menu entry; retain existing matching face animations.','Replace two voice cue mappings with these original cues, using app copies only.','Keep original primary chirp, yawn, wink and other approved beeps unchanged.','No overlapping reaction audio; stop on interruption or mute, obey first-gesture audio and remembered mute.','Keep reduced-motion behavior; do not add repeat frequency or louder gain.','Preserve source masters/provenance outside shipping runtime; do not copy deprecated voice WAVs into the new runtime bundle.'],'qa':{'performed':['finite sample check','peak ceiling -8 dBFS','DC absolute mean <0.0001','silent endpoints','PCM format/duration/quantization roundtrip','SHA256 masters/app/source/audition'],'not_performed':['human listening or perceived-loudness validation','phone audition','live animation synchronization','app integration','deployment']},'loudness_note':'Active RMS target -17.5 dBFS and peak ceiling -8 dBFS for a restrained starting balance. Numeric matching is not proof of equal perceived loudness; check against existing beeps on phone.'}
    (ROOT/'integration-manifest.json').write_text(json.dumps(manifest,indent=2,allow_nan=False)+'\n')
    (ROOT/'audition'/'cue-order.txt').write_text(f'Voice-free replacements. No speech.\n1. Three rounded celebration squeaks: .20s\n2. Rising proud/level-up beeps: {manifest["audition"]["order"][1]["start_seconds"]:.2f}s\n')
    print(json.dumps({'audition':str(aud),'sounds':[{'key':r['key'],**r['app']['metrics']} for r in records]},indent=2))
if __name__=='__main__': main()
