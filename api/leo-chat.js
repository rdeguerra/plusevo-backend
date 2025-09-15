// api/leo-chat.js
export default async function handler(req, res) {
  // CORS simple para probar desde navegador / curl
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")  return res.status(405).json({ error: "Only POST" });

  try {
    const { question, model = "gpt-5-mini" } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Falta 'question' (string)" });
    }

    const system = `
Eres Plusevo IA. Responde SOLO con la información de los archivos del proyecto PLUSEVO.
Si no está en los archivos, dilo amablemente y sugiere subir el documento. Español claro y preciso.
    `.trim();

    // Llamada a Responses API (sin tools para evitar errores)
    const payload = {
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
      // Si luego quieres usar vector store, lo activamos con "tools": [{"type":"file_search"}]
      // y adjuntamos correctamente; por ahora lo dejamos simple para garantizar respuesta.
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    // Si OpenAI respondió con error, lo propagamos para verlo claro
    if (!r.ok) {
      return res.status(500).json({ error: "OpenAI error", detail: data });
    }

    // Paths posibles en Responses API:
    // - data.output_text  (string de conveniencia)
    // - data.output[0].content[0].text  (estructura detallada)
    const answer =
      data.output_text
      ?? (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text)
      ?? "";

    // Si por algún motivo viene vacío, devolvemos el objeto completo para depurar
    if (!answer) {
      return res.status(200).json({ answer: "", raw: data });
    }

    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: err?.message || String(err) });
  }
}
