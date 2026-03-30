export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Anthropic API key not configured" });

  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: "Missing transcript" });

    // Prompt חזק שמכריח את המודל להחזיר JSON מלא
    const prompt = `אתה מומחה לניתוח שיחות מכירה בעברית.
נתח את השיחה הזו והחזר JSON **מלא** בלבד (ללא Markdown, ללא backticks), בדיוק במבנה הזה:

{
  "overall_score": <מספר 0-100>,
  "score_label": <"מכירה מצוינת" / "מכירה טובה" / "מכירה בינונית" / "מכירה חלשה">,
  "verdict": "<משפט אחד קצר>",
  "sub_scores": {
    "opening": <0-10>,
    "needs_finding": <0-10>,
    "solution_presentation": <0-10>,
    "closing": <0-10>
  },
  "pros": [<3-5 נקודות חיוביות, כל אחת משפט קצר>],
  "cons": [<3-5 נקודות לשיפור, כל אחת משפט קצר>],
  "key_moments": [
    {"type": "positive" או "negative", "label": "<שם הרגע>", "description": "<תיאור קצר>"}
  ],
  "tips": [
    {"title": "<כותרת>", "body": "<הסבר לשיפור>"}
  ]
}

שיחת המכירה:
"""
${transcript}
"""`;

    // שולח ל-Claude
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

    if (!clean) return res.status(500).json({ error: "Claude returned empty response" });

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      console.error("❌ JSON parse error:", err, "Text:", clean);
      return res.status(500).json({ error: "Failed to parse Claude response as JSON" });
    }

    // Fallback כדי למנוע קריסה אם sub_scores חסר
    parsed.sub_scores = parsed.sub_scores || {
      opening: 0,
      needs_finding: 0,
      solution_presentation: 0,
      closing: 0,
    };

    // Fallback נוסף לדברים נוספים אם רוצים
    parsed.pros = parsed.pros || [];
    parsed.cons = parsed.cons || [];
    parsed.key_moments = parsed.key_moments || [];
    parsed.tips = parsed.tips || [];

    res.status(200).json(parsed);

  } catch (err) {
    console.error("❌ Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
