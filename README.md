# FreshTrack KDS

Ürün ve SKT odaklı mutfak ekranı (KDS): FastAPI backend ve Vite + React frontend.

## Yerel geliştirme

**Backend** (proje kökünden):

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`DATABASE_URL` tanımlı değilse SQLite (`./freshtrack.db`) kullanılır. JWT için `SECRET_KEY` veya `JWT_SECRET` verilmezse geliştirme varsayılanı kullanılır.

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Varsayılan olarak `VITE_API_URL` kullanılmaz; istekler Vite proxy üzerinden `http://127.0.0.1:8000` adresine gider (`vite.config.ts`).

## Üretim ortam değişkenleri

### Backend

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | Hayır | Boşsa SQLite. PostgreSQL için bağlantı URL’si (ör. `postgresql://user:pass@host:5432/dbname`). |
| `SECRET_KEY` | Üretimde evet | JWT imzalama anahtarı. Geriye dönük uyumluluk için `JWT_SECRET` da okunur; ikisi de yoksa zayıf bir varsayılan kullanılır. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Hayır | Varsayılan: 10080 (7 gün). |
| `FRONTEND_URL` | Hayır | CORS için tek üretim ön yüz adresi; sonda `/` olmadan (ör. `https://app.ornek.com`). |
| `CORS_ORIGINS` | Hayır | Ek izinli origin’ler; virgülle ayrılmış liste. |

### Frontend (build zamanı)

| Değişken | Açıklama |
|----------|----------|
| `VITE_API_URL` | Backend’in kök URL’si, örn. `https://api.ornek.com`. Sonunda `/` koymayın. Yerelde genelde boş bırakılıp Vite proxy kullanılır; ayrı sunucuda barındırılan API için build öncesi ayarlayın. |

## Render / Railway: start komutu

Her iki platform da `PORT` ortam değişkenini verir. Örnek:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
```

- **Render**: Web Service → Build Command: `pip install -r requirements.txt` → Start Command yukarıdaki gibi. Root Directory proje kökü olmalı ( `app.main` import edilebilmeli).
- **Railway**: Start Command aynı; `DATABASE_URL` genelde PostgreSQL servisinden otomatik gelir; `SECRET_KEY` ve `FRONTEND_URL` / `CORS_ORIGINS`yi elle ekleyin.

## Frontend üretim build

```bash
cd frontend
set VITE_API_URL=https://api-adresiniz.example.com
npm run build
```

Çıktı `frontend/dist` içindedir; statik hosting (Netlify, Vercel, Cloudflare Pages vb.) ile yayınlanabilir.

## Örnek PostgreSQL URL

```
postgresql://kullanici:sifre@host.example.com:5432/freshtrack
```

SSL gerekiyorsa sağlayıcınızın önerdiği sorgu parametrelerini ekleyin (ör. `?sslmode=require`).
