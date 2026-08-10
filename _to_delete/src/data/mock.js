/* Mock quote: 2023 Honda CR-V EX-L, Sugar Land TX. Benchmarks are draft
   placeholders for concept purposes — see docs/verdict-logic.md. */

/* TX tax rule: 6.25% of (vehicle price − trade-in allowance).
   31,987 − 9,200 = 22,787 → correct tax is $1,424. The dealer's sheet
   shows $1,806 (tax on full price) — a real error the analyzer catches. */
export const TAX_EXPECTED = Math.round((31987 - 9200) * 0.0625); // 1424

export const DEAL = {
  vehicle: "2023 Honda CR-V EX-L AWD",
  miles: "28,400 mi",
  dealer: "Sugar Land Honda (mock)",
  lines: [
    {
      name: "Vehicle price",
      amt: 31987,
      verdict: "amber",
      short: "≈$1,590 above market",
      why: "Comparable CR-V EX-Ls in the Houston metro are listing at a market estimate of $30,400 for this mileage. Above market, but within negotiating range — and this car has been on the lot 47 days.",
    },
    {
      name: "Doc fee",
      amt: 499,
      verdict: "amber",
      short: "Above TX typical",
      why: "Texas doesn't cap doc fees. Typical range is $150–$250. Dealers rarely remove it, but they will discount the vehicle price to offset it. Ask for the offset.",
    },
    {
      name: "Dealer prep",
      amt: 395,
      verdict: "red",
      short: "Junk fee — ask to remove",
      why: "Prep is the dealer's cost of doing business. It is not a service to you. This is one of the most commonly waived fees when challenged.",
    },
    {
      name: "Nitrogen-filled tires",
      amt: 299,
      verdict: "red",
      short: "Junk fee — ask to remove",
      why: "Air is 78% nitrogen. This adds no meaningful value and is pure margin. Ask for full removal.",
    },
    {
      name: "VIN etching",
      amt: 199,
      verdict: "red",
      short: "Junk fee — ask to remove",
      why: "A DIY kit costs about $25 and most insurers don't discount for it. Standard removal request.",
    },
    {
      name: "Paint & fabric protection",
      amt: 899,
      verdict: "red",
      short: "Junk fee — ask to remove",
      why: "Aftermarket sealant with enormous markup. A professional ceramic coating from a detailer costs less and does more. Remove it.",
    },
    {
      name: "GAP coverage",
      amt: 995,
      verdict: "amber",
      short: "2x credit union price",
      why: "GAP can make sense with a small down payment — but your credit union sells it for roughly $400–$600. Decline here, buy it there if you want it.",
    },
    {
      name: "Extended warranty",
      amt: 2850,
      verdict: "amber",
      short: "Negotiable — or skip",
      why: "Heavily marked up and fully negotiable, and you can buy one later. On a CR-V with strong reliability data, run the math before saying yes in the F&I chair.",
    },
    {
      name: "Sales tax (6.25% TX)",
      amt: 1806,
      verdict: "red",
      short: "$382 more than the math says",
      why: "Texas taxes the sale price MINUS your trade-in allowance: 6.25% of ($31,987 − $9,200) = $1,424. This sheet taxes the full price. That's a $382 error in their favor — make them re-run it. Every $1,000 of trade allowance saves you $62.50 in tax.",
    },
    {
      name: "Title & registration",
      amt: 108,
      verdict: "green",
      short: "Government fee — correct",
      why: "Actual state charges passed through at cost. Nothing to negotiate here.",
    },
  ],
  financing: {
    dealer: { apr: 9.9, term: 72, label: "Dealer offer" },
    preapproval: { apr: 7.2, term: 60, label: "Your credit union pre-approval" },
  },
  trade: {
    car: "2019 Nissan Altima SV",
    offer: 9200,
    payoff: 12100,
  },
};

/* Dealer economics — draft benchmarks for concept purposes. */
export const DEALER_MATH = {
  marketEst: 30400,
  acquisitionPct: 0.87, // dealers typically buy at ~85-90% cost-to-market
  recon: 850,
  targetGross: [2000, 3000], // healthy front-end gross target, used
};

export const SEGMENT_ROOM = [
  { seg: "Economy sedan", room: "$1,500–$2,500", note: "Most competition, most room" },
  { seg: "Compact SUV — this car", room: "$2,000–$3,000", note: "Solid room, esp. 45+ days on lot", hot: true },
  { seg: "Truck / large SUV", room: "$3,000–$5,000", note: "Big markup, but demand limits flexibility" },
  { seg: "Luxury", room: "$3,000–$5,000+", note: "Highest markup, most negotiable" },
  { seg: "EV", room: "Varies widely", note: "Incentive-driven — check rebates first" },
];

export const GARAGE = [
  {
    car: "2021 Mazda CX-5 Touring",
    price: 23450,
    src: "Dealer site",
    fit: 91,
    miles: "31k mi",
    note: "Best fit · $1,100 under market · insurance est. $148/mo",
    drop: "-$750 this week",
    dol: "62 days on lot",
  },
  {
    car: "2022 Toyota RAV4 XLE",
    price: 27995,
    src: "CarGurus",
    fit: 86,
    miles: "24k mi",
    note: "At market · strongest resale · insurance est. $156/mo",
    drop: null,
    dol: "18 days on lot",
  },
  {
    car: "2023 Honda CR-V EX-L",
    price: 31987,
    src: "AutoTrader",
    fit: 74,
    miles: "28k mi",
    note: "≈$1,590 over market · quote analyzed — see Deal tab",
    drop: null,
    dol: "47 days on lot",
  },
];
