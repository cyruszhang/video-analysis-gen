"""Render the report as ONE self-contained HTML file (inline CSS + images) so it can be
emailed and opened on an iPad with no accompanying folder."""
from __future__ import annotations

import base64
import html
from pathlib import Path

from .config import Config

CSS = """
:root{--bg:#fff;--fg:#1c2530;--mut:#5b6877;--line:#e1e6ec;--good:#1f9d57;--fix:#d64533;--mix:#c98a0b;--card:#f6f8fa;--link:#1f5fbf}
@media(prefers-color-scheme:dark){:root{--bg:#14181d;--fg:#e6ebf0;--mut:#9aa7b4;--line:#2a323b;--card:#1b2128;--link:#7db0ff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:860px;margin:0 auto;padding:20px 18px 60px}
h1{font-size:1.9rem;line-height:1.2;margin:.2em 0 .1em}
h2{font-size:1.45rem;margin:2em 0 .5em;padding-top:.4em;border-top:2px solid var(--line)}
h3{font-size:1.15rem;margin:1.6em 0 .4em}
a{color:var(--link)}
.sub{color:var(--mut);margin:0 0 1em}
.album{display:inline-block;margin:.4em 0 1em;padding:.5em .9em;border:1px solid var(--line);border-radius:10px;background:var(--card);text-decoration:none;font-weight:600}
table{width:100%;border-collapse:collapse;margin:.6em 0 1em;font-size:.95rem}
th,td{text-align:left;vertical-align:top;padding:.55em .6em;border-bottom:1px solid var(--line)}
th{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}
.tablewrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.clip{margin:1.4em 0 2em;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--card)}
.clip h3{margin:0 0 .3em}
.tag{display:inline-block;font-size:.72rem;font-weight:700;padding:.15em .55em;border-radius:99px;color:#fff;vertical-align:middle;margin-left:.4em}
.tag.Good{background:var(--good)}.tag.Fix{background:var(--fix)}.tag.Mixed{background:var(--mix)}
.shots{display:flex;flex-wrap:wrap;gap:8px;margin:.6em 0}
.shots img{flex:1 1 260px;max-width:100%;min-width:0;border-radius:8px}
video{width:100%;border-radius:8px;margin:.4em 0;background:#000}
.watch{display:inline-block;margin:.2em 0 .4em;font-weight:600}
ul{padding-left:1.2em}li{margin:.3em 0}
.good{color:var(--good);font-weight:700}.mid{color:var(--mix);font-weight:700}.fix{color:var(--fix);font-weight:700}
.theme{color:var(--mut);font-size:.9rem}
.idnote{color:var(--mix);font-size:.88rem}
.toc a{margin-right:.8em;white-space:nowrap}
"""


VCLS = {"strong": "good", "ok": "mid", "weak": "fix"}


def e(s) -> str:
    return html.escape(str(s))


def fmt_t(t: float) -> str:
    t = float(t)
    return f"0:{t:04.1f}".replace(".0", "") if t < 60 else f"{int(t // 60)}:{int(t % 60):02d}"


def data_uri(data: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(data).decode()}"


def clip_links(ids: list[str]) -> str:
    return ", ".join(f'<a href="#clip-{e(i)}">{e(i)}</a>' for i in ids)


def render_clip(c: dict, cfg: Config) -> str:
    a = c["analysis"]
    v = a["verdict"]
    out = [f'<section class="clip" id="clip-{e(c["id"])}">']
    title = f'Clip {c["id"]}' + (f': “{c["title"]}”' if c.get("title") else "")
    out.append(f'<h3>{e(title)}<span class="tag {e(v)}">{e(v)}</span></h3>')
    if c.get("url"):
        out.append(f'<a class="watch" href="{e(c["url"])}">▶ Watch this clip</a>')
    if c.get("video_bytes"):
        out.append(f'<video controls playsinline preload="none" src="{data_uri(c["video_bytes"], "video/mp4")}"></video>')
    out.append(f'<p><strong>What {e(cfg.pronoun)} did:</strong> {e(a["what_she_did"])} '
               f'<span class="theme">Themes: {e(", ".join(a["themes"]))}.</span></p>')
    ident = a["identification"]
    if ident["method"] in ("not_found", "position_only") or ident["confidence"] == "low":
        note = ident.get("note") or ""
        out.append(f'<p class="idnote">⚠ Could not read #{e(cfg.number)} clearly '
                   f'(placed by {e(ident["method"].replace("_", " "))}, {e(ident["confidence"])} confidence). {e(note)}</p>')
    if c.get("shots"):
        out.append('<div class="shots">' + "".join(
            f'<img alt="Annotated still" src="{data_uri(b, "image/jpeg")}">' for b in c["shots"]) + "</div>")
    if a["moments"]:
        out.append("<ul>")
        for m in a["moments"]:
            end = f' to {fmt_t(m["t_end"])}' if m.get("t_end") and m["t_end"] > m["t_start"] + 0.2 else ""
            cls, word = ("good", "Good") if m["kind"] == "good" else ("fix", "Fix")
            out.append(f'<li><span class="{cls}">{word}, {fmt_t(m["t_start"])}{end}:</span> {e(m["text"])}</li>')
        out.append("</ul>")
    if a.get("decisions"):
        out.append("<p><strong>Decisions:</strong></p><ul>")
        for d in a["decisions"]:
            out.append(f'<li><span class="{VCLS[d["verdict"]]}">{fmt_t(d["t"])} · {e(d["verdict"])}:</span> '
                       f'{e(d["situation"])} Chose: {e(d["chose"])}'
                       + (f' Better: {e(d["better"])}' if d["better"].strip().lower() != "same" else "") + "</li>")
        out.append("</ul>")
    out.append(f'<p><strong>Coaching note:</strong> {e(a["coaching_note"])}</p></section>')
    return "\n".join(out)


