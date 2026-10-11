# Takakontti

Personal project site for small tools, experiments, and things I'm building. The GitHub Pages homepage is written in Markdown in [index.md](index.md).

## Projects

- [Path of Exile — All Ears tracker](all-ears/): ordered achievement checklist with optional local progress saving.
- More project links will be added here as they are ready.

Visit the [live site](https://takakontti.github.io/) for the project overview.

## How it works

- The published tracker reads compact structured data from `data/all-ears-data.js`. The original downloaded wiki HTML sources are kept locally under the Git-ignored `/dev/` folder and are not required to run the published site.
- The site asks whether to allow local progress saving when no prior opt-in is present. If allowed, checks are saved in browser local storage, separately for each character name. Progress stays on that browser/device and is not synced. Choosing **Continue without saving** keeps progress in memory for that visit only; because the choice is not recorded, the prompt appears again on a later visit.
- The site does not use cookies. Local storage is only used after the user explicitly opts in; **Privacy settings** can disable saving and clear this site's saved progress.
- See [privacy.html](privacy.html) for the privacy notice.
- GitHub Pages logs visitor IP addresses for security purposes. This is done by GitHub as the host, not by the tracker; see its [Pages data-collection notice](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#data-collection) and [Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- Opted-in users can download a machine-readable JSON export from **Privacy settings**; withdrawing consent clears this tracker's stored data.
- Use the act buttons to navigate, search to find an NPC/dialogue, **Hide checked** to declutter the list, and **Go to next unchecked** to continue in sequence.
- The tracker data is embedded as a compact gzip payload in the generated JavaScript asset, so the source guide pages are not needed at runtime. For local preview, serve the repository over HTTP to match GitHub Pages behavior.

## Sources and notices

The All Ears checklist data is adapted from “[Guide: All Ears achievement](https://www.poewiki.net/wiki/Guide:All_Ears_achievement)” on the Path of Exile Wiki, last updated June 30, 2025 (source revision [1680570](https://www.poewiki.net/w/index.php?title=Guide:All_Ears_achievement&oldid=1680570)). The source page is licensed under [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/); see the [revision history](https://www.poewiki.net/w/index.php?title=Guide:All_Ears_achievement&action=history). The extracted, reformatted checklist data is provided under the same license; changes are identified on the site. This tool and the adapted data are non-commercial. If you plan to monetize the site, do not use the adapted wiki checklist without permission or legal review.

This product isn't affiliated with or endorsed by Grinding Gear Games in any way. Path of Exile is a trademark of Grinding Gear Games.