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

  function safeHref(value) {
    const href = String(value ?? "").trim();
    if (!href) return "";

    try {
      const parsed = new URL(href, window.location.href);
      const allowedProtocols = new Set(["http:", "https:", "mailto:"]);
      return allowedProtocols.has(parsed.protocol) ? href : "";
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

  function safeBackgroundUrl(value) {
    const href = safeHref(value);
    if (!href) return "";

    try {
      const parsed = new URL(href, window.location.href);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch (_error) {
      return "";
    }
  }

  function safeBackgroundPosition(value) {
    const position = String(value ?? "").trim().toLowerCase();
    const tokens = position.split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens.length > 2) return "center center";

    const keywords = new Set(["left", "center", "right", "top", "bottom"]);
    const isSafeToken = (token) => {
      if (keywords.has(token)) return true;
      if (!/^\d{1,3}(?:\.\d+)?%$/.test(token)) return false;
      const percentage = Number.parseFloat(token);
      return percentage >= 0 && percentage <= 100;
    };

    return tokens.every(isSafeToken) ? tokens.join(" ") : "center center";
  }

  function applyRandomHomeBackground(backgrounds) {
    if (!document.querySelector(".home-main") || !Array.isArray(backgrounds)) return;

    const validBackgrounds = backgrounds
      .map((background) => {
        if (!background || typeof background !== "object") return null;

        const src = safeBackgroundUrl(background.src);
        if (!src) return null;

        return {
          src,
          mobileSrc: safeBackgroundUrl(background.mobileSrc) || src,
          title: String(background.title || "Background artwork").trim().slice(0, 200),
          position: safeBackgroundPosition(background.position),
          mobilePosition: safeBackgroundPosition(
            background.mobilePosition ?? background.position
          ),
        };
      })
      .filter(Boolean);

    if (!validBackgrounds.length) return;

    const storageKey = "oswin-last-background";
    let previousSrc = "";
    try {
      previousSrc = window.sessionStorage.getItem(storageKey) || "";
    } catch (_error) {
      // Random selection still works if session storage is unavailable.
    }

    const candidates = validBackgrounds.length > 1
      ? validBackgrounds.filter((background) => background.src !== previousSrc)
      : validBackgrounds;
    const pool = candidates.length ? candidates : validBackgrounds;
    const selected = pool[Math.floor(Math.random() * pool.length)];

    document.body.style.setProperty("--home-background-image", `url("${selected.src}")`);
    document.body.style.setProperty("--home-background-position", selected.position);
    document.body.style.setProperty(
      "--home-background-image-mobile",
      `url("${selected.mobileSrc}")`
    );
    document.body.style.setProperty(
      "--home-background-position-mobile",
      selected.mobilePosition
    );
    document.body.dataset.backgroundArtwork = selected.title;
    document.body.classList.add("has-art-background");

    document.querySelectorAll("[data-background-title]").forEach((element) => {
      element.textContent = selected.title;
    });

    try {
      window.sessionStorage.setItem(storageKey, selected.src);
    } catch (_error) {
      // The background is still applied when session storage is unavailable.
    }
  }

  function setupMobileNavigation() {
    const toggle = document.getElementById("menu-toggle");
    const navigation = document.getElementById("primary-navigation");
    if (!toggle || !navigation) return;

    const setMenuOpen = (isOpen, returnFocus = false) => {
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
      navigation.classList.toggle("is-open", isOpen);
      document.body.classList.toggle("menu-open", isOpen);

      if (!isOpen && returnFocus) toggle.focus();
    };

    toggle.setAttribute("aria-controls", "primary-navigation");
    setMenuOpen(false);

    toggle.addEventListener("click", () => {
      setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false, true);
      }
    });

    document.addEventListener("click", (event) => {
      if (
        toggle.getAttribute("aria-expanded") === "true" &&
        !toggle.contains(event.target) &&
        !navigation.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    });
  }

  function setupTheme() {
    const root = document.documentElement;
    const toggle = document.getElementById("theme-toggle");
    const mediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    const storageKey = "oswin-theme";
    const validThemes = new Set(["light", "dark"]);
    let followsSystem = true;

    const readSavedTheme = () => {
      try {
        const savedTheme = window.localStorage.getItem(storageKey);
        return validThemes.has(savedTheme) ? savedTheme : null;
      } catch (_error) {
        return null;
      }
    };

    const saveTheme = (theme) => {
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch (_error) {
        // The selected theme still works for this page if storage is unavailable.
      }
    };

    const updateToggle = (theme) => {
      if (!toggle) return;

      const nextTheme = theme === "dark" ? "light" : "dark";
      const label = toggle.querySelector("[data-theme-label]");
      const icon = toggle.querySelector("[data-theme-icon]");

      toggle.setAttribute("aria-pressed", String(theme === "dark"));
      toggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
      toggle.setAttribute("title", `Switch to ${nextTheme} theme`);

      if (label) label.textContent = `${nextTheme === "dark" ? "Dark" : "Light"} mode`;
      if (icon) {
        icon.textContent = nextTheme === "dark" ? "☾" : "☀";
        icon.setAttribute("aria-hidden", "true");
      }
    };

    const applyTheme = (theme, persist = false) => {
      const resolvedTheme = validThemes.has(theme) ? theme : "light";
      root.dataset.theme = resolvedTheme;
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.setAttribute("content", resolvedTheme === "dark" ? "#111827" : "#ffffff");
      updateToggle(resolvedTheme);
      if (persist) saveTheme(resolvedTheme);
    };

    const savedTheme = readSavedTheme();
    followsSystem = !savedTheme;
    applyTheme(savedTheme || (mediaQuery?.matches ? "dark" : "light"));

    if (toggle) {
      toggle.addEventListener("click", () => {
        followsSystem = false;
        applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
      });
    }

    const handleSystemThemeChange = (event) => {
      if (followsSystem) applyTheme(event.matches ? "dark" : "light");
    };

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }
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

  function renderExperience(container, entries) {
    if (!container || !Array.isArray(entries)) return;

    const validEntries = entries.filter((entry) => entry && typeof entry === "object");
    if (!validEntries.length) return;

    container.innerHTML = validEntries
      .map((entry) => {
        const role = entry.role || "Experience";
        const organization = String(entry.organization || "").trim();
        const organizationUrl = safeHref(entry.organizationUrl);
        const organizationMarkup = organizationUrl
          ? `<a href="${escapeHtml(organizationUrl)}"${linkAttributes(organizationUrl)}>${escapeHtml(organization)}</a>`
          : escapeHtml(organization);
        const metadata = [entry.dates, entry.location]
          .filter((value) => String(value || "").trim())
          .map((value) => `<span>${escapeHtml(value)}</span>`)
          .join("");

        return `
          <article class="experience-entry">
            <div>
              <h3>${escapeHtml(role)}</h3>
              ${organization ? `<p class="experience-organization">${organizationMarkup}</p>` : ""}
            </div>
            <div class="experience-details">
              ${metadata ? `<p class="experience-meta">${metadata}</p>` : ""}
              ${entry.summary ? `<p class="experience-summary">${escapeHtml(entry.summary)}</p>` : ""}
            </div>
          </article>`;
      })
      .join("");
  }

  function renderSkills(container, groups) {
    if (!container || !Array.isArray(groups)) return;

    const validGroups = groups
      .filter((group) => group && typeof group === "object")
      .map((group) => {
        const sections = Array.isArray(group.sections)
          ? group.sections
            .filter((section) => section && typeof section === "object")
            .map((section) => ({
              name: String(section.name || "").trim(),
              items: Array.isArray(section.items)
                ? section.items.filter((item) => String(item || "").trim())
                : [],
            }))
            .filter((section) => section.items.length)
          : [];

        const flatItems = Array.isArray(group.items)
          ? group.items.filter((item) => String(item || "").trim())
          : [];

        if (!sections.length && flatItems.length) {
          sections.push({ name: "", items: flatItems });
        }

        return {
          name: String(group.group || group.name || "Skills").trim(),
          sections,
        };
      })
      .filter((group) => group.sections.length);

    if (!validGroups.length) return;

    container.innerHTML = validGroups
      .map((group) => `
        <article class="skill-card">
          <h3>${escapeHtml(group.name)}</h3>
          ${group.sections.map((section) => `
            <div class="skill-subgroup">
              ${section.name ? `<h4>${escapeHtml(section.name)}</h4>` : ""}
              <ul class="skill-list">
                ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>`).join("")}
        </article>`)
      .join("");
  }

  function renderFocusAreas(container, areas) {
    if (!container || !Array.isArray(areas)) return;

    const validAreas = areas.filter((area) => area && typeof area === "object" && area.title);
    if (!validAreas.length) return;

    container.innerHTML = validAreas
      .map((area, index) => `
        <article class="focus-card">
          <span class="focus-index">${String(index + 1).padStart(2, "0")}</span>
          <h3>${escapeHtml(area.title)}</h3>
          ${area.description ? `<p>${escapeHtml(area.description)}</p>` : ""}
        </article>`)
      .join("");
  }

  async function loadSiteSettings() {
    const textElements = [...document.querySelectorAll("[data-site-text]")];
    const linkElements = [...document.querySelectorAll("[data-site-href]")];
    const sourceElements = [...document.querySelectorAll("[data-site-src]")];
    const altElements = [...document.querySelectorAll("[data-site-alt]")];
    const courseworkContainer = document.getElementById("coursework-list");
    const experienceContainer = document.getElementById("experience-list");
    const skillsContainer = document.getElementById("skills-list");
    const focusContainer = document.getElementById("focus-list");
    const hasHomeBackground = Boolean(document.querySelector(".home-main"));

    if (
      !textElements.length &&
      !linkElements.length &&
      !sourceElements.length &&
      !altElements.length &&
      !courseworkContainer &&
      !experienceContainer &&
      !skillsContainer &&
      !focusContainer &&
      !hasHomeBackground
    ) {
      return;
    }

    try {
      const settings = await fetchJson("site.json");

      applyRandomHomeBackground(settings.backgrounds);
      renderCoursework(courseworkContainer, settings.coursework);
      renderExperience(experienceContainer, settings.experience);
      renderSkills(skillsContainer, settings.skills);
      renderFocusAreas(focusContainer, settings.focusAreas);

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

  function setMessage(container, kind, message) {
    container.innerHTML = `<p class="status-message status-message--${escapeHtml(kind)}">${escapeHtml(message)}</p>`;
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
  }

  function renderProjectLinks(links) {
    if (!Array.isArray(links)) return "";

    const validLinks = links
      .map((link) => {
        if (!link || typeof link !== "object") return "";

        const href = safeHref(link.url ?? link.href);
        if (!href) return "";

        const label = link.label || link.title || "View project";
        return `<a href="${escapeHtml(href)}"${linkAttributes(href)}>${escapeHtml(label)}</a>`;
      })
      .filter(Boolean);

    return validLinks.length
      ? `<div class="entry-links project-links">${validLinks.join("")}</div>`
      : "";
  }

  function renderProjectAttachments(links) {
    const linksMarkup = renderProjectLinks(links);

    return `
      <div class="portfolio-case-attachments">
        <span>Attachments</span>
        ${linksMarkup || '<p class="portfolio-case-attachments-empty">No public attachments yet.</p>'}
      </div>`;
  }

  function renderProjects(container, projects) {
    const validProjects = projects.filter((project) => project && typeof project === "object");

    if (!validProjects.length) {
      setMessage(container, "empty", "No projects have been added yet.");
      return;
    }

    container.innerHTML = validProjects
      .map((project) => {
        const title = project.title || project.name || "Untitled project";
        const description = project.description ?? project.desc ?? "";
        const tags = Array.isArray(project.tags)
          ? project.tags.filter((tag) => String(tag).trim())
          : [];

        const metadata = [
          project.date ? `<span class="project-date">${escapeHtml(project.date)}</span>` : "",
          tags.length
            ? `<span class="entry-tags project-tags">${tags.map(escapeHtml).join(" · ")}</span>`
            : "",
        ].filter(Boolean);

        return `
          <article class="content-entry project-item">
            <h3 class="project-title">${escapeHtml(title)}</h3>
            ${description ? `<p class="project-description">${escapeHtml(description)}</p>` : ""}
            ${metadata.length ? `<div class="entry-meta">${metadata.join("")}</div>` : ""}
            ${renderProjectLinks(project.links)}
          </article>`;
      })
      .join("");
  }

  function renderPortfolioProjectMedia(media) {
    if (!Array.isArray(media)) return "";

    const validMedia = media
      .map((item) => {
        if (!item || typeof item !== "object") return "";

        const src = safeBackgroundUrl(item.src);
        if (!src) return "";

        const alt = String(item.alt || "Project visual").trim();
        const caption = String(item.caption || "").trim();
        return `
          <figure class="portfolio-case-media">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
            ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
          </figure>`;
      })
      .filter(Boolean);

    return validMedia.length
      ? `<div class="portfolio-case-media-grid">${validMedia.join("")}</div>`
      : "";
  }

  function renderPortfolioProjects(container, projects) {
    const validProjects = projects.filter((project) => {
      if (!project || typeof project !== "object") return false;
      return project.portfolio?.include !== false;
    });

    if (!validProjects.length) {
      setMessage(container, "empty", "No projects have been added yet.");
      return;
    }

    container.innerHTML = validProjects
      .map((project, index) => {
        const title = project.title || project.name || "Untitled project";
        const overview = project.portfolio?.summary ?? project.description ?? project.desc ?? "";
        const tags = Array.isArray(project.tags)
          ? project.tags.filter((tag) => String(tag || "").trim())
          : [];
        const detailFields = [
          ["Purpose", project.portfolio?.objective],
          ["Engineering challenge", project.portfolio?.challenge],
          ["My contribution", project.portfolio?.contribution],
          ["Outcome", project.portfolio?.outcome],
          ["Reflection & next iteration", project.portfolio?.reflection],
        ].filter(([, value]) => String(value || "").trim());
        const detailMarkup = detailFields
          .map(([label, value]) => `
            <section class="portfolio-case-detail">
              <h4>${escapeHtml(label)}</h4>
              <p>${escapeHtml(value)}</p>
            </section>`)
          .join("");
        const mediaMarkup = renderPortfolioProjectMedia(project.portfolio?.media);

        return `
          <article class="portfolio-case-study">
            <header class="portfolio-case-header">
              <div>
                <p class="portfolio-case-number">Project ${String(index + 1).padStart(2, "0")}</p>
                <h3>${escapeHtml(title)}</h3>
              </div>
              ${project.date ? `<p class="portfolio-case-date">${escapeHtml(project.date)}</p>` : ""}
            </header>
            ${overview ? `<p class="portfolio-case-overview">${escapeHtml(overview)}</p>` : ""}
            ${mediaMarkup}
            ${detailMarkup ? `<div class="portfolio-case-details">${detailMarkup}</div>` : ""}
            ${tags.length ? `<div class="portfolio-case-tools"><span>Tools &amp; methods</span><p>${tags.map(escapeHtml).join(" · ")}</p></div>` : ""}
            ${renderProjectAttachments(project.links)}
          </article>`;
      })
      .join("");
  }

  async function loadProjects() {
    const container = document.getElementById("projects-list");
    const portfolioContainer = document.getElementById("portfolio-projects-list");
    if (!container && !portfolioContainer) return;

    if (container) {
      container.setAttribute("aria-live", "polite");
      setMessage(container, "loading", "Loading projects…");
    }
    if (portfolioContainer) {
      portfolioContainer.setAttribute("aria-live", "polite");
      setMessage(portfolioContainer, "loading", "Loading projects…");
    }

    try {
      const data = await fetchJson("projects.json");
      const projects = Array.isArray(data) ? data : data.projects;

      if (!Array.isArray(projects)) {
        throw new Error("projects.json does not contain a projects array");
      }

      if (container) renderProjects(container, projects);
      if (portfolioContainer) renderPortfolioProjects(portfolioContainer, projects);
    } catch (error) {
      console.error("Could not load projects.json", error);
      if (container) {
        setMessage(container, "error", "Projects could not be loaded. Please check projects.json.");
      }
      if (portfolioContainer) {
        setMessage(portfolioContainer, "error", "Projects could not be loaded. Please check projects.json.");
      }
    }
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function renderNotes(container, notes) {
    const validNotes = notes.filter((note) => note && typeof note === "object");

    if (!validNotes.length) {
      setMessage(container, "empty", "No notes are published yet.");
      return;
    }

    validNotes.sort((a, b) => {
      const aTime = Date.parse(a.modified || "") || 0;
      const bTime = Date.parse(b.modified || "") || 0;
      return bTime - aTime;
    });

    container.innerHTML = validNotes
      .map((note) => {
        const title = note.title || note.filename || "Untitled note";
        const href = safeHref(note.path ?? note.url);
        const type = String(note.type || "note").toUpperCase();
        const details = [type, note.size].filter(Boolean).map(escapeHtml).join(" · ");
        const date = formatDate(note.modified);

        const titleMarkup = href
          ? `<a class="note-link" href="${escapeHtml(href)}"${linkAttributes(href)}>${escapeHtml(title)}</a>`
          : `<span class="note-title">${escapeHtml(title)}</span>`;

        return `
          <article class="content-entry note-item">
            <h2>${titleMarkup}</h2>
            <div class="entry-meta note-meta">
              ${details ? `<span>${details}</span>` : ""}
              ${date ? `<time datetime="${escapeHtml(note.modified)}">${escapeHtml(date)}</time>` : ""}
            </div>
          </article>`;
      })
      .join("");
  }

  async function loadNotes() {
    const container = document.getElementById("notes-list");
    if (!container) return;

    container.setAttribute("aria-live", "polite");
    setMessage(container, "loading", "Loading notes…");

    try {
      const data = await fetchJson("notes/manifest.json");
      const notes = Array.isArray(data) ? data : data.notes;

      if (!Array.isArray(notes)) {
        throw new Error("notes/manifest.json does not contain a notes array");
      }

      renderNotes(container, notes);
    } catch (error) {
      console.error("Could not load notes/manifest.json", error);
      setMessage(container, "error", "Notes could not be loaded. Please check notes/manifest.json.");
    }
  }

  function setupPortfolioPrint(loadPromises) {
    const button = document.getElementById("portfolio-print");
    if (!button) return;

    const status = document.getElementById("portfolio-print-status");

    Promise.allSettled(loadPromises).then(() => {
      button.disabled = false;
      document.body.dataset.portfolioReady = "true";
      if (status) {
        status.textContent = "Ready to export.";
      }
    });

    button.addEventListener("click", () => {
      window.print();
    });
  }

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  setupTheme();
  setupMobileNavigation();
  const siteReady = loadSiteSettings();
  const projectsReady = loadProjects();
  const notesReady = loadNotes();
  setupPortfolioPrint([siteReady, projectsReady, notesReady]);
})();
