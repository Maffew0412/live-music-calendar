export function createRateLimiter(maxPerSecond: number) {
  const queue: Array<{ resolve: () => void }> = [];
  let tokens = maxPerSecond;
  let lastRefill = Date.now();

  function refill() {
    const now = Date.now();
    const elapsed = now - lastRefill;
    tokens = Math.min(maxPerSecond, tokens + (elapsed / 1000) * maxPerSecond);
    lastRefill = now;
  }

  function tryDequeue() {
    refill();
    while (queue.length > 0 && tokens >= 1) {
      tokens -= 1;
      queue.shift()!.resolve();
    }
    if (queue.length > 0) {
      setTimeout(tryDequeue, 1000 / maxPerSecond);
    }
  }

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      await new Promise<void>((resolve) => {
        queue.push({ resolve });
        tryDequeue();
      });
      return fn();
    },
  };
}

export const nominatimLimiter = createRateLimiter(1);
