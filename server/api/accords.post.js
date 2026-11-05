// server/api/accords.post.js
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"

const ACCORDS_PATH = join(process.cwd(), "assets", "data", "accords.json")

function norm(v) {
  return String(v ?? "").trim()
}

function accordIdentity(a) {
  return norm(a?.id || a?.key || a?.name)
}

function normaliseAccordBody(body) {
  // Supports all formats used during this project:
  // 1) { accord }
  // 2) { recipe }
  // 3) { ingredient } older shared ingredient route format
  // 4) { recipeName, items, ...summaryFields } older accords route format
  let accord = body?.accord || body?.recipe || body?.ingredient || null

  if (!accord && body?.recipeName) {
    accord = {
      id: body?.id || body?.key || ("accord::" + Date.now()),
      cas: "MIXTURE",
      type: "ACCORD",
      name: body.recipeName,
      dateSaved: body?.dateSaved || new Date().toISOString().slice(0, 10),
      items: Array.isArray(body?.items) ? body.items : [],
      totalGrams: body?.totalGrams,
      totalIngredientGrams: body?.totalIngredientGrams,
      totalConcentrationPercent: body?.totalConcentrationPercent,
      totalEtohPercent: body?.totalEtohPercent,
      totalCost: body?.totalCost,
      costPerGram: body?.costPerGram,
      allergenList: Array.isArray(body?.allergenList) ? body.allergenList : [],
      ifraList: Array.isArray(body?.ifraList) ? body.ifraList : []
    }
  }

  if (!accord || typeof accord !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing accord object"
    })
  }

  if (!norm(accord.name) && norm(body?.recipeName)) {
    accord.name = norm(body.recipeName)
  }

  if (!norm(accord.name)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Accord name is required"
    })
  }

  if (!norm(accord.id)) accord.id = "accord::" + Date.now()
  if (!norm(accord.cas)) accord.cas = "MIXTURE"
  if (!norm(accord.type)) accord.type = "ACCORD"
  if (!norm(accord.dateSaved)) accord.dateSaved = new Date().toISOString().slice(0, 10)
  if (!Array.isArray(accord.items)) accord.items = []

  return accord
}

function matchesAccord(existing, key, incoming) {
  const k = norm(key)
  const incomingId = accordIdentity(incoming)

  if (k) {
    if (norm(existing?.id) === k) return true
    if (norm(existing?.key) === k) return true
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
  const body = await readBody(event)
  const mode = body?.mode || "append"
  const key = body?.key
  const accord = normaliseAccordBody(body)

  const accords = await readAccords()
  const idx = accords.findIndex((x) => matchesAccord(x, key, accord))

  // For saved recipes, usually append. If the same accord id/key is posted again, update that record.
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
