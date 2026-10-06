# Hockey Film Review

Drop in short Hudl clips of one player, get a coaching report as a **single HTML file**
(annotated stills inlined, responsive) that can be emailed and read on an iPad.

Pipeline: `ffmpeg` samples frames per clip → Claude vision analyzes each clip (good / fix
moments with timestamps, themes, coaching note, key moments to annotate) → stills are
annotated with Pillow → a second Claude pass writes the cross-clip summary (strengths,
areas to improve, why it happens, development plan) → `report.html`.

## Setup

Requires Python 3.11+, `ffmpeg`/`ffprobe` on PATH, and an Anthropic API key.

```
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
```

## Use

1. Put the clips in a folder (they are numbered in filename order).
   Optional `clips.csv` in that folder: `filename,title,url` — `title` is the coach's Hudl
   tag, `url` is a per-clip Google Photos link.
2. Copy `examples/game.toml`, set the player, jersey color, game title and album link.
3. Run:

```
python -m film_review ./clips --config game.toml --out ./out
```

Result: `out/report.html`. Attach it to an email. Flags:

- `--album URL` Google Photos album link (shown at the top of the report)
- `--embed-videos` embed 360p copies of each clip so they play inside the file (much larger file)
- `--model ID` override the model
- `--mock` offline test with fake analysis, no API call

Per-clip analyses are cached in `out/.work`, so re-runs only pay for new or changed clips.

## Local web app

```
python -m film_review.app        # then open http://127.0.0.1:5000
```

Upload clips (or paste direct video / public Google Drive links), enter the player details,
and get the report with live progress. Past runs are kept in `./runs`. Hudl and Google Photos
links need a login and cannot be downloaded: download the clip and upload the file.
The app only listens on 127.0.0.1.

## Reading reports away from home

Reports are a single file, so you can email it. To get a link that works anywhere, upload it
to S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2). The link is private, unguessable
and expires (max 7 days). Install `boto3` and set:

```
export FILM_REVIEW_BUCKET=my-bucket
export FILM_REVIEW_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # omit for AWS S3
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...
python -m film_review ./clips --config game.toml --publish     # prints the link
```

In the web app an "Upload the report and give me a private link" checkbox appears once
`FILM_REVIEW_BUCKET` is set. Uploading to the bucket has not been tested against a real store yet.
Alternative with no hosting: run the app on your computer and reach it from your phone
over a private network such as Tailscale.

## Notes

- Claude sees sampled stills (default 3 fps), not continuous video. The report flags clips
  where the jersey number could not be read and the player was placed by position.
