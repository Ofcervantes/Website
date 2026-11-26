(function () {
  "use strict";

  const HTML_ENTITIES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
  }

  function safeHref(value, allowedProtocols = ["http:", "https:", "mailto:"]) {
    const href = String(value ?? "").trim();
    if (!href) return "";

    try {
      const parsed = new URL(href, window.location.href);
      return allowedProtocols.includes(parsed.protocol) ? href : "";
    } catch (_error) {
      return "";
    }
  }

  function linkAttributes(href) {
    let isExternal = false;

    try {
      const parsed = new URL(href, window.location.href);
      isExternal = parsed.protocol === "http:" || parsed.protocol === "https:"
        ? parsed.origin !== window.location.origin
        : false;
    } catch (_error) {
      return "";
    }

    return isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
  }

  function getSetting(settings, path) {
    if (!path) return undefined;

    return path.split(".").reduce((value, key) => {
      if (
        value === null ||
        typeof value !== "object" ||
        !Object.prototype.hasOwnProperty.call(value, key)
      ) {
        return undefined;
      }
      return value[key];
    }, settings);
  }

  function normalizeCourseworkItem(item) {
    if (item && typeof item === "object") {
      const label = String(
        item.label || [item.code, item.title].filter(Boolean).join(" · ")
      ).trim();
      if (!label) return null;
      return {
        label,
        href: safeHref(item.url),
        level: String(item.level || "").trim(),
      };
    }

    const label = String(item || "").trim();
    return label ? { label, href: "", level: "" } : null;
  }

  function renderCoursework(container, groups) {
    if (!container || !Array.isArray(groups)) return;

    const validGroups = groups
      .filter((group) => group && typeof group === "object")
      .map((group) => ({
        name: String(group.group || group.name || "Coursework").trim(),
        items: Array.isArray(group.items)
          ? group.items.map(normalizeCourseworkItem).filter(Boolean)
          : [],
      }))
      .filter((group) => group.items.length);

    if (!validGroups.length) return;

    container.innerHTML = validGroups
      .map((group) => `
        <article class="coursework-card">
          <h3>${escapeHtml(group.name)}</h3>
          <ul class="coursework-list">
            ${group.items.map((item) => {
              const label = escapeHtml(item.label);
              const labelMarkup = item.href
                ? `<a href="${escapeHtml(item.href)}"${linkAttributes(item.href)}>${label}</a>`
                : label;
              const normalizedLevel = item.level.toLowerCase();
              const isGraduate = normalizedLevel.includes("graduate");
              const isCoursera = normalizedLevel === "coursera";
              const levelClass = isGraduate
                ? " course-level--graduate"
                : isCoursera
                  ? " course-level--coursera"
                  : "";
              const levelMarkup = item.level
                ? `<span class="course-level${levelClass}">${escapeHtml(item.level)}</span>`
                : "";
              return `<li><span class="course-name">${labelMarkup}</span>${levelMarkup}</li>`;
            }).join("")}
          </ul>
        </article>`)
      .join("");
  }

  async function loadSiteSettings() {
    const textElements = [...document.querySelectorAll("[data-site-text]")];
    const linkElements = [...document.querySelectorAll("[data-site-href]")];
    const sourceElements = [...document.querySelectorAll("[data-site-src]")];
    const altElements = [...document.querySelectorAll("[data-site-alt]")];
    const courseworkContainer = document.getElementById("coursework-list");

    if (
      !textElements.length &&
      !linkElements.length &&
      !sourceElements.length &&
      !altElements.length &&
      !courseworkContainer
    ) {
      return;
    }

    try {
      const settings = await fetchJson("site.json");

      renderCoursework(courseworkContainer, settings.coursework);

      textElements.forEach((element) => {
        const value = getSetting(settings, element.dataset.siteText);
        if (typeof value === "string" || typeof value === "number") {
          element.textContent = String(value);
        }
      });

      linkElements.forEach((element) => {
        const href = safeHref(getSetting(settings, element.dataset.siteHref));
        if (!href) return;

        element.setAttribute("href", href);

        let isExternal = false;
        try {
          const parsed = new URL(href, window.location.href);
          isExternal = ["http:", "https:"].includes(parsed.protocol)
            && parsed.origin !== window.location.origin;
        } catch (_error) {
          return;
        }

        if (isExternal) {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        } else {
          element.removeAttribute("target");
          element.removeAttribute("rel");
        }
      });

      sourceElements.forEach((element) => {
        const src = safeHref(getSetting(settings, element.dataset.siteSrc));
        if (src) element.setAttribute("src", src);
      });

      altElements.forEach((element) => {
        const alt = getSetting(settings, element.dataset.siteAlt);
        if (typeof alt === "string") element.setAttribute("alt", alt);
      });
    } catch (error) {
      // The HTML contains usable fallback content, so a settings error is non-blocking.
      console.warn("Could not load site.json; keeping the HTML fallback content", error);
    }
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load " + path);
    return response.json();
  }

  async function loadProjectDocuments() {
    const list = document.getElementById("project-documents");
    if (!list) return;

    try {
      const { projects } = await fetchJson("projects.json");
      if (!Array.isArray(projects)) throw new Error("Expected a projects array");

      const documents = projects.flatMap((project) =>
        (project?.links ?? []).map((link) => ({
          href: safeHref(link?.url, ["http:", "https:"]),
          title: String(link?.label || project?.name || "").replace(/\s*\(PDF\)$/i, "").trim(),
        }))
      );

      const rows = documents.map(({ href, title }) => {
        if (!href || !title || !/\.pdf$/i.test(new URL(href, window.location.href).pathname)) {
          throw new Error("Expected a title and PDF link");
        }

        const item = document.createElement("li");
        const link = document.createElement("a");
        const label = document.createElement("span");
        const format = document.createElement("span");

        link.href = href;
        label.className = "document-title";
        label.textContent = title;
        format.className = "document-format";
        format.textContent = "PDF";
        link.append(label, format);
        item.append(link);
        return item;
      });

      list.replaceChildren(...rows);
    } catch (error) {
      console.warn("Keeping the static document links", error);
    }
  }

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  loadSiteSettings();
  loadProjectDocuments();
})();
