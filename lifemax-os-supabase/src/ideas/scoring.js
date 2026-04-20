// Ideas — Score Calculation (0-100)

const REV = { low: 10, medium: 30, high: 60, massive: 100 };
const EFF = { quick: 1.0, medium: 0.85, heavy: 0.6, major: 0.35 };
const CAP = { none: 1.0, small: 0.9, medium: 0.7, large: 0.45 };

export function calcScore(idea) {
  const revenue = REV[idea.revenue_potential] || 30;
  const effort = EFF[idea.effort] || 0.85;
  const capital = CAP[idea.capital_needed] || 0.9;
  const yearOne = idea.fits_year_one ? 1.2 : 0.8;
  return Math.round(revenue * effort * capital * yearOne);
}

export function scoreColor(score) {
  if (score >= 70) return '#76FF03';
  if (score >= 40) return '#FFD600';
  return '#FF5252';
}

export function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}
