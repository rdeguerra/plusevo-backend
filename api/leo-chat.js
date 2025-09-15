// api/leo-chat.js — Versión estable con fallback de modelos (sin file_search)
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

    // Modelos compatibles (orden de preferencia)
    const CANDIDATE_MODELS = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"];

    let lastErr = null;
    for (const model of CANDIDATE_MODELS) {
      try {
        const r = await client.responses.create({
          model,
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

        return res.status(200).json({ answer, model_used: model });
      } catch (err) {
        // Si es "model does not exist" o similar, probamos el siguiente
        const msg = String(err?.message || err);
        const notExist = /model\b.*(does not exist|unknown|unsupported)/i.test(msg);
        const badParam = /Unknown parameter|Unsupported parameter/i.test(msg);
        if (notExist || badParam) {
          lastErr = msg;
          continue;
        }
        // Si es otro error (red, auth, etc.), rompemos
        return res.status(500).json({ error: "OpenAI fallo", message: msg });
      }
    }

    // Si ninguno funcionó:
    return res.status(500).json({
      error: "OpenAI fallo",
      message: lastErr || "No hay modelos compatibles disponibles en esta cuenta/entorno."
    });

  } catch (err) {
    return res.status(500).json({
      error: "Error interno en /api/leo-chat",
      message: String(err?.message || err),
      stack: err?.stack || null,
    });
  }
}
