export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contents, provider, ollamaUrl } = req.body;

  if (!contents || contents.length === 0) {
    return res.status(400).json({ error: 'Contents must not be empty' });
  }

  try {
    if (provider === 'ollama') {
      const url = ollamaUrl || 'http://localhost:11434/api/generate';
      const message = contents[contents.length - 1]?.parts?.[0]?.text || '';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'tinyllama',
          prompt: message,
          stream: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: data.error || 'Ollama error' });
      }

      return res.status(200).json({
        candidates: [
          {
            content: {
              parts: [{ text: data.response || 'No response' }],
            },
          },
        ],
      });
    } else {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      const model = process.env.GOOGLE_GEMINI_API_MODEL || 'gemini-flash-latest';

      if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.status(200).json(data);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
