export const DEFAULT_MAX_PRICE_DELTA_PCT = 3.5;

type Candidate = { price: number; score: number; distance: number };

// Python's round() uses ties-to-even, unlike Math.round().
function roundHalfToEven(value: number): number {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

/**
 * Converts a raw selling price to a nearby psychological price.
 * The result never moves more than maxDeltaPct from the raw value.
 */
export function psychologicalPrice(baseValue: number, maxDeltaPct = DEFAULT_MAX_PRICE_DELTA_PCT, allowDown = true): number {
  const base = roundHalfToEven(baseValue);
  if (!Number.isFinite(base) || base <= 0) return base;

  const candidates: Candidate[] = [];
  const add = (candidate: number, bonus = 0) => {
    if (!Number.isSafeInteger(candidate) || candidate <= 0) return;
    const distance = Math.abs(candidate - base);
    const pct = distance / base * 100;
    if (pct > maxDeltaPct || (!allowDown && candidate < base)) return;
    candidates.push({ price: candidate, score: pct - bonus, distance });
  };

  if (base < 1_000) {
    const prefix = Math.floor(base / 100);
    for (let offset = -3; offset <= 3; offset++) {
      const p = prefix + offset;
      if (p < 1) continue;
      add(p * 100 + 59, 3);
      add(p * 100 + 50, 2);
      add(p * 100 + 80, 1.8);
      add(p * 100, 1);
    }
  } else if (base < 1_000_000) {
    for (const unit of [1_000, 10_000, 100_000]) {
      const prefix = Math.floor(base / unit);
      for (let offset = -2; offset <= 2; offset++) {
        const p = prefix + offset;
        if (p < 1) continue;
        add(p * unit + 59, 2.8);
        add(p * unit + 50, 2.2);
        add(p * unit + 80, 2);
        add(p * unit, 1.5);
        add(p * unit + 90, 1.7);
      }
    }

    for (const digit of [5, 8, 9]) {
      for (const power of [3, 4, 5]) {
        const unit = 10 ** power;
        const prefix = Math.floor(base / (unit * 10));
        for (let offset = -1; offset <= 1; offset++) {
          const p = Math.max(0, prefix + offset);
          add(p * 10 * unit + digit * unit, digit === 5 || digit === 8 ? 2.5 : 1.8);
        }
      }
    }
  } else {
    const millions = Math.floor(base / 1_000_000);
    for (let offset = -1; offset <= 1; offset++) {
      const million = millions + offset;
      if (million < 1) continue;
      const anchor = million * 1_000_000;
      add(anchor + 580_000, 4);
      add(anchor + 589_000, 3.8);
      add(anchor + 558_000, 3.5);
      add(anchor + 590_000, 3.2);
      add(anchor + 500_000, 3);
      add(anchor + 800_000, 2.8);
      add(anchor + 900_000, 2.5);
      add(anchor + 550_000, 2.7);
      add(anchor + 599_000, 2.6);
      add(anchor, 1.5);
      add(anchor + 579_000, 3);
      add(anchor + 581_000, 2.9);
    }
  }

  for (const step of [100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000]) {
    add(roundHalfToEven(base / step) * step, 0.8);
    add(Math.floor(base / step) * step + 5 * (step >= 10 ? Math.floor(step / 10) : 1), 1);
  }

  if (!candidates.length) return base;
  candidates.sort((a, b) => a.score - b.score || a.distance - b.distance);
  return candidates[0].price;
}
