// api/leo-chat.js
// Vercel Serverless — conectado a tu Proyecto PLUSEVO con file_search
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST" });

  try {
    const { question, model = "gpt-5-mini" } = req.body || {};
    if (!question) return res.status(400).json({ error: "Missing question" });

    const system = `
Eres Plusevo IA. Responde EXCLUSIVAMENTE con información encontrada en los archivos del proyecto PLUSEVO.
Si no hay suficiente evidencia, dilo amablemente y sugiere subir el documento. No inventes datos. Español claro.
`;

    const payload = {
      model,
      temperature: 0.2,
      tools: [{ type: "file_search" }],
      input: [
        { role: "system", content: system },
        { role: "user", content: question }
      ]
    };

    // Si defines OPENAI_VECTOR_STORE_ID, fuerzas ese repositorio concreto
    if (process.env.OPENAI_VECTOR_STORE_ID) {
      payload.tool_resources = {
        file_search: { vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID] }
      };
    }

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: "OpenAI error", detail: t });
    }
    const data = await r.json();

    return res.status(200).json({
      output_text: data.output_text || data.choices?.[0]?.message?.content || "",
      raw: data
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: String(err?.message || err) });
  }
}
