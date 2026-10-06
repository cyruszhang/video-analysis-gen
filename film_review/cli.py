from __future__ import annotations

import argparse
import csv
import datetime
import hashlib
import json
import re
import sys
from pathlib import Path

from . import llm, prompts
from .annotate import annotated_frames
from .config import Config
from .extract import probe_duration, sample_frames, transcode
from .render import render_report

VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".avi", ".webm"}


def natural_key(p: Path):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)]


def load_clip_meta(clips_dir: Path) -> dict[str, dict]:
    """Optional clips.csv: filename,title,url (title = coach's Hudl tag; url = Google Photos link)."""
    f = clips_dir / "clips.csv"
    if not f.exists():
        return {}
    with f.open(newline="") as fh:
        return {r["filename"]: r for r in csv.DictReader(fh)}


def clean_title(stem: str) -> str:
    return re.sub(r"[_\-]+", " ", stem).strip()


def analyze_all(cfg: Config, videos: list[Path], meta: dict, work_root: Path, mock: bool) -> list[dict]:
    clips = []
    for i, video in enumerate(videos, 1):
        cid = f"{i:02d}"
        m = meta.get(video.name, {})
        title = m.get("title") or ("" if mock else clean_title(video.stem))
        work = work_root / cid
        work.mkdir(parents=True, exist_ok=True)
        key = hashlib.sha256(json.dumps(
            [video.name, video.stat().st_size, cfg.model, cfg.fps, cfg.frame_width, cfg.player_desc,
             cfg.notes, cfg.opponent_color, title, mock], sort_keys=True).encode()).hexdigest()[:16]
        cache = work / f"analysis-{key}.json"
        frames = None
        if cache.exists():
            analysis = json.loads(cache.read_text())
            print(f"[{cid}] cached  {video.name}")
        else:
            print(f"[{cid}] analyzing {video.name} ...", flush=True)
            frames = sample_frames(video, work / "frames", cfg.fps, cfg.frame_width)
            if mock:
                analysis = llm.mock_clip(frames, i)
            else:
                intro = prompts.clip_user_text(cfg, title, probe_duration(video))
                analysis = llm.analyze_clip(cfg.model, prompts.CLIP_SYSTEM, intro, frames)
            cache.write_text(json.dumps(analysis, indent=2))
        clips.append({"id": cid, "video": video, "title": title, "url": m.get("url", ""),
                      "analysis": analysis, "work": work})
    return clips


def summary_prompt(cfg: Config, clips: list[dict], counts: dict) -> str:
    rows = []
    for c in clips:
        a = c["analysis"]
        rows.append({"id": c["id"], "title": c["title"], "verdict": a["verdict"], "themes": a["themes"],
                     "what": a["what_she_did"],
                     "moments": [f'{m["kind"]} @{m["t_start"]}s: {m["text"]}' for m in a["moments"]],
                     "coaching_note": a["coaching_note"]})
    return (f"Focus player: {cfg.player_desc} (pronoun: {cfg.pronoun}). "
            + (f"Context: {cfg.notes}\n" if cfg.notes else "")
            + f"{counts['total']} clips: {counts['Good']} Good, {counts['Mixed']} Mixed, {counts['Fix']} Fix.\n"
            f"Valid clip ids: {[c['id'] for c in clips]}\n\nPer-clip analyses (JSON):\n"
            + json.dumps(rows, indent=1) + "\n\nCall write_summary.")


def scrub_ids(summ: dict, valid: set[str]) -> dict:
    """Drop any clip id the model invented."""
    def keep(ids):
        return [i for i in ids if i in valid]
    for sec in ("strengths", "improvements", "plan"):
        for row in summ[sec]:
            row["clips"] = keep(row["clips"])
    summ["start_with"] = keep(summ["start_with"])
    return summ


def run(args) -> int:
    cfg = Config.load(Path(args.config) if args.config else None)
    if args.album:
        cfg.album_url = args.album
    if args.model:
        cfg.model = args.model
    clips_dir = Path(args.clips)
    videos = sorted((p for p in clips_dir.iterdir() if p.suffix.lower() in VIDEO_EXT), key=natural_key)
    if not videos:
        print(f"No video files found in {clips_dir}", file=sys.stderr)
        return 1
    out = Path(args.out)
    work_root = out / ".work"
    clips = analyze_all(cfg, videos, load_clip_meta(clips_dir), work_root, args.mock)

    counts = {"total": len(clips), **{v: sum(c["analysis"]["verdict"] == v for c in clips)
                                      for v in ("Good", "Mixed", "Fix")}}
    ids = [c["id"] for c in clips]
    if args.mock:
        summ = llm.mock_summary(ids)
    else:
        print("Writing cross-clip summary ...", flush=True)
        summ = llm.summarize(cfg.model, prompts.AGG_SYSTEM, summary_prompt(cfg, clips, counts))
    summ = scrub_ids(summ, set(ids))

    for c in clips:
        c["shots"] = annotated_frames(c["video"], c["analysis"]["key_frames"], c["work"])
        c["video_bytes"] = None
        if args.embed_videos:
            small = transcode(c["video"], c["work"] / "small.mp4", height=360)
            c["video_bytes"] = small.read_bytes()

    doc = render_report(cfg, clips, summ, counts, datetime.date.today().strftime("%b %-d, %Y"))
    out.mkdir(parents=True, exist_ok=True)
    dest = out / "report.html"
    dest.write_text(doc, encoding="utf-8")
    print(f"Wrote {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="film_review", description="Hudl clips -> single-file HTML coaching report")
    ap.add_argument("clips", help="folder of video clips (optional clips.csv: filename,title,url)")
    ap.add_argument("--config", help="game.toml (see examples/game.toml)")
    ap.add_argument("--out", default="out", help="output folder (default: out)")
    ap.add_argument("--album", help="Google Photos album URL (overrides config)")
    ap.add_argument("--model", help="Claude model id (overrides config)")
    ap.add_argument("--embed-videos", action="store_true",
                    help="embed 360p copies of each clip in the HTML (bigger file, plays offline)")
    ap.add_argument("--mock", action="store_true", help="offline test mode: fake analysis, no API call")
    return run(ap.parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
