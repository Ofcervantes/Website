const form = document.querySelector(".site-search");
const input = document.getElementById("search");
const typeFilter = document.getElementById("type-filter");
const subjectFilter = document.getElementById("subject-filter");
const clear = document.getElementById("clear-search");
const status = document.getElementById("search-status");
const rows = document.querySelectorAll("#project-documents > li");

// Read the labels shown on each row so the dropdown always matches the page.
function subjectsOn(element) {
  return Array.from(element.querySelectorAll(".document-subject"), label => label.textContent);
}
const subjects = new Set(subjectsOn(document));
for (const subject of [...subjects].sort()) {
  subjectFilter.add(new Option(subject, subject));
}

// Treat accents, capitals, and punctuation the same in the query and the page text.
function normalize(text) {
  return text.toLowerCase().normalize("NFKD")
    .replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function filterList() {
  const query = input.value.trim();
  const subject = subjectFilter.value;
  const words = normalize(query).split(" ").filter(Boolean);
  let count = 0;
  for (const row of rows) {
    const type = row.dataset.type;
    const text = normalize([row.textContent, type, row.dataset.search].join(" "));
    const matchesType = typeFilter.value === "all" || typeFilter.value === type;
    const matchesSubject = !subject || subjectsOn(row).includes(subject);
    // About and coursework appear only when the reader searches for them.
    const matchesQuery = query
      ? words.length > 0 && words.every(word => text.includes(word))
      : type !== "about" && type !== "coursework";
    row.hidden = !(matchesType && matchesSubject && matchesQuery);
    if (!row.hidden) count++;
  }
  clear.hidden = !input.value;
  if (!query && typeFilter.value === "all" && !subject) status.textContent = "";
  else if (count === 0) status.textContent = "No results found.";
  else status.textContent = count === 1 ? "1 result" : count + " results";
}

function updateSearch() {
  const url = new URL(location.href);
  const query = input.value.trim();
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  if (typeFilter.value === "all") url.searchParams.delete("type");
  else url.searchParams.set("type", typeFilter.value);
  if (subjectFilter.value) url.searchParams.set("subject", subjectFilter.value);
  else url.searchParams.delete("subject");
  history.replaceState(null, "", url);
  filterList();
}

const params = new URLSearchParams(location.search);
input.value = params.get("q") || "";
typeFilter.value = params.get("type") || "all";
if (!typeFilter.value) typeFilter.value = "all";
subjectFilter.value = params.get("subject") || "";
if (subjectFilter.selectedIndex === -1) subjectFilter.value = "";
input.addEventListener("input", updateSearch);
typeFilter.addEventListener("change", updateSearch);
subjectFilter.addEventListener("change", updateSearch);
form.addEventListener("submit", event => {
  event.preventDefault();
  updateSearch();
});
clear.addEventListener("click", () => {
  input.value = "";
  updateSearch();
  input.focus();
});
form.hidden = false;
if (location.hash === "#search") input.focus();
filterList();
