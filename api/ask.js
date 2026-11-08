/* Vercel serverless: /api/ask. GET says whether Ask is on; POST answers
   one question. Logic lives in server/ask.mjs (parity with server/index.mjs). */

import { answerQuestion, askStatus } from "../server/ask.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.json(askStatus());
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "";
  const out = await answerQuestion({ body: req.body || {}, ip });
  res.status(out.status).json(out.json);
}
