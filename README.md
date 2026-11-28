# Oswin Cervantes's website

## Write in Obsidian

In Obsidian, choose **Open folder as vault** and select this repository's top-level folder (the one containing this README). New notes go in `project-docs/` as Projects. Create a note in `project-docs/articles/` for an Article. Pasting a picture saves it in `project-docs/attachments/`. Obsidian writes relative Markdown links that work on the site. [Obsidian’s vault guide](https://help.obsidian.md/vault)

After saving your changes, run these commands in a terminal from the same folder.

```sh
git add -- project-docs subjects.json
git diff --cached --stat
git commit -m "Publish my latest notes"
git push origin main
```

The first command stages all changed notes, attachments, and subject labels. To publish one note, list its path and any new images after `git add --`. GitHub Pages rebuilds the site after the push.

## Add a reference

| Label | Where to put it | Example |
| --- | --- | --- |
| Article | A Markdown file in `project-docs/articles/` | [Voltage gain in decibels](project-docs/articles/voltage-gain.md) |
| Project | A Markdown file directly in `project-docs/` | [A code-controlled differential amplifier](project-docs/amplifier-module.md) |
| PDF | A PDF anywhere in `project-docs/` | [On-chip LC filter design presentation](assets/LC_Filter/LCFilter_Design_Project.pdf) |

For Markdown, start with `# Your title`. The first paragraph appears in the list. To add a picture, put it next to the file and write `![Circuit diagram](circuit.png)`. The first picture also becomes the thumbnail. A new PDF takes its title from its filename, so `lab-notes.pdf` appears as “lab notes”.

Commit and push to `main` to publish. The site adds the entry to Documentation and assigns its type automatically.

## Edit subject labels

Open [subjects.json](subjects.json). Each entry pairs a file's path in this repository with its subject labels. For example, the voltage-gain note covers both logarithms and circuit design.

```json
{
  "project-docs/articles/voltage-gain.md": ["Math", "Engineering"]
}
```

Use any subject name, including a phrase like `Applied Math`. The labels appear beside the document and in the subject filter when you rebuild. Files without labels still appear under **All subjects**.

## Learn the code

- [documentation.html](documentation.html) contains the search box, filters, and list. [search.js](search.js) hides rows that don’t match.
- [index.html](index.html) lays out About. [random.html](random.html) holds the favorite paintings and music player. [style.css](style.css) styles the site. [gallery.js](gallery.js) advances the paintings every six seconds.
- [site.json](site.json) holds the profile and coursework. [script.js](script.js) displays them. Keep the built-in About text in sync for readers with JavaScript disabled.
- [build_projects.py](scripts/build_projects.py) turns Markdown into pages and lists the PDFs. [projects.json](projects.json) supplies the titles and links for the original presentation PDFs.

## Preview locally

From the repository root, run the following commands, then open [the local site](http://localhost:8000).

```sh
python -m pip install markdown-it-py==3.0.0
python scripts/build_projects.py
python -m http.server 8000 --directory _site
```

Run the build again after editing a file, then refresh the page.

## Painting credits

- *Two Men Contemplating the Moon* by Caspar David Friedrich, ca. 1825–30. Public-domain image from [The Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/438417).
- *The Sea of Ice* by Caspar David Friedrich, 1823–24, Hamburger Kunsthalle. [Museum exhibition record](https://cdfriedrich.de/en/chronicle/das-eismeer/) and [public-domain reproduction](https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Das_Eismeer_-_Hamburger_Kunsthalle.jpg).
