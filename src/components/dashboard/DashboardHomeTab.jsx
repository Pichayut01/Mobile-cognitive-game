import { GAME_META_MAP } from "../../utils/gameCatalog";
import { formatCompactScore } from "../../utils/numberFormat";

function formatRelativeTime(isoString) {
  if (!isoString) {
    return "ยังไม่มีการเล่น";
  }

  const deltaMinutes = Math.max(0, Math.round((Date.now() - Date.parse(isoString)) / 60000));

  if (deltaMinutes < 1) {
    return "เมื่อสักครู่นี้";
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes} นาทีที่แล้ว`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} ชั่วโมงที่แล้ว`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays} วันที่แล้ว`;
}

function DashboardHomeTab({ avatarUrl, displayName, summary, isLoading, onStartGame }) {
  const score = summary.totalScore;
  const compactScore = formatCompactScore(score);
  const bestGame = summary.bestGameId ? summary.perGame[summary.bestGameId] : null;
  const bestGameLabel = bestGame
    ? `${GAME_META_MAP[bestGame.id]?.titleTh ?? bestGame.id} สูงสุด ${bestGame.bestScore}`
    : "ยังไม่มีคะแนนสูงสุด";
  const lastPlayedLabel = isLoading
    ? "กำลังโหลด..."
    : formatRelativeTime(summary.lastPlayedAt);
  const highlightLabel = isLoading
    ? "กำลังโหลด..."
    : summary.totalSessions > 0
      ? bestGameLabel
      : "เริ่มเล่นเกมแรกได้เลย";

  return (
    <>
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
              {compactScore}
            </span>
          </div>
        </div>
      </header>

      <main className="dashboard-main dashboard-main--home">
        <section className="dashboard-score-block">
          <p className="dashboard-score-block__label">คะแนนสะสมทั้งหมด</p>
          <div className="dashboard-score-block__value-row">
            <svg
              width="75"
              height="75"
              viewBox="0 0 512 512"
              className="dashboard-score-block__trophy"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g fill="#244f75">
                <path d="M348.375,384.758c-12.811-25.137-32.785-44.594-56.582-54.492v-38.5l0.047-9.133c-0.016,0-0.031,0-0.047,0.004 v-0.242c-11.588,2.262-23.551,3.481-35.791,3.481c-11.369,0-22.476-1.094-33.291-3.055c-0.752-0.152-1.516-0.262-2.264-0.426v0.043 c-0.08-0.016-0.16-0.028-0.24-0.043v47.871c-12.209,5.078-23.393,12.695-33.137,22.293c-0.348,0.34-0.705,0.66-1.049,1.004 c-1.072,1.082-2.1,2.219-3.133,3.348c-0.705,0.77-1.426,1.512-2.115,2.305c-0.61,0.703-1.184,1.442-1.78,2.156 c-1.07,1.289-2.14,2.574-3.168,3.918c-0.088,0.117-0.17,0.238-0.26,0.355c-4.392,5.789-8.406,12.078-11.939,18.875h0.131 c-0.043,0.082-0.09,0.16-0.131,0.238H348.375z" />
                <polygon points="115.046,416 115.046,511.371 115.044,511.758 115.046,511.758 115.046,512 396.957,512 396.957,416 " />
                <path d="M498.331,29.387c-8.027-9.094-19.447-14.312-31.328-14.312h-47.744V0.27V0.242l0,0V0H92.742v15.074H44.999 c-11.887,0-23.306,5.218-31.336,14.312C3.906,40.442-0.305,56.43,1.775,74.465c0.369,7.922,4.367,49.316,47.211,78.77 c24.732,17.008,48.424,24.629,69.44,27.938c29.008,45.328,79.76,75.398,137.576,75.398c57.805,0,108.558-30.07,137.568-75.398 c21.016-3.305,44.709-10.93,69.445-27.938c42.84-29.453,46.842-70.848,47.211-78.77C512.304,56.43,508.093,40.442,498.331,29.387z M476.238,71.016l-0.125,0.852l-0.002,1.031c-0.029,1.246-1.115,30.656-32.447,52.195c-8.976,6.172-17.635,10.719-26.041,14.184 c-1.836,0.711-3.668,1.43-5.553,2.043c4.664-15.184,7.19-31.297,7.19-48.008V49.226h47.744c1.498,0,3.711,0.481,5.726,2.758 C476.009,55.703,477.288,62.637,476.238,71.016z M253.964,155.219l-33.658,18.73c-1.422,0.793-3.174,0.688-4.49-0.274 c-1.312-0.949-1.959-2.586-1.644-4.18l7.412-37.801c0.279-1.418-0.193-2.883-1.254-3.863l-28.213-26.23 c-1.191-1.106-1.633-2.805-1.129-4.352s1.859-2.664,3.474-2.859l38.236-4.633c1.436-0.172,2.678-1.078,3.291-2.391l16.219-34.93 c0.687-1.477,2.162-2.422,3.795-2.422c1.625,0,3.102,0.945,3.787,2.422l16.22,34.93c0.612,1.312,1.854,2.219,3.289,2.391 l38.236,4.633c1.615,0.195,2.971,1.312,3.474,2.859c0.504,1.547,0.063,3.246-1.127,4.352l-28.215,26.23 c-1.059,0.98-1.541,2.445-1.26,3.863l7.418,37.801c0.313,1.594-0.328,3.23-1.648,4.18c-1.316,0.961-3.06,1.066-4.486,0.274 l-33.664-18.73C256.769,154.52,255.23,154.52,253.964,155.219z M68.331,125.094c-31.326-21.539-32.41-50.949-32.438-52.016 l-0.006-1.035l-0.131-1.027c-1.043-8.379,0.232-15.312,3.516-19.031c2.01-2.277,4.222-2.758,5.726-2.758h47.742v44.086 c0,14.246,1.928,28.02,5.357,41.192c0.559,2.308,1.076,4.629,1.725,6.926C89.732,137.801,79.257,132.602,68.331,125.094z" />
              </g>
            </svg>
            <span className="dashboard-score-block__value">
              {compactScore}
            </span>
          </div>
        </section>

        <section className="dashboard-hero-card">
          <div className="dashboard-hero-card__glow" />
          <div className="dashboard-hero-card__content">
            <div className="dashboard-hero-card__icon-wrap">
              <svg
                className="dashboard-hero-card__icon"
                fill="#ffffff"
                viewBox="0 0 256 256"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M168,224a8.00008,8.00008,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8.00008,8.00008,0,0,1,168,224ZM232,64V176a24.0275,24.0275,0,0,1-24,24H48a24.0275,24.0275,0,0,1-24-24V64A24.02734,24.02734,0,0,1,48,40H208A24.02734,24.02734,0,0,1,232,64Zm-68,56a8.00014,8.00014,0,0,0-3.70508-6.74927l-44-28A7.99989,7.99989,0,0,0,104,92v56a7.99991,7.99991,0,0,0,12.29492,6.74927l44-28A8.00014,8.00014,0,0,0,164,120Z" />
              </svg>
            </div>

            <button
              type="button"
              className="dashboard-hero-card__button"
              onClick={onStartGame}
            >
              <span className="dashboard-start-game">เริ่มเล่นเกม</span>
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>
        </section>

        <section className="dashboard-widget-stack">
          <article className="dashboard-widget-card">
            <div className="dashboard-widget-card__icon dashboard-widget-card__icon--light">
              <svg className="dashboard-widget-card__svg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,6a1,1,0,0,0-1,1v5a1,1,0,0,0,.293.707l3,3a1,1,0,0,0,1.414-1.414L13,11.586V7A1,1,0,0,0,12,6Z M23.812,10.132A12,12,0,0,0,3.578,3.415V1a1,1,0,0,0-2,0V5a2,2,0,0,0,2,2h4a1,1,0,0,0,0-2H4.827a9.99,9.99,0,1,1-2.835,7.878A.982.982,0,0,0,1,12a1.007,1.007,0,0,0-1,1.1,12,12,0,1,0,23.808-2.969Z" />
              </svg>
            </div>
            <div className="dashboard-widget-card__text">
              <p className="dashboard-widget-card__label">เล่นครั้งล่าสุด</p>
              <p className="dashboard-widget-card__value">{lastPlayedLabel}</p>
            </div>
          </article>

          <article className="dashboard-widget-card">
            <div className="dashboard-widget-card__icon dashboard-widget-card__icon--brand">
              <svg className="dashboard-widget-card__svg" fill="currentColor" viewBox="0 0 72 72">
                <path d="M65.81,68h-60c-1.104,0-2-0.896-2-2s0.896-2,2-2h60c1.104,0,2,0.896,2,2S66.914,68,65.81,68z M23.19,53.068c0,3.828-3.104,6.932-6.932,6.932h-5.137c-3.828,0-6.932-3.104-6.932-6.932V32.932 C4.19,29.104,7.294,26,11.122,26h5.137c3.828,0,6.932,3.104,6.932,6.932V53.068z M19.19,32.932c0-1.619-1.313-2.932-2.932-2.932 h-5.137c-1.619,0-2.932,1.313-2.932,2.932v20.137C8.19,54.688,9.503,56,11.122,56h5.137c1.619,0,2.932-1.313,2.932-2.932V32.932z M46.19,53.068c0,3.828-3.104,6.932-6.932,6.932h-5.137c-3.828,0-6.932-3.104-6.932-6.932V21.932 c0-3.828,3.104-6.932,6.932-6.932h5.137c3.828,0,6.932,3.104,6.932,6.932V53.068z M42.19,21.932c0-1.619-1.313-2.932-2.932-2.932 h-5.137c-1.619,0-2.932,1.313-2.932,2.932v31.137c0,1.619,1.313,2.932,2.932,2.932h5.137c1.619,0,2.932-1.313,2.932-2.932V21.932z M68.19,53.068c0,3.828-3.104,6.932-6.932,6.932h-5.137c-3.828,0-6.932-3.104-6.932-6.932V10.932 C49.19,7.104,52.294,4,56.122,4h5.137c3.828,0,6.932,3.104,6.932,6.932V53.068z M64.19,10.932C64.19,9.313,62.878,8,61.259,8 h-5.137c-1.619,0-2.932,1.313-2.932,2.932v42.137c0,1.619,1.313,2.932,2.932,2.932h5.137c1.619,0,2.932-1.313,2.932-2.932V10.932z" />
              </svg>
            </div>
            <div className="dashboard-widget-card__text">
              <p className="dashboard-widget-card__label">สถิติเด่นของคุณ</p>
              <p className="dashboard-widget-card__value">{highlightLabel}</p>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}

export default DashboardHomeTab;
