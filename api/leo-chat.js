// api/leo-chat.js
export default async function handler(req, res) {
  // Permitir CORS si lo vas a probar desde navegador
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST" });

  try {
    const { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Falta 'question' (string)" });
    }

    const system =
      "Eres Plusevo IA. Responde SOLO con la información de los archivos del proyecto PLUSEVO. Si no está en los archivos, dilo amablemente. Español claro y preciso.";

    const payload = {
      model: "gpt-5.1-mini", // puedes usar gpt-5.1 si quieres más potencia
      input: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
      tools: [{ type: "file_search" }],
    };

    // Vincular Vector Store si existe
    if (process.env.OPENAI_VECTOR_STORE_ID) {
      payload.tool_resources = {
        file_search: {
          vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID],
        },
      };
    }

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2", // 👈 CLAVE
        ...(process.env.OPENAI_PROJECT_ID
          ? { "OpenAI-Project": process.env.OPENAI_PROJECT_ID }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: "OpenAI error", detail: txt });
    }

    const data = await r.json();
    const answer =
      data?.output_text ??
      data?.choices?.[0]?.message?.content?.[0]?.text ??
      "";

    return res.status(200).json({ output_text: answer, raw: data });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
