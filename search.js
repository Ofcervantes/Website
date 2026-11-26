const form = document.querySelector(".site-search");
const input = document.getElementById("search");
const filter = document.getElementById("type-filter");
const clear = document.getElementById("clear-search");
const status = document.getElementById("search-status");
const rows = document.querySelectorAll("#project-documents > li");

// Treat accents, capitals, and punctuation the same in the query and the page text.
function normalize(text) {
  return text.toLowerCase().normalize("NFKD")
    .replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function filterList() {
  const query = input.value.trim();
  const words = normalize(query).split(" ").filter(Boolean);
  let count = 0;
  for (const row of rows) {
    const type = row.dataset.type;
    const text = normalize([row.textContent, type, row.dataset.search].join(" "));
    const matchesType = filter.value === "all" || filter.value === type;
    // About and coursework appear only when the reader searches for them.
    const matchesQuery = query
      ? words.length > 0 && words.every(word => text.includes(word))
      : type !== "about" && type !== "coursework";
    row.hidden = !(matchesType && matchesQuery);
    if (!row.hidden) count++;
  }
  clear.hidden = !input.value;
  if (!query && filter.value === "all") status.textContent = "";
  else if (count === 0) status.textContent = "No results found.";
  else status.textContent = count === 1 ? "1 result" : count + " results";
}

function updateSearch() {
  const url = new URL(location.href);
  const query = input.value.trim();
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  if (filter.value === "all") url.searchParams.delete("type");
  else url.searchParams.set("type", filter.value);
  history.replaceState(null, "", url);
  filterList();
}

const params = new URLSearchParams(location.search);
input.value = params.get("q") || "";
filter.value = params.get("type") || "all";
if (!filter.value) filter.value = "all";
input.addEventListener("input", updateSearch);
filter.addEventListener("change", updateSearch);
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
