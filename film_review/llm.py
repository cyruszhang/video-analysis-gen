"""Thin wrapper over the Anthropic API plus an offline mock for testing the pipeline."""
from __future__ import annotations

import base64
import time
from pathlib import Path

CLIP_TOOL = {
    "name": "report_clip",
    "description": "Report the analysis of one clip.",
    "input_schema": {
        "type": "object",
        "properties": {
            "verdict": {"type": "string", "enum": ["Good", "Mixed", "Fix"]},
            "identification": {
                "type": "object",
                "properties": {
                    "method": {"type": "string", "enum": ["number", "color_and_position", "position_only", "not_found"]},
                    "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                    "note": {"type": "string"},
                },
                "required": ["method", "confidence"],
            },
            "what_she_did": {"type": "string", "description": "1-2 sentences summarizing what the player did."},
            "themes": {"type": "array", "items": {"type": "string"}},
            "moments": {
                "type": "array",
                "description": "Timestamped observations, in time order.",
                "items": {
                    "type": "object",
                    "properties": {
                        "kind": {"type": "string", "enum": ["good", "fix"]},
                        "t_start": {"type": "number"},
                        "t_end": {"type": "number"},
                        "text": {"type": "string"},
                    },
                    "required": ["kind", "t_start", "text"],
                },
            },
            "coaching_note": {"type": "string", "description": "One or two sentences: the cue to give the player."},
            "key_frames": {
                "type": "array",
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "properties": {
                        "t": {"type": "number"},
                        "label": {"type": "string"},
                        "kind": {"type": "string", "enum": ["good", "fix"]},
                        "x": {"type": "number"},
                        "y": {"type": "number"},
                    },
                    "required": ["t", "label", "kind", "x", "y"],
                },
            },
        },
        "required": ["verdict", "identification", "what_she_did", "themes", "moments", "coaching_note", "key_frames"],
    },
}

_ID_LIST = {"type": "array", "items": {"type": "string"}}
AGG_TOOL = {
    "name": "write_summary",
    "description": "Write the cross-clip summary of the report.",
    "input_schema": {
        "type": "object",
        "properties": {
            "strengths_summary": {"type": "string", "description": "2-3 sentences on what she does well, citing clip ids."},
            "fixes_summary": {"type": "string", "description": "2-3 sentences on the recurring misses and why they matter."},
            "top_cues": {"type": "array", "items": {"type": "string"}, "description": "The 2 short cues that cover most fixes."},
            "strengths": {"type": "array", "items": {"type": "object", "properties": {
                "name": {"type": "string"}, "on_film": {"type": "string"}, "clips": _ID_LIST},
                "required": ["name", "on_film", "clips"]}},
            "improvements": {"type": "array", "items": {"type": "object", "properties": {
                "area": {"type": "string"}, "on_film": {"type": "string"}, "clips": _ID_LIST, "cue": {"type": "string"}},
                "required": ["area", "on_film", "clips", "cue"]}},
            "why_it_happens": {"type": "array", "items": {"type": "string"}, "description": "2-3 short paragraphs linking the habits into one pattern."},
            "plan": {"type": "array", "items": {"type": "object", "properties": {
                "priority": {"type": "string"}, "cue": {"type": "string"}, "drill": {"type": "string"}, "clips": _ID_LIST},
                "required": ["priority", "cue", "drill", "clips"]}},
            "off_ice": {"type": "string"},
            "using_with_player": {"type": "array", "items": {"type": "object", "properties": {
                "head": {"type": "string"}, "text": {"type": "string"}}, "required": ["head", "text"]}},
            "start_with": {**_ID_LIST, "description": "3 clips to watch first with the player, ones showing she already does the hard things."},
        },
        "required": ["strengths_summary", "fixes_summary", "top_cues", "strengths", "improvements",
                     "why_it_happens", "plan", "off_ice", "using_with_player", "start_with"],
    },
}


def _client():
    import anthropic
    return anthropic.Anthropic()


def _call(model: str, system: str, content: list, tool: dict, max_tokens: int = 4000) -> dict:
    client = _client()
    last = None
    for attempt in range(4):
        try:
            resp = client.messages.create(
                model=model, max_tokens=max_tokens, system=system,
                tools=[tool], tool_choice={"type": "tool", "name": tool["name"]},
                messages=[{"role": "user", "content": content}],
            )
            for block in resp.content:
                if block.type == "tool_use":
                    return block.input
            raise RuntimeError("model returned no tool call")
        except Exception as e:  # network / overload: back off and retry
            last = e
            time.sleep(2 ** (attempt + 1))
    raise RuntimeError(f"API call failed after retries: {last}")


def analyze_clip(model: str, system: str, intro: str, frames: list[tuple[float, Path]]) -> dict:
    content: list = [{"type": "text", "text": intro}]
    for t, path in frames:
        content.append({"type": "text", "text": f"t={t:.2f}s"})
        content.append({"type": "image", "source": {
            "type": "base64", "media_type": "image/jpeg",
            "data": base64.standard_b64encode(path.read_bytes()).decode()}})
    return _call(model, system, content, CLIP_TOOL)


def summarize(model: str, system: str, prompt: str) -> dict:
    return _call(model, system, [{"type": "text", "text": prompt}], AGG_TOOL, max_tokens=6000)


# --- offline mock, so the whole pipeline can be exercised without an API key ---

def mock_clip(frames: list[tuple[float, Path]], i: int) -> dict:
    mid = frames[len(frames) // 2][0]
    verdict = ["Good", "Mixed", "Fix"][i % 3]
    return {
        "verdict": verdict,
        "identification": {"method": "color_and_position", "confidence": "medium", "note": "mock"},
        "what_she_did": "Mock analysis: placeholder text for pipeline testing.",
        "themes": ["positioning", "parking"],
        "moments": [
            {"kind": "good", "t_start": frames[0][0], "t_end": mid, "text": "Mock good moment."},
            {"kind": "fix", "t_start": mid, "text": "Mock fix moment."},
        ],
        "coaching_note": "Mock coaching note.",
        "key_frames": [
            {"t": frames[0][0], "label": "mock good", "kind": "good", "x": 0.3, "y": 0.5},
            {"t": mid, "label": "mock fix", "kind": "fix", "x": 0.6, "y": 0.5},
        ],
    }


def mock_summary(ids: list[str]) -> dict:
    a, b, c = (ids + ids * 3)[:3]
    return {
        "strengths_summary": f"Mock strengths (clips {a}, {b}).",
        "fixes_summary": f"Mock fixes (clip {c}).",
        "top_cues": ["feet moving", "look before it arrives"],
        "strengths": [{"name": "Mock strength", "on_film": "Mock.", "clips": [a, b]}],
        "improvements": [{"area": "Mock area", "on_film": "Mock.", "clips": [c], "cue": "Feet moving"}],
        "why_it_happens": ["Mock paragraph."],
        "plan": [{"priority": "1. Mock", "cue": "Feet moving", "drill": "Mock drill.", "clips": [c]}],
        "off_ice": "Mock off-ice note.",
        "using_with_player": [{"head": "One cue at a time.", "text": "Mock."}],
        "start_with": [a],
    }
