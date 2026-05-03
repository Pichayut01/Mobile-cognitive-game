import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import DashboardBottomNav from "../components/dashboard/DashboardBottomNav";
import DashboardHomeTab from "../components/dashboard/DashboardHomeTab";
import DashboardSettingsTab from "../components/dashboard/DashboardSettingsTab";
import DashboardStatsTab from "../components/dashboard/DashboardStatsTab";
import {
  clearSession,
  getDicebearAvatarUrl,
  getSession,
  getStoredUser,
} from "../utils/authStorage";
import { useGameStatsSummary } from "../utils/useGameStatsSummary";
import "../styles/dashboard-page.css";

function DashboardPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const session = getSession();
  const [activeTab, setActiveTab] = useState("home");
  const { summary, isLoading } = useGameStatsSummary(Boolean(user && session));

  if (!user || !session) {
    return <Navigate to="/" replace />;
  }

  const displayName = `${user.firstName} ${user.lastName}`.trim() || "Grand Master";
  const avatarUrl = getDicebearAvatarUrl(user.avatarSeed ?? displayName);

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true, state: { defaultView: "login" } });
  };

  return (
    <div className="dashboard-shell">
      <div className="dashboard-backdrop" aria-hidden="true">
        <div className="dashboard-backdrop__orb" />
      </div>

      <div className="dashboard-screen">
        {activeTab === "home" ? (
          <DashboardHomeTab
            avatarUrl={avatarUrl}
            displayName={displayName}
            summary={summary}
            isLoading={isLoading}
            onStartGame={() => navigate("/games")}
          />
        ) : null}

        {activeTab === "stats" ? <DashboardStatsTab summary={summary} isLoading={isLoading} /> : null}

        {activeTab === "settings" ? (
          <DashboardSettingsTab
            user={user}
            session={session}
            avatarUrl={avatarUrl}
            onOpenRegister={() => navigate("/", { state: { defaultView: "register" } })}
            onLogout={handleLogout}
          />
        ) : null}
      </div>

      <DashboardBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="dashboard-nav-spacer" />
    </div>
  );
}

export default DashboardPage;
