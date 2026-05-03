import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/number-ordering.css';
import { useGameSessionLogger } from '../hooks/useGameSessionLogger';
import { getGameDifficultyProfile, getStoredGameSettings } from '../utils/gameSettings';
import GameOverProgressSummary from '../components/game/GameOverProgressSummary';

// ==========================================
// ข้อมูลสีและการสุ่มตำแหน่ง
// ==========================================
const BUBBLE_COLORS = [
    'var(--bubble-green)', 'var(--bubble-orange)', 'var(--bubble-pink)',
    'var(--bubble-blue)', 'var(--bubble-purple)', 'var(--bubble-red)',
    'var(--bubble-teal)', 'var(--bubble-yellow)'
];

const WRONG_PENALTY = 5;
const WIN_MESSAGES = ["ยอดเยี่ยมมาก!", "แม่นยำสุดๆ!", "สมองประมวลผลไวมาก!", "สมาธิดีเยี่ยม!", "ถูกต้องครบถ้วน!"];

// ฟังก์ชันแบ่ง Grid เพื่อสุ่มตำแหน่งลูกโป่งไม่ให้ทับซ้อนกันมากเกินไป
const getRandomPositions = (count) => {
    const gridCols = 3;
    const gridRows = 4;
    const cells = [];

    for(let r=0; r<gridRows; r++) {
        for(let c=0; c<gridCols; c++) {
            cells.push({ r, c });
        }
    }

    const shuffledCells = cells.sort(() => 0.5 - Math.random()).slice(0, count);

    return shuffledCells.map(cell => {
        const cellWidth = 100 / gridCols;
        const cellHeight = 100 / gridRows;

        const offsetX = (Math.random() * 10) - 5;
        const offsetY = (Math.random() * 10) - 5;

        const left = (cell.c * cellWidth) + (cellWidth / 2) - 10 + offsetX;
        const top = (cell.r * cellHeight) + (cellHeight / 2) - 10 + offsetY;

        return {
            left: Math.max(5, Math.min(left, 75)) + '%',
            top: Math.max(5, Math.min(top, 80)) + '%'
        };
    });
};

