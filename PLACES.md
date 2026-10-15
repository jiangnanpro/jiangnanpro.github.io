# Adding to Places

The map lives at `/places/`. It uses the site's existing light and dark themes.

## Mark a country as visited

Add an entry to `_data/places.yml`:

```yaml
- code: FRA
  name: France
  folder: /assets/img/places/france/
```

Codes are Natural Earth's `ADM0_A3` identifiers, available in
`assets/data/places-countries.geojson`. A country can have no photos yet.
The 23 configured places are your visited-country list. Italy and Japan already
have photos; the remaining country folders are ready for you to add photos later.

## Add photos

Drop web-sized JPG, JPEG, PNG, WebP, or AVIF images into the country's folder.
Jekyll discovers them when you rebuild. Files sort alphabetically, so use names
like `01.jpg`, `02.jpg`. No editing the page or writing captions is required.
Aim for images around 1600px on their longest side, rather than full-size originals.
The originals in `assets/img/italy` and `assets/img/japan` are preserved.

Visitors can use arrow keys to browse photos and Escape to close the popup.
The page shows only the map, filling the browser below navigation. Clicking a visited country opens its photos
in a popup. Empty places show a short photos-to-come message. Drag or use two-finger
scrolling to pan; pinch to zoom. Double-click restores the starting position and 10% zoom.

## Map assets

Outlines are the public-domain Natural Earth 1:50m country dataset, obtained from
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
and reduced to names, codes, and geometry. Small regions can be easier to select
when zoomed in.

D3 7.9.0 is bundled locally under `assets/js/map-lib`, with its license alongside it.
The map makes no third-party requests and has no API key or visitor tracking.

## Branch and release

This prototype is on `develop`, brought up to date by merging `main` while preserving
its existing photo-diary collection. The deployment workflow publishes only `main`.
Review locally before merging to `main`.
