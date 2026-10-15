// Controlled inputs for differential CLI tests ONLY. No runtime code imports
// this module. Fix wall-clock/UUID inputs so a command run from the same restored
// directory can be compared byte-for-byte, including event hashes and git trees.
// This does not stub the CLI, runtime, event store, adapters or ceremony writer.
import crypto from "node:crypto"
import { syncBuiltinESMExports } from "node:module"

if (process.env.SYNTH_CLI_PARITY_FIXTURE !== "1") {
  throw new Error("cli-parity-inputs must only be preloaded by the CLI parity test")
}
const instant = Number(process.env.SYNTH_CLI_PARITY_TIME)
if (!Number.isFinite(instant)) throw new Error("CLI parity fixture requires a finite clock")
const WallClock = Date
class FixtureClock extends WallClock {
  constructor(...args) {
    super(...(args.length ? args : [instant]))
  }
  static now() { return instant }
}
globalThis.Date = FixtureClock
let sequence = 0
crypto.randomUUID = () => {
  const hex = crypto.createHash("sha256").update(`${instant}:${sequence++}`).digest("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
syncBuiltinESMExports()
// Domain alignment IDs use Math.random rather than sdk.identity.uuid.
let randomSequence = 0
Math.random = () => crypto.createHash("sha256")
  .update(`math:${instant}:${randomSequence++}`).digest().readUInt32BE(0) / 0x100000000
