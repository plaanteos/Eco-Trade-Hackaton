// ============================================================
//  EcoTrade — Login Page
//  src/app/pages/Login.tsx
//
//  Autenticación con Google via Alchemy/Supabase OAuth.
//  Estética editorial: fondo marfil, tipografía serif/sans,
//  sin glassmorphism, coherente con el resto de la app.
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Leaf, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// ─── Google Icon SVG inline (sin dependencia extra) ──────────
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// ─── Componente principal ─────────────────────────────────────
const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, role } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [opLoading, setOpLoading] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Destino de redirección tras login (o por defecto según role)
  const from = (location.state as { from?: string } | null)?.from;

  // Finalizar OAuth callback (PKCE) cuando volvemos desde Google.
  // Si redireccionamos antes de canjear el `code`, la sesión nunca se establece.
  useEffect(() => {
    if (location.pathname !== '/auth/callback') return;

    let cancelled = false;
    setCallbackError(null);
    setCallbackLoading(true);

    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const errorDescription = params.get('error_description') ?? params.get('error');

    void (async () => {
      try {
        if (errorDescription) {
          throw new Error(errorDescription);
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          // Fallback (por si el proveedor usa otro modo de retorno)
          await supabase.auth.getSession();
        }

        // Limpiar query params del callback para evitar re-intentos.
        if (!cancelled) {
          navigate('/login', { replace: true, state: location.state });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error procesando el callback de Google';
        if (!cancelled) setCallbackError(message);
      } finally {
        if (!cancelled) setCallbackLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate, location.state]);

  // Si ya está autenticado, redirigir inmediatamente
  useEffect(() => {
    if (!isAuthenticated) return;

    if (from) {
      navigate(from, { replace: true });
    } else {
      navigate(role === 'Operador' ? '/operador/cola' : '/', { replace: true });
    }
  }, [isAuthenticated, navigate, from, role]);

  const handleGoogleLogin = async () => {
    await login();
  };

  const handleOperatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      alert("Error ingresando como operador: " + signInError.message + "\nSi no tienes cuenta, crea una o ve a Supabase.");
    }
    setOpLoading(false);
  };

  const busy = isLoading || callbackLoading;
  const uiError = callbackError ?? error;

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: '#F5F3ED' }}
    >
      <div className="max-w-lg w-full">

        {/* ── Logo + Título ────────────────────────────────── */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center justify-center w-20 h-20 mb-6"
            style={{ border: '3px solid #2D5016' }}
          >
            <Leaf className="w-10 h-10" style={{ color: '#2D5016' }} />
          </div>

          <h1
            className="text-5xl mb-3 tracking-tight"
            style={{ fontFamily: 'var(--font-serif)', color: '#1A1A1A' }}
          >
            EcoTrade
          </h1>

          <p
            className="text-base uppercase tracking-widest"
            style={{ color: '#4A4A4A', letterSpacing: '0.15em' }}
          >
            Economía Circular · Blockchain
          </p>
        </div>

        {/* ── Panel de login ───────────────────────────────── */}
        <div
          className="bg-white p-10"
          style={{ border: '3px solid #1A1A1A' }}
        >
          {/* Encabezado del panel */}
          <div className="mb-8 pb-6" style={{ borderBottom: '2px solid #E8E6DD' }}>
            <h2
              className="text-2xl mb-2"
              style={{ fontFamily: 'var(--font-serif)', color: '#1A1A1A' }}
            >
              Iniciar sesión
            </h2>
            <p className="text-sm" style={{ color: '#4A4A4A' }}>
              Accede con tu cuenta de Google. Se creará una wallet Solana
              asociada automáticamente.
            </p>
          </div>

          {/* Error */}
          {uiError && (
            <div
              className="flex items-start gap-3 p-4 mb-6"
              style={{
                backgroundColor: '#FFE8E8',
                borderLeft: '4px solid #B91C1C',
              }}
              role="alert"
              aria-live="polite"
            >
              <AlertCircle
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: '#B91C1C' }}
              />
              <div>
                <p
                  className="text-sm font-medium mb-0.5"
                  style={{ color: '#B91C1C' }}
                >
                  No se pudo iniciar sesión
                </p>
                <p className="text-xs" style={{ color: '#7F1D1D' }}>
                  {uiError}
                </p>
              </div>
            </div>
          )}

          {/* Botón principal Google */}
          <button
            id="btn-google-login"
            onClick={handleGoogleLogin}
            disabled={busy}
            aria-busy={busy}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 transition-all duration-150"
            style={{
              backgroundColor: busy ? '#E8E6DD' : '#1A1A1A',
              color: '#F5F3ED',
              border: '2px solid #1A1A1A',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={e => {
              if (!busy) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2D5016';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#2D5016';
              }
            }}
            onMouseLeave={e => {
              if (!busy) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A1A1A';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A1A1A';
              }
            }}
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Conectando…</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5" />
                <span>Continuar con Google</span>
              </>
            )}
          </button>

          {/* Separador */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6DD' }} />
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#9A9A8A' }}>
              o ingresar como operador
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6DD' }} />
          </div>

          {/* Formulario de Operador */}
          <form onSubmit={handleOperatorLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Correo de operador"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 bg-[#F5F3ED] border border-[#1A1A1A] focus:outline-none focus:border-[#2D5016] text-sm"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 bg-[#F5F3ED] border border-[#1A1A1A] focus:outline-none focus:border-[#2D5016] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={callbackLoading || opLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 transition-all duration-150"
              style={{
                backgroundColor: 'transparent',
                color: '#1A1A1A',
                border: '2px solid #1A1A1A',
                cursor: (callbackLoading || opLoading) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
              onMouseEnter={e => {
                if (!callbackLoading && !opLoading) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A1A1A';
                  (e.currentTarget as HTMLButtonElement).style.color = '#F5F3ED';
                }
              }}
              onMouseLeave={e => {
                if (!callbackLoading && !opLoading) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#1A1A1A';
                }
              }}
            >
              {opLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONTINUAR COMO OPERADOR'}
            </button>
          </form>

          {/* ── Credenciales de Operador (Demo Hackathon) ── */}
          <div className="mt-6 p-4" style={{ backgroundColor: '#F9F9F9', border: '1px dashed #9A9A8A' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#1A1A1A' }}>
              Credenciales de Operador (Demo Hackathon)
            </p>
            <div className="flex flex-col gap-1">
              <p className="text-xs" style={{ color: '#4A4A4A' }}>
                <strong style={{ color: '#1A1A1A' }}>Correo:</strong> operador@ecotrade.com
              </p>
              <p className="text-xs" style={{ color: '#4A4A4A' }}>
                <strong style={{ color: '#1A1A1A' }}>Contraseña:</strong> TestOperador123
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <p className="text-center text-xs mt-8" style={{ color: '#9A9A8A' }}>
          EcoTrade © 2026 — Economía Circular con Blockchain
        </p>
      </div>
    </div>
  );
};

export default Login;
