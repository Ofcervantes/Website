function safeHref(value) {
  const href = String(value ?? "").trim();
  if (!href) return "";
  try {
    const url = new URL(href, document.baseURI);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? href : "";
  } catch {
    return "";
  }
}

function setLink(link, href) {
  link.setAttribute("href", href);
  const url = new URL(href, document.baseURI);
  if (["http:", "https:"].includes(url.protocol) && url.origin !== location.origin) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  } else {
    link.removeAttribute("target");
    link.removeAttribute("rel");
  }
}

// A course can be a plain label or an object with a code, title, link, and level.
function normalizeCourseworkItem(item) {
  if (item && typeof item === "object") {
    const label = String(item.label || [item.code, item.title].filter(Boolean).join(" · ")).trim();
    if (!label) return null;
    return { label, href: safeHref(item.url), level: String(item.level || "").trim() };
  }
  const label = String(item || "").trim();
  return label ? { label, href: "", level: "" } : null;
}

function courseRow(course) {
  const row = document.createElement("li");
  const name = document.createElement("span");
  name.className = "course-name";
  if (course.href) {
    const link = document.createElement("a");
    setLink(link, course.href);
    link.textContent = course.label;
    name.append(link);
  } else {
    name.textContent = course.label;
  }
  row.append(name);

  if (course.level) {
    const badge = document.createElement("span");
    badge.className = "course-level";
    badge.textContent = course.level;
    const level = course.level.toLowerCase();
    if (level.includes("graduate")) badge.classList.add("course-level--graduate");
    if (level === "coursera") badge.classList.add("course-level--coursera");
    row.append(badge);
  }
  return row;
}

function renderCoursework(groups) {
  const container = document.getElementById("coursework-list");
  if (!container || !Array.isArray(groups)) return;
  const cards = [];
  for (const [index, group] of groups.entries()) {
    if (!Array.isArray(group?.items)) continue;
    const courses = group.items.map(normalizeCourseworkItem).filter(Boolean);
    if (!courses.length) continue;

    const card = document.createElement("article");
    card.className = "coursework-card";
    card.id = "coursework-" + (index + 1);
    const heading = document.createElement("h3");
    heading.textContent = String(group.group || group.name || "Coursework").trim();
    const list = document.createElement("ul");
    list.className = "coursework-list";
    list.append(...courses.map(courseRow));
    card.append(heading, list);
    cards.push(card);
  }
  if (cards.length) container.replaceChildren(...cards);
}

// HTML attributes such as data-site-text="profile.fullName" point into site.json.
function settingAt(settings, path) {
  let value = settings;
  for (const key of path.split(".")) {
    if (value == null || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}

async function renderSite() {
  const response = await fetch("site.json", { cache: "no-store" });
  if (!response.ok) return;
  const settings = await response.json();
  for (const element of document.querySelectorAll("[data-site-text]")) {
    const value = settingAt(settings, element.dataset.siteText);
    if (typeof value === "string" || typeof value === "number") element.textContent = value;
  }
  for (const link of document.querySelectorAll("[data-site-href]")) {
    const href = safeHref(settingAt(settings, link.dataset.siteHref));
    if (href) setLink(link, href);
  }
  for (const image of document.querySelectorAll("[data-site-src]")) {
    const src = safeHref(settingAt(settings, image.dataset.siteSrc));
    if (src) image.setAttribute("src", src);
  }
  for (const image of document.querySelectorAll("[data-site-alt]")) {
    const alt = settingAt(settings, image.dataset.siteAlt);
    if (typeof alt === "string") image.alt = alt;
  }
  renderCoursework(settings.coursework);
}

for (const year of document.querySelectorAll("[data-current-year]")) {
  year.textContent = new Date().getFullYear();
}
renderSite().catch(error => {
  console.warn("Keeping the page’s built-in content because site settings could not load.", error);
});
