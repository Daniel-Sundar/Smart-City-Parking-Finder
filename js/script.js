/* =========================================================
   script.js - Main app file (the starting point)
   ---------------------------------------------------------
   Job: calculations, filtering/sorting, building the page
   from the data, and connecting buttons/forms to code.
   Map drawing lives in map.js; the data lives in data.js.

   Sections:
     0. Checking the dataset
     1. Availability status
     2. Calculations (statistics + Haversine distance)
     3. Filtering and sorting
     4. Rendering (writing HTML into the page)
     5. Selecting a parking spot
     6. Favourites (LocalStorage)
     7. Near me (Geolocation)
     8. Simulated availability (setInterval)
     9. Page controls (menu, search, filters, reset)
    10. Start the app
   ========================================================= */


/* ---------------------------------------------------------
   0. CHECKING THE DATASET
   Runs once at start-up. If a record in data.js is wrong
   (e.g. a typo in a coordinate), a warning appears in the
   browser console (F12) explaining what to fix.
   --------------------------------------------------------- */

const VALID_VEHICLES = ["car", "bike"];

/** Returns a list of problems found in the dataset (empty list = all good). */
function validateDataset(spots) {
  const problems = [];
  const seenIds = new Set();

  spots.forEach((spot) => {
    const label = `Spot ${spot.id} (${spot.name})`;

    if (seenIds.has(spot.id)) problems.push(`${label}: duplicate id`);
    seenIds.add(spot.id);

    if (typeof spot.name !== "string" || spot.name.trim() === "") problems.push(`${label}: missing name`);
    if (!(spot.latitude >= -90 && spot.latitude <= 90)) problems.push(`${label}: invalid latitude`);
    if (!(spot.longitude >= -180 && spot.longitude <= 180)) problems.push(`${label}: invalid longitude`);
    if (!Number.isInteger(spot.totalSlots) || spot.totalSlots <= 0) problems.push(`${label}: totalSlots must be a whole number above 0`);
    if (!Number.isInteger(spot.availableSlots) || spot.availableSlots < 0 || spot.availableSlots > spot.totalSlots) {
      problems.push(`${label}: availableSlots must be between 0 and totalSlots`);
    }
    if (!(spot.price >= 0)) problems.push(`${label}: price cannot be negative`);
    if (typeof spot.openingHours !== "string" || spot.openingHours.trim() === "") problems.push(`${label}: missing openingHours`);
    if (!Array.isArray(spot.vehicleTypes) || spot.vehicleTypes.length === 0 ||
        !spot.vehicleTypes.every((type) => VALID_VEHICLES.includes(type))) {
      problems.push(`${label}: vehicleTypes must contain "car" and/or "bike"`);
    }
  });

  return problems;
}


/* ---------------------------------------------------------
   1. AVAILABILITY STATUS
   --------------------------------------------------------- */

// Above this share of free slots, a spot counts as "Available".
const AVAILABLE_THRESHOLD = 0.4; // 0.4 = 40%

// Text shown on the badge for each status.
// The status word (available / limited / full) also matches our
// CSS class names: badge-available, badge-limited, badge-full.
const STATUS_LABELS = {
  available: "Available",
  limited: "Filling fast",
  full: "Full",
};

// Display names for the vehicle codes stored in data.js
const VEHICLE_LABELS = {
  car: "Car",
  bike: "Bike",
};

/**
 * Returns the share of free slots as a number from 0 to 1.
 * Example: 42 free out of 60 -> 0.7
 */
function getFreeRatio(spot) {
  if (spot.totalSlots === 0) return 0; // avoid dividing by zero
  return spot.availableSlots / spot.totalSlots;
}

/**
 * Decides the status of a parking spot (available / limited / full).
 *   "full"      -> 0 slots free
 *   "available" -> more than 40% free
 *   "limited"   -> anything in between (above 0%, up to 40%)
 */
function getAvailabilityStatus(spot) {
  if (spot.availableSlots === 0) return "full";
  if (getFreeRatio(spot) > AVAILABLE_THRESHOLD) return "available";
  return "limited";
}


/* ---------------------------------------------------------
   2. CALCULATIONS
   Pure functions: they take data in and return numbers.
   They never touch the page.
   --------------------------------------------------------- */

/**
 * Adds up one number field across all spots.
 * Example: sumField(spots, "totalSlots") -> 1105
 */
function sumField(spots, fieldName) {
  return spots.reduce((total, spot) => total + spot[fieldName], 0);
}

/**
 * Calculates all dashboard statistics in one place.
 * Returns an object, e.g. { totalLocations: 12, availableSlots: 480, ... }
 * Called again after every simulated update, so the numbers stay correct.
 */
