/* Cars the buyer already owns, and the stats we show for any car.

   An owned car lives apart from the shopping list: it has no asking price
   and no match score, but it is what every car on the list gets compared
   against, so it carries the same stats (mpg, safety, upkeep, seats,
   size). Stats come from /api/vehicle-stats and are stored with the car,
   so they show offline and don't cost a lookup every visit. */

export const TYPICAL_MILES = 12000;

const clean = (s) => String(s || "").trim();

export function toOwnedItem(stats, extra = {}) {
  const s = stats || {};
  const title = [s.year, s.make, s.model, clean(s.trim)].filter(Boolean).join(" ");
  const id = `own-${s.vin || [s.year, s.make, s.model, s.epaId].join("-")}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return {
    id, owned: true, title,
    year: s.year, make: s.make, model: s.model, trim: clean(s.trim),
    vin: s.vin || null,
    miles: Number(extra.miles) || 0,
    milesPerYear: Number(extra.milesPerYear) || null,
    stats: pickStats(s),
  };
}

/* Only what we display, so a stored car doesn't carry lookup menus. */
export function pickStats(s) {
  if (!s) return null;
  return {
    mpgCity: s.mpgCity ?? null, mpgHwy: s.mpgHwy ?? null, mpgComb: s.mpgComb ?? null,
    fuel: s.fuel ?? null, powertrain: s.powertrain ?? null, evRange: s.evRange ?? null,
    sizeClass: s.sizeClass ?? null, drive: s.drive ?? null, engine: s.engine ?? null,
    seats: s.seats ?? null, body: s.body ?? null,
    safety: s.safety ?? null, upkeep: s.upkeep ?? null, epaId: s.epaId ?? null,
    at: s.at ?? null,
  };
}

/* A shopping listing already knows some of this (MarketCheck mpg and
   seats); looked-up stats fill in the rest without overwriting it. */
export function statsFor(car) {
  const s = car?.stats || {};
  return {
    ...s,
    mpgCity: s.mpgCity ?? car?.mpgCity ?? null,
    mpgHwy: s.mpgHwy ?? car?.mpgHwy ?? null,
    seats: s.seats ?? car?.seats ?? null,
    drive: s.drive ?? car?.drivetrain ?? null,
    engine: s.engine ?? car?.engine ?? null,
  };
}

export const combined = (city, hwy) => (city && hwy ? 1 / (0.55 / city + 0.45 / hwy) : null);

export function mpgOf(car) {
  const s = statsFor(car);
  return s.mpgComb || (s.mpgCity && s.mpgHwy ? Math.round(combined(s.mpgCity, s.mpgHwy)) : null);
}

export function fuelPerYear(car, gasPrice, miles = TYPICAL_MILES) {
  const mpg = mpgOf(car);
  const s = statsFor(car);
  if (!mpg || !gasPrice || s.powertrain === "Electric") return null;
  return Math.round((miles / mpg) * gasPrice);
}

/* Everything the hybrid-or-gas calculator can pick from, owned first. */
export function compareChoices(owned = [], cars = []) {
  const row = (c, kind) => {
    const s = statsFor(c);
    return {
      id: c.id, kind, title: c.title, price: c.price || null, milesPerYear: c.milesPerYear || null,
      mpgCity: s.mpgCity || null, mpgHwy: s.mpgHwy || null, powertrain: s.powertrain || null,
      label: `${kind === "owned" ? "Yours" : "Shopping"} · ${c.title}${mpgOf(c) ? ` · ${mpgOf(c)} mpg` : ""}`,
    };
  };
  return [...owned.map((c) => row(c, "owned")), ...cars.map((c) => row(c, "shopping"))];
}

/* Plain rows for the stats card: [label, value, note?]. Missing stats
   are left out rather than shown as blanks. */
export function statRows(car, { gasPrice, gasLabel, miles } = {}) {
  const s = statsFor(car);
  const rows = [];
  const mpg = mpgOf(car);
  if (s.powertrain === "Electric") rows.push(["Range", s.evRange ? `${s.evRange} mi` : "Electric"]);
  else if (mpg) rows.push(["Fuel economy", `${mpg} mpg`, s.mpgCity && s.mpgHwy ? `${s.mpgCity} city / ${s.mpgHwy} hwy` : null]);
  const m = miles || TYPICAL_MILES;
  const fuel = fuelPerYear(car, gasPrice, m);
  if (fuel) rows.push(["Gas a year", `$${fuel.toLocaleString()}`, `${m.toLocaleString()} mi at $${gasPrice.toFixed(2)}${gasLabel ? `, ${gasLabel}` : ""}`]);
  if (s.safety?.overall) rows.push(["Safety", `${s.safety.overall} of 5 stars`, "NHTSA overall"]);
  else if (s.safety) rows.push(["Safety", "Not rated", "NHTSA hasn't crash-tested this one"]);
  if (s.safety?.recalls != null) rows.push(["Recalls", String(s.safety.recalls), s.safety.recalls ? "check nhtsa.gov/recalls with the VIN" : null]);
  if (s.upkeep?.perYear) rows.push(["Repairs a year", `$${s.upkeep.perYear.toLocaleString()}`, `estimate, ${s.upkeep.known ? `${car.make} average` : "all-brand average"} (RepairPal)${s.upkeep.age > 3 ? ", adjusted for age" : ""}`]);
  if (s.seats) rows.push(["Seats", String(s.seats)]);
  if (s.sizeClass) rows.push(["Size", s.sizeClass]);
  if (s.powertrain && s.powertrain !== "Gas") rows.push(["Powertrain", s.powertrain]);
  if (s.drive) rows.push(["Drive", s.drive]);
  if (s.engine) rows.push(["Engine", s.engine]);
  return rows;
}
