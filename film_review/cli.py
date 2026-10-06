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


def analyze_all(cfg: Config, videos: list[Path], meta: dict, work_root: Path, mock: bool, say=print) -> list[dict]:
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
            say(f"[{cid}/{len(videos):02d}] cached  {video.name}")
        else:
            say(f"[{cid}/{len(videos):02d}] analyzing {video.name} ...")
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


def generate(cfg: Config, clips_dir: Path, out: Path, mock: bool = False, embed_videos: bool = False,
             say=print) -> Path:
    """Run the whole pipeline. `say` receives human-readable progress lines."""
    videos = sorted((p for p in clips_dir.iterdir() if p.suffix.lower() in VIDEO_EXT), key=natural_key)
    if not videos:
        raise ValueError(f"No video files found in {clips_dir}")
    clips = analyze_all(cfg, videos, load_clip_meta(clips_dir), out / ".work", mock, say)

    counts = {"total": len(clips), **{v: sum(c["analysis"]["verdict"] == v for c in clips)
                                      for v in ("Good", "Mixed", "Fix")}}
    ids = [c["id"] for c in clips]
    if mock:
        summ = llm.mock_summary(ids)
    else:
        say("Writing cross-clip summary ...")
        summ = llm.summarize(cfg.model, prompts.AGG_SYSTEM, summary_prompt(cfg, clips, counts))
    summ = scrub_ids(summ, set(ids))

    say("Annotating stills and rendering report ...")
    for c in clips:
        c["shots"] = annotated_frames(c["video"], c["analysis"]["key_frames"], c["work"])
        c["video_bytes"] = None
        if embed_videos:
            c["video_bytes"] = transcode(c["video"], c["work"] / "small.mp4", height=360).read_bytes()

    doc = render_report(cfg, clips, summ, counts, datetime.date.today().strftime("%b %-d, %Y"))
    out.mkdir(parents=True, exist_ok=True)
    dest = out / "report.html"
    dest.write_text(doc, encoding="utf-8")
    say(f"Wrote {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
    return dest


def run(args) -> int:
    cfg = Config.load(Path(args.config) if args.config else None)
    if args.album:
        cfg.album_url = args.album
    if args.model:
        cfg.model = args.model
    try:
        report = generate(cfg, Path(args.clips), Path(args.out), args.mock, args.embed_videos)
        if args.publish:
            from . import publish
            if not publish.enabled():
                print("Set FILM_REVIEW_BUCKET (see film_review/publish.py) to use --publish", file=sys.stderr)
                return 1
            print("Shareable link:", publish.publish(report, report.parent.parent.name or "report"))
    except ValueError as err:
        print(err, file=sys.stderr)
        return 1
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
    ap.add_argument("--publish", action="store_true",
                    help="upload the report to your S3-compatible bucket and print a private expiring link")
    ap.add_argument("--mock", action="store_true", help="offline test mode: fake analysis, no API call")
    return run(ap.parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
