import { useEffect, useState } from "react";
import {
  DEFAULT_GAME_SETTINGS,
  DIFFICULTY_OPTIONS,
  MAX_GAME_DURATION_MINUTES,
  MIN_GAME_DURATION_MINUTES,
  getAllDifficultySummaries,
  getDifficultyOptionById,
  getStoredGameSettings,
  saveGameSettings,
} from "../../utils/gameSettings";

function DashboardSettingsTab({ user, session, avatarUrl, onOpenRegister, onLogout }) {
  const [gameSettings, setGameSettings] = useState(DEFAULT_GAME_SETTINGS);

  useEffect(() => {
    setGameSettings(getStoredGameSettings());
  }, []);

  const lastLogin = new Date(session.loggedInAt).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const selectedDifficulty = getDifficultyOptionById(gameSettings.difficulty);
  const difficultySummaries = getAllDifficultySummaries(gameSettings.difficulty);

  const updateDuration = (delta) => {
    setGameSettings((prev) =>
      saveGameSettings({
        ...prev,
        durationMinutes: prev.durationMinutes + delta,
      }),
    );
  };

  const updateDifficulty = (difficulty) => {
    setGameSettings((prev) =>
      saveGameSettings({
        ...prev,
        difficulty,
      }),
    );
  };

  return (
    <>
      <header className="dashboard-topbar">
        <div className="dashboard-topbar__inner">
          <div className="dashboard-topbar__title-group">
            <span className="material-symbols-outlined dashboard-topbar__lead-icon">
              settings
            </span>
            <h1 className="dashboard-topbar__title">การตั้งค่า</h1>
          </div>
        </div>
      </header>

      <main className="dashboard-main dashboard-main--settings">
        <div className="dashboard-settings-stack">
          <section className="dashboard-settings-card">
            <div className="dashboard-settings-card__icon">
              <img
                alt="Account profile"
                className="dashboard-settings-card__avatar"
                src={avatarUrl}
              />
            </div>
            <h2 className="dashboard-settings-card__title">ข้อมูลบัญชี</h2>
            <p className="dashboard-settings-card__copy">
              จัดการข้อมูลบัญชีและดูการตั้งค่าเริ่มต้นของการเล่นเกมได้จากหน้านี้
            </p>

            <div className="dashboard-settings-card__grid">
              <div className="dashboard-settings-card__item">
                <span className="dashboard-settings-card__label">ชื่อผู้ใช้</span>
                <strong className="dashboard-settings-card__value">
                  {user.firstName} {user.lastName}
                </strong>
              </div>

              <div className="dashboard-settings-card__item">
                <span className="dashboard-settings-card__label">อายุ</span>
                <strong className="dashboard-settings-card__value">{user.age} ปี</strong>
              </div>

              <div className="dashboard-settings-card__item dashboard-settings-card__item--wide">
                <span className="dashboard-settings-card__label">เข้าสู่ระบบล่าสุด</span>
                <strong className="dashboard-settings-card__value">{lastLogin}</strong>
              </div>
            </div>

            <div className="dashboard-settings-card__actions">
              <button
                type="button"
                className="dashboard-action-button dashboard-action-button--secondary"
                onClick={onOpenRegister}
              >
                กลับไปหน้า Register
              </button>

              <button
                type="button"
                className="dashboard-action-button dashboard-action-button--primary"
                onClick={onLogout}
              >
                ออกจากระบบ
              </button>
            </div>
          </section>

          <section className="dashboard-settings-panel">
            <div className="dashboard-settings-panel__header">
              <div>
                <p className="dashboard-settings-panel__eyebrow">เวลาเล่นเริ่มต้น</p>
                <h2 className="dashboard-settings-panel__title">กำหนดเวลาต่อรอบ</h2>
              </div>
            </div>

            <p className="dashboard-settings-panel__copy">
              ค่าเริ่มต้นยังเป็น 3 นาทีเหมือนเดิม แต่สามารถปรับให้สั้นลงหรือยาวขึ้นได้ตามที่ถนัด
            </p>

            <div className="dashboard-settings-stepper">
              <div>
                <strong className="dashboard-settings-stepper__value">
                  {gameSettings.durationMinutes} นาที
                </strong>
                <p className="dashboard-settings-stepper__hint">
                  ใช้ได้ตั้งแต่ {MIN_GAME_DURATION_MINUTES} ถึง{" "}
                  {MAX_GAME_DURATION_MINUTES} นาที
                </p>
              </div>

              <div className="dashboard-settings-stepper__control">
                <button
                  type="button"
                  className="dashboard-settings-stepper__button"
                  onClick={() => updateDuration(-1)}
                  disabled={gameSettings.durationMinutes <= MIN_GAME_DURATION_MINUTES}
                  aria-label="ลดเวลาเล่น"
                >
                  -
                </button>

                <button
                  type="button"
                  className="dashboard-settings-stepper__button"
                  onClick={() => updateDuration(1)}
                  disabled={gameSettings.durationMinutes >= MAX_GAME_DURATION_MINUTES}
                  aria-label="เพิ่มเวลาเล่น"
                >
                  +
                </button>
              </div>
            </div>

            <p className="dashboard-settings-panel__note">
              เวลาที่ตั้งไว้นี้จะถูกใช้ตอนเริ่มเกมรอบใหม่ทุกเกม
            </p>
          </section>

          <section className="dashboard-settings-panel">
            <div className="dashboard-settings-panel__header">
              <div>
                <p className="dashboard-settings-panel__eyebrow">ระดับความยาก</p>
                <h2 className="dashboard-settings-panel__title">เลือกความยากที่เหมาะกับตัวเอง</h2>
              </div>
            </div>

            <p className="dashboard-settings-panel__copy">
              ค่าเริ่มต้นคือ <strong>ปานกลาง</strong> ซึ่งจะคงรูปแบบเกมเหมือนเวอร์ชันปัจจุบัน
              ส่วนง่ายและยากจะปรับแค่เล็กน้อยเพื่อไม่ให้เปลี่ยนหน้าตาเกมมากเกินไป
            </p>

            <div className="dashboard-settings-choice-grid">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`dashboard-settings-choice ${
                    option.id === gameSettings.difficulty ? "is-active" : ""
                  }`}
                  onClick={() => updateDifficulty(option.id)}
                  aria-pressed={option.id === gameSettings.difficulty}
                >
                  <span className="dashboard-settings-choice__label">{option.label}</span>
                  <p className="dashboard-settings-choice__copy">{option.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="dashboard-settings-panel">
            <div className="dashboard-settings-panel__header">
              <div>
                <p className="dashboard-settings-panel__eyebrow">ผลของความยาก</p>
                <h2 className="dashboard-settings-panel__title">แต่ละเกมจะถูกปรับอะไรบ้าง</h2>
              </div>
            </div>

            <p className="dashboard-settings-panel__copy">
              ตอนนี้กำลังใช้ระดับ <strong>{selectedDifficulty.label}</strong> และผลที่แต่ละเกมจะถูก
              ปรับมีดังนี้
            </p>

            <div className="dashboard-settings-impact-list">
              {difficultySummaries.map((game, index) => (
                <article key={game.gameId} className="dashboard-settings-impact-item">
                  <span className="dashboard-settings-impact-item__badge" aria-hidden="true">
                    {index + 1}
                  </span>

                  <div className="dashboard-settings-impact-item__content">
                    <h3 className="dashboard-settings-impact-item__title">{game.titleTh}</h3>
                    <p className="dashboard-settings-impact-item__copy">{game.summary}</p>
                  </div>
                </article>
              ))}
            </div>

            <p className="dashboard-settings-panel__note">
              หากเปลี่ยนระดับใหม่ เกมจะใช้ค่าที่เลือกทันทีเมื่อเริ่มรอบถัดไป
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

export default DashboardSettingsTab;
