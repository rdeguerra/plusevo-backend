// api/leo-chat.js — Versión final con Vector Store (tool_resources OK)
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

    const API_KEY = process.env.OPENAI_API_KEY;
    const VSTORE = process.env.OPENAI_VECTOR_STORE_ID; // vs_68c873b973e08191be0e69d0410a5eb8
    if (!API_KEY) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });
    if (!VSTORE) return res.status(500).json({ error: "Falta OPENAI_VECTOR_STORE_ID" });

    // Body seguro
    let body = {};
    try { body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); } catch {}
    const question = body?.question;
    if (!question) return res.status(400).json({ error: "Envía { question: string }" });

    // SDK on-demand
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: API_KEY });

    // Responses API + file_search con tool_resources (no tool_config)
    const r = await client.responses.create({
      model: "gpt-5.1",
      instructions:
        "Eres LEO, asistente de PLUSEVO. Responde SOLO con información encontrada en los documentos del Vector Store. " +
        "Si la respuesta no está en esos documentos, di: 'No tengo ese dato en los documentos de PLUSEVO'.",
      input: question,
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [VSTORE],
        },
      },
    });

    const answer =
      (typeof r.output_text === "string" && r.output_text.trim()) ||
      (Array.isArray(r.output)
        ? r.output.map(p => (p?.content||[]).map(c => c?.text?.value||"").join("\n")).join("\n").trim()
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
