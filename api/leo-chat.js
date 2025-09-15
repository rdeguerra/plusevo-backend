// api/leo-chat.js — Versión estable SIN file_search NI attachments
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

    if (req.method === "GET") {
      return res.status(200).json({ ok: true, hint: "Usa POST con { question }" });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });

    // Body seguro
    let body = {};
    try { body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); } catch { body = {}; }
    const question = body?.question;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Envía { question: string }" });
    }

    // SDK on-demand
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: API_KEY });

    // IMPORTANTE: SIN tools, SIN tool_resources, SIN attachments
    const r = await client.responses.create({
      model: "gpt-5.1-mini",
      instructions:
        "Eres LEO, asistente de PLUSEVO. Responde claro, breve y profesional. " +
        "Si piden datos internos, aclara: 'Por ahora no tengo acceso a los documentos de PLUSEVO en este entorno.'",
      input: question
    });

    const answer =
      (typeof r.output_text === "string" && r.output_text.trim()) ||
      (Array.isArray(r.output)
        ? r.output.map(p => (p?.content || []).map(c => c?.text?.value || "").join("\n")).join("\n").trim()
        : "");

    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({
      error: "Error interno en /api/leo-chat",
      message: String(err?.message || err),
      stack: err?.stack || null,
    });
  }
}
