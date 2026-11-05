// server/api/accords.js
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"

const ACCORDS_PATH = join(process.cwd(), "assets", "data", "accords.json")

function norm(v) {
  return String(v ?? "").trim()
}

function accordIdentity(a) {
  return norm(a?.id || a?.key || a?.name)
}

function matchesAccord(existing, key, incoming) {
  const k = norm(key)
  const incomingId = accordIdentity(incoming)

  if (k) {
    if (norm(existing?.id) === k) return true
    if (norm(existing?.key) === k) return true
    if (norm(existing?.name) === k) return true
  }

  if (incomingId) {
    if (norm(existing?.id) === incomingId) return true
    if (norm(existing?.key) === incomingId) return true
  }

  return false
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
  const method = String(event.method || "GET").toUpperCase()

  if (method === "GET") {
    return {
      ok: true,
      accords: await readAccords()
    }
  }

  if (method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed"
    })
  }

  const body = await readBody(event)
  const mode = body?.mode || "append"
  const key = body?.key
  const accord = body?.accord || body?.ingredient

  if (!accord || typeof accord !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing accord object"
    })
  }

  const accords = await readAccords()
  const idx = accords.findIndex((x) => matchesAccord(x, key, accord))

  // append = add new accord unless exact id/key exists; update = update existing or append if missing
  if (mode === "update") {
    if (idx === -1) accords.push(accord)
    else accords[idx] = { ...accords[idx], ...accord }
  } else {
    if (idx === -1) accords.push(accord)
    else accords[idx] = { ...accords[idx], ...accord }
  }

  await writeAccords(accords)

  return {
    ok: true,
    count: accords.length,
    key: accord.id || accord.key || accord.name || key || null
  }
})
