// api/leo-chat.js
// Serverless Function para Vercel (no requiere Next.js).
// - CORS abierto para Shopify
// - GET: responde ping para probar
// - POST: pregunta -> OpenAI Responses + file_search (Vector Store)

export const config = { runtime: "nodejs" };

import OpenAI from "openai";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function setCors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    setCors(res);
    res.status(204).end();
    return;
  }

  try {
    setCors(res);

    // Ping sencillo para probar en el navegador
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        message: "PLUSEVO backend OK. Usa POST con { question }.",
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const API_KEY = process.env.OPENAI_API_KEY;
    const VSTORE = process.env.OPENAI_VECTOR_STORE_ID;

    if (!API_KEY) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY" });
    }
    if (!VSTORE) {
      return res.status(500).json({ error: "Falta OPENAI_VECTOR_STORE_ID" });
    }

    // Lee el body (Shopify/tu widget envía { question })
    let body = {};
    try {
      // Vercel parsea JSON si viene correcto; si no, intentamos nosotros
      body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    } catch {
      body = {};
    }
    const question = (body && body.question) || "";

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Envía { question: string } en el body" });
    }

    const openai = new OpenAI({ apiKey: API_KEY });

    // ----- OpenAI Responses + file_search -----
    const resp = await openai.responses.create({
      model: "gpt-5.1",         // puedes usar "gpt-5.1-mini" para menor costo
      temperature: 0.2,
      system:
        "Eres LEO, el asistente oficial de PLUSEVO. " +
        "Responde con precisión y en tono profesional. " +
        "Prioriza SIEMPRE la información contenida en los documentos del vector store. " +
        "Si la respuesta no está en esos documentos, di literalmente: 'No tengo ese dato en los documentos de PLUSEVO'.",
      input: question,
      tools: [{ type: "file_search" }],
      tool_config: {
        file_search: {
          vector_store_ids: [VSTORE],
          max_num_results: 8,
        },
      },
      reasoning: { effort: "medium" },
    });

    // Texto final cómodo
    const answer =
      resp.output_text?.trim?.() ||
      (Array.isArray(resp.output)
        ? resp.output
            .map((p) => (p?.content || []).map((c) => c?.text?.value || "").join("\n"))
            .join("\n")
            .trim()
        : "");

    // Respuesta al widget
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("leo-chat error:", err);
    return res.status(500).json({
      error: "Error interno en /api/leo-chat",
      message: String(err?.message || err),
      stack: err?.stack || null,
    });
  }
}
