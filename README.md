# Oswin Cervantes's website

## Publish a project write-up

1. Sign in to GitHub, open this repository’s [project-docs folder](project-docs/), and choose **Add file → Create new file**.
2. Give the file a descriptive name ending in `.md`, such as `filter-design.md`.
3. Start with a single `# Project title`. The first paragraph appears below the title in the list. Use `##` for sections. Use GitHub’s **Preview** tab to check formatting.
4. Commit to `main`, or merge your pull request into `main`. GitHub Pages builds the article, adds it to Documentation, and includes its text in search.

The [amplifier write-up](project-docs/amplifier-module.md) is a working example. To revise an article, edit its Markdown file and commit again. Keep its filename to preserve the published URL.

To include an image, save it alongside the Markdown file (or in a subfolder) and reference it where it belongs, for example `![Amplifier circuit schematic](images/amplifier.png)`. The first image also appears as the article’s thumbnail in Documentation. Images are optional.

## Edit the site

- Update the profile, contact details, and coursework in `site.json`. Keep the corresponding HTML in `index.html` in sync for readers with JavaScript disabled.
- Update PDF titles and links in `projects.json` and their fallback list in `documentation.html`. The build script stages the site's public files and assets.

## Preview locally

From the repository root, run the following commands, then open [the local site](http://localhost:8000).

```sh
python -m pip install markdown-it-py==3.0.0
python scripts/build_projects.py
python -m http.server 8000 --directory _site
```

Rebuild after editing a Markdown file to refresh the local article and search index.

## Painting credits

- *Two Men Contemplating the Moon* by Caspar David Friedrich, ca. 1825–30. Public-domain image from [The Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/438417).
- *The Sea of Ice* by Caspar David Friedrich, 1823–24, Hamburger Kunsthalle. [Museum exhibition record](https://cdfriedrich.de/en/chronicle/das-eismeer/) and [public-domain reproduction](https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Das_Eismeer_-_Hamburger_Kunsthalle.jpg).
