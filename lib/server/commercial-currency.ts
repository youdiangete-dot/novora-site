import "server-only";

const MAXIMUM_SAFE_AMOUNT_MINOR = BigInt(Number.MAX_SAFE_INTEGER);
const AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d+))?$/;

const COMMERCIAL_CURRENCY_MINOR_UNIT_EXPONENTS = Object.freeze({
  CNY: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KWD: 3,
  TWD: 2,
  USD: 2,
} as const);

export type SupportedCommercialCurrency =
  keyof typeof COMMERCIAL_CURRENCY_MINOR_UNIT_EXPONENTS;

export function isSupportedCommercialCurrency(
  value: unknown,
): value is SupportedCommercialCurrency {
  return typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(COMMERCIAL_CURRENCY_MINOR_UNIT_EXPONENTS, value);
}

export function getCommercialCurrencyMinorUnitExponent(
  currency: unknown,
): number | null {
  return isSupportedCommercialCurrency(currency)
    ? COMMERCIAL_CURRENCY_MINOR_UNIT_EXPONENTS[currency]
    : null;
}

export function commercialAmountToMinorUnits(
  value: unknown,
  currency: unknown,
): number | null {
  if (typeof value !== "string") return null;
  const exponent = getCommercialCurrencyMinorUnitExponent(currency);
  if (exponent === null) return null;
  const match = AMOUNT_PATTERN.exec(value);
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (exponent === 0) {
    if (fraction && !/^0+$/.test(fraction)) return null;
  } else if (fraction.length > exponent) return null;

  try {
    const scale = BigInt(`1${"0".repeat(exponent)}`);
    const wholeMinor = BigInt(match[1]) * scale;
    const fractionalMinor = fraction
      ? BigInt(fraction.padEnd(exponent, "0"))
      : BigInt(0);
    const amountMinor = wholeMinor + fractionalMinor;
    return amountMinor <= MAXIMUM_SAFE_AMOUNT_MINOR
      ? Number(amountMinor)
      : null;
  } catch {
    return null;
  }
}
