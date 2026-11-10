# ParkFinder – Viva and Concepts Guide

A beginner-friendly explanation of how ParkFinder works, using the actual code in this project, plus likely viva questions with answers.

---

## Part A – Feature breakdown

Each feature is explained with the same 9 questions: problem, input, processing, output, HTML, CSS, JavaScript, algorithm, and where it is used.

### A1. Dashboard statistics
| | |
|---|---|
| **Problem** | Users want a quick city-wide picture: how much parking is free right now? |
| **Input** | The `PARKING_SPOTS` array (`totalSlots`, `availableSlots`, `price`) |
| **Processing** | Add up the slots with `reduce()`, subtract, divide for percentages and the average |
| **Output** | 12 locations · capacity 1,105 · 480 available (43% free) · 625 occupied (57%) · ₹27/hr (starting values) |
| **HTML** | `<article class="card stat-card">` with ids `stat-total`, `stat-available`, `stat-occupied`, `stat-price` and their `…-note` paragraphs |
| **CSS** | `.stats` (Grid, 4 columns), `.stat-card`, `.stat-icon-*`, `.stat-value` |
| **JavaScript** | `sumField()`, `calculateDashboardStats()`, `renderDashboardStats()` |
| **Algorithm** | `total = Σ field`; `occupied = capacity − available`; `occupancy% = occupied ÷ capacity × 100`; `average = Σ price ÷ count` |
| **Used** | On start-up (`initApp`) and after every simulated update (`refreshAfterDataChange`) |

### A2. Parking cards and availability status
| | |
|---|---|
| **Problem** | Show every parking location clearly, with its status at a glance |
| **Input** | A filtered, sorted array of spots and the selected id |
| **Processing** | For each spot: work out its status, build an HTML string; join them; insert into the list |
| **Output** | Cards with name, area, status badge (text + colour), free/total bar, price and distance |
| **HTML** | `<ul id="parking-list">` (cards are created inside it), `<span id="result-count">` |
| **CSS** | `.parking-card`, `.is-selected`, `.badge-available/-limited/-full`, `.occupancy-bar` with `--fill` |
| **JavaScript** | `getFreeRatio()`, `getAvailabilityStatus()`, `createParkingCardHTML()`, `renderParkingList()`, `escapeHTML()` |
| **Algorithm** | `0 free → full`; `free ÷ total > 0.4 → available`; otherwise `limited` |
| **Used** | Every time `updateParkingList()` runs |

### A3. Search
| | |
|---|---|
| **Problem** | Find parking by name, area or street quickly |
| **Input** | Text typed in `#search-input` |
| **Processing** | `trim()` + `toLowerCase()`; for each spot join name + area + address in lower case; check `includes()` |
| **Output** | Only matching cards and markers; result count; an empty-state message if nothing matches |
| **HTML** | `<form id="search-form" role="search">`, `<label class="visually-hidden">`, `<input type="search">`, `<button type="submit">` |
| **CSS** | `.search-bar` (Flexbox), `.search-bar:focus-within`, `.list-message` |
| **JavaScript** | `setupSearchForm()` (`input` + `submit` events), `getFilterValues()`, `matchesSearch()`, `getEmptyMessage()` |
| **Algorithm** | `text.includes(search)` where both are lower case; empty search matches everything |
| **Used** | Hero search bar; Enter key and Search button also scroll to the results |

### A4. Filters, sorting and reset
| | |
|---|---|
| **Problem** | Narrow down to spots that suit the user (space, vehicle, budget, favourites) and order them |
| **Input** | Checkboxes `name="status"`, radios `name="vehicle"`, `#price-range`, `#saved-only`, `#sort-select` |
| **Processing** | `filter()` keeps a spot only if all conditions are true; `[...spots].sort(compare)` orders a copy |
| **Output** | Updated cards, result count, markers and selection |
| **HTML** | `<form id="filter-form">`, `<fieldset>`/`<legend>`, `<output id="price-output">`, `<select>` |
| **CSS** | `.filter-form` (`auto-fit` grid), `.filter-group`, `.check`, `.segmented` (hidden radio + styled span), `accent-color` |
| **JavaScript** | `filterParkingSpots()`, `SORT_COMPARATORS`, `sortParkingSpots()`, `updatePriceLabel()`, `setupFilterControls()`, `resetFilters()` |
| **Algorithm** | AND of five conditions; compare functions `a − b` (ascending) or `b − a` (descending) with a distance tie-break |
| **Used** | One `input` listener on the whole filter form; Reset uses `form.reset()` + clears search + default selection |

