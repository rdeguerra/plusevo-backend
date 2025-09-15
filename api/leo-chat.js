// api/leo-chat.js
// Vercel Serverless - conectado a tu Proyecto PLUSEVO con file_search
export default async function handler(req, res) {
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

    const system = `
      Eres Plusevo IA. Responde SOLO con la información de los archivos del proyecto PLUSEVO.
      Si no está en los archivos, dilo amablemente y sugiere subir el documento. Español claro y preciso.
    `;

    const payload = {
      model: "gpt-4.1-mini", // puedes subir a gpt-4.1 si quieres más potencia
      temperature: 0.2,
      input: [
        { role: "system", content: system },
        { role: "user", content: question }
      ],
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Project": process.env.OPENAI_PROJECT_ID,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: "OpenAI error", detail: data });
    }

    return res.status(200).json({ answer: data.output_text });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
