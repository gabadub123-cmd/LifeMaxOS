// Ideas — Score Calculation (0-100)
// Revenue score is pulled from REVENUE_OPTIONS so one-time values are consistent.

import { REVENUE_OPTIONS } from './constants';

const EFF = { quick: 1.0, medium: 0.85, heavy: 0.6, major: 0.35 };
const CAP = { none: 1.0, small: 0.9, medium: 0.7, large: 0.45 };

export function calcScore(idea) {
  const revOpt = REVENUE_OPTIONS.find(r => r.key === idea.revenue_potential);
  const revenue = revOpt ? revOpt.value : 30;
  const effort  = EFF[idea.effort]        || 0.85;
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