export default function NumberOrderingGame() {
    const navigate = useNavigate();
    const [gameSettings] = useState(() => getStoredGameSettings());
    const difficultyProfile = getGameDifficultyProfile('number-ordering', gameSettings.difficulty);
    const gameDuration = gameSettings.durationMinutes * 60;

    const [gameState, setGameState] = useState({
        level: 1,
        score: 0,
        bubbleCount: difficultyProfile.initialBubbleCount,
        boardsCleared: 0,
        hasStarted: false,
        isGameOver: false,
    });

    const [timeLeft, setTimeLeft] = useState(gameDuration);
    const [bubbles, setBubbles] = useState([]);
    const [orderType, setOrderType] = useState('asc'); // 'asc' = น้อยไปมาก, 'desc' = มากไปน้อย
    const [expectedValues, setExpectedValues] = useState([]); // Array เก็บตัวเลขที่ถูกต้องตามลำดับ
    const [currentIndex, setCurrentIndex] = useState(0); // ลำดับที่กำลังรอกด
    const [isRoundOver, setIsRoundOver] = useState(false);

    const [message, setMessage] = useState("ดูโจทย์ด้านบน แล้วกดตัวเลขตามลำดับ");
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
        gameId: 'number-ordering',
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
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
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
            p.className = 'number-ordering-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.width = Math.random() * 10 + 5 + 'px';
            p.style.height = p.style.width;
            p.style.backgroundColor = color;
            p.style.borderRadius = '50%';

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 50;
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

        const count = stateRef.current.bubbleCount;

        const nums = [];
        while(nums.length < count) {
            const r = Math.floor(Math.random() * difficultyProfile.maxNumber) + 1;
            if(!nums.includes(r)) nums.push(r);
        }

        const positions = getRandomPositions(count);
        const shuffledColors = [...BUBBLE_COLORS].sort(() => 0.5 - Math.random());

        const newBubbles = nums.map((val, idx) => ({
            id: idx,
            value: val,
            color: shuffledColors[idx % shuffledColors.length],
            pos: positions[idx],
            isClicked: false,
            isWrong: false
        }));

        const newOrderType =
            difficultyProfile.orderMode === 'asc'
                ? 'asc'
                : Math.random() > 0.5 ? 'asc' : 'desc';

        const sorted = [...nums].sort((a, b) => newOrderType === 'asc' ? a - b : b - a);

        setBubbles(newBubbles);
        setOrderType(newOrderType);
        setExpectedValues(sorted);
        setCurrentIndex(0);
        setIsRoundOver(false);
        setMessage('กวาดสายตาหาตัวเลขให้เจอ!');
        setShowProgress(false);
        setProgressPercent(0);
        recordRoundStart();

    }, [recordRoundStart]);

    const handleBubbleClick = (index, value, colorStr, event) => {
        if (isPausedRef.current || isRoundOver || stateRef.current.isGameOver || bubbles[index].isClicked) return;

        if (value === expectedValues[currentIndex]) {
            recordCorrect({ completedRound: currentIndex + 1 === expectedValues.length });
            playSound('pop');

            const colorMatch = colorStr.match(/var\((--.*?)\)/);
            const rawColor = colorMatch ? getComputedStyle(document.documentElement).getPropertyValue(colorMatch[1]).trim() : '#fff';
            createParticles(event.clientX, event.clientY, rawColor);

            const newBubbles = [...bubbles];
            newBubbles[index].isClicked = true;
            setBubbles(newBubbles);

            if (currentIndex + 1 === expectedValues.length) {
                playSound('win');
                handleBoardClear();
            } else {
                setCurrentIndex(prev => prev + 1);
            }
        } else {
            playSound('wrong');
            applyWrongPenalty();

            const newBubbles = [...bubbles];
            newBubbles[index].isWrong = true;
            setBubbles(newBubbles);

            setTimeout(() => {
                setBubbles(currentBubbles => {
                    const resetBubbles = [...currentBubbles];
                    if (resetBubbles[index]) {
                        resetBubbles[index].isWrong = false;
                    }
                    return resetBubbles;
                });
            }, 400);
        }
    };

    const handleBoardClear = () => {
        setIsRoundOver(true);

        setGameState(prev => {
            const nextState = { ...prev };
            nextState.score += (prev.bubbleCount * 10);
            nextState.boardsCleared += 1;

            setMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);

            if (
                nextState.boardsCleared % difficultyProfile.boardsToGrow === 0 &&
                nextState.bubbleCount < difficultyProfile.maxBubbleCount
            ) {
                nextState.bubbleCount += 1;
                nextState.level += 1;
            }

            scheduleAction(() => {
                if (stateRef.current.isGameOver || isPausedRef.current) return;
                setShowProgress(true);
                setProgressPercent(0);
                requestAnimationFrame(() => requestAnimationFrame(() => setProgressPercent(100)));
                scheduleAction(startNewBoard, 1200);
            }, 500);

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
            bubbleCount: difficultyProfile.initialBubbleCount,
            boardsCleared: 0,
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

    return (
        <div className="number-ordering-app">
            <div className="number-ordering-header">
                {gameState.hasStarted && !gameState.isGameOver && (
                    <button
                        type="button"
                        className={`number-ordering-btn-pause ${isPaused ? 'is-paused' : ''}`}
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
                    className="number-ordering-btn-back"
                    onClick={() => navigate('/games')}
                    aria-label="กลับไปหน้าเลือกเกม"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>arrow_back</span>
                </button>
                <h1>เกมเรียงลำดับ</h1>
                <div className="number-ordering-stats">
                    <div className={`number-ordering-stat-item timer ${isLowTime ? 'low-time' : ''}`}>
                        เวลา: <span>{mins}:{secs}</span>
                    </div>
                </div>
            </div>

            <div className="number-ordering-game-container">
                <div className={`number-ordering-current-score ${isScorePenaltyActive ? 'is-penalty' : ''}`}>
                    {gameState.score}
                </div>

                {gameState.hasStarted && !gameState.isGameOver && (
                    <div key={gameState.boardsCleared} className={`number-ordering-instruction-box ${orderType}`}>
                        เรียงตัวเลขจาก
                        <span className="highlight">
                            {orderType === 'asc' ? 'น้อย ➡ มาก' : 'มาก ➡ น้อย'}
                        </span>
                    </div>
                )}

                <div className="number-ordering-bubble-board">
                    {bubbles.map((bubble, index) => {
                        let bClass = "number-ordering-bubble";
                        if (bubble.isClicked) bClass += " clicked";
                        if (bubble.isWrong) bClass += " wrong";

                        const fontSize = bubble.value > 9 ? '1.8rem' : '2.2rem';

                        return (
                            <div
                                key={bubble.id}
                                className={bClass}
                                style={{
                                    backgroundColor: bubble.color,
                                    left: bubble.pos.left,
                                    top: bubble.pos.top,
                                    fontSize
                                }}
                                onClick={(e) => handleBubbleClick(index, bubble.value, bubble.color, e)}
                            >
                                {bubble.value}
                            </div>
                        );
                    })}
                </div>

                <div className="number-ordering-message-box">
                    <div className="number-ordering-message">{message}</div>
                    <div className="number-ordering-auto-progress-container" style={{ opacity: showProgress ? 1 : 0 }}>
                        <div className="number-ordering-auto-progress-bar" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>

                {isPaused && (
                    <div className="number-ordering-pause-overlay" role="dialog" aria-live="polite" aria-label="หยุดเกมชั่วคราว">
                        <div className="number-ordering-pause-card">
                            <span className="material-symbols-outlined number-ordering-pause-icon" aria-hidden="true">pause_circle</span>
                            <h2>หยุดเกมชั่วคราว</h2>
                            <div className="number-ordering-pause-actions">
                                <button type="button" className="number-ordering-btn-resume" onClick={togglePause}>
                                    เล่นต่อ
                                </button>
                                <button type="button" className="number-ordering-btn-reset" onClick={startGameInit}>
                                    เริ่มใหม่
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!gameState.hasStarted && (
                <div className="number-ordering-controls">
                    <button className="number-ordering-btn-start" onClick={startGameInit}>
                        {`เริ่มเกม ${gameSettings.durationMinutes} นาที!`}
                    </button>
                </div>
            )}

            {gameState.isGameOver && (
                <div className="number-ordering-overlay game-over-overlay">
                    <GameOverProgressSummary
                        gameId="number-ordering"
                        currentScore={gameState.score}
                        isReady={isProgressReady}
                        summaryLabel={'\u0e1c\u0e48\u0e32\u0e19\u0e23\u0e2d\u0e1a'}
                        summaryValue={`${gameState.boardsCleared} \u0e23\u0e2d\u0e1a`}
                    />
                    <div className="game-over-overlay__actions">
                        <button className="number-ordering-btn-restart" onClick={startGameInit}>เล่นใหม่อีกรอบ</button>
                        <button className="number-ordering-btn-exit" onClick={() => navigate('/games')}>กลับไปหน้าเลือกเกม</button>
                    </div>
                </div>
            )}
        </div>
    );
}
