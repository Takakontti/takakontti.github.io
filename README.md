# Takakontti

Personal project site for small tools, experiments, and things I'm building. The GitHub Pages homepage is written in Markdown in [index.md](index.md).

## Projects

- [Path of Exile — All Ears tracker](all-ears/): ordered achievement checklist with optional local progress saving.
- More project links will be added here as they are ready.

Visit the [live site](https://takakontti.github.io/) for the project overview.

## How it works

- The checklist is read from the locally included All Ears guide HTML; the dialogue order and quest conditions follow that guide.
- The site asks whether to allow local progress saving when no prior opt-in is present. If allowed, checks are saved in browser local storage, separately for each character name. Progress stays on that browser/device and is not synced. Choosing **Continue without saving** keeps progress in memory for that visit only; because the choice is not recorded, the prompt appears again on a later visit.
- The site does not use cookies. Local storage is only used after the user explicitly opts in; **Privacy settings** can disable saving and clear this site's saved progress.
- See [privacy.html](privacy.html) for the privacy notice.
- GitHub Pages logs visitor IP addresses for security purposes. This is done by GitHub as the host, not by the tracker; see its [Pages data-collection notice](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#data-collection) and [Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- Fonts are system fonts; the page does not make Google Fonts requests or load analytics, embedded media, game assets, GGG APIs, or game files.
- Opted-in users can download a machine-readable JSON export from **Privacy settings**; withdrawing consent clears this tracker's stored data.
- Use the act buttons to navigate, search to find an NPC/dialogue, **Hide checked** to declutter the list, and **Go to next unchecked** to continue in sequence.
- The guide HTML must remain in the repository root so the tracker can load its steps. Use a local web server for testing; browsers do not allow `fetch()` from a `file://` page.

## Sources and notices

The All Ears checklist is adapted from “[Guide: All Ears achievement](https://www.poewiki.net/wiki/Guide:All_Ears_achievement)” on the Path of Exile Wiki, last updated June 30, 2025 (source revision [1680570](https://www.poewiki.net/w/index.php?title=Guide:All_Ears_achievement&oldid=1680570)). The source page is licensed under [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/); see the included source copy and [revision history](https://www.poewiki.net/w/index.php?title=Guide:All_Ears_achievement&action=history). The checklist adaptation is provided under the same license, with changes identified on the site, and is non-commercial. If you plan to monetize this site, do not use the adapted wiki checklist without permission or legal review.

This product isn't affiliated with or endorsed by Grinding Gear Games in any way. Path of Exile is a trademark of Grinding Gear Games.