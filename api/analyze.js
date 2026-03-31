export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' });

  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Missing transcript' });

    const prompt = `אתה מאמן מכירות מנוסה עם 20 שנה ניסיון. תפקידך לנתח שיחת מכירה בעברית ולתת פידבק פרקטי וכירורגי – לא כללי.

חשוב: לפני הכל, זהה את סוג השיחה (חידוש פוליסה, מכירה ראשונה, שיחת המשך, גביית חוב, שירות לקוחות וכו') ונתח אותה לפי המטרה האמיתית שלה בלבד.

שיחת המכירה:
"""
${transcript}
"""

החזר JSON בלבד (ללא markdown, ללא backticks), בדיוק בפורמט הזה:

{
  "call_type": "<סוג השיחה שזיהית>",
  "call_goal": "<המטרה האמיתית של השיחה>",
  "outcome": "closed" | "lost" | "follow_up" | "unclear",
  "overall_score": <0-100, מבוסס על הצלחת המטרה הספציפית של השיחה>,
  "score_label": "<מכירה מצוינת / טובה / בינונית / חלשה>",
  "verdict": "<משפט אחד חד – מה קרה בשיחה הזו>",

  "phase_scores": [
    {
      "phase": "<שם השלב בשיחה, לדוגמה: פתיחה, זיהוי צורך, הצגת פתרון, טיפול בהתנגדות, סגירה>",
      "score": <0-10>,
      "what_happened": "<מה קרה בפועל בשלב הזה – ציטוט קצר או תיאור>",
      "verdict": "<הצלחה / חמצון / כשל>"
    }
  ],

  "highlights": [
    {
      "type": "peak" | "drop" | "objection" | "critical_error" | "missed_close" | "successful_close" | "interest_spike" | "lost_interest" | "turning_point",
      "label": "<שם קצר לרגע>",
      "quote": "<ציטוט מדויק או קרוב מהשיחה שמתאר את הרגע>",
      "impact": "positive" | "negative",
      "explanation": "<למה זה חשוב – מה השפעתו על השיחה>",
      "what_to_say_instead": "<אם שלילי – מה המוכר היה צריך להגיד במקום. אם חיובי – מה עבד טוב ולמה>"
    }
  ],

  "point_of_no_return": {
    "exists": true | false,
    "quote": "<הציטוט המדויק שבו הלקוח החליט לא לקנות>",
    "explanation": "<למה זה היה נקודת האל-חזור>",
    "recovery_script": "<מה המוכר היה יכול להגיד כדי לשנות את המהלך – דיאלוג מדויק>"
  },

  "critical_missed_moments": [
    {
      "moment": "<תיאור מה קרה>",
      "what_was_said": "<מה המוכר אמר בפועל>",
      "what_should_have_been_said": "<הניסוח המדויק שהיה צריך>"
    }
  ],

  "what_worked": [
    "<דבר ספציפי שעבד טוב – עם הסבר למה>"
  ],

  "coaching_summary": "<פסקה אחת של 3-4 משפטים – פידבק ישיר לנציג, כאילו אתה יושב לידו>"
}

חשוב מאוד:
- היילייטס צריכים להיות ספציפיים לשיחה הזו, לא כלליים
- ציטוטים צריכים להיות מהשיחה עצמה
- what_to_say_instead צריך להיות ניסוח מדויק ומעשי שהמוכר יכול לומר
- recovery_script צריך להיות דיאלוג אמיתי, לא עצה כללית
- אל תמציא רגעים שלא קרו בשיחה`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || 'Claude API error' });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    res.status(200).json(JSON.parse(clean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
