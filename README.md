# Oswin's website

This is a simple, multi-page static website. It uses plain HTML, CSS, JavaScript, and JSON, so there is no build step or framework to maintain. GitHub Pages publishes the files in this repository.

## Make changes

You can edit the site in any text editor, including GitHub's built-in file editor.

For most updates, you only need three places:

- Change your profile, contact details, coursework, experience, skills, focus areas, or home paintings in `site.json`.
- Add or edit projects in `projects.json`.
- Add writing by dropping a PDF or Markdown file into `notes/`.

The remaining files control page-specific writing and the visual design:

- `index.html` is the home page. Edit its introduction and section descriptions directly.
- `about.html` is the longer about page. Edit its biography paragraphs directly; its structured sections come from `site.json`.
- `projects.html` shows expanded project sections and includes the button that assembles the print-ready PDF portfolio from `site.json` and `projects.json`.
- `portfolio.html` only redirects older portfolio links to the Projects page; normal edits do not belong there.
- `style.css` controls the appearance shared by every page.
- `assets/af-logo.png` is the shared header logo.
- `assets/oswin-profile.png` is the home-page portrait.
- `assets/Oswin_Cervantes_Resume.pdf` is the resume opened by the CV link beside LinkedIn.

## Quick content updates

### Add a project

1. Open `projects.json`.
2. Copy one existing project object inside the `projects` array.
3. Paste it at the top of the array, replace the text, and save.
4. Refresh `projects.html` to review it.

Only `name` and `desc` are required. `tags`, `links`, and `date` are optional. The `_editingGuide` at the top of `projects.json` is for you and is ignored by the website. You do not need to edit HTML, CSS, or JavaScript when adding a project.

### Add a note

1. Run `python3 scripts/notes_admin.py` from the repository folder.
2. Use the private editor that opens, then choose **Save note**.
3. Review the local Notes page and commit and push when ready.

