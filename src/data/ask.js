/* Ask: a question box that knows where you are in the deal.

   Pure helpers, shared by the sheet (components/AskSheet.jsx) and the
   server (server/ask.mjs), so what the model sees is testable and
   reviewable in one place.

   Privacy rules, enforced here rather than trusted to the UI:
   - Context is numbers and car names only. No name, email, phone, VIN,
     dealer name, exact location or anything typed into a free-text field
     beyond the car's own title.
   - The buyer sees exactly what's shared (contextLines) before they send.
   - Nothing here is stored server-side or sent to analytics. */

export const ASK_LIMITS = {
  question: 600,      // characters per question
  turns: 8,           // prior messages sent back for follow-ups
  answer: 2000,       // characters kept per prior answer
  perDay: 40,         // questions per device per day, client-side
};

const money = (n) => (Number(n) > 0 ? "$" + Math.round(Number(n)).toLocaleString("en-US") : null);
const clean = (s, max = 80) => String(s || "").replace(/[\r\n\t]+/g, " ").replace(/[<>{}]/g, "").trim().slice(0, max);

/* Everything the model gets to know about this buyer's situation. */
export function buildAskContext({ screen, setup = {}, session = null, deal = null, car = null, garageCount = 0, hasPass = false } = {}) {
  const ctx = { screen: clean(screen, 24) || "start", hasPass: Boolean(hasPass) };

  /* State only, never the ZIP itself: tax and fee rules are statewide. */
  const zip = String(setup.zip || "");
  if (/^7[5-9]\d{3}$|^88[5-9]\d{2}$/.test(zip)) ctx.state = "TX";
  /* Only a rate the buyer entered. The app's 7.2% default is a
     placeholder, and calling it "your pre-approval" would be made up. */
  if (setup.aprSet && Number(setup.apr) > 0) {
    ctx.preApprovalApr = Number(setup.apr);
    if (Number(setup.term) > 0) ctx.preferredTerm = Number(setup.term);
  }
  if (Number(setup.tradeValue) > 0) ctx.tradeValue = Number(setup.tradeValue);
  if (Number(setup.tradePayoff) > 0) ctx.tradePayoff = Number(setup.tradePayoff);
  if (garageCount > 0) ctx.carsSaved = garageCount;

  if (session?.car) {
    const rounds = (session.rounds || []).filter((r) => Number(r.amount) > 0).slice(-6);
    ctx.dealerSession = {
      car: clean(session.car.title),
      miles: Number(session.car.miles) || null,
      fairPrice: Number(session.fair) || null,
      theirNumbers: rounds.map((r) => Number(r.amount)),
      minutesIn: session.startedAt ? Math.max(0, Math.round((Date.now() - session.startedAt) / 60000)) : null,
    };
  }

  if (deal) {
    ctx.quote = {
      car: clean(deal.vehicle),
      price: Number(deal.asking) || null,
      junkAddOns: Number(deal.junkTotal) || 0,
      taxOvercharge: Number(deal.taxError) > 25 ? Number(deal.taxError) : 0,
      apr: Number(deal.apr) || null,
      term: Number(deal.term) || null,
      tradeOffer: Number(deal.trade?.offer) || null,
      tradePayoff: Number(deal.trade?.payoff) || null,
      flagged: (deal.linesFlag || []).slice(0, 6).map((l) => clean(l.name, 48)),
    };
  }

  if (car && !session?.car) {
    ctx.lookingAt = {
      car: clean([car.year, car.make, car.model, car.trim].filter(Boolean).join(" ")),
      price: Number(car.price) || null,
      miles: Number(car.miles) || null,
    };
  }
  return ctx;
}

/* The plain-English list the buyer sees under "Ask uses". */
export function contextLines(ctx = {}) {
  const out = [];
  const s = ctx.dealerSession;
  if (s) {
    const latest = s.theirNumbers?.at(-1);
    out.push([s.car, latest ? `their latest ${money(latest)}` : null, s.fairPrice ? `fair ${money(s.fairPrice)}` : null].filter(Boolean).join(", "));
  }
  if (ctx.quote) {
    const q = ctx.quote;
    out.push(["Your quote" + (q.car ? ` for ${q.car}` : ""), q.price ? money(q.price) : null, q.junkAddOns ? `${money(q.junkAddOns)} in add-ons flagged` : null].filter(Boolean).join(", "));
  }
  if (ctx.lookingAt) out.push([ctx.lookingAt.car, money(ctx.lookingAt.price)].filter(Boolean).join(", "));
  if (ctx.preApprovalApr) out.push(`Your pre-approval rate, ${ctx.preApprovalApr}%`);
  if (ctx.tradeValue || ctx.tradePayoff) out.push("Your trade-in numbers");
  return out;
}

