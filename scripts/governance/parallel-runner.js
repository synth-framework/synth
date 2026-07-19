// ============================================================
// PARALLEL GOVERNANCE RUNNER (EXP-GOVERN-005)
// ============================================================
// Executes a scheduled governance plan concurrently up to a configurable
// limit while respecting the dependency DAG. Failed checks block downstream
// dependents; independent checks continue to run.
// ============================================================

/**
 * @typedef {Object} ParallelResult
 * @property {import("./scheduler.js").ScheduleEntry} entry
 * @property {Object} result
 */

export class ParallelRunner {
  /**
   * @param {Object} [options]
   * @param {number} [options.concurrency] - maximum parallel checks (default 1)
   * @param {number} [options.timeoutMs] - per-check timeout, 0 for none
   */
  constructor(options = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 1)
    this.timeoutMs = options.timeoutMs ?? 0
  }

  /**
   * @param {import("./scheduler.js").ScheduleEntry[]} plan
   * @param {(entry: import("./scheduler.js").ScheduleEntry) => Promise<Object>} execute
   * @returns {Promise<{results: ParallelResult[], failed: boolean}>}
   */
  async run(plan, execute) {
    const entriesById = new Map(plan.map((e) => [e.checkId, e]))
    const inDegree = new Map(
      plan.map((e) => [e.checkId, (e.dependencies ?? []).filter((d) => entriesById.has(d)).length]),
    )
    const dependents = new Map(plan.map((e) => [e.checkId, []]))
    for (const entry of plan) {
      for (const dep of entry.dependencies ?? []) {
        if (entriesById.has(dep)) {
          dependents.get(dep).push(entry.checkId)
        }
      }
    }

    const ready = plan.filter((e) => inDegree.get(e.checkId) === 0)
    /** @type {Map<string, Promise<void>>} */
    const running = new Map()
    /** @type {Map<string, ParallelResult>} */
    const completed = new Map()
    let anyFailed = false

    const markComplete = (entry, result) => {
      completed.set(entry.checkId, { entry, result })
      if (result.status !== "passed") {
        anyFailed = true
        // Block downstream dependents from running.
        return
      }
      for (const dependentId of dependents.get(entry.checkId)) {
        inDegree.set(dependentId, inDegree.get(dependentId) - 1)
        if (inDegree.get(dependentId) === 0) {
          ready.push(entriesById.get(dependentId))
        }
      }
    }

    while (completed.size < plan.length) {
      while (running.size < this.concurrency && ready.length > 0) {
        const entry = ready.shift()
        const task = this.runOne(entry, execute).then((result) => {
          running.delete(entry.checkId)
          markComplete(entry, result)
        })
        running.set(entry.checkId, task)
      }

      if (running.size === 0) {
        // Remaining entries are blocked by upstream failures.
        const now = new Date().toISOString()
        for (const entry of plan) {
          if (!completed.has(entry.checkId)) {
            completed.set(entry.checkId, {
              entry,
              result: {
                status: "blocked",
                exitCode: 1,
                startTime: now,
                endTime: now,
                durationMs: 0,
                error: "blocked by upstream failure",
              },
            })
          }
        }
        anyFailed = true
        break
      }

      await Promise.race([...running.values()])
    }

    return {
      results: plan.map((entry) => completed.get(entry.checkId)),
      failed: anyFailed,
    }
  }

  /**
   * @param {import("./scheduler.js").ScheduleEntry} entry
   * @param {(entry: import("./scheduler.js").ScheduleEntry) => Promise<Object>} execute
   */
  async runOne(entry, execute) {
    const startTime = Date.now()
    const startIso = new Date(startTime).toISOString()

    try {
      let promise = execute(entry)
      if (this.timeoutMs > 0) {
        promise = this.withTimeout(promise, this.timeoutMs, entry.checkId)
      }
      const result = await promise
      const endTime = Date.now()
      return {
        ...result,
        startTime: result.startTime ?? startIso,
        endTime: result.endTime ?? new Date(endTime).toISOString(),
        durationMs: result.durationMs ?? endTime - startTime,
      }
    } catch (err) {
      const endTime = Date.now()
      return {
        status: "failed",
        exitCode: -1,
        startTime: startIso,
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
        error: err.message,
      }
    }
  }

  async withTimeout(promise, ms, checkId) {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`check ${checkId} timed out after ${ms}ms`)), ms)
    })
    return Promise.race([promise, timeout])
  }
}
