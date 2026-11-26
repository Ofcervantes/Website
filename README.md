# Oswin Cervantes's website

## Add a reference

| Label | Where to put it | Example |
| --- | --- | --- |
| Article | A Markdown file in `project-docs/articles/` | [Voltage gain in decibels](project-docs/articles/voltage-gain.md) |
| Project | A Markdown file directly in `project-docs/` | [A code-controlled differential amplifier](project-docs/amplifier-module.md) |
| PDF | A PDF anywhere in `project-docs/` | [On-chip LC filter design presentation](assets/LC_Filter/LCFilter_Design_Project.pdf) |

For Markdown, start with `# Your title`. The first paragraph appears in the list. To add a picture, put it next to the file and write `![Circuit diagram](circuit.png)`. The first picture also becomes the thumbnail. A new PDF takes its title from its filename, so `lab-notes.pdf` appears as “lab notes”.

Commit and push to `main` to publish. The site adds the entry to Documentation and assigns its label automatically.

## Learn the code

- [documentation.html](documentation.html) contains the search box, type dropdown, and list. [search.js](search.js) hides rows that don’t match.
- [index.html](index.html) lays out About. [style.css](style.css) styles both pages. [gallery.js](gallery.js) advances the paintings every six seconds.
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
