export const config = { runtime: "nodejs" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const setCors = (res) => { Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v)); };

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  setCors(res);
  if (req.method === "GET") return res.status(200).json({ ok: true, hint: "Usa POST con { question }" });
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  let body = {};
  try { body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); } catch {}
  return res.status(200).json({ ok: true, echo: body?.question ?? null });
}
