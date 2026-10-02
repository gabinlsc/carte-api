export function isSimpleRing(ring: number[][]): boolean {
  const cross = (a: number[], b: number[], c: number[]) =>
    (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
  const on = (a: number[], b: number[], p: number[]) =>
    Math.abs(cross(a, b, p)) < 1e-12 &&
    p[0]! >= Math.min(a[0]!, b[0]!) &&
    p[0]! <= Math.max(a[0]!, b[0]!) &&
    p[1]! >= Math.min(a[1]!, b[1]!) &&
    p[1]! <= Math.max(a[1]!, b[1]!);
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!,
      b = ring[i + 1]!;
    if (a[0] === b[0] && a[1] === b[1]) return false;
    if (Math.abs(a[0]! - b[0]!) > 180) return false;
    for (let j = i + 1; j < ring.length - 1; j++) {
      if (j === i + 1 || (i === 0 && j === ring.length - 2)) continue;
      const c = ring[j]!,
        d = ring[j + 1]!;
      if (
        (cross(a, b, c) * cross(a, b, d) < 0 &&
          cross(c, d, a) * cross(c, d, b) < 0) ||
        on(a, b, c) ||
        on(a, b, d) ||
        on(c, d, a) ||
        on(c, d, b)
      )
        return false;
    }
  }
  return true;
}