function calculateDashboardStats(spots) {
  const totalLocations = spots.length;
  const totalSlots = sumField(spots, "totalSlots");
  const availableSlots = sumField(spots, "availableSlots");
  const occupiedSlots = totalSlots - availableSlots;

  // Guard against an empty list (dividing by 0 gives NaN)
  const averagePrice = totalLocations > 0
    ? sumField(spots, "price") / totalLocations
    : 0;
  const occupiedPercent = totalSlots > 0
    ? (occupiedSlots / totalSlots) * 100
    : 0;

  return {
    totalLocations,
    totalSlots,
    availableSlots,
    occupiedSlots,       // = totalSlots - availableSlots
    occupiedPercent,     // = occupiedSlots / totalSlots x 100
    freePercent: 100 - occupiedPercent, // = availableSlots / totalSlots x 100
    averagePrice,
  };
}

/** Converts degrees to radians (Math.sin/cos work in radians). */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine formula: straight-line ("as the crow flies") distance in km
 * between two points on Earth, given their latitude and longitude.
 * It treats Earth as a sphere with a radius of 6371 km.
 * Road distance is usually longer than this.
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS_KM = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

// The point that distances are measured from.
// It starts at the DEMO reference point from data.js (Town Hall) and is
// replaced by the user's real position after "Near me" succeeds.
// Kept only in memory: it is never saved.
let distanceOrigin = {
  latitude: APP_CONFIG.referencePoint.latitude,
  longitude: APP_CONFIG.referencePoint.longitude,
  isUserLocation: false,
};

// spot id -> distance in km from distanceOrigin
const spotDistances = new Map();

/** Calculates the distance from distanceOrigin to every parking spot. */
function calculateDistances() {
  PARKING_SPOTS.forEach((spot) => {
    const km = haversineDistanceKm(distanceOrigin.latitude, distanceOrigin.longitude, spot.latitude, spot.longitude);
    spotDistances.set(spot.id, km);
  });
}

/** Distance (km) to show and sort by. */
function getSpotDistance(spot) {
  return spotDistances.get(spot.id);
}

/** Short text saying what the distances are measured from. */
function getDistanceBasisText() {
  return distanceOrigin.isUserLocation
    ? "Distances from your location (straight line)"
    : `Distances from ${APP_CONFIG.referencePoint.name} (demo reference point, not your location)`;
}


/* ---------------------------------------------------------
   3. FILTERING AND SORTING
   These functions never change PARKING_SPOTS. They always
   return a NEW array, so the original data stays intact.
   --------------------------------------------------------- */

/**
 * Reads the current value of every search/filter control on the page
 * and returns them together in one object.
 */
function getFilterValues() {
  const searchInput = document.getElementById("search-input");
  const priceRange = document.getElementById("price-range");
  const sortSelect = document.getElementById("sort-select");

  // All ticked availability checkboxes -> their values, e.g. ["available", "full"]
  const checkedBoxes = document.querySelectorAll('input[name="status"]:checked');
  const statuses = Array.from(checkedBoxes).map((box) => box.value);

  // The one selected vehicle radio button
  const vehicle = document.querySelector('input[name="vehicle"]:checked').value;

  return {
    // trim() removes spaces at the start/end; toLowerCase() makes the search case-insensitive
    searchText: searchInput.value.trim().toLowerCase(),
    statuses,
    vehicle,                              // "all", "car" or "bike"
    maxPrice: Number(priceRange.value),   // input values are text, so convert to a number
    sortBy: sortSelect.value,             // "distance", "price" or "available"
    savedOnly: document.getElementById("saved-only").checked,
  };
}

/**
 * true if the search text appears in the spot's name, area or address.
 * An empty search matches everything.
 */
function matchesSearch(spot, searchText) {
  if (searchText === "") return true;

  const searchableText = `${spot.name} ${spot.area} ${spot.address}`.toLowerCase();
  return searchableText.includes(searchText);
}

/**
 * Returns only the spots that pass EVERY filter.
 * filter() keeps an item when the function returns true.
 */
function filterParkingSpots(spots, filters) {
  return spots.filter((spot) => {
    const passesSearch = matchesSearch(spot, filters.searchText);
    const passesStatus = filters.statuses.includes(getAvailabilityStatus(spot));
    const passesVehicle = filters.vehicle === "all" || spot.vehicleTypes.includes(filters.vehicle);
    const passesPrice = spot.price <= filters.maxPrice;
    const passesSaved = !filters.savedOnly || isFavourite(spot.id);

    return passesSearch && passesStatus && passesVehicle && passesPrice && passesSaved;
  });
}

// How to compare two spots for each sort option.
// A compare function returns a negative number if a should come first,
// a positive number if b should come first, and 0 if they are equal.
// "|| ..." = when equal, put the nearer one first.
const SORT_COMPARATORS = {
  distance: (a, b) => getSpotDistance(a) - getSpotDistance(b),
  price: (a, b) => a.price - b.price || getSpotDistance(a) - getSpotDistance(b),
  available: (a, b) => b.availableSlots - a.availableSlots || getSpotDistance(a) - getSpotDistance(b),
};

/**
 * Returns a sorted COPY of the spots.
 * sort() changes the array it is called on, so we copy first with [...spots].
 */
function sortParkingSpots(spots, sortBy) {
  const compare = SORT_COMPARATORS[sortBy] || SORT_COMPARATORS.distance;
  return [...spots].sort(compare);
}


