#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LOGO_PATH = os.path.join(ROOT, 'assets', 'logo', 'Go-photo-studio trans 1024.png')
OUT_DIR = os.path.join(ROOT, 'assets', 'marketing')
os.makedirs(OUT_DIR, exist_ok=True)


def font(size, bold=False):
    candidates = [
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Supplemental/Helvetica.ttc',
        '/Library/Fonts/Arial.ttf',
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def gradient_bg(w, h, c1, c2):
    img = Image.new('RGB', (w, h), c1)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_title(draw, x, y, text):
    draw.text((x, y), text, fill=(13, 24, 45), font=font(58, bold=True))


def draw_sub(draw, x, y, text):
    draw.text((x, y), text, fill=(53, 72, 102), font=font(30))


def place_logo(base, size, x, y):
    logo = Image.open(LOGO_PATH).convert('RGBA').resize((size, size), Image.LANCZOS)
    base.paste(logo, (x, y), logo)


def save(img, name):
    out = os.path.join(OUT_DIR, name)
    img.save(out, 'PNG', optimize=True)
    print('saved', out)


def make_og():
    w, h = 1200, 630
    img = gradient_bg(w, h, (238, 246, 255), (244, 238, 255))
    d = ImageDraw.Draw(img)

    rounded_rect(d, (56, 48, w - 56, h - 48), 36, fill=(255, 255, 255), outline=(220, 230, 246), width=3)
    place_logo(img, 180, 95, 90)

    draw_title(d, 300, 100, 'GO Photo Studio Skill')
    draw_sub(d, 302, 185, 'Identity-preserving AI headshots')
    draw_sub(d, 302, 228, 'A->E pipeline, quality gate, auto retry')

    chips = ['Codex/Claude/IDE', 'Open Source', 'Quality Dashboard']
    x = 302
    for chip in chips:
        w_chip = d.textlength(chip, font=font(24)) + 34
        rounded_rect(d, (x, 292, x + w_chip, 334), 20, fill=(241, 246, 255), outline=(207, 222, 245), width=2)
        d.text((x + 17, 301), chip, fill=(41, 62, 94), font=font(22))
        x += w_chip + 12

    d.text((94, 520), 'github.com/ZoeZYZY/go-photo-studio-skill', fill=(70, 90, 125), font=font(22))
    save(img, 'open-graph-1200x630.png')


def make_gallery_1():
    w, h = 1270, 760
    img = gradient_bg(w, h, (244, 250, 255), (248, 240, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, (36, 30, w - 36, h - 30), 30, fill=(255, 255, 255), outline=(216, 226, 244), width=3)
    place_logo(img, 220, 76, 80)
    draw_title(d, 332, 95, 'Studio-quality headshots')
    draw_sub(d, 334, 180, 'without the studio trip')
    bullets = [
        'Identity-preserving portrait pipeline',
        'Structured presets + strict negative constraints',
        'Verification gate + automatic retry',
    ]
    y = 290
    for b in bullets:
        d.ellipse((334, y + 12, 348, y + 26), fill=(63, 115, 255))
        d.text((362, y), b, fill=(35, 52, 85), font=font(30))
        y += 72
    save(img, 'product-hunt-gallery-1-hero.png')


def make_gallery_2():
    w, h = 1270, 760
    img = gradient_bg(w, h, (245, 250, 255), (236, 246, 255))
    d = ImageDraw.Draw(img)
    draw_title(d, 72, 54, 'A->E auditable pipeline')
    stages = ['A Layer Parse', 'B Identity Extract', 'C Guided Stylization', 'D Export Plan', 'E Verify/Retry']
    x = 72
    y = 220
    for i, s in enumerate(stages):
        box_w = 215
        rounded_rect(d, (x, y, x + box_w, y + 190), 22, fill=(255, 255, 255), outline=(195, 215, 240), width=3)
        d.text((x + 18, y + 24), s, fill=(23, 43, 79), font=font(30, bold=True))
        d.text((x + 18, y + 86), 'JSON output', fill=(70, 90, 125), font=font(24))
        d.text((x + 18, y + 122), 'traceable', fill=(70, 90, 125), font=font(24))
        if i < len(stages) - 1:
            d.polygon([(x + box_w + 12, y + 95), (x + box_w + 42, y + 78), (x + box_w + 42, y + 112)], fill=(72, 123, 255))
        x += 235
    save(img, 'product-hunt-gallery-2-pipeline.png')


def make_gallery_3():
    w, h = 1270, 760
    img = gradient_bg(w, h, (255, 247, 241), (245, 239, 255))
    d = ImageDraw.Draw(img)
    draw_title(d, 72, 54, 'Quality gate & monitoring')
    draw_sub(d, 74, 132, 'Track failure rate and retries by provider and preset')

    cards = [
        ('Failure Rate', '< 0.20 target', (255, 255, 255)),
        ('Avg Retries', '< 1.0 target', (255, 255, 255)),
        ('Identity Score', 'embedding + deterministic', (255, 255, 255)),
    ]
    x = 72
    for title, sub, bg in cards:
        rounded_rect(d, (x, 228, x + 360, 470), 22, fill=bg, outline=(230, 206, 245), width=3)
        d.text((x + 24, 268), title, fill=(52, 34, 91), font=font(36, bold=True))
        d.text((x + 24, 338), sub, fill=(93, 73, 132), font=font(27))
        x += 390

    d.text((72, 548), 'Artifacts: runs.ndjson -> dashboard.json / dashboard.md', fill=(86, 66, 120), font=font(28))
    save(img, 'product-hunt-gallery-3-monitoring.png')


def make_gallery_4():
    w, h = 1270, 760
    img = gradient_bg(w, h, (241, 251, 244), (236, 246, 255))
    d = ImageDraw.Draw(img)
    draw_title(d, 72, 54, 'Works across agent stacks')
    logos = ['Codex', 'Claude', 'Cursor / IDE']
    x = 72
    for name in logos:
        rounded_rect(d, (x, 220, x + 350, 450), 26, fill=(255, 255, 255), outline=(195, 227, 213), width=3)
        d.text((x + 36, 305), name, fill=(24, 77, 61), font=font(44, bold=True))
        x += 390
    draw_sub(d, 72, 520, 'One source of truth: scripts + references + quality contracts')
    draw_sub(d, 72, 570, 'No provider lock-in for analysis and verification')
    save(img, 'product-hunt-gallery-4-platform.png')


def make_gallery_5():
    w, h = 1270, 760
    img = gradient_bg(w, h, (241, 246, 255), (248, 241, 255))
    d = ImageDraw.Draw(img)
    draw_title(d, 72, 54, 'Get started in minutes')

    cmd_box = (72, 190, 1198, 620)
    rounded_rect(d, cmd_box, 24, fill=(20, 27, 45), outline=(57, 76, 117), width=2)
    cmds = [
        'npm run skill:test',
        'npm run skill:e2e:mock',
        'npm run skill:e2e:online:gemini',
        'npm run skill:dashboard',
    ]
    y = 250
    mono = font(36)
    for c in cmds:
        d.text((112, y), '$ ' + c, fill=(202, 224, 255), font=mono)
        y += 84

    d.text((72, 670), 'Open-source skill repo with CI/CD, release flow, and feedback templates', fill=(57, 76, 110), font=font(28))
    save(img, 'product-hunt-gallery-5-quickstart.png')


def main():
    make_og()
    make_gallery_1()
    make_gallery_2()
    make_gallery_3()
    make_gallery_4()
    make_gallery_5()


if __name__ == '__main__':
    main()