/* Starter questions, by where the buyer is. The first one should be the
   thing someone in that spot most often wonders. */
export function starters(ctx = {}) {
  if (ctx.dealerSession) {
    const s = ctx.dealerSession;
    const over = s.fairPrice && s.theirNumbers?.length && s.theirNumbers.at(-1) > s.fairPrice;
    return [
      over ? "They won't come down. What now?" : "Is this a good number?",
      "They're asking what payment I want. What do I say?",
      "When should I walk away?",
    ];
  }
  if (ctx.quote) {
    return [
      "Which of these add-ons can I refuse?",
      "Is this interest rate high?",
      ctx.quote.tradeOffer ? "Is my trade offer fair?" : "What's a doc fee?",
    ];
  }
  if (ctx.lookingAt) {
    return [`What should I check before I buy this ${ctx.lookingAt.car.split(" ").slice(1, 3).join(" ") || "car"}?`, "How much under asking can I offer?", "Is the mileage a problem?"];
  }
  if (ctx.screen === "tools") return ["How much car can I afford?", "Should I get pre-approved first?", "Is a 72-month loan a bad idea?"];
  return ["How do I know a fair price?", "What fees are normal?", "Should I tell them I have a trade-in?"];
}

/* Higher stakes, better model. Live at the dealer or asking about a
   quote goes to the deeper model; general questions go to the fast one. */
export function pickTier(ctx = {}, question = "") {
  if (ctx.dealerSession || ctx.quote) return "deep";
  if (String(question).length > 280) return "deep";
  return "fast";
}

/* What the server sends as the system prompt. */
export function systemPrompt(ctx = {}) {
  const words = ctx.hasPass
    ? "This buyer has the Deal Pass, so give exact words to say when it helps, in quotes, short enough to read off a phone."
    : "This buyer doesn't have the Deal Pass. Explain what to do and why, and give the gist of what to say in your own sentence, but don't write a word-for-word script. When a script would help, end with one short line: \"The Deal Pass has the exact words for this.\" Never hold back a fact, a number or whether to walk away.";
  return [
    "You are Ask, inside DriverSide, a car-buying app whose promise is to be the only one at the table on the buyer's side. DriverSide never sells data to dealers and takes no money from them.",
    "Answer like a sharp friend who knows the car business: plain words, short sentences, no jargon without a one-line explanation. Lead with the answer. Two to five short paragraphs or a few bullets at most; the buyer may be standing in a showroom.",
    "Use the buyer's own numbers below when they matter, and do the arithmetic for them. Never make up a price, rate, fee, incentive or listing. If you'd need a number you weren't given, say which one and where to find it.",
    "Be on the buyer's side without being reckless: say plainly when a number is high or a charge is optional. You are not a lawyer or a licensed financial advisor; for contracts and loans give the facts and what to ask, not a guarantee.",
    "Don't recommend specific dealers, lenders or brands of add-on, and don't ask for personal details like name, phone, address or SSN. If asked about something unrelated to buying, owning or financing a car, say briefly that you only help with cars.",
    words,
    "Write plain text. No headings, no tables, no emoji. Use dollar amounts like $1,250.",
    "The buyer's situation, as JSON (use it, don't recite it):\n" + JSON.stringify(ctx),
  ].join("\n\n");
}

/* Trim the conversation to what the server accepts. */
export function trimHistory(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-ASK_LIMITS.turns)
    .map((m) => ({ role: m.role, content: m.content.slice(0, m.role === "user" ? ASK_LIMITS.question : ASK_LIMITS.answer) }));
}

/* Client-side daily cap, so a stuck finger can't run up a bill. */
export function underDailyCap(log = [], now = Date.now()) {
  const day = 24 * 3600 * 1000;
  return log.filter((t) => now - t < day).length < ASK_LIMITS.perDay;
}
