/* =========================================================
   map.js - Everything to do with the Leaflet map
   ---------------------------------------------------------
   Job: create the map, create the markers, show/hide them,
   highlight the selected one and move the view.
   It does NOT build the sidebar list or decide what is
   filtered (that is script.js).

   It uses a few helpers that live in script.js:
     getAvailabilityStatus(), STATUS_LABELS, formatPrice(), escapeHTML()
   That works because every script file has finished loading
   before initApp() (in script.js) calls initMap().

   Public functions (called from script.js):
     initMap(onMarkerSelect)             create the map + all markers once
     updateMapMarkers(spots, selectedId) show only these spots' markers,
                                         refresh their colours and popups
     focusMapOnSpot(spot)                centre the map + open the popup
     resetMapView()                      back to the starting view
     showReferenceMarker(lat, lng, isUserLocation, label)
                                         blue "you" marker, or grey demo point
   ========================================================= */

// The Leaflet map object. Stays null if Leaflet failed to load,
// and every function below checks for that first.
let parkingMap = null;

// A layer group is a "folder" of markers. Adding/removing a marker
// to/from this group shows/hides it on the map.
let markerLayer = null;

// One marker per spot, looked up by spot id: markersById.get(5) -> marker.
// A Map is like an object, but its keys can be numbers.
const markersById = new Map();

// What each marker currently looks like, e.g. 5 -> "limited|12|selected".
// Used to skip redrawing markers that haven't changed.
const markerLooks = new Map();

// Marker for the point distances are measured from after "Near me":
// blue = the user's real location, grey = the demo reference point
let referenceMarker = null;

// OpenStreetMap tile server + the credit line OpenStreetMap requires
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';


/* ---------------------------------------------------------
   Status message on top of the map ("Loading map…", errors)
   --------------------------------------------------------- */

/** Shows a message over the map, or hides it when text is empty. */
function setMapStatus(text, isError = false) {
  const statusElement = document.getElementById("map-status");
  statusElement.textContent = text;
  statusElement.hidden = text === "";
  statusElement.classList.toggle("is-error", isError);
}


/* ---------------------------------------------------------
   Markers and popups
   --------------------------------------------------------- */

/**
 * Builds the marker's look: a coloured circle showing the number of free slots.
 * The number means the status is not shown by colour alone.
 * L.divIcon lets us draw the marker with our own HTML + CSS
 * instead of an image file.
 */
function createMarkerIcon(spot, isSelected) {
  const status = getAvailabilityStatus(spot); // from script.js
  const selectedClass = isSelected ? " is-selected" : "";

  return L.divIcon({
    className: "map-marker-wrapper",       // replaces Leaflet's default white box
    html: `<span class="map-marker marker-${status}${selectedClass}">${spot.availableSlots}</span>`,
    iconSize: [30, 30],                    // size in pixels
    iconAnchor: [15, 15],                  // which pixel sits on the exact location (the centre)
    popupAnchor: [0, -16],                 // where the popup's arrow points, relative to the anchor
  });
}

/** HTML shown inside a marker's popup. */
function createPopupHTML(spot) {
  const status = getAvailabilityStatus(spot);

  return `
    <div class="map-popup">
      <p class="map-popup-title">${escapeHTML(spot.name)}</p>
      <p class="map-popup-row">${escapeHTML(spot.area)}</p>
      <span class="badge badge-${status}">${STATUS_LABELS[status]}</span>
      <p class="map-popup-row"><strong>${spot.availableSlots}</strong> of ${spot.totalSlots} slots free</p>
      <p class="map-popup-row"><strong>${formatPrice(spot.price)}</strong> · ${formatDistance(spot)}</p>
    </div>
  `;
}

/** A short text describing how a marker should look right now. */
function getMarkerLook(spot, isSelected) {
  return `${getAvailabilityStatus(spot)}|${spot.availableSlots}|${isSelected ? "selected" : "normal"}`;
}

/**
 * Gives one marker the right colour, number and size.
 * setIcon() replaces the marker's HTML, so we only call it when the
 * look really changed. Redrawing every marker on every simulated
 * update would make them flicker and lose keyboard focus.
 */
