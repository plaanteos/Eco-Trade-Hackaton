// ============================================================
//  EcoTrade — App
//  src/app/App.tsx
//
//  AuthProvider debe estar DENTRO del RouterProvider para poder
//  usar useNavigate. Lo montamos mediante RouterProvider +
//  un wrapper interno en routes.ts que provee el contexto.
// ============================================================

import { RouterProvider } from 'react-router';
import { router } from './routes';

function App() {
  return <RouterProvider router={router} />;
}

export default App;