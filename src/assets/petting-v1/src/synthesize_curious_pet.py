#!/usr/bin/env python3
"""Original soft electronic curious glide. No voice, samples or downloads.
Run with Python 3 + numpy; writes assets only, never app/repository files.
"""
from pathlib import Path
import hashlib, json, math, struct, wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SR=48000
DURATION=1.8

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def db(v): return 20*math.log10(v) if v>1e-12 else None

def main():
    for d in ['masters','app','audition']: (ROOT/d).mkdir(exist_ok=True)
    t=np.arange(round(DURATION*SR))/SR
    # Broad smooth up-and-down phrase, not repeated alarm pulses.
    knots=np.array([0.0,.30,.82,1.28,1.8])
    pitches=np.array([205.0,235.0,405.0,305.0,220.0])
    freq=np.empty_like(t)
    for i in range(len(knots)-1):
        mask=(t>=knots[i])&(t<knots[i+1])
        u=(t[mask]-knots[i])/(knots[i+1]-knots[i])
        smooth=u*u*(3-2*u)
        freq[mask]=pitches[i]+(pitches[i+1]-pitches[i])*smooth
    phase=2*math.pi*np.cumsum(freq)/SR
    # Rounded oo-like synthesized timbre, not a human vowel/formant recording.
    tone=np.sin(phase)+.14*np.sin(2*phase)+.035*np.sin(3*phase)
    env=np.sin(math.pi*t/DURATION)**1.45
    x=tone*env
    x-=float(x.mean())*env
    # Quieter for a sustained cue than the short -17.5 dBFS active RMS chirps.
    mask=np.abs(x)>1e-4
    ar=float(np.sqrt(np.mean(x[mask]**2)))
    x*=min(10**(-21.0/20)/ar,10**(-13/20)/float(np.max(np.abs(x))))
    x[0]=x[-1]=0
    assert np.isfinite(x).all() and abs(x.mean())<1e-4
    assert float(np.max(np.abs(x)))<=10**(-13/20)
    master=ROOT/'masters'/'curious_pet_glide_master_f32_48k.wav'
    app=ROOT/'app'/'curious_pet_glide_app_pcm16_48k.wav'
    b=np.asarray(x,dtype='<f4').tobytes()
    master.write_bytes(b'RIFF'+struct.pack('<I',36+len(b))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,3,1,SR,SR*4,4,32)+b'data'+struct.pack('<I',len(b))+b)
    q=np.round(x*32767).astype('<i2');q[0]=q[-1]=0
    with wave.open(str(app),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(q.tobytes())
    with wave.open(str(app),'rb') as w:
        assert (w.getnchannels(),w.getframerate(),w.getsampwidth(),w.getnframes())==(1,SR,2,len(x))
        r=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32767
    assert np.max(np.abs(r-x))<=1/32767
    assert r[0]==0 and r[-1]==0 and np.max(np.abs(r))<1
    active=np.abs(r)>1e-4
    spec=np.abs(np.fft.rfft(r))**2
    hz=np.fft.rfftfreq(len(r),1/SR)
    high_fraction=float(spec[hz>3000].sum()/spec.sum())
    assert high_fraction<1e-6
    aud=ROOT/'audition'/'Motion-Buddy-curious-petting-glide.wav'
    aud.write_bytes(app.read_bytes())
    metrics={'duration_seconds':len(r)/SR,'sample_peak_dbfs':db(float(np.max(np.abs(r)))),'active_rms_dbfs':db(float(np.sqrt(np.mean(r[active]**2)))),'rms_dbfs':db(float(np.sqrt(np.mean(r*r)))),'dc_offset':float(r.mean()),'start_sample':float(r[0]),'end_sample':float(r[-1]),'energy_fraction_above_3khz':high_fraction}
    manifest={'status':'CREATED_NUMERICALLY_CHECKED_NOT_INTEGRATED','key':'curious_pet_glide','provenance':'Original mathematical sine oscillator/envelope synthesis for Michael Dicker. No voices, human imitation, sampled inputs, downloads, external audio or copied melodies. numpy is a calculation tool only.','user_direction':'2026-11-06: replace sharp repeated finger-interaction beep with long curious/enjoyable ooOOooo-like electronic sound.','source':'src/synthesize_curious_pet.py','source_sha256':sha(Path(__file__)),'master':{'path':str(master.relative_to(ROOT)),'format':'IEEE float32 mono 48 kHz','sha256':sha(master)},'app':{'path':str(app.relative_to(ROOT)),'format':'PCM16 mono 48 kHz','sha256':sha(app),'metrics':metrics},'audition':{'path':str(aud.relative_to(ROOT)),'sha256':sha(aud)},'pitch_curve_hz':{'times_seconds':knots.tolist(),'pitches_hz':pitches.tolist(),'interpolation':'smoothstep'},'integration':{'trigger':'once when a drag/petting gesture is recognized, not pointerdown or each move event','repeat_policy':'no automatic loop; at most once per contact for initial implementation','do_not_play':['menu/mute/control gestures','tap before drag is recognized','muted or audio not unlocked','concurrent reaction sound'],'interruption':'fade current cue over 100-150 ms on release/cancel, mute, visibility loss or higher-priority face reaction; cancel pending cues','runtime_gain':'start at unity on app copy; do not normalize sustained cue up to sharp-beep peak','preserve':'remembered mute, initial-gesture audio unlocking, original short-tap chirp and unrelated reaction sounds'},'qa':{'performed':['finite sample check','sample peak <= -13 dBFS','DC absolute mean <0.0001','zero endpoints','PCM format/duration/quantization roundtrip','energy above 3 kHz < 0.000001','SHA256 records'],'not_performed':['human listening/perceived loudness validation','phone audition','app integration or browser test','deployment']},'loudness_note':'Target active RMS -21 dBFS, quieter than short reaction chirps. Numeric balance is a starting point, not phone/perceived-loudness proof.'}
    (ROOT/'integration-manifest.json').write_text(json.dumps(manifest,indent=2,allow_nan=False)+'\n')
    print(json.dumps({'master':str(master),'app':str(app),'audition':str(aud),'metrics':metrics},indent=2))
if __name__=='__main__':main()
