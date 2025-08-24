import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import OpenAI from 'openai';

const app = express();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORIGIN = process.env.SITE_ORIGIN || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const limiter = rateLimit({ windowMs: 5 * 60 * 1000, limit: 30 });
app.use('/api/', limiter);

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ai-debate-platform.html'));
});

// Validation helper
const validateImageRequest = (body) => {
  const { prompt, quality, size } = body;
  const errors = [];

  // Validate prompt
  if (!prompt) {
    errors.push('Prompt gerekli.');
  } else if (typeof prompt !== 'string') {
    errors.push('Prompt string olmalı.');
  } else if (prompt.trim().length < 3) {
    errors.push('Prompt en az 3 karakter olmalı.');
  }

  // Validate quality
  const validQualities = ['fast', 'balanced', 'hd'];
  if (quality && !validQualities.includes(quality)) {
    errors.push(`Quality şunlardan biri olmalı: ${validQualities.join(', ')}`);
  }

  // Validate size
  const validSizes = ['1024x1024', '1792x1024', '1024x1792'];
  if (size && !validSizes.includes(size)) {
    errors.push(`Size şunlardan biri olmalı: ${validSizes.join(', ')}`);
  }

  return errors;
};

app.post('/api/images/generate', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  try {
    // Log request (without prompt content for privacy)
    console.log(`[${requestId}] Image generation request started - Quality: ${req.body.quality || 'balanced'}, Size: ${req.body.size || '512x512'}`);
    
    // Validation
    const validationErrors = validateImageRequest(req.body);
    if (validationErrors.length > 0) {
      console.log(`[${requestId}] Validation failed:`, validationErrors);
      return res.status(400).json({ 
        error: validationErrors.join(' ') 
      });
    }

    const { prompt, quality = 'balanced', size = '512x512' } = req.body;

    // Call OpenAI API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const result = await client.images.generate({
      model: 'dall-e-3',
      prompt: prompt.trim(),
      size: size === '512x512' ? '1024x1024' : size, // DALL-E-3 minimum 1024x1024
      quality,
      response_format: 'b64_json'
    }, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Validate response
    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      console.error(`[${requestId}] OpenAI API returned no image data:`, result);
      return res.status(502).json({ 
        error: 'Görsel oluşturulamadı. Lütfen tekrar deneyin.' 
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Image generation successful - Duration: ${duration}ms`);
    
    res.json({ image_b64: b64 });
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Image generation failed after ${duration}ms:`, {
      name: err.name,
      message: err.message,
      status: err.status,
      type: err.type
    });

    // Handle specific OpenAI API errors
    if (err.name === 'AbortError') {
      return res.status(408).json({ 
        error: 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.' 
      });
    }
    
    if (err.status === 400) {
      return res.status(400).json({ 
        error: 'Geçersiz istek. Prompt veya parametreleri kontrol edin.' 
      });
    }
    
    if (err.status === 401) {
      return res.status(500).json({ 
        error: 'Servis geçici olarak kullanılamıyor. Lütfen tekrar deneyin.' 
      });
    }
    
    if (err.status === 429) {
      return res.status(429).json({ 
        error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.' 
      });
    }
    
    if (err.status >= 500) {
      return res.status(502).json({ 
        error: 'OpenAI servisi geçici olarak kullanılamıyor. Lütfen tekrar deneyin.' 
      });
    }
    
    // Generic server error
    res.status(500).json({ 
      error: 'Sunucu hatası oluştu. Lütfen tekrar deneyin.' 
    });
  }
});

// Chat endpoint for AI debate platform
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 200,
      temperature: 0.7
    });

    const content = completion.choices[0]?.message?.content || 'No response';
    res.json({ content });
    
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Chat service temporarily unavailable' });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
