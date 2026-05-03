import { useEffect, useMemo, useState } from 'react';
import { getGameSessions } from '../../utils/gameStatsStorage';
import { GAME_META_MAP } from '../../utils/gameCatalog';
import { formatCompactScore } from '../../utils/numberFormat';
import '../../styles/game-over-progress.css';

// ── Constants ──
const DISPLAY_LIMIT = 6;
const TREND_WINDOW = 3;
const RECENT_AVERAGE_WINDOW = 5;
const CHART_WIDTH = 1080;
const CHART_HEIGHT = 680;
const CHART_PADDING = { top: 40, right: 36, bottom: 64, left: 96 };

const STATUS_LABEL = 'หมดเวลา!';
const SCORE_UNIT_LABEL = 'คะแนน';
const DELTA_LABEL = 'เทียบรอบก่อน';
const BEST_LABEL = 'สถิติสูงสุด';
const AVERAGE_LABEL = 'เฉลี่ย 5 รอบ';
const FIRST_ROUND_LABEL = 'เริ่มรอบแรก';
const FLAT_LABEL = 'คงที่';
const ACTUAL_SERIES_LABEL = 'คะแนนจริง';
const AVERAGE_SERIES_LABEL = 'ค่าเฉลี่ย';
const BEST_SERIES_LABEL = 'สถิติสูงสุด';
const CHART_LABEL = 'แนวโน้มคะแนน';
const LATEST_ROUNDS_SUFFIX = 'รอบล่าสุด';
const LOADING_LABEL = 'กำลังเตรียมกราฟสรุป';
const ERROR_LABEL = 'ไม่สามารถโหลดประวัติเกม';

// ── Utilities ──
function buildRollingAverage(values, windowSize) {
  return values.map((_, index) => {
    const startIndex = Math.max(0, index - windowSize + 1);
    const windowValues = values.slice(startIndex, index + 1);
    const total = windowValues.reduce((sum, value) => sum + value, 0);
    return total / Math.max(1, windowValues.length);
  });
}

function buildRunningBest(values) {
  let bestScore = 0;
  return values.map((value) => {
    bestScore = Math.max(bestScore, value);
    return bestScore;
  });
}

function getNiceChartMax(value) {
  const safeValue = Math.max(10, Number(value) || 0);
  const magnitude = 10 ** Math.floor(Math.log10(safeValue));
  const normalized = safeValue / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function formatDelta(value) {
  if (value == null) return FIRST_ROUND_LABEL;
  if (value === 0) return FLAT_LABEL;
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString('en-US')}`;
}

function formatSessionNumber(value) {
  return `#${value.toLocaleString('en-US')}`;
}

function createSmoothLinePath(values, getX, getY) {
  if (!values.length) return '';
  const points = values.map((value, index) => ({ x: getX(index), y: getY(value) }));
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] ?? current;
    const following = points[index + 2] ?? next;
    const controlPointOneX = current.x + (next.x - previous.x) / 6;
    const controlPointOneY = current.y + (next.y - previous.y) / 6;
    const controlPointTwoX = next.x - (following.x - current.x) / 6;
    const controlPointTwoY = next.y - (following.y - current.y) / 6;
    path += ` C ${controlPointOneX} ${controlPointOneY}, ${controlPointTwoX} ${controlPointTwoY}, ${next.x} ${next.y}`;
  }
  return path;
}

