"""Local web app: upload clips or paste links, enter player details, get the report.
Runs on your own computer only (127.0.0.1). One job at a time, in a background thread."""
from __future__ import annotations

import json
import threading
import time
import traceback
import uuid
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, render_template_string, request, send_from_directory
from werkzeug.utils import secure_filename

from .cli import VIDEO_EXT, generate
from .config import Config
from . import publish as pub
from .fetch import FetchError, fetch

RUNS = Path("runs")
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024**3
JOB_LOCK = threading.Lock()

BASE_CSS = """
body{font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1c2530}
h1{margin:.2em 0}label{display:block;margin:.7em 0 .2em;font-weight:600;font-size:.9rem}
input[type=text],textarea,select{width:100%;padding:.5em;border:1px solid #c9d1d9;border-radius:6px;font:inherit}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
button{margin-top:1em;padding:.7em 1.4em;font:inherit;font-weight:700;border:0;border-radius:8px;background:#1f5fbf;color:#fff;cursor:pointer}
.card{border:1px solid #e1e6ec;border-radius:10px;padding:10px 14px;margin:8px 0}
pre{background:#f6f8fa;padding:10px;border-radius:8px;white-space:pre-wrap;max-height:340px;overflow:auto}
.err{color:#b3261e}.mut{color:#5b6877;font-size:.9rem}
"""

INDEX = """<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Film Review</title><style>{{css}}</style>
<h1>Hockey Film Review</h1>
<p class=mut>Runs locally. Upload clips or paste direct video links, describe the player, get a report.</p>
{% if error %}<p class=err>{{error}}</p>{% endif %}
<form method=post action=/start enctype=multipart/form-data id=f>
<div class=row>
 <div><label>Player name</label><input type=text name=name value="Kelly"></div>
 <div><label>Number</label><input type=text name=number value="7"></div>
 <div><label>Jersey color</label><input type=text name=jersey_color value="dark"></div>
</div>
<div class=row>
 <div><label>Position</label><input type=text name=position value="left wing"></div>
 <div><label>Pronoun</label><select name=pronoun><option>she<option>he<option>they</select></div>
 <div><label>Opponent color</label><input type=text name=opponent_color value="white"></div>
</div>
<label>Game title</label><input type=text name=title placeholder="Game Film Review - Oct 4th vs Wenatchee">
<label>Notes for the analyst (coach comments, systems, tendencies)</label>
<textarea name=notes rows=3 placeholder="e.g. Coach says she glides into battles. We run a 1-2-2 forecheck."></textarea>
<label>Clip files</label><input type=file name=files multiple accept="video/*">
<label>or video links (one per line; direct files or public Drive links)</label>
<textarea name=urls rows=3></textarea>
<label>Google Photos album link (shown at top of the report)</label><input type=text name=album_url>
<label>Model</label><input type=text name=model value="claude-opus-5-5">
<label><input type=checkbox name=embed> Embed small copies of the clips in the report (bigger file)</label>
{% if can_share %}<label><input type=checkbox name=share checked> Upload the report and give me a private link (works away from home)</label>{% endif %}
<label><input type=checkbox name=mock> Test mode (fake analysis, no API call)</label>
<button>Generate report</button></form>
<h2>Past reports</h2>
{% for r in runs %}<div class=card><a href="/run/{{r.id}}">{{r.title}}</a>
 <span class=mut>· {{r.when}} · {{r.status}}</span></div>{% else %}<p class=mut>None yet.</p>{% endfor %}
<script>
const k="film-review-form";const f=document.getElementById("f");
try{const s=JSON.parse(localStorage.getItem(k)||"{}");for(const n in s){const e=f.elements[n];if(e&&e.type!="file"&&e.type!="checkbox")e.value=s[n];}}catch(e){}
f.addEventListener("submit",()=>{try{const s={};for(const n of["name","number","jersey_color","position","pronoun","opponent_color","notes","album_url","model"])s[n]=f.elements[n].value;localStorage.setItem(k,JSON.stringify(s));}catch(e){}});
</script>"""

RUN = """<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Run</title><style>{{css}}</style><p><a href="/">← back</a></p>
<h1 id=t>{{title}}</h1><p id=s class=mut>…</p><p id=l></p><pre id=log></pre>
<script>
async function poll(){const r=await fetch("/api/run/{{id}}");const d=await r.json();
document.getElementById("s").textContent=d.status;document.getElementById("log").textContent=d.log.join("\\n");
if(d.status=="done")document.getElementById("l").innerHTML='<a href="/runs/{{id}}/report.html"><b>Open report</b></a> · <a href="/runs/{{id}}/download" >download file</a>'+(d.share_url?' · <a href="'+d.share_url+'">shareable link</a><br><input type=text readonly value="'+d.share_url+'" onclick="this.select()">':'');
if(d.status=="error"){document.getElementById("s").className="err";}
if(d.status=="running"||d.status=="queued")setTimeout(poll,1500);}
poll();</script>"""


