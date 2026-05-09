/**
 * API kökü (`API_BASE`):
 * - Geliştirme: `VITE_API_URL` yoksa boş string → istekler Vite ile aynı origin (`/api`, `/auth`, …),
 *   proxy ile FastAPI’ye gider (localhost ↔ 127.0.0.1 CORS sorunu olmaz).
 * - Üretim: `VITE_API_URL=https://api.ornek.com` — backend’in tam kök URL’si (sonunda `/` olmadan).
 *   Ayrı sunucuda API için bu değişken **zorunludur**; yoksa istekler statik site köküne gider.
 */
const raw = import.meta.env.VITE_API_URL as string | undefined;
const trimmed =
  typeof raw === "string" && raw.trim().length > 0 ? raw.trim().replace(/\/$/, "") : "";

export const API_BASE =
  trimmed.length > 0 ? trimmed : import.meta.env.DEV ? "" : "";

if (import.meta.env.DEV) {
  console.log(
    "[API] API_BASE =",
    API_BASE === "" ? '(bos — proxy: /api, /auth, … -> http://127.0.0.1:8000)' : API_BASE,
  );
}
