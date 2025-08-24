# Proje Özeti
Amaç: Kullanıcı prompt’undan DALL·E ile görsel üretmek ve AI karakterleriyle tartışma platformunu desteklemek. Minimum setup: Frontend (mevcut HTML), Backend (Express proxy), Image-Gen mini.

# Roller
- Tech Lead (senin yönettiğin): işleri bilet’lere ayırır.
- Frontend: ai-debate-platform.html üzerinde butonlar, fetch akışı, loading/hata.
- Backend/API: server.js içinde /api/images/generate endpoint.
- Image-Gen mini: app.js içinde prompt normalizasyonu.

# API Sözleşmesi
POST /api/images/generate  
body: { prompt, quality, size }  
resp: { image_b64 } veya { error }

# Güvenlik
- API key `.env` (`OPENAI_API_KEY`)
- CORS: yalnız `SITE_ORIGIN`
- Rate limit: 30 req / 5dk / IP
