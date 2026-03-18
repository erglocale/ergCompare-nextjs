export interface CurrencyRecord {
  id: string;
  name: string | null;
  value: number | null;
  date?: string | null;
  provider?: string | null;
}

export const USD_CURRENCY: CurrencyRecord = {
  id: "USD",
  name: "US Dollar",
  value: 1,
  date: null,
  provider: null,
};

export function convertCurrencyAmount(
  currencyFrom: CurrencyRecord | null | undefined,
  currencyTo: CurrencyRecord | null | undefined,
  value: number
) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const fromCurrency = currencyFrom ?? USD_CURRENCY;
  const toCurrency = currencyTo ?? USD_CURRENCY;
  const fromValue = fromCurrency.value;
  const toValue = toCurrency.value;

  if (fromValue === null || toValue === null) {
    return Number(value.toFixed(3));
  }

  if (fromCurrency.id === toCurrency.id) {
    return Number(value.toFixed(3));
  }

  if (fromCurrency.id === USD_CURRENCY.id) {
    return Number((value * toValue).toFixed(3));
  }

  const valueInUsd = Number((value / fromValue).toFixed(3));
  return Number((valueInUsd * toValue).toFixed(3));
}

export function formatCurrencyValue(
  value: number,
  currencyCode = USD_CURRENCY.id,
  fractionDigits = 0
) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCurrencyPerUnit(
  value: number,
  currencyCode = USD_CURRENCY.id,
  unit = "km"
) {
  return `${formatCurrencyValue(value, currencyCode, 2)}/${unit}`;
}
