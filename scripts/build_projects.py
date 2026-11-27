"""Build the public site and turn files in project-docs/ into searchable articles."""

import argparse
import json
import re
import shutil
from datetime import date
from html import escape
from pathlib import Path
from textwrap import shorten
from urllib.parse import quote, unquote, urljoin, urlsplit, urlunsplit

from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = (
    "index.html", "about.html", "documentation.html", "projects.html", "portfolio.html",
    "notes.html", "style.css", "script.js", "gallery.js", "search.js",
    "site.json", "projects.json", "CNAME", ".nojekyll",
    "assets/af-logo.png", "assets/oswin-profile.png", "assets/oswin-portrait.webp",
    "assets/backgrounds/friedrich-the-lonely-tree.webp",
    "assets/backgrounds/friedrich-the-lonely-tree-portrait.webp",
    "assets/backgrounds/friedrich-evening.webp",
    "assets/backgrounds/friedrich-evening-portrait.webp",
    "assets/paintings/two-men-contemplating-the-moon.webp",
    "assets/paintings/the-sea-of-ice.webp",
)
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"}
MARKDOWN = MarkdownIt("commonmark", {"html": False}).enable(["table", "strikethrough"])


def inline_text(token):
    """Collect visible text without including emphasis markers or link destinations."""
    if token.type in ("softbreak", "hardbreak"):
        return " "
    if token.children:
        return "".join(inline_text(child) for child in token.children)
    return token.content


def article_link(value, article_url):
    """Resolve links in article content while the page chrome uses the site's root."""
    original = urlsplit(value)
    if original.scheme or original.netloc:
        return value
    url = urlsplit(urljoin(article_url, value))
    path = url.path
    if path.startswith("/project-docs/") and path.lower().endswith(".md"):
        path = path[:-3] + ".html"
    return urlunsplit(("", "", path, url.query, url.fragment))


def render_project(source, relative, template, output):
    url = "/" + quote(relative.with_suffix(".html").as_posix())
    tokens = MARKDOWN.parse(source.read_text(encoding="utf-8-sig"))
    title = ""
    summary = ""
    thumbnail = ""
    contents = []
    anchors = set()

    for index, token in enumerate(tokens):
        if token.type in ("fence", "code_block"):
            contents.append(token.content)
        if token.type != "inline":
            continue
        text = inline_text(token).strip()
        contents.append(text)
        opening = tokens[index - 1]
        if opening.type == "heading_open":
            if opening.tag == "h1" and not title:
                title = text
            base = re.sub(r"[^\w -]", "", text.lower()).replace(" ", "-") or "heading"
            anchor = base
            suffix = 0
            while anchor in anchors:
                suffix += 1
                anchor = f"{base}-{suffix}"
            anchors.add(anchor)
            opening.attrSet("id", anchor)
        if opening.type == "paragraph_open" and not summary:
            prose = "".join(inline_text(child) for child in token.children or [] if child.type != "image")
            summary = shorten(prose, width=180, placeholder="…")
        for child in token.children or []:
            if child.type == "link_open":
                child.attrSet("href", article_link(child.attrGet("href"), url))
            elif child.type == "image" and child.attrGet("src"):
                image_url = article_link(child.attrGet("src"), url)
                child.attrSet("src", image_url)
                if not thumbnail and urlsplit(image_url).scheme in ("", "https", "http"):
                    thumbnail = image_url

    body = MARKDOWN.renderer.render(tokens, MARKDOWN.options, {})
    if not title:
        title = re.sub(r"[-_]+", " ", source.stem).strip() or source.stem
        body = f"<h1>{escape(title)}</h1>\n" + body

    article = f'<main id="main-content" class="page-main"><article class="project-article">\n{body}</article></main>'
    page = re.sub(r"<main\b[^>]*>.*?</main>", lambda _: article, template, count=1, flags=re.S)
    page = page.replace("<head>", '<head>\n  <base href="/">', 1)
    page = page.replace('href="#main-content"', f'href="{escape(url)}#main-content"', 1)
    page = re.sub(r"<title>.*?</title>", lambda _: f"<title>{escape(title)} — Documentation</title>", page, count=1)
    page = re.sub(r'<meta name="description" content="[^"]*">', lambda _: f'<meta name="description" content="{escape(summary or title)}">', page, count=1)
    destination = output / relative.with_suffix(".html")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(page, encoding="utf-8")
    record = {"title": title, "summary": summary, "text": " ".join(" ".join(contents).split()), "url": url}
    if thumbnail:
        record["thumbnail"] = thumbnail
    return record


def article_date(path):
    """An optional YYYY-MM-DD- filename prefix orders dated entries newest first."""
    match = re.match(r"(\d{4}-\d{2}-\d{2})-", path.name)
    if match:
        try:
            return date.fromisoformat(match[1])
        except ValueError:
            pass
    return date.min


def copy_public_file(relative, output):
    destination = output / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / relative, destination)


def project_pdfs(output):
    pdfs = {}
    projects = json.loads((ROOT / "projects.json").read_text(encoding="utf-8-sig"))["projects"]
    for project in projects:
        name = project["name"]
        keywords = project.get("keywords", "")
        if isinstance(keywords, list):
            keywords = " ".join(keywords)
        search = f"{name} {keywords}".strip()
        for link in project.get("links", []):
            href = urljoin("/", link["url"].strip())
            url = urlsplit(href)
            if not url.path.lower().endswith(".pdf"):
                continue
            if url.scheme not in ("", "http", "https"):
                raise ValueError(f"Invalid PDF link in {name}: {href}")
            title = re.sub(r"\s*\(PDF\)$", "", link.get("label") or name, flags=re.I).strip()
            key = href
            if not url.scheme and not url.netloc:
                source = (ROOT / unquote(url.path).lstrip("/")).resolve()
                if source.suffix.lower() != ".pdf":
                    raise ValueError(f"Expected a PDF for {href}")
                relative = source.relative_to(ROOT)
                copy_public_file(relative, output)
                key = relative.as_posix()
                href = urlunsplit(("", "", "/" + quote(key), url.query, url.fragment))
            record = pdfs.setdefault(key, {"title": title, "url": href, "keywords": []})
            record["keywords"].append(search)
    return pdfs


