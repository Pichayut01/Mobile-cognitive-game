import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import GameSelectPage from "./pages/GameSelectPage";
import MemoryMatrixGame from "./pages/MemoryMatrixGame";
import SwitchRulesGame from "./pages/SwitchRulesGame";
import BackTraceGame from "./pages/BackTraceGame";
import NumberOrderingGame from "./pages/NumberOrderingGame";
import VisualSearchGame from "./pages/VisualSearchGame";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/games" element={<GameSelectPage />} />
      <Route path="/game/memory-matrix" element={<MemoryMatrixGame />} />
      <Route path="/game/switch-rules" element={<SwitchRulesGame />} />
      <Route path="/game/back-trace" element={<BackTraceGame />} />
      <Route path="/game/number-ordering" element={<NumberOrderingGame />} />
      <Route path="/game/visual-search" element={<VisualSearchGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