### A5. Selection and synchronisation
| | |
|---|---|
| **Problem** | The list, the map and the details panel must always show the same spot |
| **Input** | A card click, a marker click, or a change in the results |
| **Processing** | Keep the selected id if visible, else the first result, else `null` |
| **Output** | Highlighted card, highlighted marker with popup, filled details panel (or an empty message) |
| **HTML** | `<aside id="info-panel">`, `#info-content`, `#info-empty` |
| **CSS** | `.parking-card.is-selected`, `.map-marker.is-selected` |
| **JavaScript** | `getSyncedSelectionId()`, `selectParkingSpot()`, `setupCardSelection()` (event delegation), `handleMarkerSelect()`, `renderInfoPanel()` |
| **Algorithm** | `some()` to check visibility; `find()` to get the spot object |
| **Used** | Card clicks, marker clicks, every filter/search change, simulated updates |

### A6. Interactive map (Leaflet + OpenStreetMap)
| | |
|---|---|
| **Problem** | Users need to *see* where parking is |
| **Input** | `PARKING_SPOTS` latitude/longitude, the visible spots, the selected id |
| **Processing** | Create the map and one marker per spot once; afterwards only add/remove markers and change icons |
| **Output** | Markers showing the number of free slots in the status colour, popups, legend, zoom buttons, OpenStreetMap credit |
| **HTML** | `<div id="map">`, `<p id="map-status">`, `.map-legend` |
| **CSS** | `.map-card`, `.map-marker`, `.marker-available/-limited/-full`, `.leaflet-popup-*`, `.map-status` |
| **JavaScript** | `initMap()`, `createAllMarkers()`, `createMarkerIcon()`, `createPopupHTML()`, `refreshMarkerIcon()`, `updateMapMarkers()`, `focusMapOnSpot()`, `resetMapView()` |
| **Algorithm** | A `Set` of visible ids → `addLayer` / `removeLayer`; redraw an icon only when its status, number or selection changed |
| **Used** | Whole app; map ↔ card sync |

### A7. Simulated real-time availability
| | |
|---|---|
| **Problem** | Show how a real system would update without a real sensor feed |
| **Input** | `APP_CONFIG.simulation` = every 5000 ms, 3 spots, ±3 slots |
| **Processing** | Pick 3 different random spots, add a random non-zero change, clamp to 0…capacity, redraw |
| **Output** | Changing numbers, statuses, marker colours and numbers, popups, statistics; "Last simulated update" time |
| **HTML** | `.demo-bar`, `#sim-last-update`, `#sim-toggle` |
| **CSS** | `.demo-bar`, `.demo-bar.is-paused` (grey border when paused) |
| **JavaScript** | `startSimulation()`, `stopSimulation()`, `simulateAvailabilityUpdate()`, `pickRandomSpots()`, `getRandomInteger()`, `clamp()`, `refreshAfterDataChange()` |
| **Algorithm** | `clamp(x, 0, total) = min(max(x, 0), total)` |
| **Used** | Starts automatically; the Pause/Resume button stops/starts it |

### A8. Distances and Near me (Haversine + Geolocation)
| | |
|---|---|
| **Problem** | "How far is each parking?" and "Which parking is closest to me right now?" |
| **Input** | Parking coordinates; a starting point: the demo reference point (Town Hall) at first, the user's position after they allow it |
| **Processing** | Haversine distance to every spot; sort nearest first; show the starting point on the map; select the nearest visible spot |
| **Output** | Distances on cards and in the details; a note above the list saying what they are measured from; blue "You" marker, or grey "Demo reference point" marker if location is not available; a message |
| **HTML** | `#locate-btn`, `#locate-label`, `#distance-basis`, `#legend-user`, `#toast` |
| **CSS** | `.user-marker`, `.user-marker.is-demo`, `.btn:disabled`, `.toast` |
| **JavaScript** | `calculateDistances()`, `haversineDistanceKm()`, `getSpotDistance()`, `getDistanceBasisText()`, `requestUserLocation()`, `handleLocationFound()`, `handleLocationError()`, `useDistanceOrigin()`, `useDemoReferencePoint()`, `showReferenceMarker()` |
| **Algorithm** | Haversine: `a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)`, `d = 2R·atan2(√a, √(1−a))` |
| **Used** | Distances on start-up; Near me only when the button is clicked; the position is never saved; the app never claims to know the user's location when it doesn't |

### A9. Directions
| | |
|---|---|
| **Problem** | Help the user actually get to the parking |
| **Input** | The selected spot's latitude/longitude |
| **Processing** | Build a Google Maps URL |
| **Output** | A new tab with Google Maps directions |
| **HTML** | `<a id="directions-link" target="_blank" rel="noopener noreferrer">` |
| **CSS** | `.btn .btn-primary` (a link styled as a button) |
| **JavaScript** | `getDirectionsURL()`, set in `renderInfoPanel()` |
| **Algorithm** | `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` |
| **Used** | Details panel |

