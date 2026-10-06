from __future__ import annotations

import tomllib
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Config:
    player_name: str = "Player"
    number: str = "7"
    jersey_color: str = ""
    position: str = "left wing"
    pronoun: str = "she"
    opponent_color: str = ""
    notes: str = ""          # free text: coach notes, systems, known tendencies
    title: str = "Game Film Review"
    album_url: str = ""
    model: str = "claude-opus-5-5"
    fps: float = 3.0
    frame_width: int = 1024
    themes: list[str] = field(default_factory=lambda: [
        "passing", "net drive", "net front", "compete", "puck protection",
        "breakouts", "entries", "puck decisions", "scanning", "positioning",
        "support", "wall position", "parking", "transition", "backcheck",
        "shooting", "other",
    ])

    @classmethod
    def load(cls, path: Path | None) -> "Config":
        if path is None:
            return cls()
        data = tomllib.loads(Path(path).read_text())
        p, g, m = data.get("player", {}), data.get("game", {}), data.get("model", {})
        cfg = cls()
        cfg.player_name = p.get("name", cfg.player_name)
        cfg.number = str(p.get("number", cfg.number))
        cfg.jersey_color = p.get("jersey_color", cfg.jersey_color)
        cfg.position = p.get("position", cfg.position)
        cfg.pronoun = p.get("pronoun", cfg.pronoun)
        cfg.notes = p.get("notes", cfg.notes)
        cfg.opponent_color = g.get("opponent_color", cfg.opponent_color)
        cfg.title = g.get("title", cfg.title)
        cfg.album_url = g.get("album_url", cfg.album_url)
        cfg.model = m.get("name", cfg.model)
        cfg.fps = float(m.get("fps", cfg.fps))
        cfg.frame_width = int(m.get("frame_width", cfg.frame_width))
        cfg.themes = m.get("themes", cfg.themes)
        return cfg

    @property
    def player_desc(self) -> str:
        color = f"{self.jersey_color} " if self.jersey_color else ""
        return f"{self.player_name}, #{self.number}, {color}jersey, {self.position}"
