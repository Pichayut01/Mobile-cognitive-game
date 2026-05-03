import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/switch-rules.css';
import { useGameSessionLogger } from '../hooks/useGameSessionLogger';
import { getGameDifficultyProfile, getStoredGameSettings } from '../utils/gameSettings';
import GameOverProgressSummary from '../components/game/GameOverProgressSummary';

// ==========================================
// Shape SVG Components
// ==========================================
const SHAPE_TYPES = ['circle', 'square', 'triangle', 'star', 'heart'];
const COLOR_OPTIONS = [
    { id: 'red', hex: '#e74c3c', nameTh: 'แดง' },
    { id: 'blue', hex: '#3498db', nameTh: 'น้ำเงิน' },
    { id: 'green', hex: '#27ae60', nameTh: 'เขียว' },
    { id: 'yellow', hex: '#f1c40f', nameTh: 'เหลือง' },
    { id: 'purple', hex: '#9b59b6', nameTh: 'ม่วง' },
];
const SHAPE_NAMES_TH = {
    circle: 'วงกลม',
    square: 'สี่เหลี่ยม',
    triangle: 'สามเหลี่ยม',
    star: 'ดาว',
    heart: 'หัวใจ',
};
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const RULE_CONFIG = {
    color: { labelTh: 'ดูสี', icon: 'palette', cssClass: 'color' },
    shape: { labelTh: 'ดูรูปทรง', icon: 'category', cssClass: 'shape' },
    number: { labelTh: 'ดูตัวเลข', icon: 'tag', cssClass: 'number' },
};

const ShapeSVG = ({ type, color, size = 100 }) => {
    const viewBox = `0 0 ${size} ${size}`;
    switch (type) {
        case 'circle':
            return <svg viewBox={viewBox}><circle cx={size/2} cy={size/2} r={size*0.45} fill={color} /></svg>;
        case 'square':
            return <svg viewBox={viewBox}><rect x={size*0.1} y={size*0.1} width={size*0.8} height={size*0.8} rx={size*0.12} fill={color} /></svg>;
        case 'triangle':
            return <svg viewBox={viewBox}><polygon points={`${size/2},${size*0.08} ${size*0.95},${size*0.92} ${size*0.05},${size*0.92}`} fill={color} /></svg>;
        case 'star':
            return <svg viewBox={viewBox}><polygon points={`${size/2},${size*0.05} ${size*0.64},${size*0.35} ${size*0.97},${size*0.38} ${size*0.72},${size*0.60} ${size*0.79},${size*0.93} ${size/2},${size*0.75} ${size*0.21},${size*0.93} ${size*0.28},${size*0.60} ${size*0.03},${size*0.38} ${size*0.36},${size*0.35}`} fill={color} /></svg>;
        case 'heart':
            return <svg viewBox={viewBox}><path d={`M${size/2},${size*0.9} C${size/2},${size*0.9} ${size*0.05},${size*0.6} ${size*0.05},${size*0.3} C${size*0.05},${size*0.12} ${size*0.25},${size*0.05} ${size*0.4},${size*0.18} C${size/2},${size*0.28} ${size/2},${size*0.28} ${size/2},${size*0.28} C${size/2},${size*0.28} ${size/2},${size*0.28} ${size*0.6},${size*0.18} C${size*0.75},${size*0.05} ${size*0.95},${size*0.12} ${size*0.95},${size*0.3} C${size*0.95},${size*0.6} ${size/2},${size*0.9} ${size/2},${size*0.9} Z`} fill={color} /></svg>;
        default:
            return null;
    }
};

// ==========================================
// Helper Functions
// ==========================================
const WRONG_PENALTY = 5;
const WIN_MESSAGES = ["เก่งมาก!", "ยอดเยี่ยม!", "สมองไวมาก!", "ปรับตัวเก่ง!", "คิดเร็วมาก!"];

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomExcluding(arr, exclude) {
    const filtered = arr.filter(x => x !== exclude);
    return pickRandom(filtered);
}

function randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==========================================
// Main Component
// ==========================================
export default function SwitchRulesGame() {
    const navigate = useNavigate();
    const [gameSettings] = useState(() => getStoredGameSettings());
    const difficultyProfile = getGameDifficultyProfile('switch-rules', gameSettings.difficulty);
    const gameDuration = gameSettings.durationMinutes * 60;

    // --- State Setup ---
    const [gameState, setGameState] = useState({
        level: 1,
        score: 0,
        streak: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        isPlaying: false,
        isGameOver: false,
        hasStarted: false,
        totalCorrect: 0,
        totalWrong: 0,
    });

    const [timeLeft, setTimeLeft] = useState(gameDuration);
    const [currentRule, setCurrentRule] = useState(null); // 'color', 'shape', 'number'
    const [stimulus, setStimulus] = useState(null); // { shape, color, number }
    const [choices, setChoices] = useState([]); // array of choice objects
    const [roundStatus, setRoundStatus] = useState('playing'); // 'playing', 'correct', 'wrong'
    const [clickedChoiceIndex, setClickedChoiceIndex] = useState(null);
    const [correctChoiceIndex, setCorrectChoiceIndex] = useState(null);
    const [questionsInCurrentRule, setQuestionsInCurrentRule] = useState(0);
    const [nextSwitchAt, setNextSwitchAt] = useState(0);
    const [showSwitchAlert, setShowSwitchAlert] = useState(false);
    const [isRuleSwitching, setIsRuleSwitching] = useState(false);
    const [isStimulusEntering, setIsStimulusEntering] = useState(false);

    const [message, setMessage] = useState("กดปุ่มเริ่มเกมเพื่อฝึกสมองครับ");
    const [showProgress, setShowProgress] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isScorePenaltyActive, setIsScorePenaltyActive] = useState(false);
    const [isProgressReady, setIsProgressReady] = useState(false);

    // Refs
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
    const questionsInCurrentRuleRef = useRef(0);
    const nextSwitchAtRef = useRef(0);
    const currentRuleRef = useRef(null);

    useEffect(() => { stateRef.current = gameState; }, [gameState]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { questionsInCurrentRuleRef.current = questionsInCurrentRule; }, [questionsInCurrentRule]);
    useEffect(() => { nextSwitchAtRef.current = nextSwitchAt; }, [nextSwitchAt]);
    useEffect(() => { currentRuleRef.current = currentRule; }, [currentRule]);

    const { startSession, stopSession, recordRoundStart, recordCorrect, recordMistake } = useGameSessionLogger({
        gameId: 'switch-rules',
        getSnapshot: () => ({
            score: stateRef.current.score,
            levelReached: stateRef.current.level,
        }),
    });

    // --- Score penalty feedback ---
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
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'switch') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
    }, []);

    // --- Particles Effect ---
    const createParticles = (x, y, color) => {
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'switch-rules-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.width = Math.random() * 10 + 5 + 'px';
            p.style.height = p.style.width;
            p.style.backgroundColor = color;

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 60;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            document.body.appendChild(p);

            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
            ], { duration: 600, easing: 'ease-out' }).onfinish = () => p.remove();
        }
    };

    // --- Timer & Scheduling ---
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

    // --- Core Game Logic ---

    // Generate a new stimulus
    const generateStimulus = useCallback(() => {
        const shape = pickRandom(SHAPE_TYPES);
        const color = pickRandom(COLOR_OPTIONS);
        const number = pickRandom(NUMBERS);
        return { shape, color, number };
    }, []);

    // Generate choices based on current rule and stimulus
    const generateChoices = useCallback((rule, stim, choiceCount) => {
        const choicesArr = [];

        if (rule === 'color') {
            // Correct answer: matching color
            const correctChoice = { type: 'color', colorObj: stim.color, isCorrect: true };
            choicesArr.push(correctChoice);
            // Wrong choices: different colors
            const otherColors = COLOR_OPTIONS.filter(c => c.id !== stim.color.id);
            const shuffled = shuffleArray(otherColors);
            for (let i = 0; i < choiceCount - 1 && i < shuffled.length; i++) {
                choicesArr.push({ type: 'color', colorObj: shuffled[i], isCorrect: false });
            }
        } else if (rule === 'shape') {
            // Correct answer: matching shape
            const correctChoice = { type: 'shape', shapeType: stim.shape, isCorrect: true };
            choicesArr.push(correctChoice);
            // Wrong choices: different shapes
            const otherShapes = SHAPE_TYPES.filter(s => s !== stim.shape);
            const shuffled = shuffleArray(otherShapes);
            for (let i = 0; i < choiceCount - 1 && i < shuffled.length; i++) {
                choicesArr.push({ type: 'shape', shapeType: shuffled[i], isCorrect: false });
            }
        } else if (rule === 'number') {
            // Correct answer: matching number
            const correctChoice = { type: 'number', number: stim.number, isCorrect: true };
            choicesArr.push(correctChoice);
            // Wrong choices: different numbers
            const otherNumbers = NUMBERS.filter(n => n !== stim.number);
            const shuffled = shuffleArray(otherNumbers);
            for (let i = 0; i < choiceCount - 1 && i < shuffled.length; i++) {
                choicesArr.push({ type: 'number', number: shuffled[i], isCorrect: false });
            }
        }

        return shuffleArray(choicesArr);
    }, []);

    // Pick a new rule (different from current)
    const pickNewRule = useCallback(() => {
        const ruleTypes = difficultyProfile.ruleTypes;
        const current = currentRuleRef.current;
        if (!current) return pickRandom(ruleTypes);
        return pickRandomExcluding(ruleTypes, current);
    }, [difficultyProfile]);

    // Run a new round
    const runRound = useCallback(() => {
        const current = stateRef.current;
        if (current.isGameOver || isPausedRef.current) return;

        const qCount = questionsInCurrentRuleRef.current;
        const switchAt = nextSwitchAtRef.current;
        let activeRule = currentRuleRef.current;

        // Check if we need to switch the rule
        const needSwitch = activeRule && qCount >= switchAt;

        if (needSwitch || !activeRule) {
            const newRule = needSwitch ? pickNewRule() : pickRandom(difficultyProfile.ruleTypes);
            activeRule = newRule;
            setCurrentRule(newRule);
            currentRuleRef.current = newRule;
            setQuestionsInCurrentRule(0);
            questionsInCurrentRuleRef.current = 0;
            const newSwitchAt = randBetween(difficultyProfile.switchEveryMin, difficultyProfile.switchEveryMax);
            setNextSwitchAt(newSwitchAt);
            nextSwitchAtRef.current = newSwitchAt;

            if (needSwitch) {
                // Show rule switch alert
                playSound('switch');
                setShowSwitchAlert(true);
                setIsRuleSwitching(true);
                scheduleAction(() => {
                    setShowSwitchAlert(false);
                    setIsRuleSwitching(false);
                    // Now actually start the round with new rule
                    startRoundWithRule(newRule);
                }, difficultyProfile.ruleDisplayMs);
                return;
            }
        }

        startRoundWithRule(activeRule);
    }, [difficultyProfile, pickNewRule, playSound, scheduleAction]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const startRoundWithRule = useCallback((rule) => {
        const current = stateRef.current;
        if (current.isGameOver || isPausedRef.current) return;

        setRoundStatus('playing');
        setClickedChoiceIndex(null);
        setCorrectChoiceIndex(null);
        setShowProgress(false);
        setProgressPercent(0);
        setMessage('เลือกคำตอบที่ถูกต้องตามกฎ!');
        setIsStimulusEntering(true);
        setTimeout(() => setIsStimulusEntering(false), 350);

        const stim = generateStimulus();
        setStimulus(stim);

        const generatedChoices = generateChoices(rule, stim, difficultyProfile.choiceCount);
        setChoices(generatedChoices);

        // Find correct index
        const cIdx = generatedChoices.findIndex(c => c.isCorrect);
        setCorrectChoiceIndex(cIdx);

        setGameState(prev => ({ ...prev, isPlaying: true }));
        recordRoundStart();
    }, [generateStimulus, generateChoices, difficultyProfile, recordRoundStart]);

    // Handle choice click
    const handleChoiceClick = (index, event) => {
        if (isPausedRef.current || roundStatus !== 'playing' || !stateRef.current.isPlaying || stateRef.current.isGameOver) return;

        const choice = choices[index];
        setClickedChoiceIndex(index);

        if (choice.isCorrect) {
            recordCorrect({ completedRound: true });
            playSound('correct');
            createParticles(event.clientX, event.clientY, '#4caf50');
            setRoundStatus('correct');
            endRound(true);
        } else {
            playSound('wrong');
            setRoundStatus('wrong');
            applyWrongPenalty();
            endRound(false);
        }
    };

    const endRound = (isWin) => {
        setQuestionsInCurrentRule(prev => {
            const next = prev + 1;
            questionsInCurrentRuleRef.current = next;
            return next;
        });

        setGameState(prev => {
            const nextState = { ...prev };

            if (isWin) {
                nextState.score = prev.score + (prev.level * 10) + (prev.streak * 2);
                nextState.streak = prev.streak + 1;
                nextState.consecutiveWins = prev.consecutiveWins + 1;
                nextState.consecutiveLosses = 0;
                nextState.totalCorrect = prev.totalCorrect + 1;
                setMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);

                if (nextState.consecutiveWins >= 5) {
                    nextState.level += 1;
                    nextState.consecutiveWins = 0;
                }
            } else {
                nextState.consecutiveLosses = prev.consecutiveLosses + 1;
                nextState.consecutiveWins = 0;
                nextState.streak = 0;
                nextState.totalWrong = prev.totalWrong + 1;
                setMessage('พลาดแล้ว! ดูกฎดีๆ นะ');

                if (nextState.consecutiveLosses >= 3 && prev.level > 1) {
                    nextState.level -= 1;
                    nextState.consecutiveLosses = 0;
                }
            }

            scheduleAction(() => {
                if (stateRef.current.isGameOver || isPausedRef.current) return;
                setShowProgress(true);
                setProgressPercent(0);
                requestAnimationFrame(() => requestAnimationFrame(() => setProgressPercent(100)));
                scheduleAction(runRound, 800);
            }, 300);

            return nextState;
        });
    };

    // --- Pause ---
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

    // --- Start Game ---
    const startGameInit = () => {
        void stopSession('manual_stop');
        sessionVersionRef.current += 1;
        setIsProgressReady(false);
        initAudio();
        clearScheduledAction();
        setGameState({
            level: 1, score: 0, streak: 0,
            consecutiveWins: 0, consecutiveLosses: 0,
            isPlaying: false, isGameOver: false, hasStarted: true,
            totalCorrect: 0, totalWrong: 0,
        });
        setCurrentRule(null);
        currentRuleRef.current = null;
        setQuestionsInCurrentRule(0);
        questionsInCurrentRuleRef.current = 0;
        setNextSwitchAt(0);
        nextSwitchAtRef.current = 0;
        setIsPaused(false);
        setIsScorePenaltyActive(false);
        setShowSwitchAlert(false);
        setIsRuleSwitching(false);
        isPausedRef.current = false;
        clearTimeout(scorePenaltyTimeoutRef.current);
        setShowProgress(false);
        setProgressPercent(0);
        startSession();
        startTimer();
        scheduleAction(runRound, 100);
    };

    // --- Cleanup ---
    useEffect(() => {
        return () => {
            clearInterval(timerIntervalRef.current);
            clearScheduledAction();
            clearTimeout(scorePenaltyTimeoutRef.current);
        };
    }, [clearScheduledAction]);

    // --- Render Helpers ---
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    const isLowTime = timeLeft <= 10 && gameState.hasStarted;

    const renderChoiceContent = (choice) => {
        if (choice.type === 'color') {
            return (
                <>
                    <div className="switch-rules-choice-btn__color-swatch" style={{ backgroundColor: choice.colorObj.hex }} />
                    <span className="switch-rules-choice-btn__label">{choice.colorObj.nameTh}</span>
                </>
            );
        } else if (choice.type === 'shape') {
            return (
                <>
                    <div className="switch-rules-choice-btn__shape">
                        <ShapeSVG type={choice.shapeType} color="#505769" />
                    </div>
                    <span className="switch-rules-choice-btn__label">{SHAPE_NAMES_TH[choice.shapeType]}</span>
                </>
            );
        } else if (choice.type === 'number') {
            return (
                <span className="switch-rules-choice-btn__number">{choice.number}</span>
            );
        }
        return null;
    };

    const ruleConfig = currentRule ? RULE_CONFIG[currentRule] : null;

    return (
        <div className="switch-rules-app">
            <div className="switch-rules-header">
                {gameState.hasStarted && !gameState.isGameOver && (
                    <button
                        type="button"
                        className={`switch-rules-btn-pause ${isPaused ? 'is-paused' : ''}`}
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
                    className="switch-rules-btn-back"
                    onClick={() => navigate('/games')}
                    aria-label="กลับไปหน้าเลือกเกม"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>arrow_back</span>
                </button>
                <h1>เกมสลับกฎ</h1>
                <div className="switch-rules-stats">
                    <div className={`switch-rules-stat-item timer ${isLowTime ? 'low-time' : ''}`}>
                        เวลา: <span>{mins}:{secs}</span>
                    </div>
                    <div className="switch-rules-stat-item">เลเวล: <span>{gameState.level}</span></div>
                </div>
            </div>

            <div className="switch-rules-game-container">
                <div className={`switch-rules-current-score ${isScorePenaltyActive ? 'is-penalty' : ''}`}>
                    {gameState.score}
                </div>

                {/* Rule Banner */}
                {ruleConfig && gameState.hasStarted && !gameState.isGameOver && (
                    <div key={currentRule} className={`switch-rules-rule-banner ${isRuleSwitching ? 'is-switching' : ''}`}>
                        <span className="switch-rules-rule-banner__label">กฎปัจจุบัน</span>
                        <span className="switch-rules-rule-banner__text">
                            <span className="switch-rules-rule-banner__icon-wrap">
                                <span className="material-symbols-outlined switch-rules-rule-banner__icon" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>{ruleConfig.icon}</span>
                            </span>
                            {ruleConfig.labelTh}
                        </span>
                    </div>
                )}

                {/* Stimulus Card */}
                {stimulus && gameState.hasStarted && !gameState.isGameOver && (
                    <div className={`switch-rules-stimulus-card ${isStimulusEntering ? 'is-entering' : ''}`}
                         style={{ opacity: gameState.isGameOver ? 0.3 : 1 }}
                    >
                        <div className="switch-rules-stimulus-shape">
                            <ShapeSVG type={stimulus.shape} color={stimulus.color.hex} />
                            <span className="switch-rules-stimulus-number">{stimulus.number}</span>
                        </div>
                    </div>
                )}

                {/* Choices */}
                {choices.length > 0 && gameState.hasStarted && !gameState.isGameOver && (
                    <div className="switch-rules-choices">
                        {choices.map((choice, i) => {
                            let statusClass = '';
                            if (roundStatus !== 'playing') {
                                if (choice.isCorrect) {
                                    statusClass = 'is-correct';
                                } else if (i === clickedChoiceIndex && !choice.isCorrect) {
                                    statusClass = 'is-wrong';
                                } else {
                                    statusClass = 'is-dimmed';
                                }
                            }

                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`switch-rules-choice-btn ${statusClass}`}
                                    onClick={(e) => handleChoiceClick(i, e)}
                                    disabled={roundStatus !== 'playing'}
                                >
                                    {renderChoiceContent(choice)}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Message */}
                <div className="switch-rules-message-box">
                    <div className="switch-rules-message">{message}</div>
                    <div className="switch-rules-streak-info" style={{ opacity: gameState.streak > 1 ? 1 : 0 }}>
                        ต่อเนื่อง: <span>{gameState.streak}</span> ครั้ง
                    </div>
                    <div className="switch-rules-auto-progress-container" style={{ opacity: showProgress ? 1 : 0 }}>
                        <div className="switch-rules-auto-progress-bar" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>

                {/* Rule Switch Alert */}
                {showSwitchAlert && (
                    <div className="switch-rules-switch-alert">
                        <span className="material-symbols-outlined switch-rules-switch-alert__icon" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>sync</span>
                        <span>สลับกฎ!</span>
                    </div>
                )}

                {/* Pause Overlay */}
                {isPaused && (
                    <div className="switch-rules-pause-overlay" role="dialog" aria-live="polite" aria-label="หยุดเกมชั่วคราว">
                        <div className="switch-rules-pause-card">
                            <span className="material-symbols-outlined switch-rules-pause-icon" aria-hidden="true">pause_circle</span>
                            <h2>หยุดเกมชั่วคราว</h2>
                            <div className="switch-rules-pause-actions">
                                <button type="button" className="switch-rules-btn-resume" onClick={togglePause}>
                                    เล่นต่อ
                                </button>
                                <button type="button" className="switch-rules-btn-reset" onClick={startGameInit}>
                                    เริ่มใหม่
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Start Screen */}
            {!gameState.hasStarted && (
                <div className="switch-rules-controls">
                    <button className="switch-rules-btn-start" onClick={startGameInit}>
                        {`เริ่มฝึกสมอง ${gameSettings.durationMinutes} นาที!`}
                    </button>
                </div>
            )}

            {/* Game Over Screen */}
            {gameState.isGameOver && (
                <div className="switch-rules-overlay game-over-overlay">
                    <GameOverProgressSummary
                        gameId="switch-rules"
                        currentScore={gameState.score}
                        isReady={isProgressReady}
                        summaryLabel={'\u0e15\u0e2d\u0e1a\u0e16\u0e39\u0e01'}
                        summaryValue={`${gameState.totalCorrect} \u0e02\u0e49\u0e2d`}
                    />
                    <div className="game-over-overlay__actions">
                        <button className="switch-rules-btn-restart" onClick={startGameInit}>เล่นใหม่อีกรอบ</button>
                        <button className="switch-rules-btn-exit" onClick={() => navigate('/games')}>กลับไปหน้าเลือกเกม</button>
                    </div>
                </div>
            )}
        </div>
    );
}
