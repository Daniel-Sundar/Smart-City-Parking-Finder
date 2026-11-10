/* =========================================================
   data.js - App settings and parking data
   ---------------------------------------------------------
   Job: hold DATA only. No calculations, no page code.
   script.js and map.js read from here.
   ========================================================= */

// General settings for the app.
// "const" means the variable can't be pointed at something else later.
const APP_CONFIG = {
  appName: "ParkFinder",
  city: "Coimbatore",
  currencySymbol: "₹",

  // Distances are calculated from the parking coordinates (Haversine formula).
  // Until the user shares their location with "Near me", they are measured
  // from this DEMO reference point in the city centre - not the user's location.
  referencePoint: {
    name: "Town Hall, Coimbatore",
    latitude: 10.9946,
    longitude: 76.9614,
  },

  // Map settings used by map.js
  map: {
    // [latitude, longitude] of central Coimbatore, near the middle of our 12 spots
    center: [11.022, 76.975],
    zoom: 13,          // starting zoom on large screens (bigger number = closer)
    mobileZoom: 12,    // starting zoom on phones, so more spots fit on screen
    focusZoom: 15,     // zoom used when the user selects a parking spot
    userZoom: 14,      // zoom used to show the user's location after "Near me"
  },

  // Simulated availability demo (script.js, section 8)
  simulation: {
    intervalMs: 5000,  // update every 5 seconds
    spotsPerUpdate: 3, // how many parking spots change each time
    maxChange: 3,      // each change is between -3 and +3 slots
  },

  // Name of the LocalStorage entry that keeps the saved (favourite) spot ids
  favouritesStorageKey: "parkfinder-favourites",
};

/* ---------------------------------------------------------
   PARKING DATASET  (SIMULATED DEMO DATA)
   ---------------------------------------------------------
   IMPORTANT: Everything below is made up for this student
   project. The names, slot counts, prices, hours and facilities are
   NOT real parking inventory and have not been verified.
   Area and road names are real Coimbatore places, and the
   latitude/longitude values are approximate points in those
   areas, so the markers will land in sensible places on the map.
   Distances are NOT stored here: script.js calculates them from
   latitude/longitude, so they always agree with the map.

   Field guide (every record has the same fields):
     id              unique number used to identify the spot
     name            display name of the parking location
     area            neighbourhood of Coimbatore
     address         street / road (the area is stored separately)
     availableSlots  free slots right now (simulated; script.js changes
                     this number every few seconds in the demo)
     totalSlots      total capacity
     price           cost per hour, in rupees (₹)
     latitude        north–south map position
     longitude       east–west map position
     vehicleTypes    vehicles accepted: "car" and/or "bike"
     openingHours    opening hours (display text)
     facilities      list of facilities, shown as tags
   --------------------------------------------------------- */
