/* Deal engine: normalizes any deal (the mock CR-V demo or a manually
   entered quote) into one decoded shape the Decoder renders, and builds
   the three scripts from live market numbers. TX-first per CLAUDE.md. */

export const TX_TAX = 0.0625;
export const DOC_FEE_TYPICAL = 250;
export const PRE_APPROVAL = { apr: 7.2, term: 60 }; // CU benchmark

/* ---------- vehicle parsing ---------- */

export function parseVehicle(s) {
  const m = String(s).trim().match(/^((?:19|20)\d{2})\s+([A-Za-z]+)\s+([\w-]+)\s*(.*)$/);
  if (!m) return null;
  return { year: m[1], make: m[2], model: m[3], trim: (m[4] || "").trim() };
}

/* ---------- deal normalization ---------- */

/* input: { vehicle, dealer, miles, zip, asking, docFee, titleReg,
   addons: [{name, amt}], taxCharged, apr, term, tradeOffer, tradePayoff,
   marketEst (optional), daysOnLot (optional) } */
export function buildDeal(input) {
  const asking = Number(input.asking) || 0;
  const tradeOffer = Number(input.tradeOffer) || 0;
  const tradePayoff = Number(input.tradePayoff) || 0;
  const docFee = Number(input.docFee) || 0;
  const titleReg = Number(input.titleReg) || 0;
  const taxCharged = Number(input.taxCharged) || 0;
  const addons = (input.addons || []).filter((a) => Number(a.amt) > 0);

  const expectedTax = Math.round(TX_TAX * Math.max(0, asking - tradeOffer));
  const taxError = Math.max(0, Math.round(taxCharged - expectedTax));
  const junkTotal = addons.reduce((s, a) => s + Number(a.amt), 0);
  const negEq = Math.max(0, tradePayoff - tradeOffer);

  const linesFlag = addons.map((a) => ({
    name: a.name, amt: Number(a.amt),
    short: a.short || "Junk fee — ask to remove",
    why: a.why || "Dealer add-on with heavy markup. These are the most commonly waived charges when challenged. Ask for full removal or an equal discount on the price.",
  }));
  if (taxError > 25)
    linesFlag.push({
      name: `Sales tax (6.25% TX)`, amt: taxCharged,
      short: `${fmtStatic(taxError)} more than the math says`,
      why: `Texas taxes price MINUS trade: 6.25% of (${fmtStatic(asking)} − ${fmtStatic(tradeOffer)}) = ${fmtStatic(expectedTax)}. This sheet charges ${fmtStatic(taxCharged)} — a ${fmtStatic(taxError)} error in their favor. Make them re-run it.`,
    });

  const linesCheck = [];
  linesCheck.push({
    name: "Vehicle price", amt: asking,
    short: "Check against live comps",
    why: "Grade the ask against the live market median below, not the sticker. If it's above the median, that gap is negotiating room — especially past 45 days on the lot.",
  });
  if (docFee > DOC_FEE_TYPICAL)
    linesCheck.push({
      name: "Doc fee", amt: docFee,
      short: "Above TX typical",
      why: `Texas doesn't cap doc fees; typical is $150–$250. Dealers rarely remove it but will discount the price to offset it. Ask for the offset.`,
    });
  (input.extraCheck || []).forEach((l) => linesCheck.push(l));

  const fairRows = [{ name: "Title & registration — correct, nothing to do", amt: titleReg }];
  if (taxError <= 25 && taxCharged > 0)
    fairRows.push({ name: "Sales tax — matches 6.25% of price minus trade", amt: taxCharged });

  return {
    vehicle: input.vehicle,
    dealer: input.dealer || "DEALER QUOTE",
    miles: input.miles || "",
    zip: input.zip || "77471",
    asking,
    daysOnLot: input.daysOnLot || null,
    /* structured query beats free-text parsing (multi-word makes/models) */
    query: input.query || parseVehicle(input.vehicle),
    marketEst: Number(input.marketEst) || null,
    linesFlag, linesCheck, fairRows,
    junkTotal, taxError, expectedTax, taxCharged,
    trade: { car: input.tradeCar || "Your trade", offer: tradeOffer, payoff: tradePayoff },
    negEq,
    cleanFees: docFee + titleReg,
    baseSpread: asking - tradeOffer,
    apr: Number(input.apr) || null,
    term: Number(input.term) || null,
    principal: asking + docFee + titleReg + expectedTax + negEq,
  };
}

const fmtStatic = (n) => "$" + Math.round(n).toLocaleString();

/* ---------- the mock CR-V demo deal ---------- */

export const MOCK_DEAL = buildDeal({
  vehicle: "2023 Honda CR-V EX-L AWD",
  dealer: "SUGAR LAND HONDA",
  miles: "28,400 mi",
  zip: "77471",
  daysOnLot: 47,
  asking: 31987,
  docFee: 499,
  titleReg: 108,
  taxCharged: 1806,
  apr: 9.9,
  term: 72,
  tradeCar: "2019 NISSAN ALTIMA SV",
  tradeOffer: 9200,
  tradePayoff: 12100,
  addons: [
    { name: "Dealer prep", amt: 395, why: "Prep is the dealer's cost of doing business, not a service to you. One of the most commonly waived fees when challenged." },
    { name: "Nitrogen-filled tires", amt: 299, why: "Air is 78% nitrogen. This adds no meaningful value and is pure margin. Ask for full removal." },
    { name: "VIN etching", amt: 199, why: "A DIY kit costs about $25 and most insurers don't discount for it. Standard removal request." },
    { name: "Paint & fabric protection", amt: 899, why: "Aftermarket sealant with enormous markup. A professional detailer's ceramic coating costs less and does more." },
  ],
  extraCheck: [
    { name: "GAP coverage", amt: 995, short: "2x credit union price", why: "Your credit union sells GAP for roughly $400–$600. Decline here, buy it there if you want it." },
    { name: "Extended warranty", amt: 2850, short: "Negotiable — or skip", why: "Heavily marked up, fully negotiable, and you can buy one later. On a CR-V, run the math before saying yes in the F&I chair." },
  ],
});
/* Demo-fidelity tweaks the generic engine can't know */
MOCK_DEAL.linesCheck[0].short = "≈$1,590 above market";
MOCK_DEAL.linesCheck[0].why = "Comparable EX-Ls in the Houston metro list around $30,400 at this mileage. Above market but in negotiating range — and this car has sat 47 days.";

