import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/memory-matrix.css';
import { useGameSessionLogger } from '../hooks/useGameSessionLogger';
import { getGameDifficultyProfile, getStoredGameSettings } from '../utils/gameSettings';
import GameOverProgressSummary from '../components/game/GameOverProgressSummary';

const WRONG_PENALTY = 5;
const WIN_MESSAGES = ["ยอดเยี่ยมมากครับ!", "จำแม่นสุดๆ!", "เก่งที่สุดเลย!", "สมาธิดีเยี่ยม!", "เยี่ยมไปเลย!"];

export default function MemoryMatrixGame() {
    const navigate = useNavigate();
    const [gameSettings] = useState(() => getStoredGameSettings());
    const difficultyProfile = getGameDifficultyProfile('memory-matrix', gameSettings.difficulty);
    const gameDuration = gameSettings.durationMinutes * 60;

    // --- State Setup ---
    const [gameState, setGameState] = useState({
        level: 1,
        score: 0,
        gridSize: 4,
        tileCount: difficultyProfile.initialTileCount,
        streak: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        isPlaying: false,
        isGameOver: false,
        hasStarted: false,
    });

    // Timer state
    const [timeLeft, setTimeLeft] = useState(gameDuration);

    // UI states
    const [message, setMessage] = useState("กดปุ่มเริ่มเกมเพื่อเริ่มการฝึกครับ");
    const [tileStatus, setTileStatus] = useState({}); // { index: 'active' | 'correct' | 'wrong' }
    const [showProgress, setShowProgress] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isScorePenaltyActive, setIsScorePenaltyActive] = useState(false);
    const [isProgressReady, setIsProgressReady] = useState(false);

    // Refs for mutable values that shouldn't trigger re-render
    const stateRef = useRef(gameState);
    const correctTilesRef = useRef([]);
    const userSelectionsRef = useRef([]);
    const isShowingTilesRef = useRef(false);
    const timerIntervalRef = useRef(null);
    const autoTimerRef = useRef(null);
    const audioCtxRef = useRef(null);
    const timeLeftRef = useRef(timeLeft);
    const isPausedRef = useRef(isPaused);
    const sessionVersionRef = useRef(0);
    const scheduledCallbackRef = useRef(null);
    const scheduledDelayRef = useRef(0);
    const scheduledStartedAtRef = useRef(0);
    const scorePenaltyTimeoutRef = useRef(null);

    // Sync ref with state for callbacks
    useEffect(() => {
        stateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const { startSession, stopSession, recordRoundStart, recordCorrect, recordMistake } = useGameSessionLogger({
        gameId: 'memory-matrix',
        getSnapshot: () => ({
            score: stateRef.current.score,
            levelReached: stateRef.current.level,
        }),
    });

    const triggerScorePenaltyFeedback = useCallback(() => {
        clearTimeout(scorePenaltyTimeoutRef.current);
        setIsScorePenaltyActive(true);
        scorePenaltyTimeoutRef.current = setTimeout(() => {
            setIsScorePenaltyActive(false);
        }, 700);
    }, []);

    const applyWrongPenalty = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            score: Math.max(0, prev.score - WRONG_PENALTY),
        }));
        recordMistake();
        triggerScorePenaltyFeedback();
    }, [recordMistake, triggerScorePenaltyFeedback]);

    // --- Audio System ---
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const playSound = useCallback((type) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
            osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2); // A2
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'start') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        }
    }, []);

    // --- Particles Effect ---
    const createParticles = (x, y, color) => {
        for (let i = 0; i < 12; i++) {
            const p = document.createElement('div');
            p.className = 'memory-matrix-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.width = Math.random() * 8 + 4 + 'px';
            p.style.height = p.style.width;
            p.style.backgroundColor = color;

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            document.body.appendChild(p);

            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
            ], { duration: 600, easing: 'ease-out' }).onfinish = () => p.remove();
        }
    };

    // --- Core Game Logic ---
    const adjustDifficulty = (currentState, dir) => {
        let { tileCount } = currentState;
        if (dir > 0) {
            tileCount = Math.min(difficultyProfile.maxTileCount, tileCount + 1);
        } else {
            tileCount = Math.max(difficultyProfile.minTileCount, tileCount - 1);
        }
        return { gridSize: 4, tileCount };
    };

    const endGame = useCallback(() => {
        setGameState(prev => ({ ...prev, isGameOver: true, isPlaying: false }));
        setIsProgressReady(false);
        setIsPaused(false);
        setIsScorePenaltyActive(false);
        isPausedRef.current = false;
        clearInterval(timerIntervalRef.current);
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
        scheduledCallbackRef.current = null;
        scheduledDelayRef.current = 0;
        scheduledStartedAtRef.current = 0;
        clearTimeout(scorePenaltyTimeoutRef.current);
        const sessionVersion = sessionVersionRef.current;
        void stopSession('time_up').finally(() => {
            if (sessionVersionRef.current === sessionVersion) {
                setIsProgressReady(true);
            }
        });
    }, [stopSession]);

    const clearScheduledAction = useCallback(() => {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
        scheduledCallbackRef.current = null;
        scheduledDelayRef.current = 0;
        scheduledStartedAtRef.current = 0;
    }, []);

    const scheduleAction = useCallback((callback, delay) => {
        clearTimeout(autoTimerRef.current);
        scheduledCallbackRef.current = callback;
        scheduledDelayRef.current = delay;
        scheduledStartedAtRef.current = Date.now();
        autoTimerRef.current = setTimeout(() => {
            autoTimerRef.current = null;
            const nextCallback = scheduledCallbackRef.current;
            scheduledCallbackRef.current = null;
            scheduledDelayRef.current = 0;
            scheduledStartedAtRef.current = 0;
            if (nextCallback) {
                nextCallback();
            }
        }, delay);
    }, []);

    const pauseScheduledAction = useCallback(() => {
        if (!autoTimerRef.current || !scheduledCallbackRef.current) return;
        const elapsed = Date.now() - scheduledStartedAtRef.current;
        scheduledDelayRef.current = Math.max(0, scheduledDelayRef.current - elapsed);
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
    }, []);

    const resumeScheduledAction = useCallback(() => {
        if (autoTimerRef.current || !scheduledCallbackRef.current) return;
        scheduledStartedAtRef.current = Date.now();
        autoTimerRef.current = setTimeout(() => {
            autoTimerRef.current = null;
            const nextCallback = scheduledCallbackRef.current;
            scheduledCallbackRef.current = null;
            scheduledDelayRef.current = 0;
            scheduledStartedAtRef.current = 0;
            if (nextCallback) {
                nextCallback();
            }
        }, scheduledDelayRef.current);
    }, []);

    const resumeTimer = useCallback(() => {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    timeLeftRef.current = 0;
                    endGame();
                    return 0;
                }
                const nextValue = prev - 1;
                timeLeftRef.current = nextValue;
                return nextValue;
            });
        }, 1000);
    }, [endGame]);

    const startTimer = useCallback(() => {
        clearInterval(timerIntervalRef.current);
        setTimeLeft(gameDuration);
        timeLeftRef.current = gameDuration;
        resumeTimer();
    }, [gameDuration, resumeTimer]);

    const runRound = useCallback(() => {
        const current = stateRef.current;
        if (current.isGameOver || isPausedRef.current) return;

        setGameState(prev => ({ ...prev, isPlaying: true }));
        userSelectionsRef.current = [];
        setTileStatus({});
        setShowProgress(false);
        setProgressPercent(0);
        setMessage('สังเกตตำแหน่งสีฟ้าให้ดีนะครับ...');

        const totalTiles = current.gridSize * current.gridSize;
        const correctTiles = [];
        while (correctTiles.length < current.tileCount) {
            const idx = Math.floor(Math.random() * totalTiles);
            if (!correctTiles.includes(idx)) correctTiles.push(idx);
        }
        correctTilesRef.current = correctTiles;

        isShowingTilesRef.current = true;

        scheduleAction(() => {
            if (stateRef.current.isGameOver || isPausedRef.current) return;
            playSound('start');

            // Show tiles
            const newStatus = {};
            correctTiles.forEach(idx => { newStatus[idx] = 'active'; });
            setTileStatus(newStatus);

            const duration = Math.max(
                difficultyProfile.revealMinMs,
                difficultyProfile.revealBaseMs - (current.level * difficultyProfile.revealPerLevelMs)
            );

            scheduleAction(() => {
                if (stateRef.current.isGameOver || isPausedRef.current) return;
                setTileStatus({}); // Hide tiles
                isShowingTilesRef.current = false;
                setMessage('เลือกที่จำได้เลยครับ!');
                recordRoundStart();
            }, duration);

        }, 500);
    }, [playSound, recordRoundStart, scheduleAction]);

    const handleTileClick = (index, event) => {
        const current = stateRef.current;
        if (isPausedRef.current || isShowingTilesRef.current || !current.isPlaying || current.isGameOver || userSelectionsRef.current.includes(index)) {
            return;
        }

        if (correctTilesRef.current.includes(index)) {
            recordCorrect({ completedRound: userSelectionsRef.current.length + 1 === correctTilesRef.current.length });
            // กดถูก
            playSound('correct');
            createParticles(event.clientX, event.clientY, '#4caf50');

            userSelectionsRef.current.push(index);
            setTileStatus(prev => ({ ...prev, [index]: 'correct' }));

            if (userSelectionsRef.current.length === correctTilesRef.current.length) {
                endRound(true);
            }
        } else {
            // กดผิด
            playSound('wrong');
            applyWrongPenalty();

            // Show incorrect and reveal remaining correct ones
            const revealStatus = { [index]: 'wrong' };
            correctTilesRef.current.forEach(idx => {
                if (!userSelectionsRef.current.includes(idx)) {
                    revealStatus[idx] = 'active'; // reveal what was missed
                } else {
                    revealStatus[idx] = 'correct'; // keep previously found correct ones
                }
            });
            setTileStatus(revealStatus);

            endRound(false);
        }
    };

    const endRound = (isWin) => {
        setGameState(prev => {
            const nextState = { ...prev, isPlaying: false };
            let lvUp = false;

            if (isWin) {
                nextState.score = prev.score + (prev.level * 10) + (prev.streak * 2);
                nextState.streak = prev.streak + 1;
                nextState.consecutiveWins = prev.consecutiveWins + 1;
                nextState.consecutiveLosses = 0;
                setMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);

                if (nextState.consecutiveWins >= 2) {
                    nextState.level += 1;
                    nextState.consecutiveWins = 0;
                    lvUp = true;
                    Object.assign(nextState, adjustDifficulty(nextState, 1));
                }
            } else {
                nextState.consecutiveLosses = prev.consecutiveLosses + 1;
                nextState.consecutiveWins = 0;
                nextState.streak = 0;
                setMessage('ไม่เป็นไรครับ เริ่มใหม่ได้!');

                if (nextState.consecutiveLosses >= 2 && prev.level > 1) {
                    nextState.level -= 1;
                    nextState.consecutiveLosses = 0;
                    lvUp = true;
                    Object.assign(nextState, adjustDifficulty(nextState, -1));
                }
            }

            // Schedule next round
            scheduleAction(() => {
                if (stateRef.current.isGameOver || isPausedRef.current) return;
                setMessage('รอบต่อไปกำลังจะเริ่ม...');
                setShowProgress(true);
                setProgressPercent(0);
                requestAnimationFrame(() => requestAnimationFrame(() => setProgressPercent(100)));
                scheduleAction(runRound, 1200);
            }, 800);

            return nextState;
        });
    };

    const togglePause = useCallback(() => {
        if (!stateRef.current.hasStarted || stateRef.current.isGameOver) return;

        if (isPausedRef.current) {
            isPausedRef.current = false;
            setIsPaused(false);
            if (timeLeftRef.current > 0) {
                resumeTimer();
            }
            resumeScheduledAction();
            return;
        }

        isPausedRef.current = true;
        setIsPaused(true);
        clearInterval(timerIntervalRef.current);
        pauseScheduledAction();
    }, [pauseScheduledAction, resumeScheduledAction, resumeTimer]);

    const startGameInit = () => {
        void stopSession('manual_stop');
        sessionVersionRef.current += 1;
        setIsProgressReady(false);
        initAudio();
        clearScheduledAction();
        setGameState({
            level: 1, score: 0, gridSize: 4, tileCount: difficultyProfile.initialTileCount, streak: 0,
            consecutiveWins: 0, consecutiveLosses: 0,
            isPlaying: false, isGameOver: false, hasStarted: true
        });
        setIsPaused(false);
        setIsScorePenaltyActive(false);
        isPausedRef.current = false;
        clearTimeout(scorePenaltyTimeoutRef.current);
        setTileStatus({});
        userSelectionsRef.current = [];
        isShowingTilesRef.current = false;
        setShowProgress(false);
        setProgressPercent(0);
        startSession();
        startTimer();
        // Wait a tiny bit for state to set before running first round
        scheduleAction(runRound, 100);
    };

    // Cleanup timers
    useEffect(() => {
        return () => {
            clearInterval(timerIntervalRef.current);
            clearScheduledAction();
            clearTimeout(scorePenaltyTimeoutRef.current);
        };
    }, [clearScheduledAction]);

    // Format time display
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    const isLowTime = timeLeft <= 10 && gameState.hasStarted;

    return (
        <div className="memory-matrix-app">
            <div className="memory-matrix-header">
                {gameState.hasStarted && !gameState.isGameOver && (
                    <button
                        type="button"
                        className={`memory-matrix-btn-pause ${isPaused ? 'is-paused' : ''}`}
                        onClick={togglePause}
                        aria-label={isPaused ? 'เล่นเกมต่อ' : 'หยุดเกมชั่วคราว'}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.45rem' }}>
                            {isPaused ? 'play_arrow' : 'pause'}
                        </span>
                    </button>
                )}
                <button
                    type="button"
                    className="memory-matrix-btn-back"
                    onClick={() => navigate('/games')}
                    aria-label="กลับไปหน้าเลือกเกม"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>arrow_back</span>
                </button>
                <h1>จำตำแหน่งไฟ</h1>
                <div className="memory-matrix-stats">
                    <div className={`memory-matrix-stat-item timer ${isLowTime ? 'low-time' : ''}`}>
                        เวลา: <span>{mins}:{secs}</span>
                    </div>
                    <div className="memory-matrix-stat-item">เลเวล: <span>{gameState.level}</span></div>
                </div>
            </div>

            <div className="memory-matrix-game-container">
                <div className={`memory-matrix-current-score ${isScorePenaltyActive ? 'is-penalty' : ''}`}>
                    {gameState.score}
                </div>

                <div
                    className="memory-matrix-grid"
                    style={{
                        gridTemplateColumns: `repeat(${gameState.gridSize}, 1fr)`,
                        opacity: gameState.isGameOver ? 0.3 : 1
                    }}
                >
                    {Array.from({ length: gameState.gridSize * gameState.gridSize }).map((_, i) => (
                        <div
                            key={i}
                            className={`memory-matrix-tile ${tileStatus[i] ? 'memory-matrix-tile--' + tileStatus[i] : ''} ${tileStatus[i] || ''}`}
                            onClick={(e) => handleTileClick(i, e)}
                        />
                    ))}
                </div>

                <div className="memory-matrix-message-box">
                    <div className="memory-matrix-message">{message}</div>

                    <div className="memory-matrix-streak-info" style={{ opacity: gameState.streak > 1 ? 1 : 0 }}>
                        ต่อเนื่อง: <span>{gameState.streak}</span> ครั้ง
                    </div>

                    <div className="memory-matrix-auto-progress-container" style={{ opacity: showProgress ? 1 : 0 }}>
                        <div className="memory-matrix-auto-progress-bar" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>

                {isPaused && (
                    <div className="memory-matrix-pause-overlay" role="dialog" aria-live="polite" aria-label="หยุดเกมชั่วคราว">
                        <div className="memory-matrix-pause-card">
                            <span className="material-symbols-outlined memory-matrix-pause-icon" aria-hidden="true">pause_circle</span>
                            <h2>หยุดเกมชั่วคราว</h2>
                            <div className="memory-matrix-pause-actions">
                                <button type="button" className="memory-matrix-btn-resume" onClick={togglePause}>
                                    เล่นต่อ
                                </button>
                                <button type="button" className="memory-matrix-btn-reset" onClick={startGameInit}>
                                    เริ่มใหม่
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!gameState.hasStarted && (
                <div className="memory-matrix-controls">
                    <button className="memory-matrix-btn-start" onClick={startGameInit}>
                        {`เริ่มเล่น ${gameSettings.durationMinutes} นาที!`}
                    </button>
                </div>
            )}

            {gameState.isGameOver && (
                <div className="memory-matrix-overlay game-over-overlay">
                    <GameOverProgressSummary
                        gameId="memory-matrix"
                        currentScore={gameState.score}
                        isReady={isProgressReady}
                        summaryLabel={'\u0e40\u0e25\u0e40\u0e27\u0e25'}
                        summaryValue={gameState.level}
                    />
                    <div className="game-over-overlay__actions">
                        <button className="memory-matrix-btn-restart" onClick={startGameInit}>เล่นใหม่อีกรอบ</button>
                        <button className="memory-matrix-btn-exit" onClick={() => navigate('/games')}>กลับไปหน้าเลือกเกม</button>
                    </div>
                </div>
            )}
        </div>
    );
}
