/* Stats for any car, from free public sources, so a buyer can add the
   car they already own and compare it with what they're shopping.

   - fueleconomy.gov (EPA): mpg, fuel type, hybrid/electric, size class,
     drive, engine. Also the year → make → model → engine menus.
   - NHTSA 5-Star Safety Ratings: overall, frontal, side, rollover stars,
     plus open recall and complaint counts.
   - NHTSA vPIC: VIN decode (year, make, model, trim, seats, body).
   - MarketCheck (only if the key is set): seating from a live listing of
     the same year, make and model, when the VIN didn't say.
   - Upkeep: RepairPal's average yearly repair cost for the brand, scaled
     up for age. An estimate, and labeled as one. */

const UA = { Accept: "application/json" };
const TIMEOUT = 8000;

async function getJson(url, fetchImpl = fetch) {
  const r = await fetchImpl(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

const FE = "https://www.fueleconomy.gov/ws/rest";

/* fueleconomy.gov answers one item as an object and several as an array. */
export function menuItems(json) {
  const m = json?.menuItem;
  const list = Array.isArray(m) ? m : m ? [m] : [];
  return list.map((i) => ({ text: String(i.text), value: String(i.value) }));
}

export async function menu(kind, { year, make, model } = {}, fetchImpl = fetch) {
  const y = encodeURIComponent(year || ""), mk = encodeURIComponent(make || ""), md = encodeURIComponent(model || "");
  const url =
    kind === "years" ? `${FE}/vehicle/menu/year` :
    kind === "makes" ? `${FE}/vehicle/menu/make?year=${y}` :
    kind === "models" ? `${FE}/vehicle/menu/model?year=${y}&make=${mk}` :
    kind === "options" ? `${FE}/vehicle/menu/options?year=${y}&make=${mk}&model=${md}` : null;
  if (!url) throw new Error("unknown menu");
  return menuItems(await getJson(url, fetchImpl));
}

const words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim().split(" ").filter(Boolean);

/* EPA model names are often more specific than a listing's ("Camry
   Hybrid LE", "RAV4 AWD"). Pick the EPA model that best matches the
   model plus trim we were given: an exact name wins, then the most words
   in common, then the shortest name. */
export function bestModel(models, model, trim = "") {
  if (!models.length) return null;
  const want = words(`${model} ${trim}`);
  const exact = models.find((m) => m.text.toLowerCase() === String(model).toLowerCase() && !/hybrid/i.test(trim));
  if (exact) return exact.text;
  const base = words(model);
  const scored = models
    .map((m) => {
      const w = words(m.text);
      const hasBase = base.every((b) => w.includes(b));
      const common = w.filter((x) => want.includes(x)).length;
      const hybridMismatch = /hybrid/i.test(m.text) !== /hybrid/i.test(`${model} ${trim}`);
      return { m, score: (hasBase ? 100 : 0) + common * 10 - (hybridMismatch ? 30 : 0) - w.length };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0].score >= 90 ? scored[0].m.text : null;
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function powertrainOf(v) {
  const atv = String(v?.atvType || "").toLowerCase();
  if (atv === "ev") return "Electric";
  if (atv.includes("plug")) return "Plug-in hybrid";
  if (atv.includes("hybrid")) return "Hybrid";
  if (atv === "diesel" || /diesel/i.test(v?.fuelType1 || "")) return "Diesel";
  return "Gas";
}

export function fromEpa(v) {
  if (!v) return null;
  return {
    epaId: String(v.id ?? ""),
    mpgCity: num(v.city08), mpgHwy: num(v.highway08), mpgComb: num(v.comb08),
    fuel: v.fuelType1 || v.fuelType || null,
    powertrain: powertrainOf(v),
    evRange: num(v.range),
    sizeClass: v.VClass || null,
    drive: v.drive || null,
    engine: [num(v.cylinders) ? `${v.cylinders} cyl` : null, num(v.displ) ? `${v.displ} L` : null, v.trany || null].filter(Boolean).join(", ") || null,
    epaFuelCostYear: num(v.fuelCost08),
  };
}

const stars = (s) => (/^[1-5]$/.test(String(s)) ? Number(s) : null);

export function fromSafety(r) {
  if (!r) return null;
  return {
    overall: stars(r.OverallRating),
    front: stars(r.OverallFrontCrashRating),
    side: stars(r.OverallSideCrashRating),
    rollover: stars(r.RolloverRating),
    recalls: Number.isFinite(Number(r.RecallsCount)) ? Number(r.RecallsCount) : null,
    complaints: Number.isFinite(Number(r.ComplaintsCount)) ? Number(r.ComplaintsCount) : null,
    forwardCollisionWarning: r.NHTSAForwardCollisionWarning || null,
    laneDepartureWarning: r.NHTSALaneDepartureWarning || null,
    tested: r.VehicleDescription || null,
  };
}

/* RepairPal average yearly repair cost by brand (repairpal.com/reliability).
   Brands not listed fall back to the all-brand average. */
export const UPKEEP = {
  acura: 501, audi: 987, bmw: 968, buick: 608, cadillac: 783, chevrolet: 649, chrysler: 608,
  dodge: 634, ford: 775, gmc: 744, honda: 428, hyundai: 468, infiniti: 638, jeep: 634,
  kia: 474, lexus: 551, lincoln: 879, mazda: 462, "mercedes-benz": 908, mini: 854,
  mitsubishi: 535, nissan: 500, ram: 858, subaru: 617, toyota: 441, volkswagen: 676, volvo: 769,
};
export const UPKEEP_AVERAGE = 652;

/* Older cars cost more to keep running: +6% a year past year three,
   capped at 1.6x. */
export function upkeepEstimate(make, year, nowYear = new Date().getFullYear()) {
  const key = String(make || "").toLowerCase().trim();
  const base = UPKEEP[key] ?? UPKEEP_AVERAGE;
  const age = Math.max(0, nowYear - Number(year || nowYear));
  const factor = Math.min(1.6, 1 + Math.max(0, age - 3) * 0.06);
  return { perYear: Math.round((base * factor) / 10) * 10, brandAverage: base, known: key in UPKEEP, age };
}

export function fromVin(r) {
  if (!r) return null;
  const s = (k) => (r[k] && String(r[k]).trim()) || null;
  return {
    year: num(s("ModelYear")), make: s("Make") ? title(s("Make")) : null, model: s("Model"), trim: s("Trim"),
    seats: num(s("Seats")), body: s("BodyClass"), drive: s("DriveType"),
    electrification: s("ElectrificationLevel"), error: s("ErrorCode") && !/^0\b/.test(s("ErrorCode")) ? s("ErrorText") : null,
  };
}
const title = (x) => String(x).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bBmw\b/, "BMW").replace(/\bGmc\b/, "GMC");

export async function decodeVin(vin, fetchImpl = fetch) {
  const j = await getJson(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`, fetchImpl);
  return fromVin(j?.Results?.[0]);
}

/* With no trim to go on, assume the base engine: the smallest one. */
export function baseEngine(options) {
  const litres = (o) => Number((o.text.match(/([\d.]+)\s*L\b/) || [])[1]) || Infinity;
  return [...options].sort((a, b) => litres(a) - litres(b))[0];
}

async function epaFor({ year, make, model, trim, epaId }, fetchImpl) {
  let id = epaId;
  let options = [];
  let epaModel = null;
  if (!id) {
    const models = await menu("models", { year, make }, fetchImpl);
    epaModel = bestModel(models, model, trim);
    if (!epaModel) return { epa: null, options: [], epaModel: null };
    options = await menu("options", { year, make, model: epaModel }, fetchImpl);
    if (!options.length) return { epa: null, options, epaModel };
    const t = words(trim);
    const pick = options.find((o) => t.some((w) => w.length > 2 && words(o.text).includes(w))) || baseEngine(options);
    id = pick.value;
  }
  const v = await getJson(`${FE}/vehicle/${encodeURIComponent(id)}`, fetchImpl);
  return { epa: fromEpa(v), options, epaModel };
}

/* EPA model names carry trims and drive ("Camry LE/SE", "RAV4 Hybrid
   AWD", "Sienna 2WD"); NHTSA wants the plain model. Try the full name,
   then drop words from the end. */
export function modelCandidates(model) {
  const w = String(model || "").trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (let n = w.length; n >= 1; n--) out.push(w.slice(0, n).join(" "));
  return out;
}

async function safetyFor({ year, make, model, drive }, fetchImpl) {
  const base = "https://api.nhtsa.gov/SafetyRatings";
  let items = [];
  for (const m of modelCandidates(model)) {
    const list = await getJson(`${base}/modelyear/${encodeURIComponent(year)}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(m)}`, fetchImpl);
    items = list?.Results || [];
    if (items.length) break;
  }
  if (!items.length) return null;
  const d = String(drive || "").toLowerCase();
  const want = d.includes("all") || d.includes("4-wheel") || d.includes("4wd") ? /awd|4wd/i : d.includes("front") ? /fwd/i : d.includes("rear") ? /rwd/i : null;
  const pick = (want && items.find((i) => want.test(i.VehicleDescription))) || items[0];
  const r = await getJson(`${base}/VehicleId/${pick.VehicleId}`, fetchImpl);
  return fromSafety(r?.Results?.[0]);
}

async function seatsFromMarket({ year, make, model }, key, fetchImpl) {
  if (!key) return null;
  const tries = [...new Set([String(model), modelCandidates(model).pop()])].filter(Boolean);
  for (const m of tries) {
    const p = new URLSearchParams({ api_key: key, year: String(year), make: String(make), model: m, rows: "1" });
    const j = await getJson(`https://mc-api.marketcheck.com/v2/search/car/active?${p}`, fetchImpl);
    const b = j?.listings?.[0]?.build;
    if (b) return { seats: num(b.std_seating), body: b.body_type || null };
  }
  return null;
}

const settle = (p) => p.then((v) => v, () => null);

/* The one call the endpoint makes. Every source is optional: whatever
   answers is returned, and `missing` says what didn't. */
export async function vehicleStats(q, { fetchImpl = fetch, marketKey = process.env.MARKETCHECK_API_KEY, nowYear } = {}) {
  let { year, make, model, trim = "", vin = "", epaId = "" } = q || {};
  let vinInfo = null;
  if (vin && /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
    vinInfo = await settle(decodeVin(vin, fetchImpl));
    if (vinInfo && !vinInfo.error) {
      year = year || vinInfo.year; make = make || vinInfo.make; model = model || vinInfo.model; trim = trim || vinInfo.trim || "";
    }
  }
  year = Number(year);
  if (!(year > 1983) || !make || !model) return { ok: false, note: vin ? "Couldn't read that VIN. Try year, make and model." : "Need a year, make and model." };

  const epaP = settle(epaFor({ year, make, model, trim, epaId }, fetchImpl));
  const [epaRes, market] = await Promise.all([epaP, vinInfo?.seats ? null : settle(seatsFromMarket({ year, make, model }, marketKey, fetchImpl))]);
  const epa = epaRes?.epa || null;
  const safety = await settle(safetyFor({ year, make, model, drive: epa?.drive || vinInfo?.drive }, fetchImpl));
  const upkeep = upkeepEstimate(make, year, nowYear);

  const out = {
    ok: true,
    year, make, model, trim: trim || null, vin: vin || null,
    ...(epa || {}),
    seats: vinInfo?.seats || market?.seats || null,
    body: vinInfo?.body || market?.body || null,
    safety,
    upkeep,
    epaOptions: epaRes?.options || [],
    epaModel: epaRes?.epaModel || null,
  };
  out.missing = [!epa && "mpg", !safety && "safety", !out.seats && "seats"].filter(Boolean);
  return out;
}

/* ── Known problems: what owners report and what's been recalled ──
   NHTSA complaints (filed by owners) and recalls (filed by the maker),
   for the model year. Complaints are unverified reports, so we show
   where they cluster, not a verdict. */

const PART_NAMES = {
  "POWER TRAIN": "Transmission and drivetrain", "ENGINE": "Engine", "FUEL/PROPULSION SYSTEM": "Fuel and propulsion",
  "SERVICE BRAKES": "Brakes", "ELECTRICAL SYSTEM": "Electrical", "AIR BAGS": "Airbags", "VEHICLE SPEED CONTROL": "Speed control",
  "STEERING": "Steering", "SUSPENSION": "Suspension", "STRUCTURE": "Body and structure", "SEAT BELTS": "Seat belts",
  "EXTERIOR LIGHTING": "Lights", "VISIBILITY/WIPER": "Visibility and wipers", "WHEELS": "Wheels", "TIRES": "Tires",
  "FORWARD COLLISION AVOIDANCE": "Collision avoidance", "LANE DEPARTURE": "Lane assist", "BACK OVER PREVENTION": "Backup camera",
  "LATCHES/LOCKS/LINKAGES": "Latches and locks", "ENGINE AND ENGINE COOLING": "Engine cooling", "HYBRID PROPULSION SYSTEM": "Hybrid system",
  "ELECTRONIC STABILITY CONTROL (ESC)": "Stability control", "PARKING BRAKE": "Parking brake", "SEATS": "Seats",
};
const IGNORE = new Set(["UNKNOWN OR OTHER", ""]);
const titleCase = (s) => String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export function partName(raw) {
  const top = String(raw || "").split(":")[0].trim().toUpperCase();
  return PART_NAMES[top] || titleCase(top.replace(/,.*$/, ""));
}
const clip = (s, n) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s\S*$/, "") + "…" : t; };
/* NHTSA writes complaint dates month first (09/18/2026) and recall
   dates day first (17/11/2021). Both become YYYY-MM-DD here. */
