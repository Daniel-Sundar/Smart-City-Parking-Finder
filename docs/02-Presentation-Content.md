# ParkFinder – Presentation Content (11 slides)

Ready to paste into PowerPoint / Google Slides. Each slide lists the **on-slide text**, the **visual** to place, and short **speaker notes**. All images are real screenshots in `docs/screenshots/`.

Design tip: navy (#0B1F3A) for the title and conclusion slides, white slides with a navy title and a thin teal (#0D9B8E) line for the rest – the same simple style as the app.

---

## Title slide

**On slide**
- **Smart City Parking Finder**
- Product: **ParkFinder** – find a parking spot before you arrive
- Team:
  - DANIEL S – URK26CS1083
  - GLADYS JOYSELIN W – URK26CS1063
  - MONICA S – URK26CS1068
  - SARAVNA M – URK26CS1090
- Course: Web Technology – Micro Project · [Course code] · [Semester / Section]
- Karunya Institute of Technology and Sciences · [Guide / Faculty name] · [Date]

**Visual:** `assets/icons/logo.svg` + a cropped `01-landing-desktop.png`

---

## Slide 1 – Webpage title and project objective

**On slide**
- Webpage title: **"ParkFinder | Smart City Parking Finder"** (the `<title>` tag)
- Industry: Urban mobility
- **Problem:** drivers waste time and fuel circling for parking without knowing where slots are free
- **Objective:** a responsive web app to locate available parking with an interactive map, search, filters and navigation support
- **Scope:** front-end only · 12 simulated locations in Coimbatore · simulated availability updates
- ⚠️ Data is simulated for demonstration – not real parking inventory

**Visual:** `01-landing-desktop.png`

**Notes:** Point to the hero text and the "Demo data" notice – the app is honest that the data is simulated.

---

## Slide 2 – How many HTML tags were used and why

**On slide** (counted with an HTML parser on `index.html`)

| | Unique tag types | Total element instances |
|---|---|---|
| HTML elements in `index.html` | **35** | **199** |

- Most used: `<div>` 35 · `<span>` 26 · `<p>` 25 · `<li>` 12 · `<label>` 10 · `<a>` 9 · `<input>` 9
- **Why semantic tags?** `header, nav, main, section, aside, footer` describe the *meaning* of each area – better for accessibility, search engines and readable code.
- **Why labels and fieldsets?** Every control has a `<label>`; groups use `<fieldset>` + `<legend>`.
- The 12 parking cards (`li, article, h3…`) are **created by JavaScript**, so they are not in the static count.

**Notes:** *Unique types* = how many different tags; *instances* = how many times they appear.

---

## Slide 3 – Major HTML tags used

| Tag | Used for in ParkFinder |
|---|---|
| `<header>`, `<nav>` | Sticky navbar: logo, Overview, Find Parking, Live Map, About, Near me |
| `<main>`, `<section>` | Hero, statistics, Find Parking area, filters, list, map |
| `<aside>` | Selected parking details panel |
| `<form>`, `<input>`, `<label>` | Search box; checkboxes; vehicle radio buttons; price slider |
| `<fieldset>`, `<legend>` | Availability / Vehicle type / Favourites groups |
| `<select>`, `<option>` | Sort by: Nearest / Cheapest / Most available |
| `<output>` | Live value of the price slider (₹30/hr) |
| `<dl>`, `<dt>`, `<dd>` | Available, occupied, capacity, price, hours, distance, vehicles |
| `<ul>`, `<li>` | Parking list, facility tags, footer lists |
| `<a target="_blank">` | Google Maps directions (safe `rel="noopener noreferrer"`) |
| `<button>` | Menu, Near me, Search, Reset filters, Pause updates, Save to favourites |
| `<footer>` | About section: description, team, technologies, map credit |
| `<script defer>` | Leaflet → data.js → map.js → script.js |

---

## Slide 4 – CSS code and layout logic

**On slide**
- **Simple design:** navy header and hero, white panels with thin borders, small corners, no animations, system font
- **CSS variables:** navy `#0B1F3A`, teal `#0D9B8E`, green `#16A34A`, orange `#F59E0B`, red `#DC2626`, background `#F3F5F8`
- **Flexbox** – navbar, search bar, card rows, buttons
- **CSS Grid** – 4 statistics; list | map | details (each 600px tall; list and details scroll inside)
- **Filter bar:** `repeat(auto-fit, minmax(190px, 1fr))` – groups wrap by themselves
- **Responsive:** ≤1199px details under list + map · ≤959px Menu button, 2×2 statistics · ≤767px one column, map first, 40px tap targets
- Occupancy bars: JavaScript sets `--fill: 70%`, CSS draws the width
- Accessibility: darker teal for button text contrast; visible focus outlines

**Visual:** `10-tablet-768.png` next to `11-mobile-390.png`

---

## Slide 5 – JavaScript code and how the application works

**On slide**
- **3 files, 73 functions**
  - `data.js` – `APP_CONFIG` + `PARKING_SPOTS` (12 records; the single source of truth)
  - `map.js` (12 functions) – Leaflet map, markers, popups, reference marker
  - `script.js` (61 functions) – data check, statistics, distances, search, filters, sorting, rendering, selection, favourites, near me, simulation, navigation
- **One refresh pipeline** – `updateParkingList()`:
  `read controls → filter() → sort() → keep/choose selection → cards → details → map markers`
- Array methods: `filter()`, `sort()`, `map()`, `reduce()`, `includes()`, `some()`, `find()`
- Events: `input`, `submit`, `click`, `keydown`, `scroll` (event delegation for cards)
- Browser APIs: `setInterval`, `localStorage`, `navigator.geolocation`

**Visual:** the pipeline as a diagram.

---

## Slide 6 – Landing page and dashboard output

**Visual:** `02-full-page-desktop.png` (or `01-landing-desktop.png` + `03-dashboard-filters-cards-map.png`)

**On slide (labels on the screenshot)**
- Statistics calculated from the data: 12 locations · capacity 1,105 · available / occupied with %
- Demo-data notice with the last update time and Pause button
- Filter bar above the list, map and details
- Map markers show the number of free slots
- Selected parking panel: available, occupied, capacity, price, hours, distance, vehicles, facilities, **Get directions**, **Save to favourites**

---

## Slide 7 – Filters, parking cards and interactive map

**Visuals (2×2 grid):**
- `05-search-gandhipuram.png` – live search: 1 result, list + map + details in sync
- `06-filters-available-bike.png` – Available + Bike: only matching markers remain
- `04-marker-popup.png` – marker popup with area, status, slots, price and distance
- `07-near-me.png` – Near me: blue "You" marker, "Distances from your location", nearest first

Optional: `08-favourites-saved-only.png`, `09-empty-state.png`, `12-mobile-menu.png`

---

## Slide 8 – Algorithm and user interaction flow

**On slide**
1. **Status:** `0 free → Full`; `> 40% free → Available`; otherwise `Filling fast`
2. **Statistics:** totals with `reduce()`; occupied = capacity − available; % = part ÷ capacity × 100
3. **Search + filters:** keep a spot only if *all* conditions are true (`filter()` + `includes()`)
4. **Sort a copy:** `[...spots].sort(compare)` – original data never changes
5. **Selection sync:** keep the selected spot if visible, else the first result, else an empty message
6. **Distances (Haversine):** `d = 2R·atan2(√a, √(1−a))`, R = 6371 km – from the user, or from the labelled demo point
7. **Simulation:** every 5 s, 3 random spots ±1…3 slots, `clamp(0, capacity)`, redraw everything
8. **Favourites:** ids in a `Set` → `JSON.stringify` → `localStorage`

**Flow diagram:**
`User action (type / click / filter / timer) → updateParkingList() → cards + details + markers`

---

## Slide 9 – Applications, limitations and future scope

| Applications | Limitations | Future scope |
|---|---|---|
| Smart-city parking portals | Simulated data, not real sensors | Real sensor / open-data API via a backend |
| Malls, hospitals, campuses | Needs internet for map tiles | Booking and digital payment |
| Event / stadium parking guides | Straight-line distance only | Road routing and travel time |
| Reducing traffic and fuel waste | Favourites only in one browser | Alerts when a favourite fills up |
| | One city, no booking | Multi-city, marker clustering, EV / accessible filters |

---

## Slide 10 – Conclusion and thank you

**On slide**
- Built a complete, responsive parking-finder interface with **HTML5, CSS3 and vanilla JavaScript**
- Integrated **Leaflet + OpenStreetMap**, **LocalStorage**, **Geolocation** and **Google Maps** directions
- Clear separation: **data.js** (data) · **map.js** (map) · **script.js** (logic) · **style.css** (design)
- Every screen element is calculated from one dataset – no hard-coded numbers
- Tested with 57 automated browser checks – all passed
- **Thank you! Questions?**

**Visual:** `12-mobile-menu.png` or the logo on navy.