/* ---------------------------------------------------------
   4. RENDERING
   These functions turn data into HTML and put it on the page.
   --------------------------------------------------------- */

/**
 * Makes text safe to put inside innerHTML.
 * Characters like < and > would otherwise be read as HTML tags.
 * This matters because the "no results" message includes what the user typed.
 */
function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Formats a price, e.g. 30 -> "₹30/hr" */
function formatPrice(amount) {
  return `${APP_CONFIG.currencySymbol}${amount}/hr`;
}

/** Formats a distance, e.g. "2.4 km" */
function formatDistance(spot) {
  return `${getSpotDistance(spot).toFixed(1)} km`;
}

/** Percentage of free slots, e.g. 42 of 60 -> 70 */
function getFreePercent(spot) {
  return Math.round(getFreeRatio(spot) * 100);
}

/**
 * Builds the HTML for ONE parking card and returns it as a string.
 * Shows: name, status, area, free / total slots, price and distance.
 * tabindex="0" lets keyboard users reach the card with the Tab key.
 */
function createParkingCardHTML(spot, isSelected) {
  const status = getAvailabilityStatus(spot);
  const selectedClass = isSelected ? " is-selected" : "";
  const savedMark = isFavourite(spot.id) ? ' · <span class="saved-mark">&#9829; Saved</span>' : "";

  // Template literal (backticks) lets us write HTML with ${...} gaps
  // that JavaScript fills with values from the spot object.
  return `
    <li>
      <article class="parking-card${selectedClass}" data-id="${spot.id}" data-status="${status}" tabindex="0">
        <div class="parking-card-top">
          <h3 class="parking-name">${escapeHTML(spot.name)}</h3>
          <span class="badge badge-${status}">${STATUS_LABELS[status]}</span>
        </div>
        <p class="parking-area">${escapeHTML(spot.area)}${savedMark}</p>
        <div class="occupancy occupancy-${status}" style="--fill: ${getFreePercent(spot)}%">
          <div class="occupancy-bar"><span></span></div>
          <span class="occupancy-text">${spot.availableSlots} / ${spot.totalSlots} free</span>
        </div>
        <div class="parking-meta">
          <span>${formatPrice(spot.price)}</span>
          <span>${formatDistance(spot)}</span>
        </div>
      </article>
    </li>
  `;
}

/**
 * Builds every parking card and puts them into <ul id="parking-list">.
 * selectedId   = the id of the card to highlight (optional)
 * emptyMessage = text to show when the list is empty (optional)
 * keepScroll   = true for background updates (simulation, saving):
 *                keep the scroll position and keyboard focus
 */
function renderParkingList(spots, selectedId = null, emptyMessage = "No parking locations found.", keepScroll = false) {
  const listElement = document.getElementById("parking-list");
  const countElement = document.getElementById("result-count");

  // Remember where the user was before we replace the cards
  const previousScroll = listElement.scrollTop;
  const focusedCard = document.activeElement?.closest?.(".parking-card");
  const focusedId = focusedCard ? focusedCard.dataset.id : null;

  if (spots.length === 0) {
    listElement.innerHTML = `<li class="list-message">${escapeHTML(emptyMessage)}</li>`;
  } else {
    // map() turns each spot object into an HTML string,
    // join("") glues all those strings into one big string.
    listElement.innerHTML = spots
      .map((spot) => createParkingCardHTML(spot, spot.id === selectedId))
      .join("");
  }

  if (keepScroll) {
    listElement.scrollTop = previousScroll;
    // Put keyboard focus back on the same card (if it is still in the list)
    if (focusedId) {
      listElement.querySelector(`.parking-card[data-id="${focusedId}"]`)?.focus({ preventScroll: true });
    }
  } else {
    listElement.scrollTop = 0; // new results -> show them from the top
  }

  // "1 result" vs "12 results"
  const resultWord = spots.length === 1 ? "result" : "results";
  countElement.textContent = `${spots.length} ${resultWord}`;
}

/** Calculates the statistics and writes them into the four stat cards. */
function renderDashboardStats(spots) {
  const stats = calculateDashboardStats(spots);

  // toLocaleString adds thousands separators, e.g. 1105 -> "1,105"
  document.getElementById("stat-total").textContent = stats.totalLocations;
  document.getElementById("stat-capacity-note").textContent =
    `Total capacity: ${stats.totalSlots.toLocaleString("en-IN")} slots`;

  // Round the free % and use 100 - it for occupancy, so the two always add up to 100
  const freePercent = Math.round(stats.freePercent);
  document.getElementById("stat-available").textContent = stats.availableSlots.toLocaleString("en-IN");
  document.getElementById("stat-available-note").textContent = `${freePercent}% of capacity free`;

  document.getElementById("stat-occupied").textContent = stats.occupiedSlots.toLocaleString("en-IN");
  document.getElementById("stat-occupied-note").textContent = `${100 - freePercent}% occupancy`;

  // innerHTML here (not textContent) because we include a <span> for "/hr"
  document.getElementById("stat-price").innerHTML =
    `${APP_CONFIG.currencySymbol}${Math.round(stats.averagePrice)}<span class="stat-unit">/hr</span>`;
}

