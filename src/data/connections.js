/* Marketplace connections. None of these sites expose a public API for a
   user's saved cars, so connecting is a demonstration of the mechanic:
   it imports that account's favorites into one garage. The UI labels it
   as sample import — we don't pretend to an integration we don't have.
   Real paths later: browser extension, share sheet, email parsing. */

export const CONNECTORS = [
  { id: "autotrader", ab: "AT", name: "AutoTrader", sub: "Saved cars & searches" },
  { id: "cargurus", ab: "CG", name: "CarGurus", sub: "Saved cars & price history" },
  { id: "carscom", ab: "CC", name: "Cars.com", sub: "Saved cars" },
  { id: "carvana", ab: "CV", name: "Carvana", sub: "Watchlist" },
  { id: "fbmarket", ab: "FB", name: "FB Marketplace", sub: "Via the share sheet" },
];

/* What each connection brings in on first sync. */
export const IMPORTS = {
  autotrader: [
    { year: 2023, make: "Honda", model: "CR-V", trim: "EX-L", price: 31987, miles: 28400, bodyType: "SUV", dealer: "Sugar Land Honda", days: 47 },
    { year: 2022, make: "Toyota", model: "RAV4", trim: "XLE", price: 27995, miles: 24000, bodyType: "SUV", dealer: "Katy Toyota", days: 18 },
  ],
  cargurus: [
    { year: 2021, make: "Mazda", model: "CX-5", trim: "Touring", price: 23450, miles: 31000, bodyType: "SUV", dealer: "Sugar Land Mazda", days: 62, drop: "-$750 this week" },
    { year: 2022, make: "Kia", model: "Telluride", trim: "LX", price: 33900, miles: 36000, bodyType: "SUV", dealer: "Houston Kia", days: 12 },
  ],
  carscom: [
    { year: 2020, make: "Toyota", model: "Highlander", trim: "LE", price: 29900, miles: 58000, bodyType: "SUV", dealer: "Pasadena Toyota", days: 33 },
  ],
  carvana: [
    { year: 2021, make: "Honda", model: "Odyssey", trim: "EX", price: 32400, miles: 41000, bodyType: "Minivan", dealer: "Carvana", days: 71 },
  ],
  fbmarket: [
    { year: 2019, make: "Toyota", model: "Camry", trim: "LE", price: 18400, miles: 62000, bodyType: "Sedan", dealer: "Private seller", days: 44 },
  ],
};

export function connectorName(id) {
  return (CONNECTORS.find((c) => c.id === id) || {}).name || id;
}
