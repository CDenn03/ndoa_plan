const EXCLUDED = new Set(['updatedAt','syncedAt','isDirty','checksum','version','deletedAt'])

function canonicalise(obj: Record<string, unknown>): string {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(obj).sort()) {
    if (EXCLUDED.has(k) || obj[k] === undefined) continue
    out[k] = obj[k]
  }
  return JSON.stringify(out)
}

export function computeChecksum(entity: Record<string, unknown>): string {
  const str = canonicalise(entity)
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0')
}

export function hasChanged(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return computeChecksum(a) !== computeChecksum(b)
}
