// server/api/accords.delete.js
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"

const ACCORDS_PATH = join(process.cwd(), "assets", "data", "accords.json")

function norm(v) {
  return String(v ?? "").trim()
}

function keysFromAccord(a) {
  return [a?.id, a?.key, a?.name].map(norm).filter(Boolean)
}

function matchesAccord(existing, keys) {
  if (!keys.length) return false
  return keysFromAccord(existing).some(k => keys.includes(k))
}

async function readAccords() {
  try {
    const raw = await readFile(ACCORDS_PATH, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAccords(accords) {
  await mkdir(dirname(ACCORDS_PATH), { recursive: true })
  await writeFile(ACCORDS_PATH, JSON.stringify(accords, null, 2) + "\n", "utf8")
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const query = getQuery(event)

  const keys = [
    query?.key,
    query?.id,
    query?.name,
    body?.key,
    body?.id,
    body?.name,
    ...(body?.accord ? keysFromAccord(body.accord) : [])
  ].map(norm).filter(Boolean)

  if (!keys.length) {
    throw createError({ statusCode: 400, statusMessage: "Accord key is required" })
  }

  const accords = await readAccords()
  const before = accords.length
  const next = accords.filter(a => !matchesAccord(a, keys))

  await writeAccords(next)

  return {
    ok: true,
    deleted: before - next.length,
    count: next.length
  }
})
