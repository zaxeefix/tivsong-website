(function () {
  var key = "tiv-songs-theme";
  var root = document.documentElement;

  function preferred() {
    var saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") return saved;
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function apply(theme, persist) {
    var next = theme === "light" ? "light" : "dark";
    root.dataset.theme = next;
    root.style.colorScheme = next;
    if (persist) localStorage.setItem(key, next);
    window.dispatchEvent(new CustomEvent("tiv-theme-change", { detail: next }));
    return next;
  }

  function sync() {
    return apply(preferred(), false);
  }

  window.TivTheme = {
    get: preferred,
    set: function (theme) { return apply(theme, true); },
    toggle: function () { return apply(root.dataset.theme === "dark" ? "light" : "dark", true); },
    sync: sync
  };

  sync();
  addEventListener("storage", sync);
  addEventListener("pageshow", sync);
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", function () {
    if (!localStorage.getItem(key)) sync();
  });
})();