const byDate = (d) => { const [m, day, y] = String(d || "").split("/"); return y ? `${y}-${m}-${day}` : ""; };
const recallDate = (d) => { const [day, m, y] = String(d || "").split("/"); return y ? `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}` : ""; };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const niceDate = (iso) => { const [y, m, d] = String(iso || "").split("-").map(Number); return y && m ? `${MONTHS[m - 1]} ${d}, ${y}` : ""; };

export function summarizeComplaints(results = []) {
  const parts = new Map();
  let crashes = 0, fires = 0, injuries = 0, deaths = 0;
  for (const c of results) {
    if (c.crash) crashes++;
    if (c.fire) fires++;
    injuries += Number(c.numberOfInjuries) || 0;
    deaths += Number(c.numberOfDeaths) || 0;
    const names = new Set(String(c.components || "").split(",").map((x) => x.trim().toUpperCase()).filter((x) => !IGNORE.has(x)).map(partName));
    for (const n of names) {
      const p = parts.get(n) || { part: n, count: 0, latest: null };
      p.count++;
      if (!p.latest || byDate(c.dateComplaintFiled) > byDate(p.latest.date)) p.latest = { date: c.dateComplaintFiled, text: clip(c.summary, 220) };
      parts.set(n, p);
    }
  }
  const top = [...parts.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    .map((p) => ({ part: p.part, count: p.count, example: p.latest?.text || null }));
  return { total: results.length, crashes, fires, injuries, deaths, top };
}

export function summarizeRecalls(results = []) {
  return results
    .map((r) => ({
      id: r.NHTSACampaignNumber, iso: recallDate(r.ReportReceivedDate), part: partName(r.Component),
      what: clip(r.Consequence || r.Summary, 200), fix: clip(r.Remedy, 200),
      parkIt: Boolean(r.parkIt), parkOutside: Boolean(r.parkOutSide), overTheAir: Boolean(r.overTheAirUpdate),
    }))
    .sort((a, b) => b.iso.localeCompare(a.iso))
    .map(({ iso, ...r }) => ({ ...r, date: niceDate(iso) }));
}

export async function vehicleProblems({ year, make, model }, { fetchImpl = fetch } = {}) {
  year = Number(year);
  if (!(year > 1983) || !make || !model) return { ok: false, note: "Need a year, make and model." };
  const base = "https://api.nhtsa.gov";
  const tryModels = async (path) => {
    // A trim-style name ("Camry LE/SE") can make NHTSA answer 400; move on to the plainer name.
    let answered = false;
    for (const m of modelCandidates(model)) {
      const q = new URLSearchParams({ make: String(make), model: m, modelYear: String(year) });
      const j = await getJson(`${base}/${path}?${q}`, fetchImpl).catch(() => null);
      if (j) answered = true;
      const list = j?.results || j?.Results || [];
      if (list.length) return list;
    }
    if (!answered) throw new Error("NHTSA unavailable");
    return [];
  };
  const [complaints, recalls] = await Promise.all([
    settle(tryModels("complaints/complaintsByVehicle")),
    settle(tryModels("recalls/recallsByVehicle")),
  ]);
  if (complaints === null && recalls === null) return { ok: false, note: "NHTSA didn't answer. Try again in a minute." };
  const slug = (s) => encodeURIComponent(String(s).toUpperCase());
  return {
    ok: true, year, make, model,
    complaints: summarizeComplaints(complaints || []),
    recalls: summarizeRecalls(recalls || []),
    link: `https://www.nhtsa.gov/vehicle/${year}/${slug(make)}/${slug(modelCandidates(model).pop())}`,
    at: Date.now(),
  };
}
