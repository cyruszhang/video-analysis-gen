from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

from .extract import font, grab_frame

COLORS = {"good": (46, 204, 113), "fix": (231, 76, 60)}


def annotate_frame(video: Path, kf: dict, work: Path, width: int = 960) -> Image.Image:
    raw = grab_frame(video, float(kf["t"]), work / f"kf_{float(kf['t']):07.2f}.jpg", width)
    img = Image.open(raw).convert("RGB")
    d = ImageDraw.Draw(img)
    color = COLORS.get(kf.get("kind", "fix"), COLORS["fix"])
    w, h = img.size
    x = min(max(float(kf["x"]), 0.0), 1.0) * w
    y = min(max(float(kf["y"]), 0.0), 1.0) * h
    r = w * 0.05
    for k in range(max(4, w // 160)):  # thick ring
        d.ellipse((x - r - k, y - r - k, x + r + k, y + r + k), outline=color)
    label = f'{float(kf["t"]):.1f}s  {kf["label"]}'
    f = font(max(18, w // 34))
    box = d.textbbox((0, 0), label, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    pad = 8
    lx = min(max(x - tw / 2, 6), w - tw - 2 * pad - 6)
    ly = y + r + 10 if y + r + 10 + th + 2 * pad < h else max(y - r - th - 2 * pad - 10, 6)
    d.rounded_rectangle((lx, ly, lx + tw + 2 * pad, ly + th + 2 * pad), radius=8, fill=color)
    d.text((lx + pad, ly + pad - box[1]), label, fill=(255, 255, 255), font=f)
    return img


def annotated_frames(video: Path, key_frames: list[dict], work: Path, quality: int = 80) -> list[bytes]:
    """One annotated JPEG (bytes) per key moment, in time order. Embedded individually
    in the report so they wrap to a phone/tablet-sized column instead of one wide strip."""
    import io
    out = []
    for kf in sorted(key_frames, key=lambda k: k["t"])[:3]:
        buf = io.BytesIO()
        annotate_frame(video, kf, work, width=900).save(buf, "JPEG", quality=quality)
        out.append(buf.getvalue())
    return out
