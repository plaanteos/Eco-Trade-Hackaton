// ============================================================
//  EcoTrade — Router
//  src/app/routes.ts
//
//  AuthLayout como raíz → provee AuthContext dentro del router.
//  Rutas protegidas bajo "/" usan Root (ya tiene guard interno).
// ============================================================

import { createBrowserRouter } from "react-router";
import AuthLayout from "./components/AuthLayout";
import Root from "./pages/Root";
import Landing from "./pages/Landing";
import History from "./pages/History";
import CreateSessionPoint from "./pages/create/CreateSessionPoint";
import CreateSessionDate from "./pages/create/CreateSessionDate";
import CreateSessionMaterials from "./pages/create/CreateSessionMaterials";
import CreateSessionEvidence from "./pages/create/CreateSessionEvidence";
import CreateSessionSummary from "./pages/create/CreateSessionSummary";
import SessionSuccess from "./pages/SessionSuccess";
import SessionDetail from "./pages/SessionDetail";
import OperatorVerification from "./pages/OperatorVerification";
import PublicVerification from "./pages/PublicVerification";
import OperatorReviewQueue from "./pages/OperatorReviewQueue";
import OperatorReviewDetail from "./pages/OperatorReviewDetail";
import SolanaProofPage from "./pages/SolanaProofPage";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    // AuthLayout como raíz — provee AuthContext a todo el árbol
    Component: AuthLayout,
    children: [
      // ── Rutas públicas (sin layout principal) ──────────────
      { path: "/login", Component: Login },
      // Callback Supabase OAuth — Login se encarga de redirigir
      { path: "/auth/callback", Component: Login },
      // Verificación pública (sin auth)
      { path: "/verificar/:id", Component: PublicVerification },

      // ── Rutas protegidas (con layout Root) ────────────────
      {
        path: "/",
        Component: Root,
        children: [
          { index: true, Component: Landing },
          { path: "historial", Component: History },
          { path: "crear/punto", Component: CreateSessionPoint },
          { path: "crear/fecha", Component: CreateSessionDate },
          { path: "crear/materiales", Component: CreateSessionMaterials },
          { path: "crear/evidencia", Component: CreateSessionEvidence },
          { path: "crear/resumen", Component: CreateSessionSummary },
          { path: "sesion/:id/exito", Component: SessionSuccess },
          { path: "sesion/:id/comprobante", Component: SolanaProofPage },
          { path: "sesion/:id", Component: SessionDetail },
          // Rutas de Operador
          { path: "operador/verificar/:id", Component: OperatorVerification },
          { path: "operador/cola", Component: OperatorReviewQueue },
          { path: "operador/revisar/:id", Component: OperatorReviewDetail },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);