/* Marketplace "connections" are gone. None of these sites expose a
   buyer's saved cars, so the old Connect buttons imported sample cars,
   which a trust-first product can't do. The real path is Add a car from
   any site (src/data/vin.js, components/AddFromLink.jsx).

   What's left here is cleanup: devices that pressed Connect before still
   have those sample cars in their Garage. dropDemoImports removes exactly
   those, matched on both id and source, and nothing a buyer added. */

const DEMO_IMPORTS = [
  ["AUTOTRADER", 2023, "Honda", "CR-V", 31987],
  ["AUTOTRADER", 2022, "Toyota", "RAV4", 27995],
  ["CARGURUS", 2021, "Mazda", "CX-5", 23450],
  ["CARGURUS", 2022, "Kia", "Telluride", 33900],
  ["CARS.COM", 2020, "Toyota", "Highlander", 29900],
  ["CARVANA", 2021, "Honda", "Odyssey", 32400],
  ["FB MARKETPLACE", 2019, "Toyota", "Camry", 18400],
];
const DEMO_KEYS = new Set(DEMO_IMPORTS.map(([src, y, mk, md, p]) => `${src}|${y}-${mk}-${md}-${p}`));

export function isDemoImport(car) {
  return Boolean(car) && DEMO_KEYS.has(`${car.src}|${car.id}`);
}

export function dropDemoImports(cars = []) {
  return (Array.isArray(cars) ? cars : []).filter((c) => !isDemoImport(c));
}
