export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  res.status(200).json({ ok: true, note: "Funciona el runtime y CORS no afectan." });
}
