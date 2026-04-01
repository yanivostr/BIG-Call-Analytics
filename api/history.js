export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
 
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No auth token' });
 
  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
 
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Missing env vars' });
 
  // Get user from token using REST API
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': serviceKey
    }
  });
 
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
  const userData = await userRes.json();
  const userId = userData.id;
 
  // Fetch analyses using REST API
  const dataRes = await fetch(
    `${supabaseUrl}/rest/v1/analyses?user_id=eq.${userId}&select=id,title,file_name,created_at,employee_id,result&order=created_at.desc`,
    {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      }
    }
  );
 
  if (!dataRes.ok) {
    const err = await dataRes.text();
    return res.status(500).json({ error: err });
  }
 
  const data = await dataRes.json();
  res.status(200).json(data || []);
}
