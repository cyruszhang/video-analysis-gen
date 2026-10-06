"""Download a clip from a link. Only links that resolve to a downloadable video work:
direct file URLs, public Google Drive files, and anything yt-dlp supports. Private or
login-gated pages (Hudl, Google Photos) are not fetchable; upload the file instead."""
from __future__ import annotations

import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0 film-review"}


class FetchError(Exception):
    pass


def normalize(url: str) -> str:
    m = re.search(r"drive\.google\.com/file/d/([\w-]+)", url) or re.search(r"drive\.google\.com/.*[?&]id=([\w-]+)", url)
    if m:
        return f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    return url


def fetch(url: str, dest_dir: Path, index: int) -> Path:
    url = normalize(url.strip())
    dest_dir.mkdir(parents=True, exist_ok=True)
    host = re.sub(r"^https?://", "", url).split("/")[0]
    if "hudl.com" in host or "photos.google.com" in host or "photos.app.goo.gl" in host:
        raise FetchError(f"{host} links need a login and can't be downloaded here. "
                         "Download the clip from there and upload the file instead.")
    # 1) direct download, if the server says it's video
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=60) as r:
            ctype = r.headers.get("Content-Type", "")
            if ctype.startswith("video/") or ctype == "application/octet-stream":
                dest = dest_dir / f"link{index:02d}.mp4"
                with dest.open("wb") as f:
                    shutil.copyfileobj(r, f)
                return dest
    except Exception:
        pass
    # 2) yt-dlp, if installed
    if shutil.which("yt-dlp"):
        tmpl = str(dest_dir / f"link{index:02d}.%(ext)s")
        res = subprocess.run(["yt-dlp", "-q", "--no-playlist", "-o", tmpl, url], capture_output=True, text=True)
        found = sorted(dest_dir.glob(f"link{index:02d}.*"))
        if res.returncode == 0 and found:
            return found[0]
    raise FetchError(f"Couldn't download a video from {url}. Use a direct video link or upload the file.")
