import fs from "fs";
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  try {
    // שמירת הקובץ זמנית אם נשלח כ-stream
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const formData = new FormData();
    formData.append("file", buffer, { filename: "audio.mp3" });
    formData.append("model", "gpt-4o-transcribe"); // ⚡️ חובה!

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
      duplex: "half", // ⚡️ חובה ב-Node/Vercel
    });

    const text = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: text });
    res.status(200).send(text);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
