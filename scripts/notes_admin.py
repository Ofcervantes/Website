#!/usr/bin/env python3
"""Run the private note editor that writes Markdown into this site.

Easy workflow:
1. From the repository folder, run: python3 scripts/notes_admin.py
2. Write and save the note in the browser page that opens.
3. Review it on the local Notes page, then commit and push when ready.

The server creates the Markdown file and rebuilds notes/manifest.json. Do not
edit the manifest by hand. The editor and this backend are excluded from the
public GitHub Pages deployment.
"""

from __future__ import annotations

import argparse
import datetime as dt
import functools
import json
import re
import subprocess
import sys
import unicodedata
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


DEFAULT_PORT = 8766
MAX_REQUEST_BYTES = 1_000_000


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    ascii_text = re.sub(r"[\u2019']", "", ascii_text)
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")[:80].rstrip("-")
    return f"{slug or 'untitled-note'}.md"


def build_markdown(title: str, date: str, body: str) -> str:
    sections = [f"# {title}"]
    normalized_body = body.replace("\r\n", "\n").replace("\r", "\n").rstrip("\n")

    if date:
        sections.append(f"**Date:** {date}")
    if normalized_body.strip():
        sections.append(normalized_body)

    return "\n\n".join(sections) + "\n"


class NotesAdminServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, server_address, handler, repo_root: Path):
        super().__init__(server_address, handler)
        self.repo_root = repo_root


class NotesAdminHandler(SimpleHTTPRequestHandler):
    server_version = "LocalNotesAdmin/1.0"

    @property
    def repo_root(self) -> Path:
        return self.server.repo_root

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; "
            "base-uri 'self'; frame-ancestors 'none'",
        )
        super().end_headers()

    def _has_safe_host(self) -> bool:
        host = self.headers.get("Host", "").lower()
        return (
            host == "localhost"
            or host.startswith("localhost:")
            or host == "127.0.0.1"
            or host.startswith("127.0.0.1:")
        )

    def _send_json(self, status: int, payload: dict) -> None:
        content = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _reject_unsafe_host(self) -> bool:
        if self._has_safe_host():
            return False
        self._send_json(403, {"error": "This admin only accepts local requests."})
        return True

    def do_GET(self) -> None:
        if self._reject_unsafe_host():
            return

        path = urlsplit(self.path).path
        if path == "/api/status":
            self._send_json(200, {"ok": True})
            return
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/notes-editor.html")
            self.end_headers()
            return

        super().do_GET()

    def do_POST(self) -> None:
        if self._reject_unsafe_host():
            return
        if urlsplit(self.path).path != "/api/notes":
            self._send_json(404, {"error": "Unknown endpoint."})
            return
        if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
            self._send_json(415, {"error": "Notes must be sent as JSON."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Invalid request length."})
            return

        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            self._send_json(413, {"error": "The note is empty or too large."})
            return

        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "The request is not valid JSON."})
            return

        title_value = payload.get("title", "") if isinstance(payload, dict) else ""
        date_value = payload.get("date", "") if isinstance(payload, dict) else ""
        body_value = payload.get("body", "") if isinstance(payload, dict) else ""

        if not isinstance(title_value, str) or not isinstance(date_value, str) or not isinstance(body_value, str):
            self._send_json(400, {"error": "Title, date, and body must be text."})
            return

        title = " ".join(title_value.split())
        date = date_value.strip()
        if not title or len(title) > 120:
            self._send_json(400, {"error": "Add a title of 120 characters or fewer."})
            return
        if date:
            try:
                dt.date.fromisoformat(date)
            except ValueError:
                self._send_json(400, {"error": "Use a valid date in YYYY-MM-DD format."})
                return

        filename = slugify(title)
        notes_dir = self.repo_root / "notes"
        notes_dir.mkdir(parents=True, exist_ok=True)
        note_path = notes_dir / filename

        try:
            with note_path.open("x", encoding="utf-8", newline="\n") as note_file:
                note_file.write(build_markdown(title, date, body_value))
        except FileExistsError:
            self._send_json(
                409,
                {"error": f"{filename} already exists. Change the title or edit that file directly."},
            )
            return

        try:
            subprocess.run(
                [sys.executable, str(self.repo_root / "scripts" / "build_notes.py")],
                cwd=self.repo_root,
                check=True,
                capture_output=True,
                text=True,
            )
        except (OSError, subprocess.CalledProcessError):
            note_path.unlink(missing_ok=True)
            self._send_json(500, {"error": "The manifest could not be refreshed, so the note was not saved."})
            return

        self._send_json(201, {"ok": True, "filename": filename, "path": f"notes/{filename}"})

    def log_message(self, format_string: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {format_string % args}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create website notes through a local-only admin page.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Local port (default: {DEFAULT_PORT})")
    parser.add_argument("--no-open", action="store_true", help="Do not open the admin page automatically")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 1 <= args.port <= 65535:
        raise SystemExit("Port must be between 1 and 65535.")

    repo_root = Path(__file__).resolve().parents[1]
    handler = functools.partial(NotesAdminHandler, directory=str(repo_root))
    server = NotesAdminServer(("127.0.0.1", args.port), handler, repo_root)
    url = f"http://127.0.0.1:{args.port}/notes-editor.html"

    print("Local notes admin is ready.")
    print(url)
    print("Press Ctrl+C to stop it.")
    if not args.no_open:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local notes admin.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
