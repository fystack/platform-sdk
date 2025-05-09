export interface StatusPollerOptions {
  maxAttempts?: number
  interval?: number
  backoffFactor?: number
  maxInterval?: number
  timeoutMs?: number
}

export const DEFAULT_POLLER_OPTIONS: StatusPollerOptions = {
  maxAttempts: 10,
  interval: 1000, // Start with 1 second
  backoffFactor: 1.5, // Increase interval by 50% each time
  maxInterval: 10000, // Max 10 seconds between attempts
  timeoutMs: 10 * 60 * 1000 // 10 minutes totla
}

export class StatusPoller {
  private startTime: number
  private attempts: number
  private currentInterval: number
  private readonly options: Required<StatusPollerOptions>

  constructor(options: StatusPollerOptions = {}) {
    this.options = { ...DEFAULT_POLLER_OPTIONS, ...options } as Required<StatusPollerOptions>
    this.startTime = Date.now()
    this.attempts = 0
    this.currentInterval = this.options.interval
  }

  private async wait(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.currentInterval))

    // Implement exponential backoff
    this.currentInterval = Math.min(
      this.currentInterval * this.options.backoffFactor,
      this.options.maxInterval
    )
  }

  private shouldContinue(): boolean {
    const timeElapsed = Date.now() - this.startTime
    if (timeElapsed >= this.options.timeoutMs) {
      throw new Error(`Status polling timed out after ${timeElapsed}ms`)
    }

    if (this.attempts >= this.options.maxAttempts) {
      throw new Error(`Maximum polling attempts (${this.options.maxAttempts}) exceeded`)
    }

    return true
  }

  async poll<T>(
    pollingFn: () => Promise<T>,
    successCondition: (result: T) => boolean,
    errorCondition?: (result: T) => boolean | void
  ): Promise<T> {
    while (this.shouldContinue()) {
      this.attempts++

      const result = await pollingFn()

      // Check for error condition first
      if (errorCondition) {
        const shouldError = errorCondition(result)
        if (shouldError) {
          throw new Error('Status polling failed')
        }
      }

      // Check for success condition
      if (successCondition(result)) {
        return result
      }

      // If neither condition is met, wait and continue polling
      await this.wait()
    }

    throw new Error('Polling ended without meeting success condition')
  }
}
