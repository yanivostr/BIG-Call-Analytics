import fs from "fs";
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log("✅ Handler started"); // Debug: התחלת קריאה

  if (req.method !== "POST") {
    console.log("❌ Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("❌ OPENAI_API_KEY not configured");
    return res.status(500).json({ error: "OpenAI API key not configured" });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    console.log("✅ Received buffer:", buffer.length, "bytes"); // Debug: אורך הקובץ

    const formData = new FormData();
    formData.append("file", buffer, { filename: "audio.mp3" });
    formData.append("model", "gpt-4o-transcribe"); // חובה!

    console.log("✅ Sending request to OpenAI...");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      duplex: "half", // חובה ב-Node/Vercel
    });

    console.log("✅ Response status:", response.status);

    const text = await response.text();
    console.log("✅ Response text:", text);

    if (!response.ok) return res.status(response.status).json({ error: text });

    res.status(200).send(text);

  } catch (err) {
    console.error("❌ Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
