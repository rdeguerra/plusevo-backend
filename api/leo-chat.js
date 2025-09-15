// /app/api/leo-chat/route.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req) {
  try {
    const { question } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Falta OPENAI_API_KEY en variables de entorno." }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    if (!process.env.OPENAI_VECTOR_STORE_ID) {
      return new Response(
        JSON.stringify({ error: "Falta OPENAI_VECTOR_STORE_ID en variables de entorno." }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Envía { question: string } en el body." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // --- RESPONSES API + FILE SEARCH (vector store) ---
    const resp = await openai.responses.create({
      model: "gpt-5.1", // puedes cambiar a gpt-5.1-mini si prefieres menor costo
      system:
        "Eres LEO, el asistente oficial de PLUSEVO. Responde con precisión, tono profesional y directo. " +
        "Prioriza SIEMPRE contenido de los documentos del vector store. Si algo no está en los archivos, " +
        "declara: 'No tengo ese dato en los documentos de PLUSEVO'. Si hay dudas, pide precisión.",
      input: [
        {
          role: "user",
          content: question,
        },
      ],
      // Habilita búsqueda en tu Vector Store
      tools: [{ type: "file_search" }],
      tool_config: {
        file_search: {
          vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID],
          // opcionales:
          max_num_results: 8,
        },
      },
      // Opcional: controla la verbosidad/estilo
      reasoning: { effort: "medium" },
      temperature: 0.2,
    });

    // Texto final cómodo (el SDK expone output_text ya procesado)
    const answer =
      resp.output_text?.trim?.() ||
      (Array.isArray(resp.output) ? resp.output.map(p => p.content?.[0]?.text?.value || "").join("\n").trim() : "");

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("leo-chat error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno", detail: String(err?.message || err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}
