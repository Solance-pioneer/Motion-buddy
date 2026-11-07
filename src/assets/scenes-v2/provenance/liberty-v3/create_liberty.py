#!/usr/bin/env python3
"""One original visual-only Statue of Liberty refinement guided by owner's Unicode emoji."""
from pathlib import Path
import json,hashlib,zipfile,io,xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageFont
import cairosvg
R=Path(__file__).resolve().parents[1]
for d in ['svg/props','board']:(R/d).mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
body='''<g stroke-linejoin="round" stroke-linecap="round">
<!-- original daylight architectural cartoon: stone plinth -->
<path d="M283 307H335V320L342 330H276L283 320Z" fill="#626e65" stroke="#8d9b89" stroke-width="1.7"/>
<path d="M287 300H331V308H287Z" fill="#93a18d" stroke="#637d6e" stroke-width="1.6"/>
<!-- robe and raised right arm, left in the front view -->
<path d="M303 169L296 157L288 130L280 107L273 111L280 140L287 170L298 190L293 234L286 299H333L325 240L324 181L317 169Z" fill="#75a693" stroke="#417764" stroke-width="1.8"/>
<path d="M299 181L308 197L299 286 M309 199L309 293 M317 188L321 222L326 290 M294 252L290 292" fill="none" stroke="#b0ccba" stroke-width="2.3"/>
<path d="M300 184L294 211L289 299H300L307 221Z" fill="#568d79"/>
<!-- torch bowl, pedestal and original warm flame -->
<path d="M272 100H286L284 111H276Z" fill="#a6b48f" stroke="#486e5b" stroke-width="1.5"/>
<path d="M274 96H284V101H274Z" fill="#d7bb78"/>
<path d="M279 96C266 88 274 76 278 67C278 76 291 79 286 88Q285 94 279 96Z" fill="#e6bb66" stroke="#bd9451" stroke-width="1.2"/>
<path d="M279 91Q274 86 279 79Q279 84 282 86Z" fill="#fae5a7"/>
<!-- neck, face, seven-ray crown and head band -->
<path d="M305 160V174Q310 178 316 172L315 160Z" fill="#8ab6a2" stroke="#417764" stroke-width="1.4"/>
<path d="M299 139Q298 129 310 128Q323 128 322 141L320 155Q317 165 310 165Q302 161 300 153Z" fill="#9ec5af" stroke="#477e68" stroke-width="1.4"/>
<path d="M298 138L289 127L300 132L296 120L305 129L304 115L310 127L312 112L315 128L323 117L320 132L331 126L324 138L334 136L322 143Z" fill="#7fac96" stroke="#447a66" stroke-width="1.3"/>
<path d="M300 140Q310 135 322 140L321 145Q310 140 300 145Z" fill="#b2cebb" stroke="#537f69" stroke-width="1"/>
<path d="M304 149L307 148M314 148L317 149M310 149L308 155L312 155M307 160H314" fill="none" stroke="#527f6a" stroke-width="1.1"/>
<!-- tablet and bent arm -->
<path d="M320 181L334 175L343 217L326 223Z" fill="#5e927f" stroke="#3f725f" stroke-width="1.7"/>
<path d="M326 186L332 183M328 192L334 189M330 198L336 195" stroke="#95b9a3" stroke-width="1.2"/>
<path d="M319 215Q326 220 330 216L334 215L336 221Q327 228 321 224Z" fill="#9ec5af" stroke="#477e68" stroke-width="1.2"/>
<path d="M290 301H331" stroke="#c4d3bd" stroke-width="2"/>
</g>'''
svg='<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360" overflow="visible">'+body+'</svg>'
prop=R/'svg/props/usa_statue_of_liberty.svg';prop.write_text(svg);ET.parse(prop)
im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode())));bounds=im.getbbox();assert bounds[0]>0 and bounds[1]>0 and bounds[2]<360 and bounds[3]<360
old=Path('/workspace/motion-buddy-country-scenes-v2-landmarks-meta-r1/svg/props/usa_statue_of_liberty.svg')
board=Image.new('RGB',(780,430),'#10141c');d=ImageDraw.Draw(board);f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for i,(label,s) in enumerate([('Previous original',old.read_text()),('Refined original - static artwork',svg)]):
    raw=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode()))).convert('RGBA');cell=Image.new('RGBA',(360,360),'black');cell.alpha_composite(raw,(-120,0));board.paste(cell.convert('RGB'),(15+i*390,40));d.text((20+i*390,12),label,font=f,fill='white')
d.text((20,407),'Same scale. Original drawing; no emoji image or font bundled.',font=f,fill='#c5cbd5');board.save(R/'board/Liberty-original-before-after.png')
manifest={'pack':'motion-buddy-liberty-v3','scope':'ONLY replace USA world-space landmark prop; no Buddy, eagle, flag, timing, sound or scene logic change.','prop':{'path':str(prop.relative_to(R)),'viewbox':[0,0,360,360],'alpha_bounds':bounds,'placement':'Retain existing world-space360 placement, below all Buddy/eagle/flag/costume layers. Do not parent landmark to moving Buddy.','opacity':'Retain existing fade/opacity/cleanup policy, no new animation or timer.'},'provenance':'Original SVG geometry. Owner sent Unicode U+1F5FD as visual guidance. Refined readable crown/head/face/raised torch/robe/tablet; not traced or copied from any vendor emoji asset. No external downloads, image, font or emoji outlines embedded.','source':'src/create_liberty.py','qa':{'xml_parse_raster_bounds':'pass','audio_other_assets':'untouched','not_performed':['app runtime/integration','phone testing','deployment']}}
(R/'README.md').write_text('One visual-only original Statue of Liberty refinement using owner emoji as general visual guidance, not a copied vendor glyph. Replace only svg/props/usa_statue_of_liberty.svg in current app workstream. Retain world placement, fades and cleanup. No runtime/phone/deployment claim.\n')
manifest['files']={str(p.relative_to(R)):sha(p) for p in sorted(R.rglob('*')) if p.is_file() and p.name!='integration-manifest.json'};(R/'integration-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
zpath=R.with_suffix('.zip')
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(R.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(R.parent))
with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
assert all(sha(R/k)==v for k,v in manifest['files'].items())
print(json.dumps({'zip':str(zpath),'bytes':zpath.stat().st_size,'sha256':sha(zpath),'svg_sha256':sha(prop),'alpha_bounds':bounds,'qa':'PASS_OBJECTIVE_ONLY'},indent=2))
