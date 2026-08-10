/* Onboarding questions (tightened redesign copy, with purpose cues) and
   the 7 goal archetypes. Routing unchanged — see docs/archetypes.md. */

export const QUESTIONS = [
  { id: "why", label: "Q1 · MOTIVATION", q: "What's putting you in the market?", cue: "Five taps. That's the whole thing.", opts: [["died", "My car died (or is dying)"], ["family", "My family changed"], ["costs", "I need to cut costs"], ["nicer", "I'm ready for something nicer"], ["work", "I need it for work"], ["love", "I just love cars"]] },
  { id: "current", label: "Q2 · YOUR CURRENT CAR", q: "What happens to your current car?", cue: "This one changes the math the most.", opts: [["trade-under", "Trade it — I owe more than it's worth"], ["trade-ok", "Trade or sell — loan's basically paid"], ["keep", "Keeping it"], ["none", "I don't have one"]] },
  { id: "money", label: "Q3 · MONEY", q: "How do you think about the money?", cue: "No wrong answers — this sets what we optimize.", opts: [["tco", "Lowest total cost, all-in"], ["monthly", "A monthly number I can handle"], ["max", "I know my budget — maximize it"], ["right", "Getting it right matters more than cost"]] },
  { id: "exp", label: "Q4 · EXPERIENCE", q: "Have you bought a car before?", cue: "So we know how much to explain — never less than everything.", opts: [["first", "First time"], ["few", "A few times"], ["many", "Many times"]] },
  { id: "rank", label: "Q5 · TIEBREAKER", q: "One thing matters most:", cue: "Last one — this breaks the ties.", opts: [["cost", "Cost"], ["reliability", "Reliability"], ["safety", "Safety"], ["capability", "Capability"], ["feel", "The way it makes me feel"]] },
];

export const ARCHETYPES = {
  firstride: { name: "First Ride", tag: "Reliable, affordable, no traps", desc: "First purchase. We optimize for true cost of ownership — payment, insurance, gas, maintenance — and coach every step like it's your first time, because it is.", opts: ["All-in monthly cost", "Insurance in every comparison", "Reliability data", "Credit-building guidance"] },
  hauler: { name: "Family Hauler", tag: "Safe, sized for the 5-year plan", desc: "The family outgrew the car. We weight safety heavily, filter by real cargo and seat needs, and cost everything on a 5-year horizon so you don't do this again in two.", opts: ["Safety ratings first", "Seat & cargo fit", "5-year cost horizon", "Resale value"] },
  commuter: { name: "Commuter Math", tag: "Lowest cost per mile", desc: "You drive real miles and want the spreadsheet answer. We run fuel and charging math at your actual commute and show the hybrid/EV breakeven honestly.", opts: ["Cost per mile", "Fuel vs hybrid vs EV", "Depreciation curves", "Total interest, not payment"] },
  worktruck: { name: "Work Truck", tag: "Meets the spec, holds value", desc: "The vehicle is a tool. Payload and towing are gates, not preferences. We find what does the job at the lowest cost and flag tax treatment worth asking your CPA about.", opts: ["Capability as hard filters", "Durability records", "Resale value", "Section 179 notes"] },
  upgrade: { name: "The Upgrade", tag: "The nicer car, without the trap", desc: "You earned it. We help you get 90% of the car at 70% of the cost — lease vs buy math, total interest on long terms, and guardrails against the 84-month mistake.", opts: ["Lease vs buy math", "Total interest visibility", "Sweet-spot trims", "Payment guardrails"] },
  freshstart: { name: "Fresh Start", tag: "The least-bad path out", desc: "You're underwater or the payment doesn't work anymore. Sometimes the right answer is don't buy yet — and we're the only tool that will tell you that.", opts: ["Negative equity calc first", "Payoff vs value tracking", "Refinance check", "“Wait” as a real answer"] },
  enthusiast: { name: "The Enthusiast", tag: "Find the spec. Pay fair.", desc: "You know exactly what you want, down to the trim. We watch every marketplace for your spec, track days-on-lot for leverage, and price hot models against real data.", opts: ["Cross-site VIN alerts", "Days-on-lot leverage", "Market pricing on rare specs", "Spec-level saved search"] },
};

/* Underwater trade or cutting costs route to Fresh Start before anything. */
export function scoreArchetype(a) {
  if (a.current === "trade-under" || a.why === "costs") return "freshstart";
  if (a.exp === "first") return "firstride";
  if (a.why === "family" || a.rank === "safety") return "hauler";
  if (a.why === "work" || a.rank === "capability") return "worktruck";
  if (a.why === "love" || a.rank === "feel") return "enthusiast";
  if (a.why === "nicer") return "upgrade";
  return "commuter";
}