### A10. Favourites (LocalStorage)
| | |
|---|---|
| **Problem** | Remember a user's preferred spots between visits |
| **Input** | Clicks on **Save to favourites** / **Remove from favourites** |
| **Processing** | Add/remove the id in a `Set`; `JSON.stringify` → `localStorage.setItem`; on start `getItem` → `JSON.parse` → validate |
| **Output** | Button text and state, "♥ Saved" on cards, count, "Show saved only", toast message |
| **HTML** | `#save-btn` (`aria-pressed`), `#saved-only`, `#saved-count` |
| **CSS** | `.save-btn.is-saved`, `.saved-mark` |
| **JavaScript** | `loadFavourites()`, `saveFavourites()`, `isFavourite()`, `toggleFavourite()`, `renderSaveButton()`, `renderSavedCount()`, `setupFavourites()` |
| **Algorithm** | A Set prevents duplicates; `try/catch` handles blocked or broken storage |
| **Used** | Details panel and filters |

---

## Part B – Beginner concepts with project examples

**Variables** – named boxes for values.
- `const` = cannot be re-assigned: `const AVAILABLE_THRESHOLD = 0.4;`
- `let` = can change: `let selectedSpotId = DEFAULT_SPOT_ID;`

**Arrays** – ordered lists, starting at index 0: `PARKING_SPOTS[0]` is RS Puram; `PARKING_SPOTS.length` is 12.

**Objects** – `key: value` facts about one thing: `{ id: 1, name: "RS Puram Multi-Level Parking", totalSlots: 60 }`. Read with `spot.name`.

**Functions** – reusable named steps with inputs (parameters) and an output (`return`): `formatPrice(30)` returns `"₹30/hr"`.

**Conditional statements** – choose what to do:
```js
if (spot.availableSlots === 0) return "full";
if (getFreeRatio(spot) > AVAILABLE_THRESHOLD) return "available";
return "limited";
```
The ternary `condition ? a : b` is a short `if/else`: `isSaved ? "Saved" : "Save"`.

**Loops** – repeat work: `while (change === 0) { change = getRandomInteger(-3, 3); }` and `PARKING_SPOTS.forEach(spot => …)`.

**Array methods**
| Method | Returns | Example in ParkFinder |
|---|---|---|
| `forEach` | nothing (just does something for each) | create one marker per spot |
| `map` | a new array of the same length | spots → HTML strings for cards |
| `filter` | a new, shorter array | spots matching the filters |
| `sort` | the same array, reordered (so we copy first) | `[...spots].sort(compare)` |
| `reduce` | one value | total available slots |
| `includes` | true/false | `filters.statuses.includes("full")`, text search |
| `some` | true/false (at least one) | is the selected spot still visible? |
| `find` | the first match | `findSpotById(5)` |

**DOM manipulation** – the DOM is the browser's live tree of the page. JavaScript finds elements (`document.getElementById("info-title")`) and changes them (`.textContent`, `.innerHTML`, `.classList.toggle`, `.hidden`, `.style.setProperty("--fill", "70%")`).

**Event listeners** – "when this happens, run this":
`document.getElementById("save-btn").addEventListener("click", …)`. Events *bubble* up, so one listener on the filter form hears every checkbox, and one listener on the list handles every card (event delegation).

**setInterval()** – runs a function again and again: `setInterval(simulateAvailabilityUpdate, 5000)` returns an id; `clearInterval(id)` stops it.

**LocalStorage** – small text storage in the browser that survives refresh: `localStorage.setItem("parkfinder-favourites", "[2,5]")`, `getItem(...)`. It only stores text, so we use `JSON.stringify` / `JSON.parse`. Each browser has its own copy.

**Geolocation** – `navigator.geolocation.getCurrentPosition(success, error, options)`. The browser asks the user; `error.code` 1 = denied, 2 = unavailable, 3 = timeout. It only works on secure pages (https or localhost).

**Haversine distance** – the shortest distance over the Earth's surface between two latitude/longitude points (straight line, not roads).

**Leaflet map integration** – `L.map("map").setView([lat, lng], zoom)` creates the map; `L.tileLayer(url, { attribution })` adds OpenStreetMap images; `L.marker([lat, lng])` adds a pin; `bindPopup(html)` adds its bubble.

**Marker and popup management** – markers are created once and kept in a `Map` (`markersById`). Filters add/remove them from a `layerGroup`. `setIcon()` changes colour/size, `setPopupContent()` updates popup text, `openPopup()` shows it.

---

## Part C – Likely viva questions and answers

**General**
1. **What is your project?** A responsive front-end web app, ParkFinder, for finding parking in Coimbatore using a map, search, filters, near-me and directions.
2. **Is the data real?** No. The 12 records and their availability are simulated for demonstration. The app says so on screen.
3. **Why no backend?** The micro-project scope is front-end. We simulate real-time data with `setInterval` and store favourites in LocalStorage.
4. **What technologies did you use?** HTML5, CSS3, JavaScript ES6, Leaflet.js, OpenStreetMap, LocalStorage, the Geolocation API and a Google Maps URL.

