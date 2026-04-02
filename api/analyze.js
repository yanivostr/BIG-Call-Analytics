export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!anthropicKey) return res.status(500).json({ error: 'Missing Anthropic key' });

  try {
    const { transcript, title, file_name, employee_id, user_token } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Missing transcript' });

    // 1. Get user
    let userId = null;
    if (user_token && supabaseUrl && serviceKey) {
      try {
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { 'Authorization': `Bearer ${user_token}`, 'apikey': serviceKey }
        });
        if (userRes.ok) userId = (await userRes.json()).id;
      } catch(e) {}
    }

    // 2. Deep analysis prompt
    const prompt = `אתה מנוע ניתוח שיחות מכירה מתקדם עם התמחות בביטוח ישראלי. אתה משלב ניתוח שפה, פסיכולוגיה של מכירות, וניתוח רגשי. אתה מנתח כמו מנחה מכירות בכיר שעשה 10,000 שיחות בעצמו.

===== שיחה לניתוח =====
${transcript.slice(0, 12000)}
=======================

שלב 1 – זיהוי אוטומטי:
ראשית זהה: מי מדבר (נציג/לקוח), מה סוג השיחה, מה המטרה, מה התוצאה.

שלב 2 – ניתוח רגשי של הלקוח:
עקוב אחרי השינויים הרגשיים של הלקוח לאורך השיחה. זהה: האם הוא פתוח/סגור, מתוח/רגוע, מסכים/מתנגד, מתחמם/מתקרר. שים לב לסימנים כמו: עלייה בשאלות = עניין גובר. שתיקה = חשיבה או התנגדות. "כן אבל" = התנגדות מנומסת. "בסדר" חד = אדישות. "רגע" = מופתע.

שלב 3 – ניתוח הנציג:
העריכה שלך מבוססת על תוצאות בלבד, לא מוסר. נציג טוב הוא מי שמגיע למטרה ביעילות. שיטות מכירה אגרסיביות שעובדות = חיוביות. התחמקות ממחיר = טקטיקה לגיטימית. יצירת דחיפות = מקצועי.

שלב 4 – זיהוי דפוסים:
זהה רגעי מפנה ספציפיים, ציטוטים שגרמו לשינוי בכיוון השיחה, וטעויות שאפשר היה למנוע.

החזר JSON מדויק בלבד (ללא markdown):
{
  "call_type": "<מכירה ראשונה / חידוש / שדרוג / עדכון מחיר / שימור / גביה / תלונה / אחר>",
  "call_goal": "<המטרה הספציפית של הנציג>",
  "product_type": "<ביטוח חיים / רכב / בריאות / רכוש / פנסיה / אחר / לא ידוע>",
  "outcome": "closed" | "lost" | "follow_up",
  "outcome_reason": "<הסיבה הספציפית לתוצאה>",
  "overall_score": <0-100>,
  "score_label": "<מצוין / טוב / בינוני / חלש>",
  "verdict": "<משפט אחד חד ומדויק>",
  "estimated_duration_minutes": <מספר>,

  "customer_profile": {
    "opening_mood": "<פתוח / ניטרלי / חשדן / עוין / לחוץ>",
    "closing_mood": "<מרוצה / מסכים / מהוסס / מתוסכל / כועס>",
    "decision_style": "<מהיר / שקול / מתלבט / דוחה>",
    "main_objection": "<ההתנגדות העיקרית שהעלה>",
    "trust_level": "<גבוה / בינוני / נמוך>",
    "engagement_score": <0-10>
  },

  "emotion_timeline": [
    {
      "moment": "<תיאור הרגע>",
      "quote": "<ציטוט מהשיחה>",
      "customer_emotion": "<שמחה / עניין / ספק / חשש / כעס / הרפיה / הסכמה>",
      "trigger": "<מה גרם לשינוי הרגשי>",
      "rep_response": "<איך הנציג הגיב>",
      "response_quality": "מצוין" | "סביר" | "החמיץ"
    }
  ],

  "sales_techniques": [
    {
      "technique": "<שם הטכניקה>",
      "used": true | false,
      "effectiveness": "<יעיל / לא יעיל / לא שומש>",
      "example": "<ציטוט אם קיים>"
    }
  ],

  "phase_scores": [
    {"phase":"<שם>","score":<0-10>,"what_happened":"<מה קרה>","verdict":"הצלחה"|"חמצון"|"כשל"}
  ],

  "highlights": [
    {
      "type": "peak"|"drop"|"objection"|"critical_error"|"missed_close"|"successful_close"|"turning_point"|"power_move"|"rapport_moment",
      "label": "<שם קצר>",
      "quote": "<ציטוט מדויק>",
      "impact": "positive"|"negative",
      "explanation": "<למה זה היה מכריע>",
      "what_to_say_instead": "<ניסוח יעיל יותר>"
    }
  ],

  "point_of_no_return": {
    "exists": true | false,
    "quote": "<ציטוט>",
    "explanation": "<למה זו הנקודה>",
    "recovery_script": "<דיאלוג חלופי מדויק>"
  },

  "missed_opportunities": [
    {
      "moment": "<מה קרה>",
      "what_was_said": "<מה נאמר>",
      "what_should_have_been_said": "<מה היה יעיל יותר>",
      "potential_impact": "<מה היה יכול לקרות>"
    }
  ],

  "rep_strengths": ["<חוזקה ספציפית עם דוגמה>"],
  "rep_weaknesses": ["<חולשה שפגעה בתוצאה>"],

  "risk_flags": [
    {
      "flag": "<תיאור הסיכון>",
      "severity": "גבוה" | "בינוני" | "נמוך",
      "recommendation": "<מה לעשות>"
    }
  ],

  "coaching_summary": "<4-5 משפטים ישירים לנציג מנקודת מבט של מנחה שעשה 10,000 שיחות>",
  "one_thing_to_improve": "<דבר אחד ספציפי שאם ישתפר יעלה את אחוז הסגירה>",
  "best_moment": "<הרגע הטוב ביותר בשיחה ולמה>"
}

כללים חשובים:
- ציטוטים חייבים להגיע מהשיחה בלבד
- emotion_timeline: לפחות 3 רגעים, עד 6
- sales_techniques: בדוק את כל הטכניקות הבאות: פתיחה חמה, זיהוי צרכים, בניית ערך, יצירת דחיפות, טיפול בהתנגדות, upsell, סגירה, anchoring, social proof
- אם השיחה קצרה מאוד – ציין זאת ב-verdict`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeRes.ok) {
      const e = await claudeRes.json().catch(() => ({}));
      return res.status(claudeRes.status).json({ error: e?.error?.message || 'Claude error' });
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content.map(b => b.text || '').join('');
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    // 3. Save server-side
    if (userId && supabaseUrl && serviceKey) {
      try {
        const trTrimmed = transcript.length > 30000 ? transcript.slice(0, 30000) : transcript;
        await fetch(`${supabaseUrl}/rest/v1/analyses`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            employee_id: employee_id || null,
            title: title || 'שיחת מכירה',
            file_name: file_name || 'טקסט',
            transcript: trTrimmed,
            result: result
          })
        });
      } catch(e) { console.warn('save error:', e.message); }
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
