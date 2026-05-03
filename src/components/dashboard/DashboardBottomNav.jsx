const NAV_ITEMS = [
  { id: "home", icon: "home", label: "Home" },
  { id: "stats", icon: "leaderboard", label: "Stats" },
  { id: "settings", icon: "settings", label: "Settings" },
];

function DashboardBottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="dashboard-nav" aria-label="Dashboard navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`dashboard-nav__button ${isActive ? "is-active" : ""}`}
          >
            <span
              className="material-symbols-outlined dashboard-nav__icon"
              style={{
                fontVariationSettings:
                  isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
              }}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span className="dashboard-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default DashboardBottomNav;