/**
 * Fills the "Selected location" panel with one spot's details.
 * If spot is null (nothing matches the filters), it hides the details
 * and shows the empty-state message instead.
 */
function renderInfoPanel(spot) {
  const infoContent = document.getElementById("info-content");
  const infoEmpty = document.getElementById("info-empty");

  // The "hidden" property shows/hides an element (same as the HTML hidden attribute)
  infoContent.hidden = spot === null;
  infoEmpty.hidden = spot !== null;
  if (spot === null) return;

  const status = getAvailabilityStatus(spot);
  const freePercent = getFreePercent(spot);
  const occupiedSlots = spot.totalSlots - spot.availableSlots;

  document.getElementById("info-title").textContent = spot.name;
  document.getElementById("info-address").textContent =
    `${spot.address}, ${spot.area}, ${APP_CONFIG.city}`;

  // Badge: change both the words and the colour class
  const badge = document.getElementById("info-badge");
  badge.textContent = STATUS_LABELS[status];
  badge.className = `badge badge-${status}`;

  // Bar showing the share of free slots
  const occupancy = document.getElementById("info-occupancy");
  occupancy.className = `occupancy occupancy-${status}`;
  occupancy.style.setProperty("--fill", `${freePercent}%`);

  // Detail rows
  document.getElementById("info-available").textContent = `${spot.availableSlots} slots (${freePercent}% free)`;
  document.getElementById("info-occupied").textContent = `${occupiedSlots} slots (${100 - freePercent}%)`;
  document.getElementById("info-capacity").textContent = `${spot.totalSlots} slots`;
  document.getElementById("info-price").textContent = `${APP_CONFIG.currencySymbol}${spot.price} per hour`;
  document.getElementById("info-hours").textContent = spot.openingHours;
  document.getElementById("info-distance").textContent = distanceOrigin.isUserLocation
    ? `${formatDistance(spot)} from you`
    : `${formatDistance(spot)} from demo point`;
  document.getElementById("info-vehicles").textContent = spot.vehicleTypes
    .map((type) => VEHICLE_LABELS[type])
    .join(", ");

  // Facility tags
  document.getElementById("info-facilities").innerHTML = spot.facilities
    .map((facility) => `<li class="tag">${escapeHTML(facility)}</li>`)
    .join("");

  // "Get directions" opens Google Maps with this spot as the destination
  document.getElementById("directions-link").href = getDirectionsURL(spot);

  // Save button shows whether this spot is a favourite
  renderSaveButton(spot);
}

/**
 * Google Maps directions link for a spot.
 * Google's documented format: https://www.google.com/maps/dir/?api=1&destination=LAT,LNG
 * Google Maps asks for the starting point (or uses the user's location).
 */
