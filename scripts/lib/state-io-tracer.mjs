// Audit-only preload. Observe real filesystem calls; do not substitute stores,
// change return values, or time this instrumentation as CLI startup evidence.
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { syncBuiltinESMExports } from "node:module"

const root = process.env.SYNTH_STATE_TRACE_ROOT
const output = process.env.SYNTH_STATE_TRACE_FILE
if (!root || !output) throw new Error("State tracer requires explicit root and output")
const appendTrace = fs.appendFileSync.bind(fs)
const traceRoot = path.resolve(root)
function relative(file) {
  if (file instanceof URL) file = fileURLToPath(file)
  if (Buffer.isBuffer(file)) file = file.toString()
  if (typeof file !== "string") return undefined
  const rel = path.relative(traceRoot, path.resolve(file)).split(path.sep).join("/")
  return rel === ".synth" || rel.startsWith(".synth/") ? rel : undefined
}
function bytes(value, options) {
  if (typeof value === "string") return Buffer.byteLength(value, typeof options === "string" ? options : options?.encoding || "utf8")
  if (ArrayBuffer.isView(value)) return value.byteLength
  return undefined
}
function begin(api, op, args) {
  const file = relative(args[0])
  if (!file) return undefined
  const caller = (new Error().stack || "").split("\n").slice(2)
    .filter((line) => !line.includes("state-io-tracer.mjs")).slice(0, 3).map((line) => line.trim())
  return { api, op, file, caller, phase: process.env.SYNTH_STATE_TRACE_PHASE || "probe" }
}
function finish(record, args, result, error) {
  if (!record) return
  const size = record.op === "read" ? bytes(result, args[1]) : bytes(args[1], args[2])
  appendTrace(output, JSON.stringify({ ...record, ok: !error, ...(error ? { error: error.code || error.message } : {}), ...(size === undefined || error ? {} : { bytes: size }) }) + "\n")
}
for (const [name, op] of [["readFile", "read"], ["writeFile", "write"], ["appendFile", "append"]]) {
  const originalPromise = fsp[name]
  fsp[name] = async function (...args) {
    const record = begin(`promises.${name}`, op, args)
    try { const result = await originalPromise.apply(this, args); finish(record, args, result); return result }
    catch (error) { finish(record, args, undefined, error); throw error }
  }
  const originalSync = fs[`${name}Sync`]
  fs[`${name}Sync`] = function (...args) {
    const record = begin(`${name}Sync`, op, args)
    try { const result = originalSync.apply(this, args); finish(record, args, result); return result }
    catch (error) { finish(record, args, undefined, error); throw error }
  }
  const originalCallback = fs[name]
  fs[name] = function (...args) {
    const callback = args.at(-1)
    if (typeof callback !== "function") return originalCallback.apply(this, args)
    const record = begin(name, op, args)
    args[args.length - 1] = function (error, result) {
      finish(record, args, result, error)
      return callback.apply(this, arguments)
    }
    return originalCallback.apply(this, args)
  }
}
// This audit counts readFile/writeFile/appendFile calls, not mmap, stream or
// raw file-descriptor I/O. Report that boundary; never call it all disk I/O.
syncBuiltinESMExports()
