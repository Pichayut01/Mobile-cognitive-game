function formatDuration(totalSeconds) {
  if (!totalSeconds) {
    return "0 นาที";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.max(1, Math.round((totalSeconds % 3600) / 60));

  if (!hours) {
    return `${minutes} นาที`;
  }

  return `${hours} ชม. ${minutes} นาที`;
}

function getOverviewCopy(summary) {
  if (!summary.totalSessions) {
    return "ยังไม่มีคะแนน Cognitive Domain เริ่ม Baseline Test ให้ครบหลายเกมก่อน แล้วระบบจะวิเคราะห์จุดแข็งและจุดที่ควรดูแลให้ครับ";
  }

  const scoredDomainCount = summary.domainScoreList.filter((domain) => domain.hasData).length;
  return `คะแนนเฉลี่ยรายด้าน ${summary.averageDomainScore}/100 จาก ${scoredDomainCount} ด้าน ใช้ข้อมูล ${summary.totalSessions} รอบ และฝึกรวม ${formatDuration(summary.totalDurationSec)}`;
}

function getBadgeLabel(summary) {
  if (!summary.totalSessions) {
    return "รอข้อมูล Baseline";
  }

  const weakestDomain = summary.weakestDomainId ? summary.domainScores[summary.weakestDomainId] : null;
  if (weakestDomain) {
    return `ควรดู: ${weakestDomain.title}`;
  }

  return "วิเคราะห์ครบด้าน";
}

function getTipCopy(summary) {
  if (!summary.totalSessions) {
    return "เมื่อเล่น Baseline Test ครบ ระบบจะรวมคะแนนรายเกมแบบถ่วงน้ำหนักเป็น 5 ด้าน เพื่อช่วยมองหาจุดอ่อนที่ควรฝึกต่อครับ";
  }

  const incompleteDomain = summary.domainScoreList.find((domain) => domain.coveragePercent < 100);
  if (incompleteDomain) {
    return `ยังมีข้อมูลบางเกมไม่ครบในด้าน ${incompleteDomain.title} (${incompleteDomain.titleTh}) ถ้าเล่น Baseline ให้ครบ จะช่วยให้คะแนนรายด้านแม่นขึ้นครับ`;
  }

  const weakestDomain = summary.weakestDomainId ? summary.domainScores[summary.weakestDomainId] : null;
  if (!weakestDomain) {
    return "ข้อมูลเริ่มครบแล้วครับ เล่นซ้ำตามรอบ Baseline จะช่วยให้แนวโน้มแต่ละด้านนิ่งขึ้น";
  }

  return `ด้านที่ควรเฝ้าดูที่สุดตอนนี้คือ ${weakestDomain.title} (${weakestDomain.titleTh}) คะแนน ${weakestDomain.score}/100 ลองเลือกเกมที่เกี่ยวข้องกับด้านนี้เป็นลำดับถัดไปครับ`;
}

function DashboardStatsTab({ summary, isLoading }) {
  const overviewPercent = summary.totalSessions ? summary.averageDomainScore : 0;
  const domainCards = summary.domainScoreList ?? [];

  return (
    <>
      <header className="dashboard-topbar">
        <div className="dashboard-topbar__inner">
          <div className="dashboard-topbar__title-group">
            <h1 className="dashboard-topbar__title">สถิติการฝึกฝน</h1>
          </div>

          <div className="dashboard-topbar__actions">
            <button type="button" className="dashboard-icon-button" aria-label="Share stats" />
            <button
              type="button"
              className="dashboard-icon-button"
              aria-label="Open calendar"
            />
          </div>
        </div>
      </header>

      <main className="dashboard-main dashboard-main--stats">
        <section className="dashboard-fitness-card">
          <div className="dashboard-fitness-card__ring">
            <svg className="dashboard-fitness-card__ring-svg" viewBox="0 0 192 192">
              <circle
                className="dashboard-fitness-card__ring-track"
                cx="96"
                cy="96"
                fill="transparent"
                r="88"
                strokeWidth="12"
              />
              <circle
                className="dashboard-fitness-card__ring-progress"
                cx="96"
                cy="96"
                fill="transparent"
                r="88"
                strokeWidth="12"
                style={{ strokeDashoffset: 553 - ((553 * overviewPercent) / 100) }}
              />
            </svg>
            <div className="dashboard-fitness-card__ring-center">
              <span className="dashboard-fitness-card__percent">
                {isLoading ? "..." : `${overviewPercent}`}
              </span>
            </div>
          </div>

          <div className="dashboard-fitness-card__content">
            <h2 className="dashboard-fitness-card__title">Cognitive Domain Score</h2>
            <p className="dashboard-fitness-card__copy">
              {isLoading ? "กำลังโหลดสถิติ..." : getOverviewCopy(summary)}
            </p>
            <div className="dashboard-fitness-card__badge">
              <span className="material-symbols-outlined" aria-hidden="true">
                trending_up
              </span>
              <span>{isLoading ? "กำลังโหลด" : getBadgeLabel(summary)}</span>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">คะแนนรายด้าน</h3>
          </div>

          <div className="dashboard-domain-list">
            {domainCards.map((domain) => (
              <article key={domain.id} className="dashboard-domain-card">
                <div className="dashboard-domain-card__icon">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {domain.icon}
                  </span>
                </div>

                <div className="dashboard-domain-card__content">
                  <div className="dashboard-domain-card__head">
                    <div className="dashboard-domain-card__title-group">
                      <span className="dashboard-domain-card__title">{domain.title}</span>
                      <span className="dashboard-domain-card__subtitle">{domain.titleTh}</span>
                    </div>
                    <span className="dashboard-domain-card__score">
                      {domain.hasData ? `${domain.score}/100` : "รอข้อมูล"}
                    </span>
                  </div>

                  <div className="dashboard-domain-card__bar">
                    <div
                      className="dashboard-domain-card__bar-fill"
                      style={{ width: `${domain.hasData ? Math.max(8, domain.score) : 0}%` }}
                    />
                  </div>

                  <p className="dashboard-domain-card__label">
                    {domain.hasData
                      ? `${domain.description} • ข้อมูลครอบคลุม ${domain.coveragePercent}%`
                      : "ยังไม่มีข้อมูลเกมที่เกี่ยวข้องกับด้านนี้"}
                  </p>
                  <div className="dashboard-domain-card__sources">
                    {domain.sourceGames.map((game) => (
                      <span
                        key={game.id}
                        className={`dashboard-domain-card__source ${game.playCount > 0 ? "is-active" : ""}`}
                      >
                        {game.titleTh} {game.weight}%
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-tip-card">
          <div className="dashboard-tip-card__glow" />
          <div className="dashboard-tip-card__content">
            <div className="dashboard-tip-card__icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                tips_and_updates
              </span>
            </div>
            <div className="dashboard-tip-card__text">
              <h4 className="dashboard-tip-card__title">คำแนะนำจากสถิติ</h4>
              <p className="dashboard-tip-card__copy">
                {isLoading ? "กำลังสรุปคำแนะนำ..." : getTipCopy(summary)}
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default DashboardStatsTab;
