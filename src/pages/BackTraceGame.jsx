import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/back-trace.css';
import { useGameSessionLogger } from '../hooks/useGameSessionLogger';
import { getGameDifficultyProfile, getStoredGameSettings } from '../utils/gameSettings';
import GameOverProgressSummary from '../components/game/GameOverProgressSummary';

// ==========================================
// ฟังก์ชันสร้างจุดหกเหลี่ยม (Hexagon)
// ==========================================
const getRoundedHexPath = (cx, cy, r, cornerRadius) => {
    const vertices = [];
    for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i;
        const angleRad = Math.PI / 180 * angleDeg;
        vertices.push({
            x: cx + r * Math.cos(angleRad),
            y: cy + r * Math.sin(angleRad),
        });
    }

    const getDistance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    const normalize = (vx, vy) => {
        const len = Math.hypot(vx, vy) || 1;
        return { x: vx / len, y: vy / len };
    };

    let path = '';

    vertices.forEach((curr, index) => {
        const prev = vertices[(index + vertices.length - 1) % vertices.length];
        const next = vertices[(index + 1) % vertices.length];

        const toPrev = normalize(prev.x - curr.x, prev.y - curr.y);
        const toNext = normalize(next.x - curr.x, next.y - curr.y);

        const dot = Math.max(-1, Math.min(1, toPrev.x * toNext.x + toPrev.y * toNext.y));
        const angle = Math.acos(dot);
        const offset = Math.min(
            cornerRadius / Math.tan(angle / 2),
            getDistance(curr, prev) / 2.2,
            getDistance(curr, next) / 2.2
        );

        const start = {
            x: curr.x + toPrev.x * offset,
            y: curr.y + toPrev.y * offset,
        };
        const end = {
            x: curr.x + toNext.x * offset,
            y: curr.y + toNext.y * offset,
        };

        if (index === 0) {
            path += `M ${start.x} ${start.y}`;
        } else {
            path += ` L ${start.x} ${start.y}`;
        }

        path += ` Q ${curr.x} ${curr.y} ${end.x} ${end.y}`;
    });

    return `${path} Z`;
};

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 1250;
const HEX_RADIUS = 95;
const HEX_CORNER_RADIUS = 18;
const MIN_DIST = 240;
const HEX_PATH = getRoundedHexPath(0, 0, HEX_RADIUS, HEX_CORNER_RADIUS);

const generateNodes = (count) => {
    const nodes = [];
    let attempts = 0;
    const MARGIN = 150;

    while (nodes.length < count && attempts < 2000) {
        attempts++;
        const x = MARGIN + Math.random() * (SVG_WIDTH - 2 * MARGIN);
        const y = MARGIN + Math.random() * (SVG_HEIGHT - 2 * MARGIN);

        const tooClose = nodes.some(n => Math.hypot(n.x - x, n.y - y) < MIN_DIST);
        if (!tooClose) {
            nodes.push({ id: nodes.length, x, y });
        }
    }
    return nodes;
};

const WRONG_PENALTY = 5;
const WIN_MESSAGES = ["จำแม่นมากครับ!", "เส้นทางเป๊ะ!", "สมองไวจริงๆ!", "สมาธิดีเยี่ยม!", "เก่งมากครับ!"];

