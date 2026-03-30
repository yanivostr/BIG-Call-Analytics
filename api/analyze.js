export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Anthropic API key not configured" });

  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: "Missing transcript" });

    const prompt = `אתה מומחה לניתוח שיחות מכירה בעברית. נתח את השיחה הזו והחזר JSON בלבד:
"""
${transcript}
"""`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    console.log("📝 Claude raw response:", data);

    const text = data?.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();

    if (!clean) {
      return res.status(500).json({ error: "Claude returned empty response" });
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      console.error("❌ JSON parse error:", err, "Text:", clean);
      return res.status(500).json({ error: "Failed to parse Claude response as JSON" });
    }

    // בדיקה אם sub_scores קיים
    if (!parsed.sub_scores) {
      console.error("❌ sub_scores missing in parsed JSON:", parsed);
      return res.status(500).json({ error: "sub_scores missing in Claude response" });
    }

    res.status(200).json(parsed);

  } catch (err) {
    console.error("❌ Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
