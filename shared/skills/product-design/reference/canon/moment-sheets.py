#!/usr/bin/env python3
"""moment-sheets.py — contact sheets of every candidate moment.

Three frames per moment (start, middle, end) with its measured numbers printed
beside them. This is what makes momentType classifiable without scrubbing 15
minutes of video: the shape of a moment is usually obvious from its first,
middle and last frame together with how long it took and how much moved.

    python3 moment-sheets.py shots/<clip>.seg.json
"""
import json, subprocess, sys, os
from PIL import Image, ImageDraw

THUMB_W = 118
PER_SHEET = 10
PAD = 8
LABEL_W = 200

def frame(video, t, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', video,
                    '-frames:v', '1', '-vf', f'scale={THUMB_W}:-1', '-y', out],
                   check=True)

def build(segpath):
    seg = json.load(open(segpath))
    video = seg['video']
    if not os.path.isabs(video):
        video = os.path.join(os.path.dirname(os.path.abspath(segpath)), '..', os.path.basename(video))
        video = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(segpath)), os.path.basename(seg['video'])))
    moments = [m for m in seg['moments'] if not m['suspect']]
    stem = os.path.splitext(os.path.splitext(os.path.basename(segpath))[0])[0]
    tmp = f'/tmp/msheet_{stem}'
    os.makedirs(tmp, exist_ok=True)
    sheets = []

    for chunk_i in range(0, len(moments), PER_SHEET):
        chunk = moments[chunk_i:chunk_i + PER_SHEET]
        rows = []
        for m in chunk:
            ts = [m['startMs'] / 1000,
                  (m['startMs'] + m['durationMs'] / 2) / 1000,
                  max(0, (m['endMs'] - 40) / 1000)]
            ims = []
            for k, t in enumerate(ts):
                pth = f'{tmp}/{m["index"]}_{k}.png'
                frame(video, t, pth)
                ims.append(Image.open(pth))
            rows.append((m, ims))

        rh = max(im.height for _, ims in rows for im in ims)
        W = LABEL_W + 3 * (THUMB_W + PAD) + PAD
        H = len(rows) * (rh + PAD) + PAD
        sheet = Image.new('RGB', (W, H), (16, 16, 20))
        d = ImageDraw.Draw(sheet)
        y = PAD
        for m, ims in rows:
            d.text((PAD, y + 6), f"#{m['index']}", fill=(255, 255, 255))
            lines = [
                f"dur   {m['durationMs']} ms",
                f"cover {m['coverage']}",
                f"parts {m['participants']}",
                f"groups {m['choreographyDepth']}",
                f"travel {m['travelFraction']}",
            ]
            for li, ln in enumerate(lines):
                d.text((PAD + 34, y + 6 + li * 13), ln, fill=(180, 180, 195))
            d.text((PAD + 34, y + 6 + len(lines) * 13 + 6), "start   mid    end", fill=(120, 120, 135))
            x = LABEL_W
            for im in ims:
                sheet.paste(im, (x, y))
                x += THUMB_W + PAD
            d.line([(0, y + rh + PAD // 2), (W, y + rh + PAD // 2)], fill=(40, 40, 48))
            y += rh + PAD
        out = f'sheets/{stem}_{chunk_i // PER_SHEET + 1}.png'
        os.makedirs('sheets', exist_ok=True)
        sheet.save(out)
        sheets.append(out)
    return sheets

if __name__ == '__main__':
    for arg in sys.argv[1:]:
        for s in build(arg):
            print(s)
