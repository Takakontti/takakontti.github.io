const themeToggle = document.querySelector("#theme-toggle");
const languageToggle = document.querySelector("#language-toggle");
const themeColor = document.querySelector("#theme-color");
const themePreferenceKey = "takakontti-theme";
const languagePreferenceKey = "takakontti-language";

const translations = {
  en: {
    navAbout: "About", navProjects: "Projects", overview: "Overview", myWork: "MY WORK",
    webTools: "Web tools", tracker: "All Ears tracker", home: "Home",
    homeTitle: "Hi, I'm Takakontti.",
    homeIntro: "Welcome to my website. I make projects and practical tools, and use this space to share what I’m working on. This page is the home for those projects.",
    projectsTitle: "Projects", featuredTools: "FEATURED TOOLS · PATH OF EXILE",
    trackerTitle: "All Ears achievement tracker",
    trackerIntro: "An ordered checklist for the **All Ears** achievement. Follow optional NPC conversations in quest order, check off what you’ve heard, and keep track of important quest conditions along the way.",
    trackerDetails: "Features include per-character progress, search, act-by-act navigation, and an option to hide completed steps. Progress can stay temporary or be saved locally in your browser if you choose. It is a fan-made tool and is not affiliated with Grinding Gear Games.",
    trackerLink: "Open the All Ears tracker", comingSoon: "No Stone Unturned - Coming soon",
    toolsTitle: "More tools",
    toolsIntro: "I’m planning more small web tools and project experiments. New projects will appear here as they’re ready.",
    moreProjects: "More projects to come.<br />This page will grow as I build and publish new tools.",
    languageButton: "Suomi", languageAria: "Switch to Finnish",
    lightMode: "Light mode", darkMode: "Dark mode", switchLight: "Switch to light mode", switchDark: "Switch to dark mode"
  },
  fi: {
    navAbout: "Tietoa", navProjects: "Projektit", overview: "Yleiskatsaus", myWork: "TYÖNI",
    webTools: "Verkkotyökalut", tracker: "All Ears työkalu", home: "Etusivu",
    homeTitle: "Hei, olen Takakontti.",
    homeIntro: "Tervetuloa verkkosivulleni. Teen projekteja ja käytännöllisiä työkaluja sekä kerron täällä, mitä parhaillaan työstän. Tämä sivu kokoaa projektini yhteen.",
    projectsTitle: "Projektit", featuredTools: "ESITTELYSSÄ · PATH OF EXILE",
    trackerTitle: "All Ears saavutuksen seuranta",
    trackerIntro: "Järjestyksessä etenevä tarkistuslista **All Ears** saavutukseen. Seuraa valinnaisia NPC-keskusteluja tehtävien järjestyksessä, merkitse kuulemasi keskustelut ja pidä kirjaa tärkeistä tehtäväehdoista matkan varrella.",
    trackerDetails: "Työkalu sisältää hahmokohtaisen edistymisen, haun, näytöskohtaisen navigoinnin ja mahdollisuuden piilottaa valmiit kohdat. Edistyminen säilyy vain tämän käynnin ajan tai voidaan halutessasi tallentaa selaimeen. Tämä on fanin tekemä työkalu, eikä se ole Grinding Gear Gamesin kanssa sidoksissa.",
    trackerLink: "Avaa All Ears -seuranta", comingSoon: "No Stone Unturned – tulossa pian",
    toolsTitle: "Lisää työkaluja",
    toolsIntro: "Suunnittelen lisää pieniä verkkotyökaluja ja kokeellisia projekteja. Uudet projektit ilmestyvät tänne, kun ne valmistuvat.",
    moreProjects: "Lisää projekteja on tulossa.<br />Sivu kasvaa, kun rakennan ja julkaisen uusia työkaluja.",
    languageButton: "English", languageAria: "Switch to English",
    lightMode: "Vaalea tila", darkMode: "Tumma tila", switchLight: "Vaihda vaaleaan tilaan", switchDark: "Vaihda tummaan tilaan"
  }
};

function applyLanguage(language) {
  const selectedLanguage = language === "fi" ? "fi" : "en";
  const copy = translations[selectedLanguage];
  document.documentElement.lang = selectedLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const translation = copy[element.dataset.i18n];
    if (translation === undefined) return;
    if (element.dataset.i18n === "trackerIntro" || element.dataset.i18n === "trackerDetails") {
      element.textContent = translation.replaceAll("**", "");
    } else if (element.dataset.i18n === "trackerLink") {
      element.innerHTML = `${translation} <span aria-hidden="true">→</span>`;
    } else {
      element.innerHTML = translation;
    }
  });
  languageToggle.setAttribute("aria-label", copy.languageAria);
  languageToggle.querySelector(".language-label").textContent = copy.languageButton;
  updateThemeLabels(document.documentElement.dataset.theme, selectedLanguage);
}

function updateThemeLabels(theme, language) {
  const copy = translations[language];
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-label", isDark ? copy.switchLight : copy.switchDark);
  themeToggle.querySelector(".theme-label").textContent = isDark ? copy.lightMode : copy.darkMode;
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.querySelector(".theme-icon").textContent = isDark ? "☀" : "☾";
  updateThemeLabels(theme, document.documentElement.lang);
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

applyTheme(savedTheme === "light" ? "light" : "dark");

const savedLanguage = (() => {
  try {
    return localStorage.getItem(languagePreferenceKey);
  } catch {
    return null;
  }
})();

applyLanguage(savedLanguage);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  saveThemePreference(nextTheme);
});

languageToggle.addEventListener("click", () => {
  const nextLanguage = document.documentElement.lang === "fi" ? "en" : "fi";
  applyLanguage(nextLanguage);
  try {
    localStorage.setItem(languagePreferenceKey, nextLanguage);
  } catch {
    // The selected language still applies for this visit if storage is unavailable.
  }
});