function createLinePath(values, getX, getY) {
  if (!values.length) return '';
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(value)}`).join(' ');
}

function createAreaPath(values, getX, getY, baselineY) {
  if (!values.length) return '';
  const linePath = createSmoothLinePath(values, getX, getY);
  const lastIndex = values.length - 1;
  return `${linePath} L ${getX(lastIndex)} ${baselineY} L ${getX(0)} ${baselineY} Z`;
}

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════
function GameOverProgressSummary({
  gameId,
  currentScore = 0,
  accentColor = 'var(--brand)',
  isReady = true,
  summaryLabel = '',
  summaryValue = '',
}) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(isReady);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    if (!isReady) {
      setIsLoading(true);
      setHasError(false);
      setSessions([]);
      return () => { isCancelled = true; };
    }

    setIsLoading(true);
    setHasError(false);

    void getGameSessions(gameId)
      .then((loadedSessions) => {
        if (isCancelled) return;
        setSessions(Array.isArray(loadedSessions) ? loadedSessions : []);
      })
      .catch((error) => {
        console.error(`Unable to load progress history for ${gameId}.`, error);
        if (isCancelled) return;
        setHasError(true);
        setSessions([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => { isCancelled = true; };
  }, [gameId, isReady]);

  // ── Build chart data ──
  const chartState = useMemo(() => {
    const orderedSessions = [...sessions].sort((left, right) => Date.parse(left.endedAt) - Date.parse(right.endedAt));
    const fallbackSessions = orderedSessions.length
      ? orderedSessions
      : [{ id: 'current-score-fallback', score: currentScore, endedAt: new Date().toISOString() }];
    const displayedSessions = fallbackSessions.slice(-DISPLAY_LIMIT);
    const totalSessions = fallbackSessions.length;
    const startSessionNumber = Math.max(1, totalSessions - displayedSessions.length + 1);
    const scores = displayedSessions.map((session) => Number(session.score) || 0);
    const rollingAverage = buildRollingAverage(scores, TREND_WINDOW);
    const runningBest = buildRunningBest(scores);
    const peakScore = Math.max(currentScore, ...scores, ...rollingAverage, ...runningBest, 1);
    const chartMax = getNiceChartMax(peakScore * 1.14);
    const chartInnerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const baselineY = CHART_PADDING.top + chartInnerHeight;
    const latestScore = scores.at(-1) ?? currentScore;
    const previousScore = scores.length > 1 ? scores.at(-2) ?? null : null;
    const bestScore = Math.max(...scores, currentScore, 0);
    const recentScores = scores.slice(-RECENT_AVERAGE_WINDOW);
    const recentAverage = recentScores.length ? Math.round(recentScores.reduce((sum, value) => sum + value, 0) / recentScores.length) : 0;
    const deltaScore = previousScore == null ? null : latestScore - previousScore;
    const highestIndex = scores.reduce((bestIndex, value, index) => (value >= scores[bestIndex] ? index : bestIndex), 0);
    const xAxisLabelStep = Math.max(1, Math.ceil(displayedSessions.length / 5));
    const chartDetail = `${displayedSessions.length.toLocaleString('en-US')} ${LATEST_ROUNDS_SUFFIX}`;

    const getX = (index) => displayedSessions.length <= 1
      ? CHART_PADDING.left + chartInnerWidth / 2
      : CHART_PADDING.left + (index / (displayedSessions.length - 1)) * chartInnerWidth;
    const getY = (value) => baselineY - (chartMax === 0 ? 0 : value / chartMax) * chartInnerHeight;
    const gridValues = Array.from({ length: 4 }, (_, index) => Math.round(chartMax * ((3 - index) / 3)));

    return {
      displayedSessions, scores, latestScore, bestScore, recentAverage, deltaScore,
      highestIndex, gridValues, xAxisLabelStep, baselineY, chartDetail, getX, getY,
      scoreAreaPath: createAreaPath(scores, getX, getY, baselineY),
      scorePath: createSmoothLinePath(scores, getX, getY),
      averagePath: createSmoothLinePath(rollingAverage, getX, getY),
      bestPath: createLinePath(runningBest, getX, getY),
      axisLabels: displayedSessions.map((session, index) => ({
        id: session.id ?? `${session.endedAt}-${index}`,
        label: formatSessionNumber(startSessionNumber + index),
      })),
      scoreDots: scores.map((value, index) => ({
        id: displayedSessions[index]?.id ?? `${index}-${value}`,
        x: getX(index),
        y: getY(value),
        isCurrent: index === displayedSessions.length - 1,
        isPeak: index === highestIndex,
      })),
    };
  }, [currentScore, sessions]);

  const meta = GAME_META_MAP[gameId];

  const chips = [
    { label: DELTA_LABEL, value: formatDelta(chartState.deltaScore), tone: chartState.deltaScore > 0 ? 'positive' : chartState.deltaScore < 0 ? 'negative' : 'neutral' },
    { label: BEST_LABEL, value: formatCompactScore(chartState.bestScore), tone: 'neutral' },
    { label: summaryLabel, value: summaryValue, tone: 'neutral' },
    { label: AVERAGE_LABEL, value: formatCompactScore(chartState.recentAverage), tone: 'neutral' },
  ].filter((chip) => chip.label && chip.value !== '');

  return (
    <section className="game-over-progress" style={{ '--progress-accent': accentColor }}>

      {/* ── Hero: Time's Up + Score ── */}
      <div className="game-over-progress__hero">
        <h3 className="game-over-progress__game-title">{meta?.titleTh ?? ''}</h3>
        <span className="game-over-progress__status-pill">
          <span className="material-symbols-outlined game-over-progress__status-icon" aria-hidden="true">timer_off</span>
          {STATUS_LABEL}
        </span>
        <strong className="game-over-progress__score-value">{formatCompactScore(chartState.latestScore)}</strong>
        <span className="game-over-progress__score-unit">{SCORE_UNIT_LABEL}</span>
      </div>

      {/* ── Stats row ── */}
      <div className="game-over-progress__stats-row">
        {chips.map((chip) => (
          <article key={chip.label} className="game-over-progress__chip">
            <span className="game-over-progress__chip-label">{chip.label}</span>
            <strong className={`game-over-progress__chip-value is-${chip.tone}`}>{chip.value}</strong>
          </article>
        ))}
      </div>

      {/* ── Chart Card ── */}
      <div className="game-over-progress__chart-card">
        {!isReady || isLoading ? (
          <div className="game-over-progress__state-container">
            <span className="material-symbols-outlined game-over-progress__icon" aria-hidden="true">insights</span>
            <span className="game-over-progress__state-label">{LOADING_LABEL}</span>
          </div>
        ) : hasError ? (
          <div className="game-over-progress__state-container is-error">
            <span className="material-symbols-outlined game-over-progress__icon" aria-hidden="true">error</span>
            <span className="game-over-progress__state-label">{ERROR_LABEL}</span>
          </div>
        ) : (
          <>
            <div className="game-over-progress__chart-header">
              <span className="game-over-progress__chart-label">{CHART_LABEL}</span>
              <span className="game-over-progress__chart-detail">{chartState.chartDetail}</span>
            </div>

            <svg
              className="game-over-progress__chart"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Score trend chart"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id={`scoreArea-${gameId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--progress-accent)" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="var(--progress-accent)" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid */}
              {chartState.gridValues.map((value) => (
                <g key={`grid-${value}`}>
                  <line
                    className="game-over-progress__grid-line"
                    x1={CHART_PADDING.left}
                    x2={CHART_WIDTH - CHART_PADDING.right}
                    y1={chartState.getY(value)}
                    y2={chartState.getY(value)}
                  />
                  <text
                    className="game-over-progress__axis-label"
                    x={CHART_PADDING.left - 10}
                    y={chartState.getY(value) + 4}
                    textAnchor="end"
                  >
                    {formatCompactScore(value)}
                  </text>
                </g>
              ))}

              {/* Area under curve */}
              <path
                className="game-over-progress__score-area"
                d={chartState.scoreAreaPath}
                fill={`url(#scoreArea-${gameId})`}
              />

              {/* Lines */}
              <path className="game-over-progress__best-line" d={chartState.bestPath} />
              <path className="game-over-progress__average-line" d={chartState.averagePath} />
              <path className="game-over-progress__score-line" d={chartState.scorePath} />

              {/* Data dots */}
              {chartState.scoreDots.map((dot) => (
                <circle
                  key={dot.id}
                  className={`game-over-progress__score-dot${dot.isCurrent ? ' is-current' : ''}${dot.isPeak ? ' is-peak' : ''}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.isCurrent ? 12 : 8}
                />
              ))}

              {/* X-axis labels */}
              {chartState.axisLabels.map((axisLabel, index) => {
                const shouldShowLabel =
                  index === 0 ||
                  index === chartState.axisLabels.length - 1 ||
                  index % chartState.xAxisLabelStep === 0;
                if (!shouldShowLabel) return null;
                return (
                  <text
                    key={axisLabel.id}
                    className="game-over-progress__axis-label is-x"
                    x={chartState.getX(index)}
                    y={CHART_HEIGHT - 10}
                    textAnchor="middle"
                  >
                    {axisLabel.label}
                  </text>
                );
              })}
            </svg>

            <div className="game-over-progress__legend">
              <span className="game-over-progress__legend-item">
                <span className="game-over-progress__legend-swatch is-score" />
                {ACTUAL_SERIES_LABEL}
              </span>
              <span className="game-over-progress__legend-item">
                <span className="game-over-progress__legend-swatch is-average" />
                {AVERAGE_SERIES_LABEL}
              </span>
              <span className="game-over-progress__legend-item">
                <span className="game-over-progress__legend-swatch is-best" />
                {BEST_SERIES_LABEL}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default GameOverProgressSummary;