function refreshMarkerIcon(spot, isSelected) {
  const marker = markersById.get(spot.id);
  const look = getMarkerLook(spot, isSelected);

  if (markerLooks.get(spot.id) !== look) {
    marker.setIcon(createMarkerIcon(spot, isSelected));
    marker.setZIndexOffset(isSelected ? 1000 : 0); // selected marker on top
    markerLooks.set(spot.id, look);
  }
}

/**
 * Creates ONE marker for every parking spot, once.
 * Filters later only add/remove these markers; they are never rebuilt,
 * so their click listeners are attached exactly once (no duplicates).
 */
function createAllMarkers(onMarkerSelect) {
  PARKING_SPOTS.forEach((spot) => {
    const marker = L.marker([spot.latitude, spot.longitude], {
      icon: createMarkerIcon(spot, false),
      title: spot.name,       // tooltip on hover + name for screen readers
      alt: spot.name,
      keyboard: true,         // marker can be reached with the Tab key
      riseOnHover: true,      // hovered marker comes to the front
    });

    // autoPan: false -> the popup doesn't move the map by itself.
    // focusMapOnSpot() already centres the map on the selected spot, and two
    // movements at once would cancel each other out.
    marker.bindPopup(createPopupHTML(spot), { autoPan: false });

    // Tell script.js which spot was chosen; script.js does the rest.
    marker.on("click", () => onMarkerSelect(spot.id));
    marker.on("keypress", (event) => {
      if (event.originalEvent.key === "Enter") onMarkerSelect(spot.id);
    });

    markersById.set(spot.id, marker);
    markerLooks.set(spot.id, getMarkerLook(spot, false));
  });
}


/* ---------------------------------------------------------
   Creating the map
   --------------------------------------------------------- */

/**
 * Creates the Leaflet map inside <div id="map">, adds the
 * OpenStreetMap tiles and creates the markers.
 * onMarkerSelect: function to call with a spot id when a marker is clicked.
 */
function initMap(onMarkerSelect) {
  const mapElement = document.getElementById("map");

  // "L" is the global object that Leaflet provides. If the CDN
  // could not be reached, it doesn't exist and we show a message instead.
  if (typeof L === "undefined") {
    console.error("Leaflet did not load. Check your internet connection.");
    mapElement.querySelector(".map-placeholder p").textContent =
      "The map could not load. Check your internet connection and refresh the page.";
    return;
  }

  mapElement.innerHTML = ""; // remove the placeholder; Leaflet fills this div

  const { center, zoom, mobileZoom } = APP_CONFIG.map;
  const startZoom = window.innerWidth < 768 ? mobileZoom : zoom;

  // 1. The map itself. zoomControl adds the + / - buttons.
  parkingMap = L.map(mapElement, { zoomControl: true }).setView(center, startZoom);

  // 2. The background picture, made of 256×256 px square "tiles"
  const tileLayer = L.tileLayer(TILE_URL, {
    maxZoom: 19,
    attribution: TILE_ATTRIBUTION,
  }).addTo(parkingMap);

  // Tile loading feedback
  let failedTiles = 0;
  setMapStatus("Loading map…");
  tileLayer.on("loading", () => { failedTiles = 0; });
  tileLayer.on("tileerror", () => { failedTiles += 1; });
  tileLayer.on("load", () => {
    // "load" fires when every visible tile has finished (loaded or failed)
    if (failedTiles > 0) {
      setMapStatus("Some map tiles failed to load. Check your internet connection.", true);
    } else {
      setMapStatus("");
    }
  });

  // Leaflet measures the map's size once, when it is created. Our grid layout
  // can change that size later (the list fills in, the window is resized,
  // the layout switches to mobile). ResizeObserver tells us whenever the
  // map box changes size, and invalidateSize() makes Leaflet re-measure
  // and load any missing tiles.
  const resizeObserver = new ResizeObserver(() => parkingMap.invalidateSize());
  resizeObserver.observe(mapElement);

  // 3. A layer group to hold the markers, then the markers themselves
  markerLayer = L.layerGroup().addTo(parkingMap);
  createAllMarkers(onMarkerSelect);

  console.log(`Leaflet ${L.version} map ready with ${markersById.size} markers.`);
}


