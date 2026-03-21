// ============================================================
//  EcoTrade — AuthLayout
//  src/app/components/AuthLayout.tsx
//
//  Layout raíz que provee AuthContext a todas las rutas.
//  Debe estar DENTRO del RouterProvider para poder usar hooks
//  de react-router (useNavigate, useLocation) en AuthProvider.
// ============================================================

import React from 'react';
import { Outlet } from 'react-router';
import { AuthProvider } from '../context/AuthContext';

const AuthLayout: React.FC = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

export default AuthLayout;
