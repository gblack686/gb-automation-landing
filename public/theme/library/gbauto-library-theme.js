(() => {
  const init = () => {
    const body = document.body;
    if (!body || body.dataset.gbautoThemeReady === "true") return;

    body.classList.add("gbauto-theme");
    body.dataset.gbautoThemeReady = "true";

    const watermark = document.createElement("img");
    watermark.className = "gbauto-theme-watermark";
    watermark.src = "../assets/gb-signature.png";
    watermark.alt = "";
    watermark.setAttribute("aria-hidden", "true");
    body.appendChild(watermark);

    const badge = document.createElement("div");
    badge.className = "gbauto-theme-badge";
    badge.setAttribute("aria-hidden", "true");

    const logo = document.createElement("img");
    logo.src = "../assets/gb-logo-chrome.png";
    logo.alt = "";

    const label = document.createElement("span");
    const surface = body.dataset.gbautoSurface || "pattern";
    label.textContent = `GBAuto / ${surface}`;

    badge.append(logo, label);
    body.appendChild(badge);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
