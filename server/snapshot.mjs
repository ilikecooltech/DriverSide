/* Real MarketCheck pull — 12 active used 2023 Honda CR-V EX-L listings
   within 100 mi of ZIP 77471, retrieved Aug 8, 2026. Served as fallback
   when MARKETCHECK_API_KEY is not configured, so the demo always works. */

export const SNAPSHOT = {
  source: "snapshot",
  pulled: "Aug 8, 2026",
  zip: "77471",
  radius: 100,
  count: 12,
  median: 30934,
  low: 27138,
  high: 32998,
  comps: [
    { name: "2023 CR-V EX-L (CPO)", price: 30038, miles: 28793, days: 38, source: "hondaoflakejackson.com" },
    { name: "2023 CR-V EX-L", price: 30950, miles: 27165, days: 39, source: "machaikfordpasadena.com" },
    { name: "2023 CR-V EX-L", price: 30998, miles: 30622, days: 38, source: "carmax.com" },
    { name: "2023 CR-V EX-L (CPO)", price: 30919, miles: 31991, days: 13, source: "bigstarhonda.com" },
    { name: "2023 CR-V EX-L", price: 28988, miles: 44852, days: 48, source: "teamgillmanhondanorth.com" },
    { name: "2023 CR-V EX-L", price: 32998, miles: 15161, days: 96, source: "carmax.com" },
  ],
};