export default function BackTraceGame() {
    const navigate = useNavigate();
    const themeRootRef = useRef(null);
    const [gameSettings] = useState(() => getStoredGameSettings());
    const difficultyProfile = getGameDifficultyProfile('back-trace', gameSettings.difficulty);
    const gameDuration = gameSettings.durationMinutes * 60;

    const [gameState, setGameState] = useState({
        level: 1,
        score: 0,
        sequenceLength: difficultyProfile.initialSequenceLength,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        hasStarted: false,
        isGameOver: false,
    });

    const [timeLeft, setTimeLeft] = useState(gameDuration);
    const [nodes, setNodes] = useState([]);
    const [gamePhase, setGamePhase] = useState('idle');
    const [userPath, setUserPath] = useState([]);
    const [isWrong, setIsWrong] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isScorePenaltyActive, setIsScorePenaltyActive] = useState(false);
    const [pressedNodeId, setPressedNodeId] = useState(null);

    const [message, setMessage] = useState("กดเริ่มเกมเพื่อฝึกจำเส้นทาง");
    const [showProgress, setShowProgress] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [isProgressReady, setIsProgressReady] = useState(false);

    const stateRef = useRef(gameState);
    const nodesRef = useRef([]);
    const userPathRef = useRef([]);
    const phaseRef = useRef(gamePhase);
    const timeLeftRef = useRef(timeLeft);
    const isPausedRef = useRef(isPaused);
    const sessionVersionRef = useRef(0);

    const timerIntervalRef = useRef(null);
    const autoTimerRef = useRef(null);
    const pressTimeoutRef = useRef(null);
    const scheduledCallbackRef = useRef(null);
    const scheduledDelayRef = useRef(0);
    const scheduledStartedAtRef = useRef(0);
    const audioCtxRef = useRef(null);
    const scorePenaltyTimeoutRef = useRef(null);

    useEffect(() => { stateRef.current = gameState; }, [gameState]);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { userPathRef.current = userPath; }, [userPath]);
    useEffect(() => { phaseRef.current = gamePhase; }, [gamePhase]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

    const { startSession, stopSession, recordRoundStart, recordCorrect, recordMistake } = useGameSessionLogger({
        gameId: 'back-trace',
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
            const nextAction = scheduledCallbackRef.current;
            scheduledCallbackRef.current = null;
            scheduledDelayRef.current = 0;
            scheduledStartedAtRef.current = 0;
            nextAction?.();
        }, delay);
    }, []);

    const pauseScheduledAction = useCallback(() => {
        if (!autoTimerRef.current || !scheduledCallbackRef.current) return;

        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
        const elapsed = Date.now() - scheduledStartedAtRef.current;
        scheduledDelayRef.current = Math.max(0, scheduledDelayRef.current - elapsed);
    }, []);

    const resumeScheduledAction = useCallback(() => {
        if (autoTimerRef.current || !scheduledCallbackRef.current) return;

        const remainingDelay = scheduledDelayRef.current;
        if (remainingDelay <= 0) {
            const nextAction = scheduledCallbackRef.current;
            scheduledCallbackRef.current = null;
            scheduledDelayRef.current = 0;
            scheduledStartedAtRef.current = 0;
            nextAction?.();
            return;
        }

        scheduledStartedAtRef.current = Date.now();
        autoTimerRef.current = setTimeout(() => {
            autoTimerRef.current = null;
            const nextAction = scheduledCallbackRef.current;
            scheduledCallbackRef.current = null;
            scheduledDelayRef.current = 0;
            scheduledStartedAtRef.current = 0;
            nextAction?.();
        }, remainingDelay);
    }, []);

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
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'correct') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        }
    }, []);

    const createParticles = (x, y) => {
        const accentColor = getComputedStyle(themeRootRef.current || document.documentElement)
            .getPropertyValue('--accent-main')
            .trim() || '#8b5d46';

        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'back-trace-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.width = Math.random() * 8 + 6 + 'px';
            p.style.height = p.style.width;
            p.style.backgroundColor = accentColor;

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

    const endGame = useCallback(() => {
        setGameState(prev => ({ ...prev, isGameOver: true }));
        setIsProgressReady(false);
        setIsPaused(false);
        setIsScorePenaltyActive(false);
        isPausedRef.current = false;
        clearInterval(timerIntervalRef.current);
        clearScheduledAction();
        clearTimeout(scorePenaltyTimeoutRef.current);
        const sessionVersion = sessionVersionRef.current;
        void stopSession('time_up').finally(() => {
            if (sessionVersionRef.current === sessionVersion) {
                setIsProgressReady(true);
            }
        });
    }, [clearScheduledAction, stopSession]);

    const resumeTimer = useCallback(() => {
        clearInterval(timerIntervalRef.current);

        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame();
                    return 0;
                }
                return prev - 1;
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
        if (stateRef.current.isGameOver || isPausedRef.current) return;

        const currentLen = stateRef.current.sequenceLength;
        const newNodes = generateNodes(currentLen);

        setNodes(newNodes);
        setUserPath([]);
        setIsWrong(false);
        setGamePhase('memorize');
        setMessage('จำลำดับเส้นทางนี้ให้ดี!');
        setShowProgress(false);
        setProgressPercent(0);

        playSound('pop');

        const viewDuration =
            difficultyProfile.memorizeBaseMs + (currentLen * difficultyProfile.memorizePerNodeMs);

        scheduleAction(() => {
            if (stateRef.current.isGameOver || isPausedRef.current) return;
            setGamePhase('recall');
            setMessage('กดย้อนกลับจากจุดสุดท้ายไปจุดแรก!');
            recordRoundStart();
        }, viewDuration);

    }, [playSound, recordRoundStart, scheduleAction]);

    const handleNodeClick = (clickedId, event) => {
        if (isPausedRef.current || phaseRef.current !== 'recall' || stateRef.current.isGameOver) return;
        if (userPathRef.current.includes(clickedId)) return;

        clearTimeout(pressTimeoutRef.current);
        setPressedNodeId(clickedId);
        pressTimeoutRef.current = setTimeout(() => setPressedNodeId(null), 220);

        const totalNodes = nodesRef.current.length;
        const expectedId = totalNodes - 1 - userPathRef.current.length;

        if (clickedId === expectedId) {
            playSound('pop');
            const newPath = [...userPathRef.current, clickedId];
            setUserPath(newPath);

            if (newPath.length === nodesRef.current.length) {
                createParticles(event.clientX, event.clientY);
                playSound('correct');
                handleRoundEnd(true);
            }
        } else {
            playSound('wrong');
            setIsWrong(true);
            applyWrongPenalty();
            handleRoundEnd(false);
        }
    };

    const handleRoundEnd = (isWin) => {
        setGamePhase('result');
        if (isWin) {
            recordCorrect({ completedRound: true });
        }

        setGameState(prev => {
            const nextState = { ...prev };
            let delayToNextRound = 1200;

            if (isWin) {
                nextState.score = prev.score + (prev.sequenceLength * 10);
                nextState.consecutiveWins++;
                nextState.consecutiveLosses = 0;
                setMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);

                if (nextState.consecutiveWins >= 2) {
                    nextState.sequenceLength = Math.min(
                        difficultyProfile.maxSequenceLength,
                        prev.sequenceLength + 1
                    );
                    nextState.consecutiveWins = 0;
                }
            } else {
                nextState.consecutiveLosses++;
                nextState.consecutiveWins = 0;
                setMessage('จำสลับกันนิดนึง! ดูเฉลยแล้วลองใหม่ครับ');
                delayToNextRound = 2000;

                if (
                    nextState.consecutiveLosses >= 2 &&
                    prev.sequenceLength > difficultyProfile.minSequenceLength
                ) {
                    nextState.sequenceLength -= 1;
                    nextState.consecutiveLosses = 0;
                }
            }

            scheduleAction(() => {
                if (stateRef.current.isGameOver || isPausedRef.current) return;
                setShowProgress(true);
                setTimeout(() => setProgressPercent(100), 20);
                scheduleAction(runRound, 1000);
            }, delayToNextRound);

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
        clearTimeout(pressTimeoutRef.current);
        setPressedNodeId(null);
    }, [pauseScheduledAction, resumeScheduledAction, resumeTimer]);

    const startGameInit = () => {
        void stopSession('manual_stop');
        sessionVersionRef.current += 1;
        setIsProgressReady(false);
        initAudio();
        clearScheduledAction();
        clearTimeout(pressTimeoutRef.current);
        setPressedNodeId(null);
        setIsPaused(false);
        setIsScorePenaltyActive(false);
        isPausedRef.current = false;
        clearTimeout(scorePenaltyTimeoutRef.current);

        setGameState({
            level: 1, score: 0, sequenceLength: difficultyProfile.initialSequenceLength,
            consecutiveWins: 0, consecutiveLosses: 0,
            hasStarted: true, isGameOver: false
        });

        setGamePhase('idle');
        setUserPath([]);
        setIsWrong(false);
        startSession();
        startTimer();
        scheduleAction(runRound, 100);
    };

    useEffect(() => {
        return () => {
            clearInterval(timerIntervalRef.current);
            clearScheduledAction();
            clearTimeout(pressTimeoutRef.current);
            clearTimeout(scorePenaltyTimeoutRef.current);
        };
    }, [clearScheduledAction]);

    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    const isLowTime = timeLeft <= 10 && gameState.hasStarted;

    const getPolylinePoints = (pathArray) => {
        return pathArray.map(id => {
            const node = nodes.find(n => n.id === id);
            return `${node.x},${node.y}`;
        }).join(' ');
    };

    const fullPathPoints = getPolylinePoints(nodes.map(n => n.id));
    const userPathPoints = getPolylinePoints(userPath);

    return (
        <div className="back-trace-app" ref={themeRootRef}>
            <div className="back-trace-header">
                {gameState.hasStarted && !gameState.isGameOver && (
                    <button
                        type="button"
                        className={`back-trace-btn-pause ${isPaused ? 'is-paused' : ''}`}
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
                    className="back-trace-btn-back"
                    onClick={() => navigate('/games')}
                    aria-label="กลับไปหน้าเลือกเกม"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>arrow_back</span>
                </button>
                <h1>เกมจำเส้นทาง</h1>
                <div className="back-trace-stats">
                    <div className={`back-trace-stat-item timer ${isLowTime ? 'low-time' : ''}`}>
                        เวลา: <span>{mins}:{secs}</span>
                    </div>
                    <div className="back-trace-stat-item">เป้าหมาย: <span>{gameState.sequenceLength} จุด</span></div>
                </div>
            </div>

            <div className="back-trace-game-container">
                <div className={`back-trace-current-score ${isScorePenaltyActive ? 'is-penalty' : ''}`}>
                    {gameState.score}
                </div>

                <svg className="back-trace-svg-board" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
                    <defs>
                        <filter id="hex-shadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#6d4f3b" floodOpacity="0.18"/>
                            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#ffffff" floodOpacity="0.38"/>
                        </filter>
                        <filter id="label-shadow" x="-40%" y="-40%" width="180%" height="180%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#4f3427" floodOpacity="0.26"/>
                        </filter>
                    </defs>

                    {(gamePhase === 'memorize' || (gamePhase === 'result' && isWrong)) && (
                        <polyline
                            points={fullPathPoints}
                            fill="none"
                            stroke={isWrong ? "rgba(230, 126, 34, 0.4)" : "var(--hex-active)"}
                            strokeWidth="12"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            style={{ transition: 'stroke 0.3s' }}
                        />
                    )}

                    {(gamePhase === 'recall' || (gamePhase === 'result' && !isWrong)) && userPath.length > 1 && (
                        <polyline
                            points={userPathPoints}
                            fill="none"
                            stroke="var(--hex-active)"
                            strokeWidth="12"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    )}

                    {nodes.map((node) => {
                        const isRevealed = gamePhase === 'memorize' || userPath.includes(node.id) || (gamePhase === 'result' && !isWrong);
                        const isClickable = gamePhase === 'recall' && !userPath.includes(node.id);

                        let hexFill = "var(--hex-base)";
                        let hexStroke = "var(--hex-border)";
                        let textFill = "transparent";

                        if (isRevealed) {
                            hexFill = "var(--hex-active)";
                            hexStroke = "var(--hex-active)";
                            textFill = "#ffffff";
                        }

                        if (gamePhase === 'result') {
                            if (!isWrong) {
                                hexFill = "var(--correct)";
                                hexStroke = "var(--correct)";
                                textFill = "#ffffff";
                            } else {
                                if (node.id === userPath.length) {
                                    hexFill = "var(--wrong)";
                                    hexStroke = "var(--wrong)";
                                    textFill = "#ffffff";
                                } else if (userPath.includes(node.id)) {
                                    hexFill = "var(--hex-active)";
                                    hexStroke = "var(--hex-active)";
                                    textFill = "#ffffff";
                                } else {
                                    hexFill = "var(--hex-muted)";
                                    hexStroke = "var(--hex-muted-border)";
                                    textFill = "transparent";
                                }
                            }
                        }

                        return (
                            <g
                                key={node.id}
                                className={`back-trace-hex-group ${isClickable ? 'clickable' : ''} ${pressedNodeId === node.id ? 'pressed' : ''}`}
                                onClick={(e) => handleNodeClick(node.id, e)}
                                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                            >
                                <path
                                    className="back-trace-hex-shell"
                                    d={HEX_PATH}
                                    fill={hexFill}
                                    stroke={hexStroke}
                                    strokeWidth="8"
                                    strokeLinejoin="round"
                                    filter="url(#hex-shadow)"
                                />

                                <path
                                    className="back-trace-hex-rim"
                                    d={HEX_PATH}
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.3)"
                                    strokeWidth="2.5"
                                    strokeLinejoin="round"
                                />

                                <text
                                    className={`back-trace-hex-label ${textFill !== 'transparent' ? 'visible' : ''}`}
                                    x="0"
                                    y="7"
                                    fill={textFill}
                                    fontSize="68"
                                    fontWeight="900"
                                    fontFamily="'Noto Sans Thai', sans-serif"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    stroke={textFill === '#ffffff' ? 'rgba(79, 52, 39, 0.24)' : 'transparent'}
                                    strokeWidth={textFill === '#ffffff' ? '4' : '0'}
                                    filter="url(#label-shadow)"
                                    style={{ pointerEvents: 'none', transition: 'fill 0.2s, stroke 0.2s, opacity 0.2s' }}
                                >
                                    {node.id + 1}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                <div className="back-trace-message-box">
                    <div className="back-trace-message">{message}</div>
                    <div className="back-trace-auto-progress-container" style={{ opacity: showProgress ? 1 : 0 }}>
                        <div className="back-trace-auto-progress-bar" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
                {isPaused && (
                    <div className="back-trace-pause-overlay" role="dialog" aria-live="polite" aria-label="หยุดเกมชั่วคราว">
                        <div className="back-trace-pause-card">
                            <span className="material-symbols-outlined back-trace-pause-icon" aria-hidden="true">pause_circle</span>
                            <h2>หยุดเกมชั่วคราว</h2>
                            <div className="back-trace-pause-actions">
                                <button type="button" className="back-trace-btn-resume" onClick={togglePause}>
                                    เล่นต่อ
                                </button>
                                <button type="button" className="back-trace-btn-reset" onClick={startGameInit}>
                                    เริ่มใหม่
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!gameState.hasStarted && (
                <div className="back-trace-controls">
                    <button className="back-trace-btn-start" onClick={startGameInit}>
                        {`เริ่มเกม ${gameSettings.durationMinutes} นาที!`}
                    </button>
                </div>
            )}

            {gameState.isGameOver && (
                <div className="back-trace-overlay game-over-overlay">
                    <GameOverProgressSummary
                        gameId="back-trace"
                        currentScore={gameState.score}
                        accentColor="var(--accent-main)"
                        isReady={isProgressReady}
                        summaryLabel={'\u0e40\u0e2a\u0e49\u0e19\u0e17\u0e32\u0e07\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14'}
                        summaryValue={`${gameState.sequenceLength} \u0e08\u0e38\u0e14`}
                    />
                    <div className="game-over-overlay__actions">
                        <button className="back-trace-btn-restart" onClick={startGameInit}>เล่นใหม่อีกรอบ</button>
                        <button className="back-trace-btn-exit" onClick={() => navigate('/games')}>กลับไปหน้าเลือกเกม</button>
                    </div>
                </div>
            )}
        </div>
    );
}
