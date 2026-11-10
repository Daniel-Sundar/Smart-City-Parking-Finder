# ParkFinder – 20-Minute Presentation Script

**Team:**

| # | Name | Register number |
|---|---|---|
| 1 | DANIEL S | URK26CS1083 |
| 2 | GLADYS JOYSELIN W | URK26CS1063 |
| 3 | MONICA S | URK26CS1068 |
| 4 | SARAVNA M | URK26CS1090 |

Everyone speaks in their own voice. No AI voice, AI presenter or AI-generated video is used. The demo is done live in the browser.

## Timing plan

| Time | Part | Speaker | Slides |
|---|---|---|---|
| 0:00 – 3:30 | Introduction, problem statement, objective | DANIEL S | Title, 1 |
| 3:30 – 7:00 | HTML explanation | GLADYS JOYSELIN W | 2, 3 |
| 7:00 – 10:00 | CSS explanation | MONICA S | 4 |
| 10:00 – 13:00 | JavaScript explanation | SARAVNA M | 5 |
| 13:00 – 15:00 | Algorithm explanation | DANIEL S | 8 |
| 15:00 – 19:00 | Live demonstration (interactive) | All (GLADYS → MONICA → SARAVNA → DANIEL) | browser |
| 19:00 – 20:00 | Applications, limitations, conclusion | DANIEL S | 9, 10 |

---

## Before you start (checklist)

- [ ] Laptop connected to the internet; projector set to "duplicate".
- [ ] VS Code open → right-click `index.html` → **Open with Live Server**.
- [ ] Browser zoom at 100%; close other tabs.
- [ ] In DevTools → Application → Local Storage, delete `parkfinder-favourites` so favourites start empty.
- [ ] Location permission for `127.0.0.1` set to **Ask** (click the icon left of the address bar).
- [ ] Backup: open `docs/screenshots/` in case the internet fails.

---

## 0:00 – 3:30 · DANIEL S – Introduction and problem statement

> Good [morning/afternoon]. We are DANIEL, GLADYS, MONICA and SARAVNA, and our Web Technology micro-project is **Smart City Parking Finder**. Our product is called **ParkFinder**.
>
> **Problem.** In busy areas like Gandhipuram or RS Puram, drivers often circle for ten minutes or more looking for parking. They don't know which parking areas have free slots, how much they cost, or whether they accept bikes. This wastes time and fuel and adds to traffic.
>
> **Objective.** We designed and developed a responsive front-end web application that helps users find available parking using an interactive map, search, filters and navigation support.
>
> **Scope.** It is front-end only: HTML5, CSS3 and plain JavaScript. There is no backend or database. We created 12 parking locations across Coimbatore. **Their data is simulated**: the slot numbers, prices and the changing availability are demonstration data, not real parking inventory. The app itself clearly says this in the hero text and in the "Demo data" notice above the filters.
>
> We used Leaflet.js with OpenStreetMap for the map, LocalStorage for favourites, the browser Geolocation API for "Near me", and a Google Maps link for directions.
>
> GLADYS will now explain how we structured the page with HTML.

## 3:30 – 7:00 · GLADYS JOYSELIN W – HTML explanation (Slides 2–3)

> Our webpage title, shown in the browser tab, is "ParkFinder | Smart City Parking Finder".
>
> We counted the tags in `index.html` with an HTML parser. We used **35 different HTML tag types** and **199 HTML elements** in total. *Unique types* means how many different tags; *instances* means how many times they appear. The most used are `div` (35), `span` (26) and `p` (25).
>
> We used **semantic tags** so the structure has meaning: `header` and `nav` for the top bar, `main` for the content, `section` for each area, `aside` for the selected parking panel, and `footer` for the About section with our team and technologies. This helps screen readers and makes the code easier to read.
>
> For the controls, every input has a `label`. The availability checkboxes are grouped in a `fieldset` with a `legend`. The price slider is an `input type="range"`, and its value appears in an `output` tag. Sorting uses a `select` with three `option`s. The parking details use a description list – `dl`, `dt`, `dd` – because they are label–value pairs.
>
> The Get directions button is actually an `a` link with `target="_blank"` and `rel="noopener noreferrer"`, so it opens Google Maps safely in a new tab.
>
> Finally, the four `script` tags load Leaflet, then data.js, map.js and script.js, all with `defer`. The order matters because each file uses things from the file before it. The parking cards themselves are not written in HTML – JavaScript creates them, which SARAVNA will explain.

## 7:00 – 10:00 · MONICA S – CSS explanation (Slide 4)

> All our styling is in one file, `style.css`, organised into numbered sections.
>
> At the top we defined **CSS variables** – our design tokens: deep navy `#0B1F3A` as the primary colour, teal `#0D9B8E` as the accent, and green, orange and red for availability. Because every rule uses `var(--name)`, we can change a colour in one place.
>
> We kept the design simple on purpose: a navy header, white panels with thin borders, small rounded corners, no animations and the computer's own font. Colour is used for meaning – green, orange and red for availability – not for decoration.
>
> For layout we used two tools. **Flexbox** lines things up in one row or column – the navbar, the search bar and the rows inside each card. **CSS Grid** handles rows and columns together: the four statistics, and the three columns list, map and details. Each column is 600 pixels tall; the list and the details scroll inside their own box, so one column never stretches the others. The filter bar uses `repeat(auto-fit, minmax(190px, 1fr))`, so the filter groups wrap onto new rows by themselves.
>
> The page is **responsive**. With media queries, below 1200 pixels the details panel moves under the list and map; below 960 the statistics become 2×2 and the links are hidden behind a **Menu** button – when opened, the menu pushes the page down instead of covering it; below 768 everything becomes one column with the map first and bigger tap targets for fingers.
>
> A nice trick: each occupancy bar has a CSS variable `--fill`. JavaScript only sets a number like 70%, and CSS draws the bar.
>
> For accessibility, white text on our exact teal had too little contrast, so buttons use a slightly darker shade of the same teal. Keyboard users see a clear focus outline.

