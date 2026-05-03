import { useNavigate } from "react-router-dom";
import { getStoredUser, getDicebearAvatarUrl } from "../utils/authStorage";
import { GAME_CATALOG } from "../utils/gameCatalog";
import { formatCompactScore } from "../utils/numberFormat";
import { useGameStatsSummary } from "../utils/useGameStatsSummary";
import "../styles/game-select-page.css";

const GAME_ICONS = {
  "visual-search": (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
  "number-ordering": (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M3 12h12M3 18h6" strokeLinecap="round" />
    </svg>
  ),
  "back-trace": (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6v12" strokeLinecap="round" />
      <path d="M3 6h6M3 18h6" strokeLinecap="round" />
    </svg>
  ),
  "switch-rules": (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "memory-matrix": (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
};

function GameSelectPage() {
  const navigate = useNavigate();
  const { summary, isLoading } = useGameStatsSummary();

  const user = getStoredUser();
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || "Grand Master" : "Player";
  const score = summary.totalScore;
  const compactScore = formatCompactScore(score);
  const avatarUrl = user ? getDicebearAvatarUrl(user.avatarSeed ?? displayName) : getDicebearAvatarUrl(displayName);

  return (
    <div className="dashboard-shell">
      <div className="dashboard-backdrop" aria-hidden="true">
        <div className="dashboard-backdrop__orb" />
      </div>

      <header className="dashboard-topbar">
        <div className="dashboard-topbar__inner">
          <div className="dashboard-profile">
            <div className="dashboard-profile__avatar">
              <img
                alt="Player profile"
                className="dashboard-profile__avatar-image"
                src={avatarUrl}
              />
            </div>
            <h1 className="dashboard-profile__name">{displayName}</h1>
          </div>

          <div className="dashboard-score-pill">
            <span
              className="material-symbols-outlined dashboard-score-pill__icon"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
              aria-hidden="true"
            >
              stars
            </span>
            <span className="dashboard-score-pill__text">
              Score: {compactScore}
            </span>
          </div>
        </div>
      </header>

      <div className="game-select">
        <div className="game-select__container">
          <div className="game-select__list">
            {GAME_CATALOG.map((game) => {
              const icon = GAME_ICONS[game.id];
              const gameStats = summary.perGame[game.id];
              const bestScoreText = gameStats?.playCount
                ? `สูงสุด ${gameStats.bestScore.toLocaleString("en-US")}`
                : isLoading
                  ? "กำลังโหลด..."
                  : "ยังไม่มีสถิติ";

              return (
                <button
                  key={game.id}
                  type="button"
                  className={`game-card game-card--${game.theme}`}
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <div className="game-card__watermark">{icon}</div>
                  <div className="game-card__icon">{icon}</div>

                  <div className="game-card__text">
                    <h3 className="game-card__title">{game.titleTh}</h3>
                    <p className="game-card__skill">{game.skill}</p>
                  </div>

                  <p className="game-card__best-score">{bestScoreText}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <nav className="dashboard-nav" aria-label="Dashboard navigation">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="dashboard-nav__button"
        >
          <span
            className="material-symbols-outlined dashboard-nav__icon"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
            aria-hidden="true"
          >
            home
          </span>
          <span className="dashboard-nav__label">Home</span>
        </button>

        <button
          type="button"
          onClick={() => {}}
          className="dashboard-nav__button"
        >
          <span
            className="material-symbols-outlined dashboard-nav__icon"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
            aria-hidden="true"
          >
            menu_book
          </span>
          <span className="dashboard-nav__label">คู่มือ</span>
        </button>
      </nav>
      <div className="dashboard-nav-spacer" />
    </div>
  );
}

export default GameSelectPage;
