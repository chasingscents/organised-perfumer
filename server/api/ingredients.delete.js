// server/api/ingredients.delete.js
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const INGREDIENTS_PATH = join(process.cwd(), "assets", "data", "ingredients.json")
const BACKUP_DIR = join(process.cwd(), "assets", "data", ".backups")

function norm(v) {
  return String(v ?? "").trim()
}

function normLower(v) {
  return norm(v).toLowerCase()
}

function casArray(v) {
  if (Array.isArray(v)) return v.map(norm).filter(Boolean)
  const s = norm(v)
  return s ? [s] : []
}

function identityValues(x) {
  const out = []

  for (const v of [x?.key, x?.id, x?.name]) {
    const s = norm(v)
    if (s && !out.includes(s)) out.push(s)
  }

  for (const cas of casArray(x?.cas)) {
    if (cas && !out.includes(cas)) out.push(cas)
  }

  return out
}

function matchesIngredient(existing, keys) {
  const keySet = new Set(keys.map(normLower).filter(Boolean))
  if (!keySet.size) return false
  return identityValues(existing).some(v => keySet.has(normLower(v)))
}

async function readIngredientsStrict() {
  let raw = ""

  try {
    raw = await readFile(INGREDIENTS_PATH, "utf8")
  } catch {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error("ingredients.json must contain a JSON array.")
    }
    return parsed
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage:
        "ingredients.json is not valid JSON. Delete was cancelled so the file would not be overwritten. Fix ingredients.json, then try again."
    })
  }
}

async function writeIngredientsAtomic(ingredients) {
  await mkdir(dirname(INGREDIENTS_PATH), { recursive: true })
  await mkdir(BACKUP_DIR, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = join(BACKUP_DIR, `ingredients.${stamp}.json`)
  const tempPath = join(dirname(INGREDIENTS_PATH), `ingredients.${process.pid}.${Date.now()}.tmp.json`)

  // Keep a recoverable backup before changing the live file.
  try {
    await copyFile(INGREDIENTS_PATH, backupPath)
  } catch {
    // If the file does not exist yet, skip backup.
  }

  const nextRaw = JSON.stringify(ingredients, null, 2) + "\n"

  // Validate the exact bytes before replacing ingredients.json.
  const parsed = JSON.parse(nextRaw)
  if (!Array.isArray(parsed)) {
    throw createError({ statusCode: 500, statusMessage: "Generated ingredients data was not a JSON array." })
  }

  await writeFile(tempPath, nextRaw, "utf8")
  await rename(tempPath, INGREDIENTS_PATH)

  return backupPath
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const query = getQuery(event)

  const keys = [
    query?.key,
    query?.id,
    query?.cas,
    query?.name,
    body?.key,
    body?.id,
    body?.cas,
    body?.name,
    ...(Array.isArray(body?.keys) ? body.keys : []),
    ...(body?.ingredient ? identityValues(body.ingredient) : [])
  ]
    .flatMap(v => casArray(v))
    .map(norm)
    .filter(Boolean)

  if (!keys.length) {
    throw createError({ statusCode: 400, statusMessage: "Ingredient key is required." })
  }

  const ingredients = await readIngredientsStrict()
  const before = ingredients.length
  const next = ingredients.filter(item => !matchesIngredient(item, keys))
  const deleted = before - next.length

  if (deleted < 1) {
    return { ok: true, deleted: 0, count: before, keys }
  }

  const backupPath = await writeIngredientsAtomic(next)

  return {
    ok: true,
    deleted,
    count: next.length,
    keys,
    backupPath
  }
})