function getDirectionsURL(spot) {
  return `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;
}

// Timer for hiding the toast; stored so a new message can cancel the old timer
let toastTimerId = null;

/**
 * Shows a short message at the bottom of the screen for a few seconds.
 * textContent (not innerHTML) so the message can never be read as HTML.
 */
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.hidden = false;

  clearTimeout(toastTimerId);
  toastTimerId = setTimeout(() => { toast.hidden = true; }, 4000);
}


/* ---------------------------------------------------------
   5. SELECTING A PARKING SPOT
   --------------------------------------------------------- */

// The spot selected when the page opens and after Reset.
const DEFAULT_SPOT_ID = PARKING_SPOTS[0].id;

// id of the spot shown in the info panel. "let" because it changes.
// null means "nothing selected" (no results).
let selectedSpotId = DEFAULT_SPOT_ID;

/** Finds a spot object by its id (or undefined). */
function findSpotById(spotId) {
  // find() returns the FIRST item that matches, or undefined if none does
  return PARKING_SPOTS.find((item) => item.id === spotId);
}

/**
 * Selects a spot: remembers its id, highlights its card,
 * shows its details in the info panel, and focuses the map on it.
 * Used by BOTH card clicks and marker clicks, so they always behave the same.
 * focusMap: false when the map should stay where it is (e.g. after "Near me").
 */
function selectParkingSpot(spotId, { focusMap = true } = {}) {
  const spot = findSpotById(spotId);
  if (!spot) return;

  selectedSpotId = spotId;

  // Move the highlight without rebuilding the list (keeps the scroll position).
  // classList.toggle(name, condition) adds the class if condition is true, removes it if false.
  document.querySelectorAll(".parking-card").forEach((card) => {
    card.classList.toggle("is-selected", Number(card.dataset.id) === spotId);
  });

  renderInfoPanel(spot);

  if (focusMap) {
    focusMapOnSpot(spot); // from map.js: centre map, highlight marker, open popup
  } else {
    highlightMapMarker(spotId); // from map.js: highlight only
  }
}

/**
 * Scrolls the parking list (only the list, not the whole page)
 * so the given spot's card is visible.
 */
function scrollCardIntoView(spotId) {
  const listElement = document.getElementById("parking-list");
  const card = listElement.querySelector(`.parking-card[data-id="${spotId}"]`);
  if (!card) return;

  // How far the card's top is from the list's top, in pixels
  const offset = card.getBoundingClientRect().top - listElement.getBoundingClientRect().top;
  listElement.scrollTo({ top: listElement.scrollTop + offset - 8, behavior: "smooth" });
}

/** Called by map.js when a marker is clicked. */
function handleMarkerSelect(spotId) {
  selectParkingSpot(spotId);
  scrollCardIntoView(spotId);
}

/**
 * Listens for clicks on cards.
 * Cards are rebuilt every time filters change, so instead of adding a
 * listener to every card, we add ONE listener to the list that holds them.
 * This is called "event delegation".
 */
function setupCardSelection() {
  const listElement = document.getElementById("parking-list");

  // Handles both mouse clicks and the keyboard (Enter / Space)
  const handleCardActivation = (event) => {
    // closest() walks up from the clicked element to find the card around it
    const card = event.target.closest(".parking-card");
    if (!card) return; // clicked on empty space, not a card

    // data-id="5" in HTML -> card.dataset.id is the TEXT "5" -> Number() makes it 5
    selectParkingSpot(Number(card.dataset.id));
  };

  listElement.addEventListener("click", handleCardActivation);
  listElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); // stop Space from scrolling the page
      handleCardActivation(event);
    }
  });
}


/* ---------------------------------------------------------
   6. FAVOURITES (LocalStorage)
   LocalStorage keeps small pieces of text in the browser,
   even after a refresh. We store ONLY the saved spot ids,
   e.g. "[1,5]" - no personal information.
   --------------------------------------------------------- */

// A Set can't contain the same value twice, so duplicates are impossible.
let favouriteIds = new Set();

/**
 * Reads saved ids from LocalStorage.
 * Everything is checked, because stored text could be missing,
 * broken or out of date. LocalStorage can also be blocked
 * (e.g. strict privacy settings), so it is wrapped in try/catch.
 */
function loadFavourites() {
  try {
    const storedText = localStorage.getItem(APP_CONFIG.favouritesStorageKey);
    if (storedText === null) return new Set(); // nothing saved yet

    const storedIds = JSON.parse(storedText);   // text -> array
    if (!Array.isArray(storedIds)) return new Set();

    // Keep only ids of spots that really exist in our dataset
    const validIds = storedIds.filter((id) => Number.isInteger(id) && findSpotById(id));
    return new Set(validIds);
  } catch (error) {
    console.warn("Could not read favourites from LocalStorage:", error);
    return new Set();
  }
}

/** Writes the saved ids to LocalStorage. Returns true if it worked. */
function saveFavourites() {
  try {
    // JSON.stringify turns the array [1, 5] into the text "[1,5]"
    localStorage.setItem(APP_CONFIG.favouritesStorageKey, JSON.stringify([...favouriteIds]));
    return true;
  } catch (error) {
    console.warn("Could not save favourites to LocalStorage:", error);
    return false;
  }
}

/** true if the spot is in the favourites. */
function isFavourite(spotId) {
  return favouriteIds.has(spotId);
}

/** Shows how many spots are saved, next to "Show saved only". */
function renderSavedCount() {
  document.getElementById("saved-count").textContent = favouriteIds.size;
}

/** Updates the Save button to match whether the spot is saved. */
function renderSaveButton(spot) {
  const saveButton = document.getElementById("save-btn");
  const saved = isFavourite(spot.id);

  saveButton.classList.toggle("is-saved", saved);
  saveButton.setAttribute("aria-pressed", saved);
  document.getElementById("save-label").textContent = saved ? "Remove from favourites" : "Save to favourites";
}

/** Adds the selected spot to favourites, or removes it if already saved. */
function toggleFavourite(spotId) {
  const spot = findSpotById(spotId);
  if (!spot) return;

  const wasSaved = isFavourite(spotId);
  if (wasSaved) {
    favouriteIds.delete(spotId);
  } else {
    favouriteIds.add(spotId);
  }

  const stored = saveFavourites();
  renderSavedCount();
  updateParkingList({ focusMap: false, keepScroll: true }); // hearts on cards + "saved only" filter

  if (!stored) {
    showToast("Your browser blocked saving. Favourites will be lost after a refresh.", true);
  } else if (wasSaved) {
    showToast(`Removed "${spot.name}" from favourites.`);
  } else {
    showToast(`Saved "${spot.name}" to favourites.`);
  }
}

/** Loads saved favourites and connects the Save button (runs once at start-up). */
function setupFavourites() {
  favouriteIds = loadFavourites();
  renderSavedCount();

  document.getElementById("save-btn").addEventListener("click", () => {
    if (selectedSpotId !== null) toggleFavourite(selectedSpotId);
  });
}


/* ---------------------------------------------------------
   7. NEAR ME (Geolocation)
   The browser asks the user for permission. We only ask when
   the "Near me" button is clicked, never on page load.
   The position is never saved to LocalStorage.
   --------------------------------------------------------- */

/** Shows "Locating…" and disables the button while we wait. */
function setLocateButtonBusy(isBusy) {
  const button = document.getElementById("locate-btn");
  button.disabled = isBusy;
  button.setAttribute("aria-busy", isBusy);
  document.getElementById("locate-label").textContent = isBusy ? "Locating…" : "Near me";
}

/**
 * Measures distances from a new point, shows it on the map,
 * sorts nearest first and selects the nearest visible spot.
 */
function useDistanceOrigin(latitude, longitude, isUserLocation) {
  distanceOrigin = { latitude, longitude, isUserLocation };
  calculateDistances();

  const label = isUserLocation
    ? "Your location"
    : `${APP_CONFIG.referencePoint.name} - demo reference point (not your location)`;
  showReferenceMarker(latitude, longitude, isUserLocation, label); // from map.js

  document.getElementById("sort-select").value = "distance";
  updateParkingList({ focusMap: false });

  // After sorting nearest first, the first card is the nearest visible spot
  const firstCard = document.querySelector(".parking-card");
  if (firstCard) {
    selectParkingSpot(Number(firstCard.dataset.id), { focusMap: false });
  }
  return firstCard ? findSpotById(Number(firstCard.dataset.id)) : null;
}

/** Runs when the browser gives us the user's position. */
function handleLocationFound(position) {
  setLocateButtonBusy(false);
  const { latitude, longitude } = position.coords;
  const nearest = useDistanceOrigin(latitude, longitude, true);

  if (!nearest) {
    showToast("Location found. No parking matches the current filters.");
  } else if (getSpotDistance(nearest) > 50) {
    showToast(`You seem to be outside ${APP_CONFIG.city}. Nearest listed parking: ${nearest.name}, ${formatDistance(nearest)} away.`);
  } else {
    showToast(`Nearest parking: ${nearest.name}, ${formatDistance(nearest)} away (straight line).`);
  }
}

/**
 * Used when the real location is NOT available. Distances stay measured
 * from the demo reference point, and the message says so clearly.
 */
function useDemoReferencePoint(reason) {
  const { latitude, longitude, name } = APP_CONFIG.referencePoint;
  useDistanceOrigin(latitude, longitude, false);
  showToast(`${reason} Showing distances from ${name} (demo reference point) instead.`, true);
}

/** Runs when the browser could not give us a position. */
function handleLocationError(error) {
  setLocateButtonBusy(false);

  // error.code tells us why: 1 = permission denied, 2 = unavailable, 3 = timeout
  const reasons = {
    1: "Location permission was denied.",
    2: "Your location could not be found.",
    3: "Finding your location took too long.",
  };
  useDemoReferencePoint(reasons[error.code] || "Your location could not be found.");
}

/** "Near me" button: ask the browser for the user's position. */
function requestUserLocation() {
  if (!navigator.geolocation) {
    useDemoReferencePoint("This browser does not support location.");
    return;
  }
  // Browsers only allow location on https:// or http://localhost / 127.0.0.1
  if (!window.isSecureContext) {
    useDemoReferencePoint("Location only works on a secure page (open the project with Live Server).");
    return;
  }

  setLocateButtonBusy(true);
  navigator.geolocation.getCurrentPosition(handleLocationFound, handleLocationError, {
    enableHighAccuracy: false, // a rough position is enough and is faster
    timeout: 10000,            // give up after 10 seconds
    maximumAge: 60000,         // a position up to 1 minute old is fine
  });
}

/** Connects the "Near me" button to requestUserLocation(). */
function setupNearMe() {
  document.getElementById("locate-btn").addEventListener("click", requestUserLocation);
}


/* ---------------------------------------------------------
   8. SIMULATED AVAILABILITY (setInterval)
   Every few seconds a few random spots gain or lose a few
   slots, like cars arriving and leaving. This is a DEMO
   running in the browser - it is not real sensor data.
   --------------------------------------------------------- */

// id returned by setInterval, needed to stop it. null = not running.
let simulationTimerId = null;

/** Random whole number from min to max (both included). */
function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Keeps a number inside a range, e.g. clamp(65, 0, 60) -> 60, clamp(-2, 0, 60) -> 0 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Picks `count` different spots at random. */
function pickRandomSpots(count) {
  const pool = [...PARKING_SPOTS]; // copy, so we can remove from it
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const index = getRandomInteger(0, pool.length - 1);
    picked.push(pool.splice(index, 1)[0]); // splice removes it, so it can't be picked twice
  }
  return picked;
}

/**
 * One simulated update: change a few spots by a small amount,
 * never below 0 and never above the spot's capacity.
 */
function simulateAvailabilityUpdate() {
  const { spotsPerUpdate, maxChange } = APP_CONFIG.simulation;

  pickRandomSpots(spotsPerUpdate).forEach((spot) => {
    let change = 0;
    while (change === 0) {
      change = getRandomInteger(-maxChange, maxChange); // e.g. -3 ... +3, but not 0
    }
    spot.availableSlots = clamp(spot.availableSlots + change, 0, spot.totalSlots);
  });

  refreshAfterDataChange();

  const time = new Date().toLocaleTimeString();
  document.getElementById("sim-last-update").textContent = `Last simulated update: ${time}`;
}

/**
 * Re-draws everything that depends on availability:
 * statistics, cards, statuses, marker colours, popups and the info panel.
 * The map is not moved and the list keeps its scroll position.
 */
function refreshAfterDataChange() {
  renderDashboardStats(PARKING_SPOTS);
  updateParkingList({ focusMap: false, keepScroll: true });
}

/** Starts the simulated updates (setInterval). Never starts a second timer. */
function startSimulation() {
  if (simulationTimerId !== null) return; // already running: never start two timers
  simulationTimerId = setInterval(simulateAvailabilityUpdate, APP_CONFIG.simulation.intervalMs);
}

/** Stops the simulated updates (clearInterval). */
function stopSimulation() {
  clearInterval(simulationTimerId);
  simulationTimerId = null;
}

/** Pause / Resume button in the demo bar. */
function setupSimulationControls() {
  const toggleButton = document.getElementById("sim-toggle");
  const demoBar = document.querySelector(".demo-bar");

  toggleButton.addEventListener("click", () => {
    const isRunning = simulationTimerId !== null;
    if (isRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
    toggleButton.textContent = isRunning ? "Resume updates" : "Pause updates";
    demoBar.classList.toggle("is-paused", isRunning);
    document.getElementById("sim-last-update").textContent = isRunning
      ? "Updates paused"
      : "Updates resumed";
  });

  startSimulation();
}


/* ---------------------------------------------------------
   9. PAGE CONTROLS
   --------------------------------------------------------- */

/**
 * Keeps the selection in sync with the visible results.
 * - Selected spot is still in the results -> keep it.
 * - It was filtered out                   -> pick the first result.
 * - There are no results at all           -> select nothing (null).
 * Returns the id that should now be selected.
 */
function getSyncedSelectionId(visibleSpots, currentId) {
  // some() returns true if AT LEAST ONE item passes the test
  const isStillVisible = visibleSpots.some((spot) => spot.id === currentId);
  if (isStillVisible) return currentId;

  return visibleSpots.length > 0 ? visibleSpots[0].id : null;
}

/** Text for the empty list, depending on why it is empty. */
function getEmptyMessage(filters) {
  if (filters.savedOnly && favouriteIds.size === 0) {
    return "You haven't saved any parking locations yet. Select a location and press Save.";
  }
  // Use the original (not lower-cased) text in the message
  const typedText = document.getElementById("search-input").value.trim();
  return typedText
    ? `No parking locations match "${typedText}" with the current filters.`
    : "No parking locations match the current filters.";
}

/**
 * The main "refresh" function. Every control calls this:
 * read filters -> filter -> sort -> sync selection -> render list + panel + map.
 * focusMap:   move the map when the selection changes (default true)
 * keepScroll: keep the list's scroll position (background updates)
 */
function updateParkingList({ focusMap = true, keepScroll = false } = {}) {
  const filters = getFilterValues();
  const filteredSpots = filterParkingSpots(PARKING_SPOTS, filters);
  const sortedSpots = sortParkingSpots(filteredSpots, filters.sortBy);

  const previousSelectedId = selectedSpotId;
  selectedSpotId = getSyncedSelectionId(sortedSpots, selectedSpotId);
  const selectedSpot = sortedSpots.find((spot) => spot.id === selectedSpotId) || null;

  renderParkingList(sortedSpots, selectedSpotId, getEmptyMessage(filters), keepScroll);
  renderInfoPanel(selectedSpot);
  document.getElementById("distance-basis").textContent = getDistanceBasisText();

  // Map: show only the matching markers (map.js)
  updateMapMarkers(sortedSpots, selectedSpotId);

  // If filtering picked a NEW spot, move the map to it
  const selectionChanged = selectedSpotId !== previousSelectedId;
  if (focusMap && selectionChanged && selectedSpot) {
    focusMapOnSpot(selectedSpot);
  }
}

/** Shows the slider's value next to "Max price", e.g. "₹30/hr" */
function updatePriceLabel() {
  const priceRange = document.getElementById("price-range");
  document.getElementById("price-output").textContent = formatPrice(priceRange.value);
}

/**
 * Makes the "Menu" button open and close the navigation on small screens.
 * It adds/removes the CSS class "is-open"; the CSS decides what that looks like.
 * The open menu is part of the header, so it pushes the page down
 * instead of covering it.
 */
function setupNavToggle() {
  const toggleButton = document.getElementById("nav-toggle");
  const menu = document.getElementById("nav-menu");

  const setMenuOpen = (isOpen) => {
    menu.classList.toggle("is-open", isOpen);
    toggleButton.setAttribute("aria-expanded", isOpen); // tells screen readers
    toggleButton.textContent = isOpen ? "Close" : "Menu";
  };

  toggleButton.addEventListener("click", () => {
    setMenuOpen(!menu.classList.contains("is-open"));
  });

  // Close after choosing a link or "Near me" (mobile users expect this)
  menu.querySelectorAll("a, button").forEach((item) => {
    item.addEventListener("click", () => setMenuOpen(false));
  });

  // Escape key closes the menu and puts focus back on the button
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) {
      setMenuOpen(false);
      toggleButton.focus();
    }
  });

  // If the window becomes wide again, the desktop links are shown anyway
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 960) setMenuOpen(false);
  });
}

/**
 * Highlights the navbar link of the section currently on screen.
 * A section is "current" once its top has scrolled up to just below the navbar.
 */
function setupActiveNavLink() {
  const links = [...document.querySelectorAll(".nav-link")];
  let clickedLink = null; // a clicked link stays highlighted while the page scrolls to it
  let unlockTimerId = null;

  const setActiveLink = (current) => {
    links.forEach((link) => {
      const isCurrent = link === current;
      link.classList.toggle("active", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  links.forEach((link) => {
    link.addEventListener("click", () => {
      clickedLink = link;
      setActiveLink(link);
      clearTimeout(unlockTimerId);
      unlockTimerId = setTimeout(() => { clickedLink = null; }, 1200); // after the smooth scroll
    });
  });

  const updateActiveLink = () => {
    if (clickedLink) return; // still scrolling to the clicked section

    let current = links[0]; // at the very top: "Overview"
    links.forEach((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      if (section && section.getBoundingClientRect().top <= 120) current = link;
    });

    // At the bottom of the page the footer may be too short to reach the top
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom) current = links[links.length - 1];

    setActiveLink(current);
  };

  window.addEventListener("scroll", updateActiveLink, { passive: true });
  updateActiveLink();
}

/**
 * Connects the search bar to the list.
 *  - "input" event: fires on every keystroke, so results update while typing
 *  - "submit" event: Enter key / Search button scrolls down to the results
 */
function setupSearchForm() {
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");

  // Arrow function so the event object isn't passed in as updateParkingList's options
  input.addEventListener("input", () => updateParkingList());

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // a form normally reloads the page on submit
    updateParkingList();
    document.getElementById("locations").scrollIntoView({ behavior: "smooth" });
  });
}

/**
 * Filters panel. One "input" listener on the whole form catches changes
 * from every checkbox, radio button, the slider and the dropdown,
 * because events "bubble up" from the control to the form.
 */
function setupFilterControls() {
  const filterForm = document.getElementById("filter-form");

  filterForm.addEventListener("input", () => {
    updatePriceLabel();
    updateParkingList();
  });

  // The form has no submit button, but block submitting just in case
  filterForm.addEventListener("submit", (event) => event.preventDefault());

  document.getElementById("reset-filters").addEventListener("click", resetFilters);
}

/**
 * Puts every control back to its starting value.
 * form.reset() restores each control to what the HTML says
 * (checked boxes, value="100", the first <option>, "saved only" unticked).
 * The search box is outside the filter form, so we clear it separately.
 */
function resetFilters() {
  document.getElementById("filter-form").reset();
  document.getElementById("search-input").value = "";
  selectedSpotId = DEFAULT_SPOT_ID; // go back to the default spot

  updatePriceLabel();
  updateParkingList({ focusMap: false });
  scrollCardIntoView(selectedSpotId); // the default spot may not be first in the list
  resetMapView(); // from map.js: starting centre + zoom
}


/* ---------------------------------------------------------
   10. START THE APP
   --------------------------------------------------------- */

/**
 * Starts the whole application.
 * Every feature is switched on from here.
 */
function initApp() {
  console.log(`${APP_CONFIG.appName} started with ${PARKING_SPOTS.length} parking spots.`);

  const problems = validateDataset(PARKING_SPOTS);
  if (problems.length > 0) {
    console.warn("Problems found in data.js:\n" + problems.join("\n"));
  }

  // Distances from the demo reference point (needed by the cards and popups)
  calculateDistances();

  setupNavToggle();
  setupActiveNavLink();
  setupSearchForm();
  setupFilterControls();
  setupCardSelection();
  setupFavourites(); // load saved ids BEFORE the first list is drawn
  setupNearMe();

  // Create the map + markers BEFORE the first list update,
  // so updateParkingList() can show/hide the markers.
  // handleMarkerSelect is passed in so map.js can tell us about marker clicks.
  initMap(handleMarkerSelect); // from map.js

  // Statistics describe the whole city, so they use the full dataset
  renderDashboardStats(PARKING_SPOTS);

  updatePriceLabel();
  updateParkingList(); // fills the list, the info panel and the map markers
  scrollCardIntoView(selectedSpotId); // show the selected card inside the list

  setupSimulationControls(); // starts the simulated availability updates
}

// DOMContentLoaded fires once the browser has read all the HTML,
// so every element we look up with getElementById already exists.
document.addEventListener("DOMContentLoaded", initApp);
