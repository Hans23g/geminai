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

  const { contents, providers } = req.body;

  if (!contents || contents.length === 0) {
    return res.status(400).json({ error: 'Contents must not be empty' });
  }

  const apiProviders = providers || [{ type: 'gemini' }];
  let lastError = null;

  for (const provider of apiProviders) {
    try {
      if (provider.type === 'ollama') {
        return await handleOllama(provider, contents, res);
      } else if (provider.type === 'gemini') {
        return await handleGemini(contents, res);
      } else if (provider.type === 'huggingface') {
        return await handleHuggingFace(provider, contents, res);
      }
    } catch (error) {
      lastError = error;
      console.error(`${provider.type} failed:`, error.message);
      continue;
    }
  }

  return res.status(500).json({ 
    error: lastError?.message || 'All API providers failed' 
  });
}

async function handleOllama(provider, contents, res) {
  const url = provider.url || 'http://localhost:11434/api/generate';
  const message = contents[contents.length - 1]?.parts?.[0]?.text || '';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'tinyllama',
      prompt: message,
      stream: false,
    }),
    timeout: 30000,
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return res.status(200).json({
    candidates: [
      {
        content: {
          parts: [{ text: data.response || 'No response' }],
        },
      },
    ],
  });
}

async function handleGemini(contents, res) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const model = process.env.GOOGLE_GEMINI_API_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    throw new Error('Gemini API key not configured');
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
    throw new Error(data.error?.message || 'Gemini API error');
  }

  return res.status(200).json(data);
}

async function handleHuggingFace(provider, contents, res) {
  const apiKey = provider.key;
  if (!apiKey) {
    throw new Error('Hugging Face API key not configured');
  }

  const message = contents[contents.length - 1]?.parts?.[0]?.text || '';

  const response = await fetch(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      method: 'POST',
      body: JSON.stringify({ inputs: message }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Hugging Face API error');
  }

  return res.status(200).json({
    candidates: [
      {
        content: {
          parts: [{ text: data[0]?.generated_text || 'No response' }],
        },
      },
    ],
  });
}
