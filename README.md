# Oswin Cervantes's website

A small site with an About page and a Documentation page for project PDFs. The domain is oswincervantes.com.

## Edit the site

- Update profile, contact details, and coursework in **site.json**.
- Update document labels and PDF links in **projects.json**. Its **projects** array groups links by project name.
- Keep the fallback content in **index.html** and **documentation.html** in sync with the JSON. It appears when JavaScript or the JSON is unavailable.
- If you add or replace a PDF or image, update the asset paths in **.github/workflows/build-notes.yml** so the file deploys.

## Preview locally

Run this from the repository root and open **http://localhost:8000**.

    python -m http.server 8000

GitHub Actions publishes the public pages and their assets from **main** to GitHub Pages.

The legacy note writer runs locally with **python scripts/notes_admin.py**. Its editor, API, and notes are excluded from deployment.
