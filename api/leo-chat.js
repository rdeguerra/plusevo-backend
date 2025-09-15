// api/leo-chat.js — OpenAI mínimo (sin vector)
export const config = { runtime: "nodejs" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const setCors = (res) => { Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v)); };

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);
    if (req.method === "GET") return res.status(200).json({ ok: true, hint: "Usa POST con { question }" });
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });

    let body = {};
    try { body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); } catch {}
    const question = body?.question;
    if (!question) return res.status(400).json({ error: "Envía { question: string }" });

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const r = await client.responses.create({
      model: "gpt-5.1-mini",
      temperature: 0.2,
      instructions: "Responde breve y claro.",
      input: question
    });

    const answer =
      (typeof r.output_text === "string" && r.output_text.trim()) ||
      (Array.isArray(r.output)
        ? r.output.map(p => (p?.content||[]).map(c => c?.text?.value||"").join("\n")).join("\n").trim()
        : "");

    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({ error: "OpenAI fallo", message: String(err?.message || err) });
  }
}
