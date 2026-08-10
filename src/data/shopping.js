/* Shopping: what each archetype should be shown, the filter set, and how
   a listing is scored against this buyer's needs.

   Filters are deliberately restrained. AutoTrader gives you forty facets
   and a buyer who still doesn't know what to pick; we ship the six that
   change the answer and let the goal do the rest. */

export const BODY_TYPES = ["SUV", "Sedan", "Pickup", "Minivan", "Hatchback", "Coupe"];

/* Per-archetype shopping profile: what to search, and what "good" means.
   weights are relative and only compared against each other. */
export const SHOP_PROFILES = {
  hauler: {
    label: "Safe, three-row-capable family haulers",
    bodyTypes: ["SUV", "Minivan"],
    maxPrice: 34000, maxMiles: 60000, minYear: 2019,
    weights: { safety: 3, space: 3, reliability: 2, value: 2, economy: 1 },
    why: "Safety and seat/cargo fit lead; we cost it over five years.",
  },
  firstride: {
    label: "Reliable, affordable first cars",
    bodyTypes: ["Sedan", "Hatchback", "SUV"],
    maxPrice: 22000, maxMiles: 80000, minYear: 2017,
    weights: { value: 3, reliability: 3, economy: 2, safety: 2, space: 1 },
    why: "All-in cost of ownership first — payment, insurance, gas, upkeep.",
  },
  commuter: {
    label: "Lowest cost per mile",
    bodyTypes: ["Sedan", "Hatchback"],
    maxPrice: 30000, maxMiles: 70000, minYear: 2019,
    weights: { economy: 3, value: 3, reliability: 2, safety: 1, space: 1 },
    why: "Fuel and depreciation math at your actual mileage.",
  },
  worktruck: {
    label: "Trucks that meet the spec and hold value",
    bodyTypes: ["Pickup"],
    maxPrice: 45000, maxMiles: 90000, minYear: 2018,
    weights: { space: 3, reliability: 3, value: 2, safety: 1, economy: 1 },
    why: "Capability is a gate, not a preference. Resale matters.",
  },
  upgrade: {
    label: "The nicer car, priced honestly",
    bodyTypes: ["SUV", "Sedan", "Coupe"],
    maxPrice: 48000, maxMiles: 55000, minYear: 2020,
    weights: { value: 3, safety: 2, reliability: 2, space: 1, economy: 1 },
    why: "90% of the car at 70% of the cost — and no 84-month traps.",
  },
  freshstart: {
    label: "Dependable and cheap to own — when you're ready",
    bodyTypes: ["Sedan", "Hatchback", "SUV"],
    maxPrice: 18000, maxMiles: 90000, minYear: 2016,
    weights: { value: 3, reliability: 3, economy: 3, safety: 1, space: 1 },
    why: "Lowest total cost. And we'll tell you if waiting beats buying.",
  },
  enthusiast: {
    label: "The spec you want, at a fair price",
    bodyTypes: ["Coupe", "Sedan", "SUV"],
    maxPrice: 45000, maxMiles: 60000, minYear: 2018,
    weights: { value: 3, reliability: 1, economy: 1, safety: 1, space: 1 },
    why: "Days-on-lot leverage and real market pricing on the spec.",
  },
};

export const DEFAULT_PROFILE = SHOP_PROFILES.commuter;

export function profileFor(archetypeKey) {
  return SHOP_PROFILES[archetypeKey] || DEFAULT_PROFILE;
}

/* Coarse per-segment traits, 1-5. Enough to rank honestly without
   pretending we have IIHS and Consumer Reports wired up yet — the UI
   labels these as estimates until real data lands (BACKLOG item 6). */