const PARKING_SPOTS = [
  {
    id: 1,
    name: "RS Puram Multi-Level Parking",
    area: "RS Puram",
    address: "DB Road",
    availableSlots: 42,
    totalSlots: 60,
    price: 30,
    latitude: 11.0096,
    longitude: 76.9502,
    vehicleTypes: ["car", "bike"],
    openingHours: "6:00 AM – 11:00 PM",
    facilities: ["CCTV", "Covered", "EV charging", "Security guard"],
  },
  {
    id: 2,
    name: "Gandhipuram Central Parking",
    area: "Gandhipuram",
    address: "Cross Cut Road",
    availableSlots: 12,
    totalSlots: 80,
    price: 20,
    latitude: 11.0177,
    longitude: 76.9658,
    vehicleTypes: ["car", "bike"],
    openingHours: "5:00 AM – 11:30 PM",
    facilities: ["CCTV", "Security guard"],
  },
  {
    id: 3,
    name: "Town Hall Street Parking",
    area: "Town Hall",
    address: "Big Bazaar Street",
    availableSlots: 0,
    totalSlots: 40,
    price: 15,
    latitude: 10.9947,
    longitude: 76.9617,
    vehicleTypes: ["bike"],
    openingHours: "8:00 AM – 9:00 PM",
    facilities: ["Attendant"],
  },
  {
    id: 4,
    name: "Race Course Parking Bay",
    area: "Race Course",
    address: "West Club Road",
    availableSlots: 35,
    totalSlots: 50,
    price: 25,
    latitude: 11.0005,
    longitude: 76.9746,
    vehicleTypes: ["car"],
    openingHours: "6:00 AM – 10:00 PM",
    facilities: ["CCTV", "Shaded"],
  },
  {
    id: 5,
    name: "Peelamedu Tech Park Parking",
    area: "Peelamedu",
    address: "Avinashi Road",
    availableSlots: 90,
    totalSlots: 150,
    price: 40,
    latitude: 11.0272,
    longitude: 77.0068,
    vehicleTypes: ["car", "bike"],
    openingHours: "24 hours",
    facilities: ["CCTV", "Covered", "EV charging", "Security guard"],
  },
  {
    id: 6,
    name: "Saibaba Colony Market Parking",
    area: "Saibaba Colony",
    address: "NSR Road",
    availableSlots: 8,
    totalSlots: 45,
    price: 20,
    latitude: 11.0262,
    longitude: 76.9420,
    vehicleTypes: ["bike"],
    openingHours: "7:00 AM – 10:00 PM",
    facilities: ["Attendant"],
  },
  {
    id: 7,
    name: "Ukkadam Bus Terminus Parking",
    area: "Ukkadam",
    address: "Palakkad Main Road",
    availableSlots: 0,
    totalSlots: 70,
    price: 15,
    latitude: 10.9890,
    longitude: 76.9610,
    vehicleTypes: ["car", "bike"],
    openingHours: "24 hours",
    facilities: ["CCTV", "Security guard"],
  },
  {
    id: 8,
    name: "Singanallur Lake View Parking",
    area: "Singanallur",
    address: "Trichy Road",
    availableSlots: 55,
    totalSlots: 90,
    price: 20,
    latitude: 10.9990,
    longitude: 77.0290,
    vehicleTypes: ["car"],
    openingHours: "6:00 AM – 9:00 PM",
    facilities: ["Shaded", "Washroom"],
  },
  {
    id: 9,
    name: "Railway Junction Parking",
    area: "Gopalapuram",
    address: "State Bank Road",
    availableSlots: 18,
    totalSlots: 120,
    price: 30,
    latitude: 10.9960,
    longitude: 76.9670,
    vehicleTypes: ["car", "bike"],
    openingHours: "24 hours",
    facilities: ["CCTV", "Covered", "Security guard"],
  },
  {
    id: 10,
    name: "Lakshmi Mills Shopping Parking",
    area: "Lakshmi Mills",
    address: "Avinashi Road",
    availableSlots: 140,
    totalSlots: 250,
    price: 50,
    latitude: 11.0130,
    longitude: 76.9850,
    vehicleTypes: ["car", "bike"],
    openingHours: "9:00 AM – 11:00 PM",
    facilities: ["CCTV", "Covered", "EV charging", "Valet"],
  },
  {
    id: 11,
    name: "Saravanampatti IT Corridor Parking",
    area: "Saravanampatti",
    address: "Sathy Road",
    availableSlots: 60,
    totalSlots: 100,
    price: 35,
    latitude: 11.0780,
    longitude: 77.0000,
    vehicleTypes: ["car", "bike"],
    openingHours: "24 hours",
    facilities: ["CCTV", "Covered", "EV charging"],
  },
  {
    id: 12,
    name: "Ganapathy Market Parking",
    area: "Ganapathy",
    address: "Sathy Road",
    availableSlots: 20, // exactly 40% free -> should show "Filling fast"
    totalSlots: 50,
    price: 20,
    latitude: 11.0390,
    longitude: 76.9800,
    vehicleTypes: ["bike"],
    openingHours: "6:00 AM – 10:00 PM",
    facilities: ["Attendant"],
  },
];
