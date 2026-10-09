# Jiangnan Huang’s personal website

Personal website for Jiangnan Huang, Software Engineer & AI Researcher.

Live site: https://jiangnanpro.github.io/

The homepage brings About, Experience, Publications, and Contact together in a single scrolling layout. It includes light and dark themes, responsive navigation, publication citations, a Google Maps embed, and an optional visitor-distance estimate.

## Preview locally

Install Ruby 3.3 and Bundler, then run:

```sh
bundle install
bundle exec jekyll serve
```

Open http://127.0.0.1:4000/. Restart the preview after changing `_config.yml`.

To build without starting the preview:

```sh
bundle exec jekyll build
```

Generated files are placed in `_site/`; edit the source files instead.

## Where to edit

| Content or feature | Source |
| --- | --- |
| About text, subtitle, statement, and profile photo | `_pages/about.md` |
| Experience, visiting roles, and teaching | `_data/cv.yml` |
| Experience page settings and résumé filename | `_data/sections.yml` |
| Publication records, code links, and award text | `_bibliography/papers.bib` |
| Publication years | `_data/sections.yml` |
| Venue names and links | `_data/venues.yml` |
| Contact details, map zoom, and office coordinates | `_includes/contact-content.html` |
| Résumé PDF | `assets/pdf/Jiangnan_HUANG_CV.pdf` |
| Homepage arrangement and navigation labels | `_layouts/about.html` |
| Publication entry layout | `_layouts/bib.html` |
| Shared experience rendering | `_includes/journey-content.html`, `_includes/cv/time_table.html` |
| Layout, typography, badges, and responsive rules | `_sass/_base.scss`, `_sass/_layout.scss` |
| Theme colors | `_sass/_themes.scss` |
| Navigation, citation animations, and distance estimate | `assets/js/common.js` |
| Opening animation | `assets/js/opening-animation.js` |
| Site metadata, libraries, and visitor counter | `_config.yml` |

Experience, Publications, and Contact exist only as homepage sections. Use `/#journey`, `/#publications`, and `/#contact` for direct links. Their titles and section settings live in `_data/sections.yml`. The former standalone `/cv/`, `/publications/`, and `/contact/` routes have been removed; the separate Gallery remains available.

## Photography gallery — work in progress

The Gallery is preserved at `/projects/` and is currently hidden from navigation (`nav: false`). Its source is `_pages/projects.md`.

Gallery entries live in `_projects/`, with images in `assets/img/`. The existing example entries and numbered images are deliberately retained as scaffolding for future photography work. Replace their content as the gallery develops. The shared figure include, project-card includes, Masonry layout, and image zoom support are retained too.

## Contact integrations

- Google Maps uses a simple iframe embed. Its `z` parameter controls the initial zoom; lower values show a wider area.
- When Contact comes into view, the site requests an approximate IP location from ipwho.is. The browser calculates a straight-line distance to the configured office coordinates and rounds it to 10 km. VPNs and IP-location accuracy can affect the result. API limits or blocked requests show a retry message. An interactive globe beside Google Maps connects the visitor to the office after a successful lookup; if location lookup fails, it still shows the office. Globe.GL and its country outlines load from jsDelivr only on demand; the numeric distance remains available if WebGL or the globe assets are unavailable.
- GoatCounter supplies the footer visitor count. Configure `goatcounter_code` in `_config.yml` and enable public visitor counts in the GoatCounter account.

## Deployment

The existing GitHub Actions workflow, `.github/workflows/deploy.yml`, builds changes pushed to `main` and publishes generated files to `gh-pages` using `bin/deploy`. Pull requests run the build without publishing.

GitHub Pages should serve the `gh-pages` branch. Check the workflow result after pushing; a source commit alone does not confirm that the live website has updated.

Before publishing, build the site and check phone and desktop layouts, theme switching, navigation, citations, Gallery, and the résumé link. No Mermaid/diagram-rendering installation is needed.

## Credits and license

This website has been extensively customized from [al-folio](https://github.com/alshedivat/al-folio). The original MIT license and copyright notice are preserved in `LICENSE`. Personal writing, photographs, and publication materials remain attributed to their respective authors; the template license does not establish rights to third-party content.
