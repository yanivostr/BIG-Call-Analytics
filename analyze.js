export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' });
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Missing transcript' });
    const prompt = `אתה מומחה לניתוח שיחות מכירה בעברית. נתח את שיחת המכירה הבאה ותחזיר JSON בלבד (ללא markdown, ללא backticks).
שיחת המכירה:
"""
${transcript}
"""
החזר JSON בדיוק בפורמט הזה:
{
  "overall_score": <מספר 0-100>,
  "score_label": <"מכירה מצוינת" / "מכירה טובה" / "מכירה בינונית" / "מכירה חלשה">,
  "verdict": <משפט אחד קצר על השיחה>,
  "sub_scores": { "opening": <0-10>, "needs_finding": <0-10>, "solution_presentation": <0-10>, "closing": <0-10> },
  "pros": [<3-5 נקודות חיוביות>],
  "cons": [<3-5 נקודות לשיפור>],
  "key_moments": [{"type": "positive" או "negative", "label": "<שם>", "description": "<תיאור>"}],
  "tips": [{"title": "<כותרת>", "body": "<הסבר>"}]
}`;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) { const err = await response.json().catch(()=>({})); return res.status(response.status).json({ error: err?.error?.message || 'Claude API error' }); }
    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    res.status(200).json(JSON.parse(clean));
  } catch (err) { res.status(500).json({ error: err.message }); }
}