const TRAITS = {
  SUV: { safety: 4, space: 4, reliability: 3, economy: 2 },
  Minivan: { safety: 5, space: 5, reliability: 3, economy: 2 },
  Sedan: { safety: 4, space: 2, reliability: 4, economy: 4 },
  Hatchback: { safety: 3, space: 3, reliability: 4, economy: 5 },
  Pickup: { safety: 3, space: 5, reliability: 4, economy: 1 },
  Coupe: { safety: 3, space: 1, reliability: 3, economy: 3 },
};

const RELIABLE_MAKES = ["toyota", "honda", "mazda", "lexus", "subaru", "acura"];

/* Match score 0-100: how well this car serves THIS buyer's stated goal.
   Value (price vs the segment median) is the only market input; the rest
   is fit. Kept transparent on purpose — a score nobody can explain is a
   score nobody should trust. */
export function matchScore(listing, profile, median) {
  const t = TRAITS[listing.bodyType] || TRAITS.Sedan;
  const w = profile.weights;

  const value = median
    ? Math.max(1, Math.min(5, 3 + ((median - listing.price) / median) * 20))
    : 3;

  const traits = {
    ...t,
    value,
    reliability: RELIABLE_MAKES.includes(String(listing.make).toLowerCase())
      ? Math.min(5, t.reliability + 1)
      : t.reliability,
  };

  let total = 0, weight = 0;
  for (const k of Object.keys(w)) {
    total += (traits[k] ?? 3) * w[k];
    weight += 5 * w[k];
  }
  let score = (total / weight) * 100;

  // Hard-ish preferences: off-profile body styles and over-budget cars
  // shouldn't outrank the things the buyer actually asked for.
  if (!profile.bodyTypes.includes(listing.bodyType)) score -= 12;
  if (listing.price > profile.maxPrice) score -= 10;

  return Math.max(20, Math.min(99, Math.round(score)));
}

export function valueLabel(price, median) {
  if (!median) return { text: "No market read yet", tone: "neutral" };
  const d = price - median;
  const pct = Math.abs(d / median) * 100;
  if (pct < 2) return { text: "At market", tone: "neutral" };
  if (d < 0) return { text: `$${Math.round(-d).toLocaleString()} under market`, tone: "good" };
  return { text: `$${Math.round(d).toLocaleString()} over market`, tone: "warn" };
}

/* The six filters that change the answer. */
export function defaultFilters(profile, setup) {
  return {
    bodyType: profile.bodyTypes[0],
    maxPrice: profile.maxPrice,
    maxMiles: profile.maxMiles,
    minYear: profile.minYear,
    zip: setup?.zip || "77471",
    radius: setup?.radius || 100,
  };
}

export const FILTER_META = {
  maxPrice: { label: "Max price", step: 1000, min: 5000, max: 80000, money: true },
  maxMiles: { label: "Max miles", step: 10000, min: 10000, max: 150000 },
  minYear: { label: "Newest year from", step: 1, min: 2012, max: 2025 },
  radius: { label: "Search radius (mi)", step: 25, min: 25, max: 250 },
};

/* Sample inventory for when no MarketCheck key is configured. Real
   Houston-area body styles and plausible pricing so the experience is
   demonstrable offline — always labeled as sample in the UI. */
