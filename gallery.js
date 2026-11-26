function enablePaintingGallery() {
  const track = document.getElementById("painting-track");
  if (!track || track.children.length < 2) return;

  const section = document.getElementById("favorite-paintings");
  const controls = section.querySelector(".painting-controls");
  const playback = document.getElementById("painting-playback");
  const status = document.getElementById("painting-status");
  const figures = track.children;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hover = window.matchMedia("(hover: hover)");
  let playing = !reducedMotion.matches;
  let onScreen = false;
  let pointerDown = false;
  let startedWhileFocused = false;
  let timer;

  function scheduleAdvance() {
    window.clearTimeout(timer);
    if (!playing || !onScreen || document.hidden || controls.hidden) return;
    if (pointerDown || (hover.matches && track.matches(":hover"))) return;
    if (section.contains(document.activeElement) && !startedWhileFocused) return;
    timer = window.setTimeout(() => move(1, "autoplay"), 6000);
  }

  function move(direction, source = "button") {
    const step = figures[1].offsetLeft - figures[0].offsetLeft;
    if (step <= 0) return;
    const positions = 1 + Math.round((track.scrollWidth - track.clientWidth) / step);
    const current = Math.round(track.scrollLeft / step);
    const next = (current + direction + positions) % positions;
    track.scrollTo({
      left: next * step,
      behavior: source === "autoplay" && !reducedMotion.matches ? "smooth" : "instant",
    });
    if (source === "button") status.textContent = figures[next].querySelector("figcaption").textContent.trim();
    scheduleAdvance();
  }

  function updateControls() {
    controls.hidden = track.scrollWidth <= track.clientWidth + 1;
    playback.textContent = playing ? "Pause" : "Play";
    playback.setAttribute("aria-label", playing ? "Pause automatic scrolling" : "Start automatic scrolling");
    scheduleAdvance();
  }

  function handlePointer(event) {
    pointerDown = event.type === "pointerdown";
    scheduleAdvance();
  }

  track.classList.add("is-scrolling");
  section.setAttribute("aria-roledescription", "carousel");
  document.getElementById("painting-previous").addEventListener("click", () => move(-1));
  document.getElementById("painting-next").addEventListener("click", () => move(1));
  playback.addEventListener("click", () => {
    playing = !playing;
    startedWhileFocused = playing && document.activeElement === playback;
    updateControls();
  });
  section.addEventListener("focusin", () => {
    startedWhileFocused = false;
    scheduleAdvance();
  });
  section.addEventListener("focusout", () => queueMicrotask(scheduleAdvance));
  track.addEventListener("pointerenter", scheduleAdvance);
  track.addEventListener("pointerleave", scheduleAdvance);
  track.addEventListener("pointerdown", handlePointer);
  window.addEventListener("pointerup", handlePointer);
  window.addEventListener("pointercancel", handlePointer);
  track.addEventListener("scroll", scheduleAdvance, { passive: true });
  document.addEventListener("visibilitychange", scheduleAdvance);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) playing = false;
    updateControls();
  });
  new ResizeObserver(updateControls).observe(track);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    scheduleAdvance();
  }).observe(track);
  updateControls();
}

enablePaintingGallery();