def table(headers: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th>{e(h)}</th>" for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{cell}</td>" for cell in r) + "</tr>" for r in rows)
    return f'<div class="tablewrap"><table><tr>{th}</tr>{body}</table></div>'


def render_report(cfg: Config, clips: list[dict], summ: dict, counts: dict, today: str) -> str:
    good = [c for c in clips if c["analysis"]["verdict"] == "Good"]
    work = [c for c in clips if c["analysis"]["verdict"] != "Good"]
    p = []
    p.append(f"<h1>{e(cfg.title)}</h1>")
    p.append(f'<p class="sub">{e(today)} · {e(cfg.player_name)} #{e(cfg.number)}, {e(cfg.position)}</p>')
    if cfg.album_url:
        p.append(f'<a class="album" href="{e(cfg.album_url)}">▶ All clips in Google Photos</a>')
    p.append(f'<p>{e(summ["strengths_summary"])}</p><p>{e(summ["fixes_summary"])}</p>')
    cues = " and ".join(f"<strong>{e(c)}</strong>" for c in summ["top_cues"])
    p.append(f'<p>Of the {counts["total"]} clips below, {counts["Good"]} went well, {counts["Mixed"]} mixed, '
             f'and {counts["Fix"]} mainly fixes. Two cues cover most of the fixes: {cues}.</p>')
    p.append('<p class="toc"><strong>Jump to:</strong> ' + "".join(
        f'<a href="#clip-{e(c["id"])}">{e(c["id"])}</a>' for c in clips) + "</p>")

    rows = [[clip_links([c["id"]]), fmt_t(d["t"]), e(d["type"].replace("_", " ")), e(d["situation"]), e(d["chose"]),
             e(d["better"]), f'<span class="{VCLS[d["verdict"]]}">{e(d["verdict"])}</span>']
            for c in clips for d in c["analysis"].get("decisions", [])]
    if rows:
        n = {v: sum(r[-1].count(f">{v}<") for r in rows) for v in ("strong", "ok", "weak")}
        p.append("<h2>Decision-making</h2>")
        p.append(f'<p>{e(summ.get("decision_summary", ""))}</p>')
        p.append(f'<p>{len(rows)} decision points: {n["strong"]} strong, {n["ok"]} ok, {n["weak"]} weak.</p>')
        p.append(table(["Clip", "Time", "Type", "Situation", "Chose", "Better option", "Verdict"], rows))
    p.append("<h2>Strengths</h2>")
    p.append(table(["Strength", "What it looks like on film", "Clips"],
                   [[e(s["name"]), e(s["on_film"]), clip_links(s["clips"])] for s in summ["strengths"]]))
    p.append("<h2>Areas to improve</h2>")
    p.append(table(["Area", "What it looks like on film", "Clips", "Cue"],
                   [[e(s["area"]), e(s["on_film"]), clip_links(s["clips"]), e(s["cue"])] for s in summ["improvements"]]))
    p.append(f"<h3>Why it happens</h3>" + "".join(f"<p>{e(t)}</p>" for t in summ["why_it_happens"]))
    p.append("<h2>Development plan</h2>")
    p.append(table(["Priority", "Cue", "On-ice drill", "Seen in"],
                   [[e(s["priority"]), e(s["cue"]), e(s["drill"]), clip_links(s["clips"])] for s in summ["plan"]]))
    p.append(f'<p>{e(summ["off_ice"])}</p>')
    p.append("<h3>Using this with " + e(cfg.player_name) + "</h3>")
    if summ["start_with"]:
        p.append(f'<p>Start with clips {clip_links(summ["start_with"])}: they show {e(cfg.pronoun)} '
                 f'already does the hard parts.</p>')
    p.append("<ul>" + "".join(f'<li><strong>{e(u["head"])}</strong> {e(u["text"])}</li>' for u in summ["using_with_player"]) + "</ul>")

    if good:
        p.append("<h2>Clips that went well</h2>")
        p.extend(render_clip(c, cfg) for c in good)
    if work:
        p.append("<h2>Clips to work on</h2>")
        p.extend(render_clip(c, cfg) for c in work)

    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{e(cfg.title)}</title><style>{CSS}</style></head><body><main>'
            + "\n".join(p) + "</main></body></html>")
