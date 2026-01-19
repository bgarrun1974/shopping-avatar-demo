export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normHigherBetter(value, min, max) {
  if (max === min) return 1;
  return clamp((value - min) / (max - min), 0, 1);
}

function normLowerBetter(value, min, max) {
  if (max === min) return 1;
  return 1 - clamp((value - min) / (max - min), 0, 1);
}

/**
 * weights must sum to 100 (or close); we normalize anyway.
 * weights = { value, reliability, performance, camera, battery, safetyPrivacy }
 */
export function rankPhones(phones, answers, weights) {
  const wSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const W = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / wSum]));

  // Hard filters
  let filtered = phones.filter((p) => p.priceUsedUSD <= answers.budgetUSD);
  if (answers.os !== "Any") filtered = filtered.filter((p) => p.os === answers.os);
  if (answers.maxSize === "Small") filtered = filtered.filter((p) => p.screenIn <= 6.3);
  if (answers.maxSize === "Medium") filtered = filtered.filter((p) => p.screenIn <= 6.7);

  // If filter got too strict, relax size first (demo-friendly)
  if (filtered.length < 3) filtered = phones.filter((p) => p.priceUsedUSD <= answers.budgetUSD && (answers.os === "Any" || p.os === answers.os));
  if (filtered.length < 3) filtered = phones;

  // Compute normalization ranges
  const prices = filtered.map((p) => p.priceUsedUSD);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const scorePhone = (p) => {
    const valueScore = normLowerBetter(p.priceUsedUSD, minPrice, maxPrice); // cheaper is better
    const s =
      W.value * valueScore +
      W.reliability * normHigherBetter(p.reliability, 1, 10) +
      W.performance * normHigherBetter(p.performance, 1, 10) +
      W.camera * normHigherBetter(p.camera, 1, 10) +
      W.battery * normHigherBetter(p.battery, 1, 10) +
      W.safetyPrivacy * normHigherBetter(p.safetyPrivacy, 1, 10);

    return s;
  };

  const scored = filtered
    .map((p) => {
      const score = scorePhone(p);
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored;
}

export function explain(phone, answers, weights) {
  // Simple, transparent explanation tied to weights + user constraints
  const topFactors = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const factorToText = (k) =>
    ({
      value: "value for money",
      reliability: "reliability",
      performance: "speed/performance",
      camera: "camera quality",
      battery: "battery life",
      safetyPrivacy: "safety & privacy"
    }[k] || k);

  const bullets = [];
  bullets.push(`Fits your budget target (≈ $${phone.priceUsedUSD} used).`);
  if (answers.os !== "Any") bullets.push(`Matches your OS preference: ${answers.os}.`);

  bullets.push(`Strong on what you prioritize most: ${factorToText(topFactors[0])}${topFactors[1] ? ` and ${factorToText(topFactors[1])}` : ""}.`);

  // Trade-offs (keep it honest)
  const tradeoffs = [];
  if (phone.screenIn > 6.6) tradeoffs.push("Large phone — might be less comfortable one-handed.");
  if (phone.priceUsedUSD > answers.budgetUSD * 0.9) tradeoffs.push("Near your budget ceiling.");
  if (phone.reliability <= 7) tradeoffs.push("Reliability score is only mid-range (check warranty/condition).");
  if (tradeoffs.length === 0) tradeoffs.push("No major compromises for your stated preferences.");

  return { bullets, tradeoffs };
}