export const SAMPLE_INVENTORY = [
  { year: 2021, make: "Mazda", model: "CX-5", trim: "Touring", price: 23450, miles: 31000, bodyType: "SUV", dealer: "Sugar Land Mazda", days: 62 },
  { year: 2022, make: "Toyota", model: "RAV4", trim: "XLE", price: 27995, miles: 24000, bodyType: "SUV", dealer: "Katy Toyota", days: 18 },
  { year: 2023, make: "Honda", model: "CR-V", trim: "EX-L", price: 31987, miles: 28400, bodyType: "SUV", dealer: "Sugar Land Honda", days: 47 },
  { year: 2020, make: "Toyota", model: "Highlander", trim: "LE", price: 29900, miles: 58000, bodyType: "SUV", dealer: "Pasadena Toyota", days: 33 },
  { year: 2021, make: "Honda", model: "Odyssey", trim: "EX", price: 32400, miles: 41000, bodyType: "Minivan", dealer: "Big Star Honda", days: 71 },
  { year: 2022, make: "Kia", model: "Telluride", trim: "LX", price: 33900, miles: 36000, bodyType: "SUV", dealer: "Houston Kia", days: 12 },
  { year: 2019, make: "Toyota", model: "Camry", trim: "LE", price: 18400, miles: 62000, bodyType: "Sedan", dealer: "Gillman Toyota", days: 44 },
  { year: 2020, make: "Honda", model: "Civic", trim: "EX", price: 19750, miles: 47000, bodyType: "Sedan", dealer: "Katy Honda", days: 26 },
  { year: 2021, make: "Hyundai", model: "Elantra", trim: "SEL", price: 17200, miles: 52000, bodyType: "Sedan", dealer: "Clear Lake Hyundai", days: 55 },
  { year: 2018, make: "Honda", model: "Accord", trim: "Sport", price: 16900, miles: 78000, bodyType: "Sedan", dealer: "Pearland Auto", days: 39 },
  { year: 2022, make: "Toyota", model: "Corolla", trim: "SE", price: 20100, miles: 33000, bodyType: "Sedan", dealer: "Sugar Land Toyota", days: 21 },
  { year: 2021, make: "Mazda", model: "Mazda3", trim: "Select", price: 19900, miles: 40000, bodyType: "Hatchback", dealer: "Houston Mazda", days: 48 },
  { year: 2020, make: "Ford", model: "F-150", trim: "XLT", price: 34500, miles: 61000, bodyType: "Pickup", dealer: "Katy Ford", days: 29 },
  { year: 2021, make: "Toyota", model: "Tacoma", trim: "SR5", price: 33800, miles: 44000, bodyType: "Pickup", dealer: "Gillman Toyota", days: 17 },
  { year: 2019, make: "Chevrolet", model: "Silverado 1500", trim: "LT", price: 28900, miles: 82000, bodyType: "Pickup", dealer: "Houston Chevy", days: 66 },
  { year: 2021, make: "Lexus", model: "RX 350", trim: "Base", price: 41500, miles: 38000, bodyType: "SUV", dealer: "Lexus Sugar Land", days: 24 },
  { year: 2020, make: "BMW", model: "330i", trim: "Base", price: 29800, miles: 46000, bodyType: "Sedan", dealer: "Houston BMW", days: 58 },
  { year: 2019, make: "Ford", model: "Mustang", trim: "GT", price: 32900, miles: 39000, bodyType: "Coupe", dealer: "Pearland Ford", days: 73 },
];

export function filterInventory(inv, f) {
  return inv.filter(
    (v) =>
      (!f.bodyType || v.bodyType === f.bodyType) &&
      v.price <= f.maxPrice &&
      v.miles <= f.maxMiles &&
      v.year >= f.minYear
  );
}

/* One canonical shape for anything in the Garage, whatever its origin:
   shop result, marketplace import, or a decoded quote. */
export function toGarageItem(v, src = "SHOPPED") {
  const id = v.id || `${v.year}-${v.make}-${v.model}-${v.price}`;
  return {
    id,
    title: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" "),
    year: v.year, make: v.make, model: v.model, trim: v.trim || "",
    price: v.price,
    miles: v.miles || 0,
    bodyType: v.bodyType || "Sedan",
    dealer: v.dealer || "",
    days: v.days || 0,
    drop: v.drop || null,
    src,
    decoded: Boolean(v.decoded),
  };
}

/* Segment median from whatever set we have — used for the value read
   when a per-vehicle market call isn't warranted. */
export function segmentMedian(listings) {
  const prices = listings.map((l) => l.price).sort((a, b) => a - b);
  if (!prices.length) return null;
  const m = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[m] : Math.round((prices[m - 1] + prices[m]) / 2);
}
