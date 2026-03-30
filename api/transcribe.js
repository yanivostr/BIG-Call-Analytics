export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  try {
    const contentType = req.headers['content-type'] || '';
    
    // Forward the raw multipart body directly to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': contentType,
      },
      body: req,
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: text });
    }
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: { bodyParser: false }
};
