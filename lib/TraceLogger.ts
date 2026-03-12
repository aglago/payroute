/**
 * TraceLogger - Captures console output during webhook processing
 *
 * Usage:
 *   const tracer = new TraceLogger()
 *   tracer.start()
 *   // ... your code with console.log, console.info, etc.
 *   tracer.stop()
 *   const logs = tracer.getLogs()
 */

import type { TraceLogEntry } from './types'

export class TraceLogger {
  private logs: TraceLogEntry[] = []
  private originalConsole: {
    log: typeof console.log
    info: typeof console.info
    warn: typeof console.warn
    error: typeof console.error
    debug: typeof console.debug
  }
  private isCapturing: boolean = false

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    }
  }

  /**
   * Start capturing console output
   */
  start(): void {
    if (this.isCapturing) return
    this.isCapturing = true
    this.logs = []

    // Override console methods to capture output
    console.log = (...args: unknown[]) => {
      this.capture('log', args)
      this.originalConsole.log(...args)
    }

    console.info = (...args: unknown[]) => {
      this.capture('info', args)
      this.originalConsole.info(...args)
    }

    console.warn = (...args: unknown[]) => {
      this.capture('warn', args)
      this.originalConsole.warn(...args)
    }

    console.error = (...args: unknown[]) => {
      this.capture('error', args)
      this.originalConsole.error(...args)
    }

    console.debug = (...args: unknown[]) => {
      this.capture('debug', args)
      this.originalConsole.debug(...args)
    }
  }

  /**
   * Stop capturing and restore original console methods
   */
  stop(): void {
    if (!this.isCapturing) return
    this.isCapturing = false

    // Restore original console methods
    console.log = this.originalConsole.log
    console.info = this.originalConsole.info
    console.warn = this.originalConsole.warn
    console.error = this.originalConsole.error
    console.debug = this.originalConsole.debug
  }

  /**
   * Get captured logs
   */
  getLogs(): TraceLogEntry[] {
    return [...this.logs]
  }

  /**
   * Clear captured logs
   */
  clear(): void {
    this.logs = []
  }

  /**
   * Capture a log entry
   */
  private capture(level: TraceLogEntry['level'], args: unknown[]): void {
    const entry: TraceLogEntry = {
      level,
      message: this.formatMessage(args),
      timestamp: new Date().toISOString(),
    }

    // If there's structured data (objects), include it separately
    const dataArgs = args.filter((arg) => typeof arg === 'object' && arg !== null)
    if (dataArgs.length > 0) {
      entry.data =
        dataArgs.length === 1
          ? this.safeStringify(dataArgs[0])
          : dataArgs.map((d) => this.safeStringify(d))
    }

    this.logs.push(entry)
  }

  /**
   * Format arguments into a message string
   */
  private formatMessage(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg
        if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg)
        if (arg === null) return 'null'
        if (arg === undefined) return 'undefined'
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`
        // For objects, just show a summary in the message
        return '[Object]'
      })
      .join(' ')
  }

  /**
   * Safely stringify objects, handling circular references
   */
  private safeStringify(obj: unknown): unknown {
    try {
      // Handle circular references and large objects
      const seen = new WeakSet()
      return JSON.parse(
        JSON.stringify(obj, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]'
            }
            seen.add(value)
          }
          // Truncate very long strings
          if (typeof value === 'string' && value.length > 1000) {
            return value.substring(0, 1000) + '...[truncated]'
          }
          return value
        })
      )
    } catch {
      return '[Unable to stringify]'
    }
  }
}

/**
 * Helper function to run code with trace logging
 */
export async function withTraceLogging<T>(
  fn: () => Promise<T>
): Promise<{ result: T; logs: TraceLogEntry[] }> {
  const tracer = new TraceLogger()
  tracer.start()

  try {
    const result = await fn()
    return { result, logs: tracer.getLogs() }
  } finally {
    tracer.stop()
  }
}

export default TraceLogger