/* ---------------------------------------------------------
   Updating the map (called by script.js)
   --------------------------------------------------------- */

/**
 * Makes only selectedId look selected, and gives every marker
 * the colour that matches its current availability.
 */
function highlightMapMarker(selectedId) {
  if (!parkingMap) return;

  PARKING_SPOTS.forEach((spot) => {
    refreshMarkerIcon(spot, spot.id === selectedId);
  });
}

/**
 * Shows markers only for the given spots and hides the rest.
 * Markers are added/removed from the layer group, not re-created.
 * Also refreshes colours and popup text, so after a simulated
 * availability change the map matches the data again.
 */
function updateMapMarkers(visibleSpots, selectedId) {
  if (!parkingMap) return;

  // A Set is a list with fast "is this in it?" checks via has()
  const visibleIds = new Set(visibleSpots.map((spot) => spot.id));

  markersById.forEach((marker, spotId) => {
    if (visibleIds.has(spotId)) {
      markerLayer.addLayer(marker);    // safe to call even if already shown
      // Refresh popup text so it always matches the current data
      // (if the popup is open, the user sees the new numbers straight away)
      const spot = PARKING_SPOTS.find((item) => item.id === spotId);
      marker.setPopupContent(createPopupHTML(spot));
    } else {
      markerLayer.removeLayer(marker); // also closes its popup if open
    }
  });

  highlightMapMarker(selectedId);
}

/**
 * Centres the map on a spot, highlights its marker and opens its popup.
 * Called when the user selects a spot (card click or marker click).
 */
function focusMapOnSpot(spot) {
  if (!parkingMap || !spot) return;

  const marker = markersById.get(spot.id);
  if (!markerLayer.hasLayer(marker)) return; // marker is filtered out

  highlightMapMarker(spot.id);

  // Zoom in to at least focusZoom, but don't zoom OUT if the user is closer already
  const targetZoom = Math.max(parkingMap.getZoom(), APP_CONFIG.map.focusZoom);
  parkingMap.setView([spot.latitude, spot.longitude], targetZoom, { animate: true });

  marker.openPopup();
}

/** Closes any popup and returns to the starting centre and zoom. */
function resetMapView() {
  if (!parkingMap) return;

  const { center, zoom, mobileZoom } = APP_CONFIG.map;
  parkingMap.closePopup();
  parkingMap.setView(center, window.innerWidth < 768 ? mobileZoom : zoom, { animate: true });
}

/**
 * Shows the point that distances are measured from, and centres the map on it.
 *   isUserLocation = true  -> blue marker, "Your location"
 *   isUserLocation = false -> grey marker, the demo reference point
 * The first call creates the marker; later calls move and relabel it.
 * The position is only kept in memory - it is never saved.
 */
function showReferenceMarker(latitude, longitude, isUserLocation, label) {
  if (!parkingMap) return;

  const position = [latitude, longitude];
  const icon = L.divIcon({
    className: "user-marker-wrapper",
    html: `<span class="user-marker${isUserLocation ? "" : " is-demo"}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  if (referenceMarker === null) {
    referenceMarker = L.marker(position, { icon, title: label, alt: label, zIndexOffset: 2000 }).addTo(parkingMap);
    referenceMarker.bindPopup("", { autoPan: false });
  } else {
    referenceMarker.setLatLng(position);
    referenceMarker.options.title = label; // used when the icon is redrawn
    referenceMarker.setIcon(icon);
  }
  referenceMarker.setPopupContent(escapeHTML(label));

  // Legend entry: blue "You" or grey "Demo reference point"
  document.getElementById("legend-user").hidden = false;
  document.getElementById("legend-user-dot").className = `dot ${isUserLocation ? "dot-user" : "dot-demo"}`;
  document.getElementById("legend-user-label").textContent = isUserLocation ? "You" : "Demo reference point";

  parkingMap.closePopup();
  parkingMap.setView(position, APP_CONFIG.map.userZoom, { animate: true });
}