**HTML**
5. **How many HTML tags did you use?** 35 unique HTML tag types and 199 HTML elements in `index.html`. The 12 parking cards are added by JavaScript.
6. **What are semantic tags? Give examples.** Tags that describe meaning: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`.
7. **Why use `<label for>`?** It links text to its input: clicking the label focuses the input, and screen readers read it.
8. **What does `defer` do?** It downloads the script without blocking the page and runs it after the HTML is parsed, in order.
9. **Why `rel="noopener noreferrer"`?** So the new Google Maps tab cannot control our page through `window.opener`.
10. **What is `data-id`?** A custom attribute that stores the spot id on a card; JavaScript reads it as `card.dataset.id` (text, so we use `Number()`).

**CSS**
11. **Flexbox vs Grid?** Flexbox arranges items in one direction (a row or a column); Grid arranges rows and columns together. We use Flexbox for the navbar and cards, and Grid for the stats and dashboard.
12. **What are CSS variables?** Reusable values like `--navy-900: #0b1f3a`, used with `var(--navy-900)`.
13. **How is the site responsive?** Media queries at 1199, 959 and 767 px: the details move under the list and map, the statistics become 2×2, the links move behind a Menu button, and phones get one column with the map first.
14. **How is the occupancy bar drawn?** JavaScript sets `--fill: 70%` on the element; CSS uses `width: var(--fill)`.
15. **Why is the teal button slightly darker than #0D9B8E?** White text on #0D9B8E has 3.4:1 contrast; the darker shade reaches 5.2:1, which meets the 4.5:1 readability guideline.

**JavaScript**
16. **`let` vs `const`?** `const` can't be re-assigned; `let` can.
17. **`==` vs `===`?** `===` compares value **and** type without conversion; we always use `===`.
18. **Why copy the array before sorting?** `sort()` changes the original array; `[...spots]` keeps `PARKING_SPOTS` in its original order.
19. **How do statistics stay correct during the simulation?** They are recalculated from the data with `reduce()` after every update – never hard-coded.
20. **What is event delegation?** One listener on a parent (`#parking-list`) handles clicks on all its children (cards), even cards created later.
21. **How do you stop XSS when using innerHTML?** We escape text with `escapeHTML()` (`<` becomes `&lt;`) and use `textContent` for messages.
22. **Why `try/catch` around localStorage?** Storage can be blocked or contain broken text; we don't want the app to crash.
23. **How do you avoid duplicate favourites?** We store ids in a `Set`, which can't hold the same value twice.
24. **How do you prevent two simulation timers?** `startSimulation()` returns early if `simulationTimerId` is not `null`.
25. **What happens if the user denies location?** A message explains it, the button resets, and manual search still works.

**Map / algorithms**
26. **What is Leaflet? What is OpenStreetMap?** Leaflet is a JavaScript map library; OpenStreetMap provides the free map tiles (images) it displays.
27. **What does `setView()` do?** It moves the map to a `[latitude, longitude]` at a zoom level.
28. **How do markers disappear when filtering?** They are removed from the layer group (`removeLayer`), not deleted, and added back later (`addLayer`).
29. **Explain the Haversine formula.** It converts the latitude/longitude difference to radians and uses sine/cosine to find the angle between the points, then multiplies by Earth's radius (6371 km).
30. **When is a spot "Filling fast"?** When it has at least 1 free slot and 40% or less of its slots free.
31. **How did you test the project?** We ran 57 automated browser checks (data validation, statistics, search, every filter and combinations, sorting, reset, map sync, popups, zoom, simulation and pause, geolocation granted/denied/unavailable/timeout/unsupported, favourites after refresh, directions, six screen widths, mobile menu, console errors, broken files) and all passed. We also tested manually with Live Server.
32. **What would you add next?** Real sensor data through a backend, booking and payment, road routing, alerts and multi-city support.
33. **Why aren't distances stored in data.js?** Typed-in distances could disagree with the map. We calculate them from the coordinates with the Haversine formula, so they are always correct.
34. **What happens if the user refuses location?** The app explains it and keeps measuring distances from the demo reference point (Town Hall), labelled clearly on the list and the map. It never pretends to know where the user is.
35. **How do you catch mistakes in the dataset?** `validateDataset()` runs at start-up and checks ids, names, coordinates, capacity, available slots, price, opening hours and vehicle types; problems appear in the browser console.
36. **How does the mobile menu avoid covering the page?** The open menu is part of the header (the header row wraps), so it pushes the page down. It closes with Esc, the Close button, or when a link is chosen.
37. **Why do the markers show numbers?** The number is the free slots. It means status is not shown by colour alone, which helps colour-blind users.
