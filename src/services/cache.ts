export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; until: number }>();
  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 256,
    private readonly now = Date.now,
  ) {}
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.until <= this.now()) {
      this.entries.delete(key);
      return;
    }
    return structuredClone(entry.value);
  }
  set(key: string, value: T): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries)
      this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, {
      value: structuredClone(value),
      until: this.now() + this.ttlMs,
    });
  }
  clear(): void {
    this.entries.clear();
  }
}
