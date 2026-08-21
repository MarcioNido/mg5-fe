export const DECIMAL_PATTERN = /^-?\d+(?:\.\d{1,4})?$/;

export function decimalToUnits(value: string): bigint | null {
  if (!DECIMAL_PATTERN.test(value)) return null;
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const units = BigInt(whole!) * 10000n + BigInt(fraction.padEnd(4, '0'));
  return negative ? -units : units;
}

export function unitsToDecimal(value: bigint) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 10000n;
  const fraction = (absolute % 10000n).toString().padStart(4, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function splitRemaining(total: string, splitAmounts: string[]) {
  const totalUnits = decimalToUnits(total);
  const splitUnits = splitAmounts.map(decimalToUnits);
  if (totalUnits === null || splitUnits.some((value) => value === null)) return null;
  return totalUnits - splitUnits.reduce<bigint>((sum, value) => sum + (value ?? 0n), 0n);
}
