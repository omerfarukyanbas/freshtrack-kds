import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LOGIN_PENDING_APPROVAL_MSG } from "../api/auth";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { from?: string; registeredPending?: boolean } | undefined;
  const from = navState?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [postRegisterInfo, setPostRegisterInfo] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = location.state as { from?: string; registeredPending?: boolean } | undefined;
    if (!s?.registeredPending) return;
    setPostRegisterInfo(true);
    navigate(location.pathname, {
      replace: true,
      state: s.from !== undefined ? { from: s.from } : undefined,
    });
  }, [location.pathname, location.state, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (ex) {
      const msg =
        ex instanceof ApiError
          ? ex.message
          : ex instanceof Error
            ? ex.message
            : "Giriş başarısız";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">
          FreshTrack KDS
          <span className="auth-title__sub">
            Marketler için SKT ve Stok Yönetimi
          </span>
        </h1>
        <p className="auth-lead">İşletme hesabınızla giriş yapın.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          {postRegisterInfo ? (
            <div className="auth-pending-banner" role="status">
              <strong>Kaydınız alındı</strong>
              Hesabınız yönetici onayından sonra aktifleşecektir. Onay sonrası buradan giriş
              yapabilirsiniz.
            </div>
          ) : null}
          {err ? (
            err === LOGIN_PENDING_APPROVAL_MSG ? (
              <div className="auth-pending-banner" role="alert">
                <strong>Yönetici onayı gerekiyor</strong>
                {LOGIN_PENDING_APPROVAL_MSG}
              </div>
            ) : (
              <div className="alert alert--error">{err}</div>
            )
          ) : null}
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>

        <p className="auth-footer">
          Hesabınız yok mu? <Link to="/register">Kayıt olun</Link>
        </p>
      </div>
    </div>
  );
}
