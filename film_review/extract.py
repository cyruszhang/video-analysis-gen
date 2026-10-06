from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def probe_duration(video: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(video)],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(json.loads(out)["format"]["duration"])


def grab_frame(video: Path, t: float, dest: Path, width: int) -> Path:
    """Extract one frame at time t, scaled to `width` (aspect preserved)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(video),
         "-frames:v", "1", "-vf", f"scale={width}:-2", "-q:v", "3", str(dest)],
        check=True,
    )
    return dest


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("DejaVuSans-Bold.ttf", "Arial Bold.ttf", "Arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def stamp(path: Path, text: str) -> None:
    img = Image.open(path).convert("RGB")
    d = ImageDraw.Draw(img)
    f = font(max(16, img.width // 40))
    box = d.textbbox((8, 8), text, font=f)
    d.rectangle((box[0] - 4, box[1] - 2, box[2] + 4, box[3] + 2), fill=(0, 0, 0))
    d.text((8, 8), text, fill=(255, 255, 255), font=f)
    img.save(path, quality=88)


def sample_frames(video: Path, outdir: Path, fps: float, width: int) -> list[tuple[float, Path]]:
    """Frames at fixed intervals, each stamped with its timestamp. Returns (t, path)."""
    duration = probe_duration(video)
    step = 1.0 / fps
    times, t = [], 0.0
    while t < duration - 0.05:
        times.append(round(t, 2))
        t += step
    frames = []
    for t in times:
        p = grab_frame(video, t, outdir / f"f_{t:07.2f}.jpg", width)
        stamp(p, f"t={t:.1f}s")
        frames.append((t, p))
    return frames


def transcode(video: Path, dest: Path, height: int = 720) -> Path:
    """Browser-friendly H.264 copy for embedding in the report."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(video),
         "-vf", f"scale=-2:'min({height},ih)'", "-c:v", "libx264", "-crf", "26",
         "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
         "-movflags", "+faststart", str(dest)],
        check=True,
    )
    return dest