The editor creates the Markdown file and refreshes the note list automatically. You do not need to edit `notes/manifest.json`. For the manual file workflow, see [Add a note](#add-a-note-1) below.

### Change the home-page paintings

The `backgrounds` array in `site.json` controls the randomized painting behind the home page. About, Projects, and Notes always keep their plain backgrounds. Each full home-page load selects one valid entry and avoids immediately repeating the previous painting in the same browser tab.

Each background has five editable values:

```json
{
  "src": "assets/backgrounds/your-image.webp",
  "mobileSrc": "assets/backgrounds/your-image-portrait.webp",
  "title": "Artwork title — Artist",
  "position": "center center",
  "mobilePosition": "center center"
}
```

- `src` is the desktop image path. Put optimized WebP images in `assets/backgrounds/`; roughly 1600–2400 pixels wide is usually enough.
- `mobileSrc` is an optional portrait crop for phones. If it is missing or invalid, the desktop image is used.
- `title` identifies the artwork and is stored on the page as metadata.
- `position` and `mobilePosition` control the desktop and phone crops used by `background-size: cover`. Use safe keywords such as `left`, `center`, or `right`, or percentages such as `62% 58%`.

Add, remove, or reorder objects in the array without changing the JavaScript. If the array is empty or cannot be loaded, the home page falls back to its normal plain background.

### Update profile or contact details

Open `site.json` to change the name, large home-page role and statement, education, focus summary, location, photo, email, LinkedIn URL, resume path, GitHub URL, or YouTube URL in one place. Keep the quotation marks and commas valid JSON. The email value should start with `mailto:`.

To update the resume, edit `resume/Oswin_Cervantes_Resume.tex` and run `./scripts/build_resume.sh`. The script rebuilds `assets/Oswin_Cervantes_Resume.pdf`, so the existing website links continue to work without HTML changes.

To change the logo, replace `assets/af-logo.png` with another transparent PNG using the same filename. To change the portrait, add the new image in `assets/` and update `profile.photo` in `site.json`.

The HTML keeps fallback copies of these details so the pages remain readable if JavaScript is unavailable. Elements connected to `site.json` use one of these attributes:

- `data-site-text="profile.fullName"` replaces an element's visible text.
- `data-site-href="contact.github"` replaces a link's destination.
- `data-site-src="profile.photo"` replaces an image source.
- `data-site-alt="profile.photoAlt"` replaces image alternative text.

The large home-page hero uses `data-site-text="profile.fullName"`, `data-site-text="profile.role"`, and `data-site-text="profile.statement"`. Edit those three values in `site.json`; the layout stays in `index.html`.

If you add another repeated value, put it in `site.json` and mark the matching HTML element with the appropriate attribute. Leave sensible text, links, and image paths in the HTML as a no-JavaScript fallback.

### Update coursework, experience, skills, or areas of focus

The About page reads these structured sections from `site.json`, so normal content changes do not require editing HTML. Add, remove, or reorder objects in these arrays:

```json
"coursework": [
  {
    "group": "Subject area",
    "items": [
      "Class one",
      {
        "code": "8.20",
        "title": "Linked class",
        "url": "https://example.com/",
        "level": "Graduate level"
      }
    ]
  }
],
"experience": [
  {
    "role": "Role title",
    "organization": "Organization",
    "organizationUrl": "https://example.com/",
    "dates": "Month Year - Present",
    "location": "City, State",
    "summary": "One public-facing sentence about the work."
  }
],
"skills": [
  {
    "group": "Skill group",
    "sections": [
      {
        "name": "Subcategory",
        "items": ["Skill one", "Skill two"]
      }
    ]
  }
],
"focusAreas": [
  {
    "title": "Focus area",
    "description": "One short explanation."
  }
]
```

Coursework items may be simple text or a structured object. The `url` and `level` fields are optional; a level containing “Graduate” appears as a dark-green badge, while the level “Coursera” appears as a blue badge. `organizationUrl` is also optional. Keep the quotation marks and commas valid JSON. The HTML contains matching fallback content so the page remains readable if JavaScript is unavailable.

### Create the PDF portfolio

Open `projects.html` through the local preview or published website. The normal page shows the expanded projects, while its Portfolio PDF button adds the print cover, experience, skills, and coursework from `site.json` and `projects.json`.

1. Wait until the PDF panel says the content is ready.
2. Choose **Save PDF**.
3. Select **Save as PDF** in the browser print dialog.
4. Turn off the browser’s own headers and footers for the cleanest result.

The screen page and printed PDF have separate layouts, so you should not duplicate portfolio content in the HTML. Update the JSON files instead and both versions will stay synchronized automatically.

### Navigation and color theme

The responsive menu and theme switch do not need a framework. Their HTML hooks are:

```html
<button id="menu-toggle" type="button" aria-controls="primary-navigation" aria-expanded="false">
  Menu
</button>
<nav id="primary-navigation" aria-label="Primary navigation">
  <!-- page links -->
</nav>

<button id="theme-toggle" type="button" aria-pressed="false">
  <span data-theme-icon aria-hidden="true">☾</span>
  <span data-theme-label>Dark mode</span>
</button>
```

On small screens, CSS should hide `#primary-navigation` by default and show `#primary-navigation.is-open`. While the menu is open, JavaScript also adds `.menu-open` to `<body>`, which CSS may use to prevent background scrolling. The menu closes after a navigation click, an outside click, or Escape; Escape returns focus to the menu button.

The theme switch sets `data-theme="light"` or `data-theme="dark"` on the `<html>` element. CSS theme rules should therefore use selectors such as `:root[data-theme="dark"]`. The first visit follows the device color-scheme preference. A manual choice is saved in local storage under `oswin-theme`. The text and icon marked with `data-theme-label` and `data-theme-icon` automatically update to show the theme the button will switch to.

### Add or edit a project

Open `projects.json`. Each project is an object inside the `projects` list:

```json
{
  "name": "Project name",
  "desc": "A short, plain-language description.",
  "tags": ["Topic", "Tool"],
  "links": [
    {
      "label": "Read more",
      "url": "https://example.com"
    }
  ],
  "date": "Spring 2026",
  "portfolio": {
    "objective": "What the project was meant to accomplish.",
    "challenge": "Why the engineering problem was difficult.",
    "contribution": "What you personally designed, analyzed, built, or led.",
    "outcome": "What worked, measured results, and the delivered result.",
    "reflection": "Optional lessons or what you would change next time.",
    "media": [
      {
        "src": "assets/projects/example-result.png",
        "alt": "Accessible description of the project image",
        "caption": "Optional technical caption"
      }
    ]
  }
}
```

Keep the commas and quotation marks valid JSON. A project may omit `tags`, `links`, `date`, any portfolio field, or `media` when they are not needed. Links may also point to files in this repository, such as `assets/report.pdf`.

The Projects view uses `name`, `desc`, `tags`, `links`, and `date`, then expands the nested `portfolio` fields into each project section. The Portfolio PDF uses the same project sections in a print-ready layout. Keep the writing specific: explain the project’s purpose, the hard engineering constraint, your individual contribution, and a measurable or concrete outcome. Each project includes an Attachments area: add report, presentation, or other file links to its `links` array. Put project photographs, plots, schematics, or rendered layouts under `assets/projects/` and list them in `media`; both the page and PDF portfolio will include them automatically.

### Add a note

Note creation is a local-only admin task and is not linked from or deployed with the public website. From the repository folder, run:

```sh
python3 scripts/notes_admin.py
```

The command opens [http://127.0.0.1:8766/notes-editor.html](http://127.0.0.1:8766/notes-editor.html). Enter a title, optional date, and Markdown, then choose **Save note**. The loopback-only backend writes the file directly into `notes/` and refreshes `notes/manifest.json`. It refuses to overwrite an existing filename.

Review the archive at [http://127.0.0.1:8766/notes.html](http://127.0.0.1:8766/notes.html), then stop the admin with `Ctrl+C`.

You can also create a `.md` or `.markdown` file in any text editor, or add an existing PDF.

1. Put the `.md`, `.markdown`, or `.pdf` file in the `notes/` folder.
2. Use a clear filename, because the filename becomes the displayed title. For example, `fourier-transform-notes.pdf` becomes “Fourier Transform Notes.”
3. Run `python3 scripts/build_notes.py` after adding a file manually.
4. Commit and push the new note and manifest to the `main` branch.

The GitHub Action refreshes the manifest again before deployment. It assembles an explicit public-file allowlist, so the local editor, backend scripts, README, and repository internals are excluded from GitHub Pages.

## Preview locally

The project and note lists are loaded with `fetch`, so opening an HTML file directly from Finder may not work. Start a small local web server from the repository folder instead:

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. Stop the server with `Ctrl+C`.

## Publish updates

This repository is already configured for GitHub Pages and the `oswincervantes.com` custom domain.

1. Commit your changes and push them to the `main` branch.
2. Open the repository's **Actions** tab.
3. Wait for the “Build notes & deploy” workflow to finish.

Each push to `main` automatically refreshes the note list and publishes the latest version. If you ever move the site to a new repository, choose **GitHub Actions** under **Settings → Pages → Build and deployment**.
