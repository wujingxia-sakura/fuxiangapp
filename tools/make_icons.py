"""生成浮想的 PWA 图标。
运行：python tools/make_icons.py
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import os

S = 512
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "icons")
os.makedirs(ICONS, exist_ok=True)

# 背景：从深蓝灰到近黑
y = np.linspace(0, 1, S)[:, None]
top = np.array([26, 38, 51, 255], dtype=np.float64)
bottom = np.array([11, 14, 20, 255], dtype=np.float64)
bg = (top * (1 - y) + bottom * y).astype(np.uint8)
bg = np.repeat(bg[:, None, :], S, axis=1)
img = Image.fromarray(bg, "RGBA")

# 圆角
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=112, fill=255)
img.putalpha(mask)

# 泡泡外发光
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
for r, a in [(190, 18), (172, 26), (156, 34)]:
    gd.ellipse([256 - r, 250 - r, 256 + r, 250 + r], fill=(242, 192, 122, a))
img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(28)))

# 泡泡本体：径向渐变
cx, cy, R = 256, 250, 150
yy, xx = np.mgrid[0:S, 0:S]
d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / R
alpha = np.clip((1 - d) * 0.55, 0, 0.55)
fill = np.zeros((S, S, 4), dtype=np.uint8)
fill[..., 0] = 242
fill[..., 1] = 192
fill[..., 2] = 122
fill[..., 3] = (alpha * 255).astype(np.uint8)
bubble = Image.fromarray(fill, "RGBA")
img = Image.alpha_composite(img, bubble)

# 泡泡描边
outline = Image.new("RGBA", (S, S), (0, 0, 0, 0))
od = ImageDraw.Draw(outline)
od.ellipse([cx - R, cy - R, cx + R, cy + R], outline=(242, 192, 122, 150), width=2)
img = Image.alpha_composite(img, outline)

# 高光
hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(hl).ellipse([180, 166, 236, 222], fill=(255, 255, 255, 90))
img = Image.alpha_composite(img, hl.filter(ImageFilter.GaussianBlur(10)))

# 小光点
dot = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(dot).ellipse([322, 332, 338, 348], fill=(242, 192, 122, 240))
img = Image.alpha_composite(img, dot.filter(ImageFilter.GaussianBlur(1)))

img.save(os.path.join(ICONS, "icon-512.png"))
img.resize((192, 192), Image.LANCZOS).save(os.path.join(ICONS, "icon-192.png"))
print("icons written to", ICONS)
