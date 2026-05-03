import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/visual-search.css';
import { useGameSessionLogger } from '../hooks/useGameSessionLogger';
import { getGameDifficultyProfile, getStoredGameSettings } from '../utils/gameSettings';
import GameOverProgressSummary from '../components/game/GameOverProgressSummary';

// ==========================================
// ข้อมูลรูปร่างและสี
// ==========================================
const SHAPES = [
    { id: 'circle', name: 'วงกลม' },
    { id: 'square', name: 'สี่เหลี่ยม' },
    { id: 'triangle', name: 'สามเหลี่ยม' },
    { id: 'star', name: 'ดาว' },
    { id: 'heart', name: 'หัวใจ' }
];

const COLORS = [
    { id: '#ff5252', name: 'สีแดง' },
    { id: '#4faeff', name: 'สีฟ้า' },
    { id: '#75db73', name: 'สีเขียว' },
    { id: '#ffab1a', name: 'สีส้ม' },
    { id: '#a66bff', name: 'สีม่วง' }
];

const ShapeIcon = ({ type, color }) => {
    switch (type) {
        case 'circle': return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" fill={color} /></svg>;
        case 'square': return <svg viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="10" width="80" height="80" rx="15" fill={color} /></svg>;
        case 'triangle': return <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,10 95,90 5,90" fill={color} strokeLinejoin="round" /></svg>;
        case 'star': return <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,5 64,35 97,38 72,60 79,93 50,75 21,93 28,60 3,38 36,35" fill={color} /></svg>;
        case 'heart': return <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50,90 C50,90 5,60 5,30 C5,12 25,5 40,18 C50,28 50,28 50,28 C50,28 50,28 60,18 C75,5 95,12 95,30 C95,60 50,90 50,90 Z" fill={color} /></svg>;
        default: return null;
    }
};

const WRONG_PENALTY = 5;
const WIN_MESSAGES = ["ตาไวมากครับ!", "กวาดสายตาได้เยี่ยม!", "สแกนภาพได้รวดเร็ว!", "สมาธิดีเยี่ยม!", "ถูกต้องและรวดเร็ว!"];

