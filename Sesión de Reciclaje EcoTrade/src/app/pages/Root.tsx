import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { SessionProvider } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { Recycle, LogOut, User, Briefcase } from 'lucide-react';

const Root: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  const isOperador = user?.role === 'Operador';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
    } else if (isOperador && location.pathname === '/') {
      // Redirect operador to their dashboard
      navigate('/operador/cola');
    }
  }, [isAuthenticated, isLoading, navigate, isOperador, location.pathname]);

  const handleLogout = async () => {
    await logout(); // logout() in AuthContext already navigates to /login
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#F5F3ED]">
        {/* Header */}
        <header className="bg-white border-b-4 border-[#1A1A1A] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <Recycle className="w-8 h-8 text-[#2D5016]" />
                <div>
                  <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-serif)' }}>
                    EcoTrade
                  </h1>
                  <div className="text-xs uppercase tracking-widest text-[#4A4A4A]">
                    Economía Circular
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-6">
                <nav className="flex items-center gap-6">
                  {isOperador ? (
                    /* Operador navigation */
                    <>
                      <Link 
                        to="/operador/cola"
                        className={`text-sm uppercase tracking-wider hover:text-[#2D5016] transition-colors ${
                          location.pathname === '/operador/cola' ? 'text-[#2D5016] font-semibold border-b-2 border-[#2D5016] pb-1' : 'text-[#1A1A1A]'
                        }`}
                      >
                        Cola de Revisión
                      </Link>
                      <Link 
                        to="/historial"
                        className={`text-sm uppercase tracking-wider hover:text-[#2D5016] transition-colors ${
                          location.pathname === '/historial' ? 'text-[#2D5016] font-semibold border-b-2 border-[#2D5016] pb-1' : 'text-[#1A1A1A]'
                        }`}
                      >
                        Todas las Sesiones
                      </Link>
                    </>
                  ) : (
                    /* Usuario navigation */
                    <>
                      <Link 
                        to="/"
                        className={`text-sm uppercase tracking-wider hover:text-[#2D5016] transition-colors ${
                          location.pathname === '/' ? 'text-[#2D5016] font-semibold border-b-2 border-[#2D5016] pb-1' : 'text-[#1A1A1A]'
                        }`}
                      >
                        Inicio
                      </Link>
                      <Link 
                        to="/historial"
                        className={`text-sm uppercase tracking-wider hover:text-[#2D5016] transition-colors ${
                          location.pathname === '/historial' ? 'text-[#2D5016] font-semibold border-b-2 border-[#2D5016] pb-1' : 'text-[#1A1A1A]'
                        }`}
                      >
                        Historial
                      </Link>
                    </>
                  )}
                </nav>

                {/* User menu */}
                <div className="flex items-center gap-4 ml-6 pl-6 border-l-2 border-[#E8E6DD]">
                  <div className="flex items-center gap-2">
                    {isOperador ? (
                      <Briefcase className="w-5 h-5 text-[#B85C00]" />
                    ) : (
                      <User className="w-5 h-5 text-[#2D5016]" />
                    )}
                    <div className="text-sm">
                      <div className="font-medium">{user?.name}</div>
                      <div className="text-xs text-[#4A4A4A] uppercase tracking-wider">
                        {user?.role}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-[#E8E6DD] transition-colors border border-[#1A1A1A]"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="page-fade-in">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-[#1A1A1A] text-[#F5F3ED] border-t-4 border-[#2D5016] mt-20">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                  EcoTrade
                </h3>
                <p className="text-sm text-[#E8E6DD]">
                  Plataforma de economía circular para reciclaje responsable.
                </p>
              </div>
              <div>
                <h4 className="text-sm uppercase tracking-wider mb-4 text-[#E8E6DD]">Enlaces</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/" className="hover:text-[#4A7C2E] transition-colors">Inicio</Link></li>
                  <li><Link to="/historial" className="hover:text-[#4A7C2E] transition-colors">Historial</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm uppercase tracking-wider mb-4 text-[#E8E6DD]">Información</h4>
                <p className="text-sm text-[#E8E6DD]">
                  1 ecoCoin = 10 KG reciclados<br />
                  Consulta los puntos de acopio disponibles
                </p>
              </div>
            </div>
            <div className="border-t border-[#4A4A4A] mt-8 pt-8 text-center text-xs text-[#E8E6DD]">
              © 2026 EcoTrade. Economía Circular.
            </div>
          </div>
        </footer>
      </div>
    </SessionProvider>
  );
};

export default Root;