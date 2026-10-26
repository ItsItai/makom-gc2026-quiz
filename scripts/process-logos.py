"""Turn the supplied logo JPEGs into trimmed WebP files and favicons (PRD 6.6).

Usage: python3 scripts/process-logos.py <folder with the source JPEGs>
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "assets"


def whiten(im):
    # The JPEGs sit on white or #F7F7F7; push near-white to pure white so no gray box shows on the page.
    mask = im.convert("L").point(lambda v: 255 if v >= 238 else 0)
    return Image.composite(Image.new("RGB", im.size, "white"), im, mask)


def trim(im, pad=4):
    box = ImageChops.difference(im, Image.new("RGB", im.size, "white")).convert("L").point(lambda v: 255 if v > 24 else 0).getbbox()
    l, t, r, b = box
    return im.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, im.width), min(b + pad, im.height)))


def save(im, name, height, quality=82):
    im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    im.save(out / name, "WEBP", quality=quality, method=6)
    print(name, im.size, (out / name).stat().st_size, "bytes")


stacked = trim(whiten(Image.open(src / "makom-logo-stacked.jpg").convert("RGB")))
save(stacked, "makom-stacked.webp", 280)
save(trim(whiten(Image.open(src / "makom-logo-horizontal.jpg").convert("RGB"))), "makom-horizontal.webp", 56)
save(trim(whiten(Image.open(src / "jnf-usa-logo.jpg").convert("RGB"))), "jnf-usa.webp", 56, 88)

# Favicon: the star mark is the top part of the stacked logo, above the wordmark.
star = trim(stacked.crop((0, 0, stacked.width, round(stacked.height * 0.66))))
side = max(star.size)
square = Image.new("RGB", (side, side), "white")
square.paste(star, ((side - star.width) // 2, (side - star.height) // 2))
for size, name in ((32, "favicon-32.png"), (180, "apple-touch-icon.png")):
    square.resize((size, size), Image.LANCZOS).save(out / name, optimize=True)
    print(name, (out / name).stat().st_size, "bytes")
