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
        const result = await handleOllama(provider, contents);
        return res.status(200).json(result);
      } else if (provider.type === 'gemini') {
        const result = await handleGemini(contents);
        return res.status(200).json(result);
      } else if (provider.type === 'huggingface') {
        const result = await handleHuggingFace(provider, contents);
        return res.status(200).json(result);
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

async function handleOllama(provider, contents) {
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
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return {
    candidates: [
      {
        content: {
          parts: [{ text: data.response || 'No response' }],
        },
      },
    ],
  };
}

async function handleGemini(contents) {
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

  return data;
}

async function handleHuggingFace(provider, contents) {
  const apiKey = provider.key;
  if (!apiKey) {
    throw new Error('Hugging Face API key not configured');
  }

  const message = contents[contents.length - 1]?.parts?.[0]?.text || '';

  const response = await fetch(
    'https://api-inference.huggingface.co/models/google/flan-t5-base',
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      method: 'POST',
      body: JSON.stringify({ inputs: message }),
    }
  );

  const text = await response.text();
  let data;
  
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('HF Parse Error:', text.substring(0, 200));
    throw new Error(`Invalid response from HF: ${text.substring(0, 50)}`);
  }

  if (!response.ok) {
    throw new Error(data.error?.[0]?.message || data.error || 'Hugging Face API error');
  }

  const generatedText = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
  
  if (!generatedText) {
    console.error('HF Response structure:', data);
    throw new Error('Invalid response format from Hugging Face');
  }

  return {
    candidates: [
      {
        content: {
          parts: [{ text: generatedText }],
        },
      },
    ],
  };
}
