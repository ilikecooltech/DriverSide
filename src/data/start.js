/* The Start screen's data: which doors exist, where each one lands, and
   what a returning buyer is told they left behind.

   Kept out of the component so the routing table and the resume logic are
   testable, and so adding a door later is a data change rather than JSX
   surgery. */

/* Five doors, in the order a buyer's urgency runs — the dealer door is
   first and loudest because someone standing at a desk right now has the
   least time and the most to lose.

   `dest` is where the door lands. `needsGoal` marks the one surface that
   genuinely can't work without an archetype (Shop ranks against it);
   every other door skips onboarding entirely, because "every door leads
   to the same toolbox — nothing here is a funnel." */
export const JOURNEY_DOORS = [
  {
    key: "dealer",
    urgent: true,
    title: "I'm at the dealer right now",
    blurb: "Deep breath. Photograph whatever they handed you — we'll take it from here.",
    cta: "START SESSION →",
    dest: { tab: "dealer", dealView: "capture" },
  },
  {
    key: "shop",
    title: "Just looking",
    blurb: "Tell us the job the car has to do. We rank the live market by fit — never by ad spend.",
    cta: "SHOP BY GOAL →",
    dest: { tab: "shop", needsGoal: true },
  },
  {
    key: "garage",
    title: "I've found a car",
    blurb: "Save it to your Garage. We'll watch the price, the days on lot, and your leverage.",
    cta: "SAVE A CAR →",
    dest: { tab: "garage" },
  },
  {
    key: "finance",
    title: "Getting my money ready",
    blurb: "Calculators for your rate, your budget and your trade-in. What the loan really costs.",
    cta: "TOOLS →",
    dest: { tab: "tools" },
  },
  {
    key: "quote",
    title: "I already have a quote",
    blurb: "Photograph any worksheet or four-square. We'll tell you which lines are real.",
    cta: "DECODE IT →",
    dest: { tab: "dealer", dealView: "capture" },
  },
  {
    key: "bought",
    title: "I already bought",
    blurb: "Cancel add-ons you didn't want, check your loan, and help the next buyer near you.",
    cta: "AFTER YOU BUY →",
    dest: { tab: "tools", toolsStage: "after" },
  },
];

/* What a returning buyer gets above the doors.

   The mockup shows "Down $510 since Tuesday" — price-drop history that
   Phase 5 builds and that we do not have yet. Rather than print a number
   we can't stand behind, this reports only what's actually on the device:
   what they saved and what it's scored against. Returns null on a first
   visit, which hides the card. */
export function resumeSummary({ cars = [], archetypeName = null } = {}) {
  const count = Array.isArray(cars) ? cars.length : 0;

  if (count > 0) {
    const top = cars[0];
    const title = top?.title || [top?.year, top?.make, top?.model].filter(Boolean).join(" ") || "Your garage";
    const rest = count - 1;
    const line = [
      rest > 0 ? `${rest} other car${rest === 1 ? "" : "s"} saved` : "Saved and being watched",
      archetypeName ? `scored for ${archetypeName}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return { title, line, cta: "Continue in your Garage", dest: { tab: "garage" } };
  }

  if (archetypeName) {
    return {
      title: `Your ${archetypeName} search`,
      line: "Set up and ready — nothing saved yet.",
      cta: "Pick up shopping",
      dest: { tab: "shop" },
    };
  }

  return null;
}

/* The stats strip.

   The mockup prints three fixed numbers. Two of them we can source for
   real from the same /api/shop call Shop already uses; the third —
   "$1,410 avg junk found per decoded sheet" — is a population claim we
   have no data behind, so it is deliberately not here. This app's whole
   position is that its numbers are checkable, and a made-up stat on the
   first screen would be the worst possible place to break that.

   Returns only tiles we can stand behind, so the strip shrinks rather
   than inventing filler. Empty array => render nothing. */
export function statsFromShop(data) {
  const listings = Array.isArray(data?.listings) ? data.listings : [];
  const live = data?.source === "live";
  const tiles = [];

  const count = Number(data?.count);
  if (live && Number.isFinite(count) && count > 0) {
    tiles.push({ key: "cars", value: count.toLocaleString(), label: "LIVE CARS IN YOUR RADIUS" });
  }

  const days = listings
    .map((l) => Number(l?.days))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (live && days.length >= 3) {
    const avg = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
    tiles.push({ key: "age", value: `${avg} days`, label: "AVG LOT AGE — TIME IS ON YOUR SIDE" });
  }

  return tiles;
}

/* Your plan: five steps, each marked done only from what's actually on the
   device. Same rule as the resume card: nothing we can't stand behind.
   `setup.aprSet` is true once the buyer has entered their own rate (the
   7.2% default is a placeholder, not a pre-approval). */
export function planSteps({ setup = {}, cars = [], watchingCount = 0, hasDeal = false, affordMax = null } = {}) {
  const fmtUsd = (n) => "$" + Math.round(n).toLocaleString();
  const rate = setup.aprSet && setup.apr ? setup.apr : null;
  return [
    rate
      ? { key: "rate", done: true, title: `Pre-approved at ${rate}%`, line: "Dealers have to beat it", dest: { tab: "tools", toolsCalc: "rates" } }
      : { key: "rate", done: false, title: "Get pre-approved", line: "A rate from your bank or credit union", dest: { tab: "tools", toolsCalc: "rates" } },
    affordMax
      ? { key: "budget", done: true, title: `Shop under ${fmtUsd(affordMax)}`, line: `${fmtUsd(setup.budget)}/mo for ${setup.term || 60} months`, dest: { tab: "tools", toolsCalc: "afford" } }
      : { key: "budget", done: false, title: "Set your budget", line: "Turn a monthly number into a price", dest: { tab: "tools", toolsCalc: "afford" } },
    cars.length
      ? { key: "cars", done: true, title: `${cars.length} car${cars.length === 1 ? "" : "s"} saved`, line: "Same numbers, side by side", dest: { tab: "garage" } }
      : { key: "cars", done: false, title: "Save the cars you like", line: "Compare them without a spreadsheet", dest: { tab: "shop", needsGoal: true } },
    watchingCount
      ? { key: "watch", done: true, title: `Watching ${watchingCount} price${watchingCount === 1 ? "" : "s"}`, line: "Drops and the 60-day mark", dest: { tab: "garage" } }
      : { key: "watch", done: false, title: "Watch a price", line: "From any car's page", dest: { tab: cars.length ? "garage" : "shop", needsGoal: !cars.length } },
    hasDeal
      ? { key: "quote", done: true, title: "Quote decoded", line: "Your numbers for the desk", dest: { tab: "dealer", dealView: "decoder" } }
      : { key: "quote", done: false, title: "Decode their quote", line: "Before you sign anything", dest: { tab: "dealer", dealView: "capture" } },
  ];
}
