export class Loader {
  static count = 0;
  static element = null;
  static startedAt = 0;
  static minimumVisibleMs = 220;
  static generation = 0;
  static reassuranceTimer = null;
  static phraseIndex = -1;
  static phrases = ["थम जा !", "डट जा !", "एक मिनट रुक जा !", "सबर राख !", "तौल न करे !"];

  static init(element) {
    Loader.element = element;
  }

  static setBusy(busy) {
    const element = Loader.element;
    if (!element) return;
    if (busy) {
      Loader.generation += 1;
      Loader.startedAt = performance.now();
      Loader.setLoadingPhrase();
      element.hidden = false;
      element.classList.add("on");
      element.setAttribute("aria-label", "Loading directory data");
      const copy = element.querySelector(".loader-copy");
      if (copy) copy.textContent = "ज़रा ठहरो, जींद खुल रहा है…";
      window.clearTimeout(Loader.reassuranceTimer);
      Loader.reassuranceTimer = window.setTimeout(() => {
        if (!Loader.count || !copy) return;
        copy.textContent = navigator.onLine ? "बस एक पल और…" : "ऑफ़लाइन हैं—सेव की हुई जानकारी देख रहे हैं…";
        element.setAttribute("aria-label", navigator.onLine ? "Still loading. Please wait" : "Offline. Checking saved information");
      }, 8000);
      for (const child of document.body.children) {
        if (child !== element && !child.hasAttribute("inert")) {
          child.setAttribute("inert", "");
          child.dataset.loaderInert = "true";
        }
      }
      document.body.classList.add("is-busy");
      try { element.showPopover?.(); } catch { element.classList.add("on"); }
    } else {
      const generation = Loader.generation;
      const remaining = Math.max(0, Loader.minimumVisibleMs - (performance.now() - Loader.startedAt));
      window.setTimeout(() => {
        if (Loader.count || generation !== Loader.generation) return;
        element.classList.remove("on");
        try { element.hidePopover?.(); } catch { /* class fallback below handles browsers without Popover API */ }
        element.hidden = true;
        element.setAttribute("aria-label", "Loading complete");
        document.querySelectorAll('[data-loader-inert="true"]').forEach((child) => {
          child.removeAttribute("inert");
          delete child.dataset.loaderInert;
        });
        document.body.classList.remove("is-busy");
        window.clearTimeout(Loader.reassuranceTimer);
      }, remaining);
    }
  }

  static setLoadingPhrase() {
    const heading = Loader.element?.querySelector(".loader-hindi");
    const typing = Loader.element?.querySelector(".loader-typing");
    if (!heading || !typing) return;
    let next = Math.floor(Math.random() * Loader.phrases.length);
    if (Loader.phrases.length > 1 && next === Loader.phraseIndex)
      next = (next + 1 + Math.floor(Math.random() * (Loader.phrases.length - 1))) % Loader.phrases.length;
    Loader.phraseIndex = next;
    const phrase = Loader.phrases[next];
    heading.setAttribute("aria-label", phrase);
    const parts = phrase.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1];
    const punctuation = /^[!।]+$/.test(lastPart) ? parts.pop() : "";
    typing.innerHTML = `${parts.map((word, index) => `<span class="loader-word loader-delay-${index}">${word}</span>`).join("")}<span class="loader-exclamation loader-delay-${parts.length}">${punctuation}</span>`;
  }

  static async track(promise) {
    Loader.count += 1;
    try {
      if (Loader.count === 1) Loader.setBusy(true);
      return await promise;
    } finally {
      Loader.count -= 1;
      if (Loader.count === 0) Loader.setBusy(false);
    }
  }
}