def read_subjects():
    """Look up each document's labels by its source path in the repository."""
    path = ROOT / "subjects.json"
    if not path.is_file():
        return {}
    subjects = json.loads(path.read_text(encoding="utf-8-sig"))
    for source, labels in subjects.items():
        if not isinstance(labels, list) or not all(isinstance(label, str) for label in labels):
            raise ValueError(f"Expected a list of subject names for {source} in subjects.json")
        cleaned = []
        for label in labels:
            label = label.strip()
            if label and label not in cleaned:
                cleaned.append(label)
        subjects[source] = cleaned
    return subjects


def document_row(kind, title, url, text="", *, summary="", thumbnail="", published=date.min, subjects=()):
    label = "PDF" if kind == "pdf" else kind.title()
    if published != date.min:
        label += f" · {published.isoformat()}"
    hidden = " hidden" if kind in ("about", "coursework") else ""
    subject_labels = "".join(f' <span class="document-subject">{escape(subject)}</span>' for subject in subjects)
    image = (f'<img class="document-thumbnail" src="{escape(thumbnail)}" alt="" loading="lazy" '
             'width="96" height="72">' if thumbnail else "")
    excerpt = f'<span class="document-summary">{escape(summary)}</span>' if summary else ""
    return (f'<li data-type="{kind}" data-search="{escape(text)}"{hidden}><a href="{escape(url)}">{image}'
            f'<span class="document-title">{escape(title)}</span>'
            f'<span class="document-meta"><span class="document-format">{label}</span>{subject_labels}</span>'
            f'{excerpt}</a></li>')


def about_rows(settings):
    profile = settings.get("profile")
    if profile:
        yield document_row("about", f'About {profile.get("fullName", "")}'.strip(), "index.html",
                           f'{profile.get("role", "")} {profile.get("statement", "")}')
    paintings = settings.get("paintings")
    if paintings:
        text = " ".join([paintings.get("artist", ""), *paintings.get("titles", [])])
        yield document_row("about", "My favorite paintings", "index.html#favorite-paintings", text)
    yield document_row("about", "Oswin Mix", "index.html#playlist", "YouTube music playlist")
    for index, group in enumerate(settings.get("coursework", []), start=1):
        if not isinstance(group, dict) or not isinstance(group.get("items"), list):
            continue
        name = group.get("group") or group.get("name") or ""
        for course in group["items"]:
            if not isinstance(course, dict):
                course = {"label": course}
            parts = (course.get("code"), course.get("title"))
            title = str(course.get("label") or " · ".join(str(part) for part in parts if part)).strip()
            if title:
                yield document_row("coursework", title, f"index.html#coursework-{index}",
                                   f'{name} {course.get("level") or ""}')


def build(output):
    for name in PUBLIC_FILES:
        copy_public_file(name, output)

    template = (ROOT / "documentation.html").read_text(encoding="utf-8-sig")
    list_marker = "<!-- document-list -->"
    if template.count(list_marker) != 1:
        raise ValueError(f"Expected one {list_marker} in documentation.html")
    sources = ROOT / "project-docs"
    articles = []
    pdfs = project_pdfs(output)
    subjects = read_subjects()
    for source in sorted(sources.rglob("*")):
        relative = source.relative_to(ROOT)
        if source.is_symlink() or not source.is_file() or any(part.startswith(".") for part in relative.parts):
            continue
        if source.suffix.lower() == ".md":
            record = render_project(source, relative, template, output)
            record["type"] = "article" if relative.parts[1] == "articles" else "project"
            record["subjects"] = subjects.get(relative.as_posix(), [])
            articles.append((article_date(source), record))
        elif source.suffix.lower() == ".pdf":
            key = relative.as_posix()
            if key not in pdfs:
                copy_public_file(relative, output)
                title = re.sub(r"[-_]+", " ", source.stem).strip()
                pdfs[key] = {"title": title, "url": "/" + quote(key), "keywords": []}
        elif source.suffix.lower() in IMAGE_EXTENSIONS:
            copy_public_file(relative, output)

    articles.sort(key=lambda item: (-item[0].toordinal(), item[1]["title"].casefold()))
    rows = []
    for published, record in articles:
        rows.append(document_row(record["type"], record["title"], record["url"], record["text"],
                                 summary=record["summary"], thumbnail=record.get("thumbnail"),
                                 published=published, subjects=record["subjects"]))
    for path, pdf in pdfs.items():
        labels = subjects.get(path, [])
        rows.append(document_row("pdf", pdf["title"], pdf["url"], " ".join(pdf["keywords"]), subjects=labels))
    settings = json.loads((ROOT / "site.json").read_text(encoding="utf-8-sig"))
    rows.extend(about_rows(settings))
    page = template.replace(list_marker, "\n".join(rows))
    (output / "documentation.html").write_text(page, encoding="utf-8")
    records = [record for _, record in articles]
    (output / "project-articles.json").write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    print(f"Built {len(records)} Markdown pages and {len(pdfs)} PDFs in {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "_site", help="Public output directory")
    build(parser.parse_args().output.resolve())
