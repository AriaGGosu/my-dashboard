import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Each route is lazy-loaded — Vite only transforms the code you actually visit.
const Valentine = lazy(() => import("./pages/Valentine"));
const HomeApp = lazy(() => import("./HomeApp"));

function App() {
  return (
    <Routes>
      {/* Valentine: ruta raíz — lo primero que se ve al entrar */}
      <Route path="/" element={<Suspense fallback={null}><Valentine /></Suspense>} />

      {/* Main app: portfolio, about, works, etc. */}
      <Route path="/home/*" element={<Suspense fallback={null}><HomeApp /></Suspense>} />
    </Routes>
  );
}

export default App;
