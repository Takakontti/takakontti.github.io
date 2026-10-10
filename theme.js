const themeToggle = document.querySelector("#theme-toggle");
const themeColor = document.querySelector("#theme-color");
const themePreferenceKey = "takakontti-theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  themeToggle.querySelector(".theme-icon").textContent = isDark ? "☀" : "☾";
  themeToggle.querySelector(".theme-label").textContent = isDark ? "Light mode" : "Dark mode";
  themeColor.content = isDark ? "#17131b" : "#ffffff";
}

function saveThemePreference(theme) {
  try {
    localStorage.setItem(themePreferenceKey, theme);
  } catch {
    // The selected theme still applies for this visit if storage is unavailable.
  }
}

const savedTheme = (() => {
  try {
    return localStorage.getItem(themePreferenceKey);
  } catch {
    return null;
  }
})();

applyTheme(savedTheme === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  saveThemePreference(nextTheme);
});
