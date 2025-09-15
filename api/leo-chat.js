// api/leo-chat.js — Chat Completions + file_search (Vector Store)
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
    const VSTORE = process.env.OPENAI_VECTOR_STORE_ID; // vs_68c873b973e08191be0e69d0410a5eb8
    if (!API_KEY) return res.status(500).json({ error: "Falta OPENAI_API_KEY" });
    if (!VSTORE) return res.status(500).json({ error: "Falta OPENAI_VECTOR_STORE_ID" });

    // Parse body seguro
    let body = {};
    try { body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); } catch { body = {}; }
    const question = body?.question;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Envía { question: string }" });
    }

    // SDK on-demand
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: API_KEY });

    // Chat Completions con file_search
    const chat = await openai.chat.completions.create({
      // Usa un modelo de chat que soporte tools (p. ej. gpt-4.1 o gpt-4o-mini)
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "Eres LEO, asistente oficial de PLUSEVO. Responde SOLO con información encontrada en los documentos del Vector Store. " +
            "Si la respuesta no está en esos documentos, di textualmente: 'No tengo ese dato en los documentos de PLUSEVO'. " +
            "Sé conciso y profesional.",
        },
        { role: "user", content: question },
      ],
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [VSTORE],
        },
      },
    });

    const answer = chat.choices?.[0]?.message?.content || "";
    return res.status(200).json({ answer: (answer || "").trim() });
  } catch (err) {
    return res.status(500).json({
      error: "Error interno en /api/leo-chat",
      message: String(err?.message || err),
      stack: err?.stack || null,
    });
  }
}