def status_file(rid: str) -> Path:
    return RUNS / rid / "status.json"


def read_status(rid: str) -> dict:
    try:
        return json.loads(status_file(rid).read_text())
    except Exception:
        return {"status": "unknown", "log": [], "title": rid}


def write_status(rid: str, **kw) -> dict:
    st = read_status(rid)
    st.update(kw)
    status_file(rid).write_text(json.dumps(st))
    return st


def log(rid: str, msg: str) -> None:
    st = read_status(rid)
    st["log"] = st.get("log", []) + [msg]
    status_file(rid).write_text(json.dumps(st))


def worker(rid: str, cfg: Config, urls: list[str], mock: bool, embed: bool, share: bool) -> None:
    with JOB_LOCK:
        write_status(rid, status="running")
        try:
            clips = RUNS / rid / "clips"
            for i, u in enumerate(urls, 1):
                log(rid, f"Downloading link {i}/{len(urls)} ...")
                fetch(u, clips, i)
            report = generate(cfg, clips, RUNS / rid / "out", mock, embed, say=lambda m: log(rid, m))
            if share:
                log(rid, "Uploading report for a shareable link ...")
                try:
                    write_status(rid, share_url=pub.publish(report, rid))
                except Exception as e:  # report is still usable locally
                    log(rid, f"Upload failed (report is still available locally): {e}")
            write_status(rid, status="done")
        except FetchError as e:
            log(rid, str(e))
            write_status(rid, status="error")
        except Exception as e:
            log(rid, "".join(traceback.format_exception_only(type(e), e)).strip())
            log(rid, traceback.format_exc())
            write_status(rid, status="error")


def list_runs() -> list[dict]:
    runs = []
    for d in sorted(RUNS.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True) if RUNS.exists() else []:
        st = read_status(d.name)
        runs.append({"id": d.name, "title": st.get("title", d.name), "status": st.get("status", "?"),
                     "when": time.strftime("%b %d %H:%M", time.localtime(d.stat().st_mtime))})
    return runs[:25]


@app.get("/")
def index():
    return render_template_string(INDEX, css=BASE_CSS, runs=list_runs(), error=request.args.get("error"),
                                  can_share=pub.enabled())


@app.post("/start")
def start():
    f = request.form
    cfg = Config(player_name=f.get("name", "Player").strip(), number=f.get("number", "").strip(),
                 jersey_color=f.get("jersey_color", "").strip(), position=f.get("position", "").strip(),
                 pronoun=f.get("pronoun", "they"), opponent_color=f.get("opponent_color", "").strip(),
                 notes=f.get("notes", "").strip(), album_url=f.get("album_url", "").strip(),
                 title=f.get("title", "").strip() or "Game Film Review",
                 model=f.get("model", "").strip() or Config().model)
    urls = [u.strip() for u in f.get("urls", "").splitlines() if u.strip()]
    files = [x for x in request.files.getlist("files") if x.filename]
    if not files and not urls:
        return redirect("/?error=Add at least one clip file or link.")
    rid = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:4]
    clips = RUNS / rid / "clips"
    clips.mkdir(parents=True)
    for x in files:
        name = secure_filename(x.filename)
        if Path(name).suffix.lower() not in VIDEO_EXT:
            return redirect(f"/?error={name} is not a supported video file.")
        x.save(clips / name)
    write_status(rid, status="queued", log=[], title=cfg.title)
    threading.Thread(target=worker, args=(rid, cfg, urls, bool(f.get("mock")), bool(f.get("embed")), bool(f.get("share"))), daemon=True).start()
    return redirect(f"/run/{rid}")


@app.get("/run/<rid>")
def run_page(rid):
    if not status_file(rid).exists():
        abort(404)
    return render_template_string(RUN, css=BASE_CSS, id=rid, title=read_status(rid).get("title", rid))


@app.get("/api/run/<rid>")
def run_api(rid):
    return jsonify(read_status(rid))


@app.get("/runs/<rid>/report.html")
def report(rid):
    return send_from_directory((RUNS / rid / "out").resolve(), "report.html")


@app.get("/runs/<rid>/download")
def download(rid):
    return send_from_directory((RUNS / rid / "out").resolve(), "report.html", as_attachment=True,
                               download_name="film-review.html")


def main() -> None:
    RUNS.mkdir(exist_ok=True)
    print("Film Review running at http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, threaded=True)


if __name__ == "__main__":
    main()
