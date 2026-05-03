function trimTrailingZeros(value) {
  return value
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
}

export function formatCompactScore(value) {
  const numericValue = Number(value) || 0;
  const absoluteValue = Math.abs(numericValue);
  const sign = numericValue < 0 ? "-" : "";

  if (absoluteValue < 1000) {
    return `${numericValue.toLocaleString("en-US")}`;
  }

  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "k" },
  ];

  const matchedUnit = units.find((unit) => absoluteValue >= unit.threshold) ?? units[units.length - 1];
  const compactValue = absoluteValue / matchedUnit.threshold;
  const decimals = compactValue >= 100 ? 0 : compactValue >= 10 ? 1 : 2;

  return `${sign}${trimTrailingZeros(compactValue.toFixed(decimals))}${matchedUnit.suffix}`;
}
