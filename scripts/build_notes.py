#!/usr/bin/env python3
"""
Scans the /notes folder for .pdf and .md files and writes notes/manifest.json.
Runs automatically via GitHub Actions on every push (see .github/workflows/build-notes.yml).
You never edit this — just drop files in /notes and push.
"""
import json, os, datetime, re

NOTES_DIR = "notes"
OUT = os.path.join(NOTES_DIR, "manifest.json")
EXTS = {".pdf": "pdf", ".md": "md", ".markdown": "md"}

def human_size(n):
    for unit in ["B", "KB", "MB", "GB"]:
        if n < 1024:
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"

def title_from(name):
    stem = os.path.splitext(name)[0]
    stem = re.sub(r"[_\-]+", " ", stem)
    return stem.strip().title()

def main():
    notes = []
    for root, _, files in os.walk(NOTES_DIR):
        for fn in sorted(files):
            ext = os.path.splitext(fn)[1].lower()
            if ext not in EXTS:
                continue
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, ".").replace(os.sep, "/")
            st = os.stat(full)
            notes.append({
                "title": title_from(fn),
                "filename": fn,
                "path": rel,
                "type": EXTS[ext],
                "size": human_size(st.st_size),
                "modified": datetime.datetime.fromtimestamp(st.st_mtime, datetime.timezone.utc).isoformat(),
            })

    manifest = {
        "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "count": len(notes),
        "notes": notes,
    }
    os.makedirs(NOTES_DIR, exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote {OUT} with {len(notes)} note(s).")

if __name__ == "__main__":
    main()