/* ---------- market + dealer economics ---------- */

export const MARKET_FALLBACK = { count: 14, median: 30400, low: 28900, high: 32400, source: "fallback", comps: [] };

/* Dealers acquire at ~85–90% cost-to-market plus recon; healthy front-end
   gross is $2–3k. Fair-price target = est. all-in + mid gross. */
export function dealerMath(median) {
  const acq = Math.round((median * 0.87 + 850) / 100) * 100;
  const fair = acq + 2500;
  return { acq, gross: null, fair };
}

/* ---------- scripts, fed by live market numbers (backlog item 1) ---------- */

export function buildScripts(deal, market, fmt, pmt) {
  const median = market?.median || deal.marketEst;
  const over = median ? Math.max(0, deal.asking - median) : null;
  const comps = (market?.comps || []).slice(0, 2);
  const compLine = comps.length
    ? ` The same car is listed at ${fmt(comps[0].price)}${comps[0].source ? ` at ${comps[0].source}` : ""}${comps[1] ? `, and another at ${fmt(comps[1].price)}` : ""} — I have the listings with me.`
    : "";

  const junkBits = [];
  if (deal.junkTotal > 0) junkBits.push(`${fmt(deal.junkTotal)} in add-ons I didn't ask for`);
  if (deal.taxError > 25) junkBits.push(`a ${fmt(deal.taxError)} tax error`);
  const removeNames = deal.linesFlag.filter((l) => !l.name.startsWith("Sales tax")).map((l) => l.name.toLowerCase());

  const s1 = {
    t: "Remove the junk",
    body: `“Before we go further — I need ${removeNames.length ? removeNames.join(", ") + " off this sheet" : "the add-ons off this sheet"}${deal.taxError > 25 ? ", and the tax line re-run on price minus my trade" : ""}. That's ${junkBits.join(" plus ")}. I'm ready to move today on a clean out-the-door number.”`,
  };

  let s2;
  if (deal.apr && deal.term && deal.apr > PRE_APPROVAL.apr) {
    const dP = pmt(deal.principal, deal.apr, deal.term);
    const pP = pmt(deal.principal, PRE_APPROVAL.apr, PRE_APPROVAL.term);
    const diff = dP * deal.term - pP * PRE_APPROVAL.term;
    s2 = { t: "Beat my pre-approval", body: `“I'm pre-approved at ${PRE_APPROVAL.apr}% for ${PRE_APPROVAL.term} months. Your ${deal.apr}% for ${deal.term} costs me about ${fmt(diff)} more in interest. If your finance team can beat ${PRE_APPROVAL.apr}%, I'll finance with you. Otherwise I'm using my credit union.”` };
  } else {
    s2 = { t: "Beat my pre-approval", body: `“I'm pre-approved at ${PRE_APPROVAL.apr}% for ${PRE_APPROVAL.term} months with my credit union. If your finance team can beat it, I'll finance with you — show me the buy rate, not just a payment.”` };
  }

  const s3 = {
    t: "Walk away",
    body: median
      ? `“${deal.daysOnLot ? `This car has been on your lot ${deal.daysOnLot} days and it's` : "This car is"} listed about ${fmt(over)} over the live market median.${compLine} My number is ${fmt(median)} plus tax, title, and a reasonable doc fee — out the door. If you can get there, call me. I'm looking at two others this week.”`
      : `“I've priced this car against comparable listings and your number is above the market. Give me your best out-the-door price in writing. If it's right, call me. I'm looking at two others this week.”`,
  };

  return [s1, s2, s3];
}

/* ---------- capture flow + garage (unchanged data) ---------- */

export const SCAN_STEPS = [
  "Reading the sheet — 10 line items found",
  "Pricing 14 live comps within 100 mi of 77471",
  "Re-running TX tax: 6.25% × (price − trade)",
  "Flagging add-ons: prep · nitrogen · etching · sealant",
  "Checking days on lot — 47 and counting",
  "Computing your leverage…",
];

export const STEP_BOUNDS = {
  price: { minPct: 0.9, maxPct: 1.02, step: 250 },
  trade: { minPct: 0.85, maxPct: 1.2, step: 100 },
};

export const GARAGE = [
  { car: "2021 Mazda CX-5 Touring", price: 23450, src: "DEALER SITE", fit: 91, miles: "31k mi", note: "$1,100 under market · insurance est. $148/mo", drop: "-$750 this week", dol: "62 days on lot", best: true },
  { car: "2022 Toyota RAV4 XLE", price: 27995, src: "CARGURUS", fit: 86, miles: "24k mi", note: "At market · strongest resale · insurance est. $156/mo", drop: null, dol: "18 days on lot" },
  { car: "2023 Honda CR-V EX-L", price: 31987, src: "AUTOTRADER", fit: 74, miles: "28k mi", note: "≈$1,590 over market · quote analyzed", drop: null, dol: "47 days on lot", decoded: true },
];