## 10:00 – 13:00 · SARAVNA M – JavaScript explanation (Slide 5)

> Our JavaScript is split into three files with clear jobs.
>
> **data.js** holds only data: the settings and an array called `PARKING_SPOTS` with 12 objects. Each object has id, name, area, address, available slots, total slots, price, latitude, longitude, vehicle types, opening hours and facilities. We don't type distances in – they are calculated from the coordinates, so they always match the map. When the page starts, `validateDataset()` checks every record and reports any mistake in the console.
>
> **map.js** contains everything about the Leaflet map – creating it, the markers (each shows its number of free slots), the popups and the location marker.
>
> **script.js** is the application logic. The most important function is `updateParkingList()`. Whenever anything changes – typing, a filter, a simulated update – it reads all the controls, uses `filter()` to keep matching spots, `sort()` on a copy to order them, decides which spot stays selected, and then redraws the cards, the details panel and the map markers.
>
> The cards are created with `map()`, which turns each spot object into an HTML string; then `join()` combines them and `innerHTML` puts them on the page. Text from users is escaped first so it can't become HTML. The statistics use `reduce()` to add up the slots.
>
> We used event listeners for user actions: `input` for typing and filters, `click` for cards and buttons. For the cards we used **event delegation** – one listener on the list instead of one per card.
>
> We also used three browser features: `setInterval` for the availability simulation, `localStorage` for favourites, and `navigator.geolocation` for Near me.

## 13:00 – 15:00 · DANIEL S – Algorithm explanation (Slide 8)

> Let me explain the main algorithms.
>
> **Status:** if a spot has 0 free slots it is *Full*; if more than 40% are free it is *Available*; otherwise *Filling fast*. For example, 20 out of 50 is exactly 40%, so it shows Filling fast.
>
> **Filtering:** a spot is shown only if every condition is true – the search text appears in its name, area or address, its status is ticked, it accepts the chosen vehicle, and its price is within the maximum.
>
> **Selection sync:** after filtering, if the selected spot is still visible we keep it; if not, we select the first result; and if there are no results, the panel shows a message instead of old details.
>
> **Simulation:** every five seconds we pick three random spots and change each by between minus three and plus three slots. We *clamp* the value so it never goes below zero or above capacity – we tested this with three thousand updates.
>
> **Distances** use the **Haversine formula**, which calculates the straight-line distance between two latitude/longitude points on a sphere with radius 6,371 km. At first they are measured from a demo reference point, Town Hall, and the list says so. After **Near me**, they are measured from the user. If the user refuses permission, we never pretend – the message says we are still using the demo point.
>
> Now we'll show you all of this live.

## 15:00 – 19:00 · Live demonstration (interactive)

**GLADYS JOYSELIN W – Search and filters (≈1 min)**
1. *"Can someone from the audience name an area of Coimbatore?"* Type it in the search bar, e.g. `Gandhipuram`. Point out: 1 result, the map moved, the details panel changed.
2. Type `airport` → empty message, no markers, the panel says nothing is selected.
3. Click **Reset filters**. Untick **Filling fast** and **Full** → only green spots. Choose **Bike**. Drag **Max price** to ₹30.
4. Change **Sort by** to *Cheapest first*, then click **Reset filters** again.

**MONICA S – Map and Near me (≈1 min)**
1. Click a parking **card** → the map centres on it and opens the popup.
2. Click a different **marker** → the card is highlighted and the details panel updates.
3. Click **Near me** → allow location. Show the blue dot, "Distances from your location" above the list, nearest first, and the message at the bottom.
   *(If permission is blocked: show the message – it clearly says distances are from the demo reference point – and that search still works.)*

**SARAVNA M – Simulation, favourites, directions (≈1 min)**
1. Point to the **Demo data** notice: watch "Last simulated update" change and the numbers on the markers and cards move. Click **Pause updates**, then **Resume updates**.
2. Click **Save to favourites** on a spot → "♥ Saved" on its card and a message. Save a second one. Tick **Show saved only**.
3. Press **F5** to refresh → the favourites are still there (LocalStorage).
4. Click **Get directions** → Google Maps opens in a new tab. Close it.

**DANIEL S – Responsive (≈30 s)**
1. Press **F12 → Ctrl+Shift+M** (device toolbar), choose a phone. Show the single column, open the **Menu** (it pushes the page down) and close it with **Close**.

**Backup plan:** if there is no internet, show the screenshots in `docs/screenshots/` in order 01 → 12 and describe each step.

## 19:00 – 20:00 · DANIEL S – Applications, limitations, conclusion (Slides 9–10)

> ParkFinder's idea can be used by smart-city portals, malls, hospitals, campuses and event venues.
>
> Its limitations: the data is simulated, it needs the internet for the map, distances are straight-line, and favourites stay in one browser. In future, it could connect to real sensors through a backend, add booking and payment, real road routing and alerts.
>
> To conclude: we built a complete, responsive parking-finder interface with HTML, CSS and plain JavaScript, integrated a real interactive map, and kept the code separated into data, map, logic and design. Every number on the screen is calculated from one dataset, and we tested 57 checks in an automated browser – all passed.
>
> Thank you. We are happy to take your questions.

