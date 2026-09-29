/* Gas price near a ZIP, from the U.S. Energy Information Administration.

   EIA publishes a weekly average for regular gasoline every Monday: the
   U.S., the regions it calls PADDs, nine states and ten metro areas. One
   request returns all of them, so we fetch the latest week once, cache
   it, and pick the closest area for each ZIP: the metro if the ZIP is in
   one, else the state, else the region, else the U.S.

   ZIP → state uses the first three digits. That is exact for all but a
   handful of prefixes that straddle a state line, which is close enough
   for a gas price. */

const Z3 = [
  // [first ZIP3, last ZIP3, state]
  [5, 5, "NY"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"],
  [50, 54, "VT"], [55, 55, "MA"], [56, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"],
  [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 205, "DC"], [206, 219, "MD"],
  [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"], [300, 319, "GA"],
  [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"],
  [400, 427, "KY"], [430, 459, "OH"], [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"],
  [530, 549, "WI"], [550, 567, "MN"], [569, 569, "DC"], [570, 577, "SD"], [580, 588, "ND"],
  [590, 599, "MT"], [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"],
  [700, 714, "LA"], [716, 729, "AR"], [730, 732, "OK"], [733, 733, "TX"], [734, 749, "OK"],
  [750, 799, "TX"], [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"],
  [850, 865, "AZ"], [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"],
  [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"],
];

export function stateForZip(zip) {
  const d = String(zip || "").replace(/\D/g, "");
  if (d.length < 3) return null;
  const z = Number(d.slice(0, 3));
  const hit = Z3.find(([lo, hi]) => z >= lo && z <= hi);
  return hit ? hit[2] : null;
}

/* The ten metro areas EIA reports, by ZIP3. */
const METRO = {
  Y44HO: [770, 771, 772, 773, 774, 775],
  YORD: [600, 601, 602, 603, 604, 605, 606, 607, 608],
  YMIA: [330, 331, 332, 333],
  YDEN: [800, 801, 802],
  YCLE: [440, 441],
  YBOS: [18, 19, 21, 22, 24],
  Y48SE: [980, 981],
  Y35NY: [100, 101, 102, 103, 104, 110, 111, 112, 113, 114],
  Y05SF: [940, 941, 943, 944, 945, 946, 947, 949],
  Y05LA: [900, 901, 902, 903, 904, 905, 906, 907, 908, 910, 911, 912, 913, 914, 915, 916, 917, 918],
};

const STATE_AREA = { CA: "SCA", CO: "SCO", FL: "SFL", MA: "SMA", MN: "SMN", NY: "SNY", OH: "SOH", TX: "STX", WA: "SWA" };

const REGION = {
  R1X: ["CT", "ME", "MA", "NH", "RI", "VT"],
  R1Y: ["DE", "DC", "MD", "NJ", "NY", "PA"],
  R1Z: ["FL", "GA", "NC", "SC", "VA", "WV"],
  R20: ["IL", "IN", "IA", "KS", "KY", "MI", "MN", "MO", "NE", "ND", "OH", "OK", "SD", "TN", "WI"],
  R30: ["AL", "AR", "LA", "MS", "NM", "TX"],
  R40: ["CO", "ID", "MT", "UT", "WY"],
  R5XCA: ["AK", "AZ", "HI", "NV", "OR", "WA"],
  R50: ["CA"],
};

/* Closest first: metro, state, region, U.S. */
export function areasForZip(zip) {
  const d = String(zip || "").replace(/\D/g, "");
  const out = [];
  if (d.length >= 3) {
    const z = Number(d.slice(0, 3));
    for (const [area, list] of Object.entries(METRO)) if (list.includes(z)) out.push(area);
  }
  const st = stateForZip(d);
  if (st && STATE_AREA[st]) out.push(STATE_AREA[st]);
  if (st) for (const [area, list] of Object.entries(REGION)) if (list.includes(st)) out.push(area);
  out.push("NUS");
  return out;
}

const NICE = {
  NUS: "U.S. average", R1X: "New England average", R1Y: "Mid-Atlantic average", R1Z: "Southeast average",
  R20: "Midwest average", R30: "Gulf Coast average", R40: "Rocky Mountain average", R50: "West Coast average",
  R5XCA: "West Coast average (outside California)",
};
const title = (s) => String(s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export function areaLabel(code, name) {
  if (NICE[code]) return NICE[code];
  return `${title(name)} average`;
}

/* rows: EIA response.data rows for one product. Uses the newest week only. */
export function pickPrice(rows, zip) {
  const valid = (rows || []).filter((r) => r && r.duoarea && Number(r.value) > 0);
  if (!valid.length) return null;
  const latest = valid.reduce((m, r) => (r.period > m ? r.period : m), "");
  const week = new Map(valid.filter((r) => r.period === latest).map((r) => [r.duoarea, r]));
  for (const code of areasForZip(zip)) {
    const r = week.get(code);
    if (r) return { price: Math.round(Number(r.value) * 100) / 100, area: code, label: areaLabel(code, r["area-name"]), week: latest };
  }
  return null;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
let cache = { at: 0, rows: null };

export async function latestGasRows({ key = process.env.EIA_API_KEY || "DEMO_KEY", fetchImpl = fetch, now = Date.now() } = {}) {
  if (cache.rows && now - cache.at < SIX_HOURS) return cache.rows;
  const p = new URLSearchParams({
    api_key: key, frequency: "weekly", "data[0]": "value", "facets[product][]": "EPMR",
    "sort[0][column]": "period", "sort[0][direction]": "desc", length: "80",
  });
  const r = await fetchImpl(`https://api.eia.gov/v2/petroleum/pri/gnd/data/?${p}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`EIA ${r.status}`);
  const j = await r.json();
  const rows = j?.response?.data || [];
  if (rows.length) cache = { at: now, rows };
  return rows;
}

export function _resetGasCache() { cache = { at: 0, rows: null }; }
