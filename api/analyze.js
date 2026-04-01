export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!anthropicKey) return res.status(500).json({ error: 'Missing Anthropic key' });

  try {
    const { transcript, title, file_name, employee_id, user_token } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Missing transcript' });

    // 1. Get user from token
    let userId = null;
    if (user_token && supabaseUrl && serviceKey) {
      try {
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { 'Authorization': `Bearer ${user_token}`, 'apikey': serviceKey }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          userId = userData.id;
        }
      } catch(e) { console.warn('auth error:', e.message); }
    }

    // 2. Analyze with Claude
    const prompt = `אתה מאמן מכירות ותיק. נתח את שיחת המכירה הבאה מנקודת מבט של סוכן מכירות מנוסה – לא שופט.

כללים:
- טקטיקות מכירה (אי-חשיפת מחיר, יצירת דחיפות, framing) = לגיטימי לחלוטין
- זהה את סוג השיחה ונתח לפי המטרה שלה בלבד
- שיחת עדכון מחיר: המטרה לעבור חלק, לא לזהות צרכים
- risk_flags = רק אם עלול לגרום לתלונה/ביטול אמיתי

שיחה:
"""
${transcript.slice(0, 8000)}
"""

החזר JSON בלבד:
{
  "call_type": "<סוג>",
  "call_goal": "<מטרה>",
  "outcome": "closed" | "lost" | "follow_up" | "unclear",
  "overall_score": <0-100>,
  "score_label": "<מצוין / טוב / בינוני / חלש>",
  "verdict": "<משפט אחד>",
  "estimated_duration_minutes": <מספר>,
  "phase_scores": [{"phase":"<שם>","score":<0-10>,"what_happened":"<מה קרה>","verdict":"הצלחה"|"חמצון"|"כשל"}],
  "highlights": [{"type":"peak"|"drop"|"objection"|"critical_error"|"missed_close"|"successful_close"|"turning_point","label":"<שם>","quote":"<ציטוט>","impact":"positive"|"negative","explanation":"<למה>","what_to_say_instead":"<אלטרנטיבה>"}],
  "point_of_no_return": {"exists":true|false,"quote":"<ציטוט>","explanation":"<למה>","recovery_script":"<חלופה>"},
  "critical_missed_moments": [{"moment":"<מה>","what_was_said":"<נאמר>","what_should_have_been_said":"<עדיף>"}],
  "strengths": ["<חוזקה>"],
  "weaknesses": ["<חולשה>"],
  "risk_flags": ["<סיכון עתידי>"],
  "coaching_summary": "<3-4 משפטים>"
}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
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

    // 3. Save to Supabase server-side (no client needed)
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