export default function VisualSearchGame() {
    const navigate = useNavigate();
    const [gameSettings] = useState(() => getStoredGameSettings());
    const difficultyProfile = getGameDifficultyProfile('visual-search', gameSettings.difficulty);
    const gameDuration = gameSettings.durationMinutes * 60;

    const [gameState, setGameState] = useState({
        level: 1,
        score: 0,
        gridSize: difficultyProfile.initialGridSize,
        boardsCleared: 0,
        consecutiveWins: 0,
        hasStarted: false,
        isGameOver: false,
    });

    const [timeLeft, setTimeLeft] = useState(gameDuration);
    const [items, setItems] = useState([]);
    const [target, setTarget] = useState(null);
    const [isRoundOver, setIsRoundOver] = useState(false);

    const [message, setMessage] = useState("กวาดสายตาหาเป้าหมายให้เร็วที่สุด");
    const [showProgress, setShowProgress] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isScorePenaltyActive, setIsScorePenaltyActive] = useState(false);
    const [isProgressReady, setIsProgressReady] = useState(false);

    const stateRef = useRef(gameState);
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

    useEffect(() => { stateRef.current = gameState; }, [gameState]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

    const { startSession, stopSession, recordRoundStart, recordCorrect, recordMistake } = useGameSessionLogger({
        gameId: 'visual-search',
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

        if (type === 'pop') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'win') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    }, []);

    const createParticles = (x, y, color) => {
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'visual-search-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.width = Math.random() * 8 + 6 + 'px';
            p.style.height = p.style.width;
            p.style.backgroundColor = color;
            p.style.borderRadius = '50%';

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            document.body.appendChild(p);

            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
            ], { duration: 500, easing: 'ease-out' }).onfinish = () => p.remove();
        }
    };

    const endGame = useCallback(() => {
        setGameState(prev => ({ ...prev, isGameOver: true }));
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

    const startNewBoard = useCallback(() => {
        if (stateRef.current.isGameOver || isPausedRef.current) return;

        const currentSize = stateRef.current.gridSize;
        const totalItems = currentSize * currentSize;

        const targetShapeObj = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const targetColorObj = COLORS[Math.floor(Math.random() * COLORS.length)];
        const newTarget = { shape: targetShapeObj, color: targetColorObj };
        setTarget(newTarget);

        const targetIndex = Math.floor(Math.random() * totalItems);
        const newItems = [];

        for (let i = 0; i < totalItems; i++) {
            if (i === targetIndex) {
                newItems.push({
                    id: i,
                    shapeId: targetShapeObj.id,
                    colorId: targetColorObj.id,
                    isTarget: true,
                    status: 'normal'
                });
            } else {
                let dShapeObj = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                let dColorObj = COLORS[Math.floor(Math.random() * COLORS.length)];

                while (dShapeObj.id === targetShapeObj.id && dColorObj.id === targetColorObj.id) {
                    dColorObj = COLORS[Math.floor(Math.random() * COLORS.length)];
                }

                newItems.push({
                    id: i,
                    shapeId: dShapeObj.id,
                    colorId: dColorObj.id,
                    isTarget: false,
                    status: 'normal'
                });
            }
        }

        setItems(newItems);
        setIsRoundOver(false);
        setMessage('หาให้เจอว่าอยู่ตรงไหน!');
        setShowProgress(false);
        setProgressPercent(0);
        recordRoundStart();

    }, [recordRoundStart]);

    const handleItemClick = (index, event) => {
        if (isPausedRef.current || isRoundOver || stateRef.current.isGameOver) return;

        const clickedItem = items[index];

        if (clickedItem.isTarget) {
            recordCorrect({ completedRound: true });
            playSound('pop');
            playSound('win');
            createParticles(event.clientX, event.clientY, clickedItem.colorId);

            setItems(prevItems => prevItems.map((item, i) => ({
                ...item,
                status: i === index ? 'correct' : 'fade'
            })));

            handleBoardClear();
        } else {
            playSound('wrong');
            applyWrongPenalty();

            setItems(prevItems => {
                const newItems = [...prevItems];
                newItems[index].status = 'wrong';
                return newItems;
            });

            setTimeout(() => {
                setItems(currentItems => {
                    const resetItems = [...currentItems];
                    if (resetItems[index] && resetItems[index].status === 'wrong') {
                        resetItems[index].status = 'normal';
                    }
                    return resetItems;
                });
            }, 400);
        }
    };

    const handleBoardClear = () => {
        setIsRoundOver(true);

        setGameState(prev => {
            const nextState = { ...prev };
            nextState.score += (prev.gridSize * prev.gridSize * 2);
            nextState.boardsCleared += 1;
            nextState.consecutiveWins += 1;

            setMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);

            if (
                nextState.consecutiveWins >= difficultyProfile.winsToGrow &&
                nextState.gridSize < difficultyProfile.maxGridSize
            ) {
                nextState.gridSize += 1;
                nextState.level += 1;
                nextState.consecutiveWins = 0;
            }

            scheduleAction(() => {
                if (stateRef.current.isGameOver || isPausedRef.current) return;
                setShowProgress(true);
                setProgressPercent(0);
                requestAnimationFrame(() => requestAnimationFrame(() => setProgressPercent(100)));
                scheduleAction(startNewBoard, 800);
            }, 600);

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
            level: 1,
            score: 0,
            gridSize: difficultyProfile.initialGridSize,
            boardsCleared: 0,
            consecutiveWins: 0,
            hasStarted: true,
            isGameOver: false
        });
        setIsPaused(false);
        setIsScorePenaltyActive(false);
        isPausedRef.current = false;
        clearTimeout(scorePenaltyTimeoutRef.current);
        setShowProgress(false);
        setProgressPercent(0);
        setIsRoundOver(false);

        startSession();
        startTimer();
        startNewBoard();
    };

    useEffect(() => {
        return () => {
            clearInterval(timerIntervalRef.current);
            clearScheduledAction();
            clearTimeout(scorePenaltyTimeoutRef.current);
        };
    }, [clearScheduledAction]);

    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    const isLowTime = timeLeft <= 10 && gameState.hasStarted;
    // ล็อกขนาดตารางตามจำนวนชิ้นที่กำลังแสดงจริง เพื่อลดอาการกระดานกระโดดก่อนเปลี่ยนรอบ
    const renderedGridSize = items.length > 0 ? Math.round(Math.sqrt(items.length)) : gameState.gridSize;
    const boardGap = renderedGridSize >= 4 ? '10px' : '12px';
    const boardPadding = renderedGridSize >= 4 ? '14px' : '16px';

    return (
        <div className="visual-search-app">
            <div className="visual-search-header">
                {gameState.hasStarted && !gameState.isGameOver && (
                    <button
                        type="button"
                        className={`visual-search-btn-pause ${isPaused ? 'is-paused' : ''}`}
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
                    className="visual-search-btn-back"
                    onClick={() => navigate('/games')}
                    aria-label="กลับไปหน้าเลือกเกม"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>arrow_back</span>
                </button>
                <h1>ค้นหาเป้าหมาย</h1>
                <div className="visual-search-stats">
                    <div className={`visual-search-stat-item timer ${isLowTime ? 'low-time' : ''}`}>
                        เวลา: <span>{mins}:{secs}</span>
                    </div>
                </div>
            </div>

            <div className="visual-search-game-container">
                <div className={`visual-search-current-score ${isScorePenaltyActive ? 'is-penalty' : ''}`}>
                    {gameState.score}
                </div>

                {gameState.hasStarted && !gameState.isGameOver && target && (
                    <div className="visual-search-instruction-box">
                        หา
                        <span className="highlight" style={{ color: target.color.id }}>
                            {target.shape.name} {target.color.name}
                        </span>
                        <div className="visual-search-target-preview">
                            <ShapeIcon type={target.shape.id} color={target.color.id} />
                        </div>
                    </div>
                )}

                <div
                    className="visual-search-board"
                    style={{
                        gridTemplateColumns: `repeat(${renderedGridSize}, 1fr)`,
                        gap: boardGap,
                        padding: boardPadding,
                        opacity: gameState.isGameOver ? 0.3 : 1
                    }}
                >
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className={`visual-search-item ${item.status}`}
                            onClick={(e) => handleItemClick(index, e)}
                        >
                            <ShapeIcon type={item.shapeId} color={item.colorId} />
                        </div>
                    ))}
                </div>

                <div className="visual-search-message-box">
                    <div className="visual-search-message">{message}</div>
                    <div className="visual-search-auto-progress-container" style={{ opacity: showProgress ? 1 : 0 }}>
                        <div className="visual-search-auto-progress-bar" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>

                {isPaused && (
                    <div className="visual-search-pause-overlay" role="dialog" aria-live="polite" aria-label="หยุดเกมชั่วคราว">
                        <div className="visual-search-pause-card">
                            <span className="material-symbols-outlined visual-search-pause-icon" aria-hidden="true">pause_circle</span>
                            <h2>หยุดเกมชั่วคราว</h2>
                            <div className="visual-search-pause-actions">
                                <button type="button" className="visual-search-btn-resume" onClick={togglePause}>
                                    เล่นต่อ
                                </button>
                                <button type="button" className="visual-search-btn-reset" onClick={startGameInit}>
                                    เริ่มใหม่
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!gameState.hasStarted && (
                <div className="visual-search-controls">
                    <button className="visual-search-btn-start" onClick={startGameInit}>
                        {`เริ่มเกม ${gameSettings.durationMinutes} นาที!`}
                    </button>
                </div>
            )}

            {gameState.isGameOver && (
                <div className="visual-search-overlay game-over-overlay">
                    <GameOverProgressSummary
                        gameId="visual-search"
                        currentScore={gameState.score}
                        isReady={isProgressReady}
                        summaryLabel={'\u0e2b\u0e32\u0e40\u0e1b\u0e49\u0e32\u0e2b\u0e21\u0e32\u0e22'}
                        summaryValue={`${gameState.boardsCleared} \u0e04\u0e23\u0e31\u0e49\u0e07`}
                    />
                    <div className="game-over-overlay__actions">
                        <button className="visual-search-btn-restart" onClick={startGameInit}>เล่นใหม่อีกรอบ</button>
                        <button className="visual-search-btn-exit" onClick={() => navigate('/games')}>กลับไปหน้าเลือกเกม</button>
                    </div>
                </div>
            )}
        </div>
    );
}
