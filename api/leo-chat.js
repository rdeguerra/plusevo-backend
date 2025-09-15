// api/leo-chat.js
export default async function handler(req, res) {
  // Permitir CORS simple
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
    `.trim();

    // Llamada al endpoint de OpenAI
    const payload = {
      model: "gpt-5-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: question }
      ]
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Project": process.env.OPENAI_PROJECT_ID
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    // Agarrar texto de salida
    let answer = "";
    if (data?.output && Array.isArray(data.output)) {
      const msg = data.output.find(o => o.type === "message");
      if (msg?.content?.[0]?.text) answer = msg.content[0].text;
    }

    // Si no hay texto, devolver raw para debug
    if (!answer) {
      return res.status(200).json({ answer: "", raw: data });
    }

    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
