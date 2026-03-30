import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OpenAI API key not configured" });
  }

  try {
    // קורא את ה-body של הקובץ
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // מכין FormData עם הקובץ והמודל
    const formData = new FormData();
    formData.append("file", buffer, { filename: "audio.mp3" });
    formData.append("model", "gpt-4o-transcribe"); // חובה! 

    // שולח ל-OpenAI עם headers נכונים
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const text = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: text });

    res.status(200).send(text);

  } catch (err) {
    console.error("❌ Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
