(function () {
  "use strict";

  const form = document.getElementById("notes-editor-form");
  const titleInput = document.getElementById("note-title");
  const dateInput = document.getElementById("note-date");
  const bodyInput = document.getElementById("note-body");
  const filenameOutput = document.getElementById("filename-output");
  const preview = document.getElementById("note-preview");
  const copyButton = document.getElementById("copy-markdown");
  const clearButton = document.getElementById("clear-note");
  const status = document.getElementById("editor-status");
  const saveButton = form?.querySelector('button[type="submit"]');

  if (
    !form ||
    !titleInput ||
    !dateInput ||
    !bodyInput ||
    !filenameOutput ||
    !preview ||
    !copyButton ||
    !clearButton ||
    !status ||
    !saveButton
  ) {
    return;
  }

  function slugify(value) {
    const slug = String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "");

    return `${slug || "untitled-note"}.md`;
  }

  function buildMarkdown() {
    const title = titleInput.value.trim() || "Untitled note";
    const date = dateInput.value;
    const body = bodyInput.value.replace(/\r\n?/g, "\n").replace(/\n+$/g, "");
    const sections = [`# ${title}`];

    if (date) sections.push(`**Date:** ${date}`);
    if (body.trim()) sections.push(body);

    return `${sections.join("\n\n")}\n`;
  }

  function updatePreview() {
    filenameOutput.textContent = slugify(titleInput.value);
    preview.textContent = buildMarkdown();
  }

  function setStatus(message, kind = "") {
    status.textContent = message;
    if (kind) {
      status.dataset.kind = kind;
    } else {
      delete status.dataset.kind;
    }
  }

  function requireTitle() {
    if (titleInput.checkValidity()) return true;

    titleInput.reportValidity();
    titleInput.focus();
    setStatus("Add a title before downloading or copying the note.", "error");
    return false;
  }

  async function saveNote() {
    if (!requireTitle()) return;

    saveButton.disabled = true;
    setStatus("Saving through the local notes backend…");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleInput.value.trim(),
          date: dateInput.value,
          body: bodyInput.value,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || `The backend returned ${response.status}.`);
      }

      setStatus(`Saved ${result.filename} and refreshed the notes manifest.`, "success");
    } catch (error) {
      setStatus(
        error.message || "The local backend could not save this note.",
        "error"
      );
    } finally {
      saveButton.disabled = false;
    }
  }

  async function checkBackend() {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setStatus("Local notes backend connected.", "success");
    } catch (_error) {
      setStatus("Start the local notes backend with: python3 scripts/notes_admin.py", "error");
    }
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (_error) {
        // Try the selection-based fallback below.
      }
    }

    const fallback = document.createElement("textarea");
    fallback.value = value;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.left = "-9999px";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();
    fallback.setSelectionRange(0, fallback.value.length);

    const copied = document.execCommand("copy");
    fallback.remove();
    if (!copied) throw new Error("The browser did not allow clipboard access.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveNote();
  });

  [titleInput, dateInput, bodyInput].forEach((input) => {
    input.addEventListener("input", updatePreview);
  });

  copyButton.addEventListener("click", async () => {
    if (!requireTitle()) return;

    try {
      await copyText(buildMarkdown());
      setStatus("Markdown copied to the clipboard.", "success");
    } catch (_error) {
      setStatus("The browser could not copy the note. Select the safe preview and copy it manually.", "error");
    }
  });

  clearButton.addEventListener("click", () => {
    const hasDraft = titleInput.value || dateInput.value || bodyInput.value;
    if (!hasDraft) {
      setStatus("The editor is already clear.");
      titleInput.focus();
      return;
    }

    const shouldClear = window.confirm("Clear the title, date, and Markdown? This cannot be undone.");
    if (!shouldClear) {
      setStatus("Clear canceled.");
      return;
    }

    form.reset();
    updatePreview();
    setStatus("The note was cleared.", "success");
    titleInput.focus();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveNote();
    }
  });

  updatePreview();
  checkBackend();
})();
