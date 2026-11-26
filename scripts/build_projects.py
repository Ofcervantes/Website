"""Build the public site and turn files in project-docs/ into searchable articles."""

import argparse
import json
import re
import shutil
from datetime import date
from html import escape
from pathlib import Path
from textwrap import shorten
from urllib.parse import quote, urljoin, urlsplit, urlunsplit

from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parents[1]
MARKER = "<!-- project-articles -->"
PUBLIC_FILES = (
    "index.html", "about.html", "documentation.html", "projects.html", "portfolio.html",
    "notes.html", "style.css", "script.js", "site.json", "projects.json", "CNAME", ".nojekyll",
    "assets/af-logo.png", "assets/oswin-profile.png",
    "assets/Amplifier_Module/Amplifier_Module_FinalReport.pdf",
    "assets/LC_Filter/LCFilter_Design_Project.pdf",
    "assets/Volteon/Amazon_Project_Volteon.pdf",
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
    page = re.sub(r"<title>.*?</title>", lambda _: f"<title>{escape(title)} — Project documentation</title>", page, count=1)
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


def build(output):
    for name in PUBLIC_FILES:
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, destination)

    template = (ROOT / "documentation.html").read_text(encoding="utf-8-sig")
    if template.count(MARKER) != 1:
        raise ValueError(f"Expected one {MARKER} in documentation.html")
    sources = ROOT / "project-docs"
    articles = []
    for source in sorted(sources.rglob("*")):
        relative = source.relative_to(ROOT)
        if source.is_symlink() or not source.is_file() or any(part.startswith(".") for part in relative.parts):
            continue
        if source.suffix.lower() == ".md":
            record = render_project(source, relative, template, output)
            articles.append((article_date(source), record))
        elif source.suffix.lower() in IMAGE_EXTENSIONS:
            (output / relative).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, output / relative)

    articles.sort(key=lambda item: (-item[0].toordinal(), item[1]["title"].casefold()))
    rows = []
    for published, record in articles:
        title, summary, url = (escape(record[key]) for key in ("title", "summary", "url"))
        date_label = published.isoformat() if published != date.min else "Article"
        excerpt = f'<span class="document-summary">{summary}</span>' if summary else ""
        image = (f'<img class="document-thumbnail" src="{escape(record["thumbnail"])}" alt="" '
                 'loading="lazy" width="96" height="72">' if "thumbnail" in record else "")
        rows.append(f'<li><a href="{url}">{image}<span class="document-title">{title}</span>'
                    f'<span class="document-format">{date_label}</span>{excerpt}</a></li>')
    (output / "documentation.html").write_text(template.replace(MARKER, "\n".join(rows)), encoding="utf-8")
    records = [record for _, record in articles]
    (output / "project-articles.json").write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    print(f"Built {len(records)} project articles in {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "_site", help="Public output directory")
    build(parser.parse_args().output.resolve())
