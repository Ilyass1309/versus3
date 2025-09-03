export function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

export function inRange(n: number, min: number, max: number) {
  return n >= min && n <= max;
}

export function validateAction(a: unknown): a is 0 | 1 | 2 {
  return isInt(a) && a >= 0 && a <= 2;
}
