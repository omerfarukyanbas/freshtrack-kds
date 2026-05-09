import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register({
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        email: email.trim(),
        password,
      });
      navigate("/login", { replace: true, state: { registeredPending: true } });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <h1 className="auth-title">
          FreshTrack KDS
          <span className="auth-title__sub">
            Marketler için SKT ve Stok Yönetimi
          </span>
        </h1>
        <p className="auth-lead">Yeni işletme hesabı oluşturun.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          {err ? <div className="alert alert--error">{err}</div> : null}
          <label className="field field--stack">
            <span>İşletme adı</span>
            <input
              required
              minLength={1}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Örn. Yıldız Market"
            />
          </label>
          <label className="field field--stack">
            <span>Yetkili kişi adı</span>
            <input
              required
              minLength={1}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ad Soyad"
            />
          </label>
          <label className="field field--stack">
            <span>E-posta</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field field--stack">
            <span>Şifre</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <p className="auth-hint muted">
            En az 8 karakter; en az bir harf ve bir rakam içermelidir.
          </p>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? "Kaydediliyor…" : "Kayıt ol"}
          </button>
        </form>

        <p className="auth-footer">
          Zaten hesabınız var mı? <Link to="/login">Giriş yapın</Link>
        </p>
      </div>
    </div>
  );
}
