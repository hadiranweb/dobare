import pricingConfig from "@/config/pricing-config.json";

export type PricingOption = { value: string; label: string; factor?: number };
export type PricingField = {
  type: "number" | "select";
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: string | number;
  help?: string;
  note?: string;
  role?: string;
  section?: string;
  options?: PricingOption[];
  mapTo?: { inputMin: number; inputMax: number; factorMin: number; factorMax: number };
};
type Profile = { drop: number; ageRate: number; useRate: number; floor: number; cap: number; usageLabel: string; usagePerYear: number };
export type PricingCategory = { name: string; profile: Profile; modules: string[]; bonuses: { id: string; label: string; bonus: number }[] };
export type PricingModule = { label: string; note?: string; fields: Record<string, PricingField> };

export const usedPricingConfig = pricingConfig as unknown as {
  output: { negotiationFloorMultiplier: number; listPriceMultiplier: number };
  universalFields: Record<string, PricingField>;
  modules: Record<string, PricingModule>;
  categories: Record<string, PricingCategory>;
};

export type UsedPriceResult = {
  fair: number;
  floor: number;
  list: number;
  newEquivalent: number;
  coefficient: number;
};

/** Pure, config-driven calculation. It does not mutate product data or form state. */
export function calculateUsedPrice(categoryKey: string, values: Record<string, string | number>, selectedBonuses: string[]): UsedPriceResult | null {
  const category = usedPricingConfig.categories[categoryKey];
  if (!category) return null;
  const number = (key: string, fallback = 0) => {
    const parsed = Number(values[key]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const selectFactor = (field: PricingField, key: string) => field.options?.find(option => option.value === String(values[key] ?? field.default))?.factor ?? 1;
  const rcv = number("rcv");
  if (rcv <= 0) return null;

  let factor = category.profile.drop;
  for (const [key, field] of Object.entries(usedPricingConfig.universalFields)) {
    if (field.role === "factor") factor *= selectFactor(field, key);
  }
  factor *= Math.pow(1 - category.profile.ageRate, Math.max(0, number("ageYears")));
  factor *= Math.pow(1 - category.profile.useRate, Math.max(0, number("usageAmount")) / Math.max(category.profile.usagePerYear, 1));

  let quantity = 1;
  let materialValue = 0;
  for (const moduleKey of category.modules) {
    for (const [key, field] of Object.entries(usedPricingConfig.modules[moduleKey]?.fields || {})) {
      if (field.role === "factor") factor *= selectFactor(field, key);
      if (field.role === "linear" && field.mapTo) {
        const input = Math.min(field.mapTo.inputMax, Math.max(field.mapTo.inputMin, number(key, Number(field.default) || 0)));
        const progress = (input - field.mapTo.inputMin) / (field.mapTo.inputMax - field.mapTo.inputMin || 1);
        factor *= field.mapTo.factorMin + progress * (field.mapTo.factorMax - field.mapTo.factorMin);
      }
      if (field.role === "multiplier") quantity = Math.max(1, number(key, 1));
      if (field.role === "absoluteFloor") materialValue = Math.max(0, number(key));
    }
  }

  const bonusSum = category.bonuses.filter(bonus => selectedBonuses.includes(bonus.id)).reduce((sum, bonus) => sum + bonus.bonus, 0);
  factor *= 1 + bonusSum;
  const coefficient = Math.min(category.profile.cap, Math.max(category.profile.floor, factor));
  // The material floor applies to one unit, before quantity, as required by the matrix.
  const fair = Math.round(Math.max(rcv * coefficient, materialValue) * quantity);
  return {
    fair,
    floor: Math.round(fair * usedPricingConfig.output.negotiationFloorMultiplier),
    list: Math.round(fair * usedPricingConfig.output.listPriceMultiplier),
    newEquivalent: Math.round(rcv * quantity),
    coefficient,
  };
}
