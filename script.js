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
      .map((group, index) => ({
        id: "coursework-" + (index + 1),
        name: String(group?.group || group?.name || "Coursework").trim(),
        items: Array.isArray(group?.items)
          ? group.items.map(normalizeCourseworkItem).filter(Boolean)
          : [],
      }))
      .filter((group) => group.items.length);

    if (!validGroups.length) return;

    container.innerHTML = validGroups
      .map((group) => `
        <article class="coursework-card" id="${group.id}">
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

  async function loadSiteSettings(settingsPromise) {
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
      const settings = await settingsPromise;

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

  function documentRow(record) {
    const row = document.createElement("li");
    const link = document.createElement("a");
    const title = document.createElement("span");
    const format = document.createElement("span");
    link.href = record.url;
    title.className = "document-title";
    title.textContent = record.title;
    format.className = "document-format";
    format.textContent = record.format;
    if (record.thumbnail) {
      const image = document.createElement("img");
      image.className = "document-thumbnail";
      image.src = record.thumbnail;
      image.alt = "";
      image.loading = "lazy";
      image.width = 96;
      image.height = 72;
      link.append(image);
    }
    link.append(title, format);
    row.append(link);
    return row;
  }

  function updatePdfRows(list, projects) {
    const records = projects.flatMap((project) =>
      (project?.links ?? []).map((link) => ({
        url: safeHref(link?.url, ["http:", "https:"]),
        title: String(link?.label || project?.name || "").replace(/\s*\(PDF\)$/i, "").trim(),
        text: project.name,
        format: "PDF",
      }))
    );
    if (!records.every((record) => record.url && record.title && /\.pdf$/i.test(new URL(record.url, document.baseURI).pathname))) {
      throw new Error("Expected a title and PDF link");
    }
    list.querySelectorAll("[data-pdf]").forEach((row) => row.remove());
    for (const record of records) {
      const row = documentRow(record);
      row.dataset.pdf = "";
      list.append(row);
    }
    return records;
  }

  function aboutRecords(settings) {
    const profile = settings.profile || {};
    const records = [{
      title: "About " + (profile.fullName || "").trim(),
      url: "index.html", format: "About", text: [profile.role, profile.statement].join(" "),
    }];
    if (settings.paintings) {
      records.push({
        title: "My favorite paintings", url: "index.html#favorite-paintings", format: "About",
        text: [settings.paintings.artist, ...settings.paintings.titles].join(" "),
      });
    }
    for (const [index, group] of (settings.coursework || []).entries()) {
      for (const entry of group.items || []) {
        const item = normalizeCourseworkItem(entry);
        if (item) records.push({
          title: item.label, format: "Coursework", text: [group.group || group.name, item.level].join(" "),
          url: "index.html#coursework-" + (index + 1),
        });
      }
    }
    return records;
  }

  function normalizeSearch(value) {
    return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  async function enableSearch(settingsPromise) {
    const form = document.querySelector(".site-search");
    if (!form) return;
    const input = document.getElementById("search");
    const clear = document.getElementById("clear-search");
    const status = document.getElementById("search-status");
    const list = document.getElementById("project-documents");
    const results = document.getElementById("search-results");
    const records = new Map();
    let loading = true;
    function indexRecord(record) {
      const key = new URL(record.url, document.baseURI).href + "\n" + record.title;
      records.set(key, {...record, keywords: normalizeSearch([record.title, record.format, record.text].join(" "))});
    }
    function showResults() {
      const terms = normalizeSearch(input.value).split(" ").filter(Boolean);
      const active = input.value.trim() !== "";
      const matches = active && terms.length
        ? Array.from(records.values()).filter((record) => terms.every((term) => record.keywords.includes(term)))
        : [];
      results.replaceChildren(...matches.map(documentRow));
      results.hidden = matches.length === 0;
      list.hidden = active;
      clear.hidden = !input.value;
      status.textContent = !active ? "" : loading ? "Searching…" : matches.length
        ? matches.length + (matches.length === 1 ? " result" : " results")
        : "No results found.";
    }

    form.hidden = false;
    const currentUrl = new URL(location.href);
    input.value = currentUrl.searchParams.get("q") || "";
    for (const link of list.querySelectorAll("a")) {
      indexRecord({
        url: link.href, title: link.querySelector(".document-title").textContent,
        format: link.querySelector(".document-format")?.textContent || "Article",
        text: link.textContent,
      });
    }
    function onInput() {
      const url = new URL(location.href);
      if (input.value.trim()) url.searchParams.set("q", input.value.trim());
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);
      showResults();
    }
    input.addEventListener("input", onInput);
    form.addEventListener("submit", (event) => { event.preventDefault(); onInput(); });
    clear.addEventListener("click", () => { input.value = ""; onInput(); input.focus(); });
    if (location.hash === "#search") input.focus();
    showResults();

    const [pdfs, articles, about] = await Promise.allSettled([
      fetchJson("projects.json").then((data) => updatePdfRows(list, data.projects)),
      fetchJson("project-articles.json"), settingsPromise,
    ]);
    // Use the rendered catalog when an index is temporarily unavailable.
    if (pdfs.status === "fulfilled") {
      for (const [key, record] of records) if (record.format === "PDF") records.delete(key);
      pdfs.value.forEach(indexRecord);
    }
    if (articles.status === "fulfilled") {
      for (const article of articles.value) {
        const url = safeHref(article.url, ["http:", "https:"]);
        if (url) indexRecord({
          title: article.title, url, format: "Article", text: [article.summary, article.text].join(" "),
          thumbnail: safeHref(article.thumbnail, ["http:", "https:"]),
        });
      }
    }
    if (about.status === "fulfilled") aboutRecords(about.value).forEach(indexRecord);
    loading = false;
    showResults();
  }

  function enablePaintingGallery() {
    const track = document.getElementById("painting-track");
    if (!track || track.children.length < 2) return;

    const section = document.getElementById("favorite-paintings");
    const controls = section.querySelector(".painting-controls");
    const playback = document.getElementById("painting-playback");
    const status = document.getElementById("painting-status");
    const figures = Array.from(track.children);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let playing = !reducedMotion.matches;
    let onScreen = false;
    let touching = false;
    let allowPlaybackFocus = false;
    let timer;

    function schedule() {
      window.clearTimeout(timer);
      const reading = section.contains(document.activeElement) && !allowPlaybackFocus;
      if (!playing || !onScreen || document.hidden || controls.hidden || touching || reading) return;
      if (window.matchMedia("(hover: hover)").matches && track.matches(":hover")) return;
      timer = window.setTimeout(() => move(1, false), 6000);
    }

    function move(direction, manual) {
      const step = figures[1].offsetLeft - figures[0].offsetLeft;
      if (step <= 0) return;
      const last = Math.round((track.scrollWidth - track.clientWidth) / step);
      const current = Math.round(track.scrollLeft / step);
      const next = (current + direction + last + 1) % (last + 1);
      track.scrollTo({
        left: next * step,
        behavior: manual || reducedMotion.matches ? "instant" : "smooth",
      });
      if (manual) status.textContent = figures[next].querySelector("figcaption").textContent.trim();
      schedule();
    }

    function updateControls() {
      controls.hidden = track.scrollWidth <= track.clientWidth + 1;
      playback.textContent = playing ? "Pause" : "Play";
      playback.setAttribute("aria-label", playing ? "Pause automatic scrolling" : "Start automatic scrolling");
      schedule();
    }

    track.classList.add("is-scrolling");
    section.setAttribute("aria-roledescription", "carousel");
    document.getElementById("painting-previous").addEventListener("click", () => move(-1, true));
    document.getElementById("painting-next").addEventListener("click", () => move(1, true));
    playback.addEventListener("click", () => {
      playing = !playing;
      allowPlaybackFocus = playing && document.activeElement === playback;
      updateControls();
    });
    section.addEventListener("focusin", () => { allowPlaybackFocus = false; schedule(); });
    section.addEventListener("focusout", () => queueMicrotask(schedule));
    track.addEventListener("pointerenter", schedule);
    track.addEventListener("pointerleave", schedule);
    track.addEventListener("pointerdown", () => { touching = true; schedule(); });
    window.addEventListener("pointerup", () => { touching = false; schedule(); });
    window.addEventListener("pointercancel", () => { touching = false; schedule(); });
    track.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) playing = false;
      updateControls();
    });
    new ResizeObserver(updateControls).observe(track);
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      schedule();
    }).observe(track);
    updateControls();
  }

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const settingsPromise = fetchJson("site.json");
  enablePaintingGallery();
  loadSiteSettings(settingsPromise);
  enableSearch(settingsPromise);
})();
