"""
MyBatis-like XML loader for ClickHouse SQL used by batch jobs.

- Place XML under `sql/resources/*.xml` with `<mapper namespace="...">`.
- Each statement text is stored as a Jinja2 template when Jinja2 is installed.
"""

from __future__ import annotations

import glob
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict

try:  # Optional; falls back to plain strings if missing.
    from jinja2 import Environment, BaseLoader
except ImportError:  # pragma: no cover - optional dependency
    Environment = None  # type: ignore
    BaseLoader = None  # type: ignore


class SqlMapper:
    def __init__(self, pattern: str):
        self.pattern = pattern
        self.templates: Dict[str, Any] = {}
        self._env = Environment(loader=BaseLoader()) if Environment else None
        self.reload()

    def reload(self) -> None:
        """Reload all XML files matched by the pattern."""
        self.templates.clear()
        for path in glob.glob(self.pattern, recursive=True):
            root = ET.parse(path).getroot()
            namespace = root.attrib.get("namespace", Path(path).stem)
            for node in root:
                key = f"{namespace}.{node.attrib.get('id')}"
                sql_text = "".join(node.itertext()).strip()
                if self._env:
                    self.templates[key] = self._env.from_string(sql_text)
                else:
                    self.templates[key] = sql_text

    def render(self, key: str, params: Dict[str, Any] | None = None) -> str:
        """Render SQL by key with params (Jinja2 if available, else format_map)."""
        if key not in self.templates:
            raise KeyError(f"SQL id '{key}' not found in mapper.")
        template = self.templates[key]
        params = params or {}
        if self._env:
            return template.render(**params)
        try:
            return template.format_map(params)
        except Exception:
            return template
