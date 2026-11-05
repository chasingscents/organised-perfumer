// server/api/ingredients.post.js
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"

const INGREDIENTS_PATH = join(process.cwd(), "assets", "data", "ingredients.json")

function norm(v) {
  return String(v ?? "").trim()
}

function matchesIngredient(existing, key, incoming) {
  // Safety data belongs to a particular stock. A shared CAS must never
  // override an explicit record ID or key during an edit or append.
  const id = norm(incoming?.id)
  if (id) return norm(existing?.id) === id

  const reference = norm(incoming?.key) || norm(key)
  if (reference && reference !== norm(incoming?.cas)) {
    return norm(existing?.key) === reference || norm(existing?.id) === reference
  }

  // Legacy records without a specific identity need both CAS and name.
  return !!norm(incoming?.cas) && norm(existing?.cas) === norm(incoming.cas) &&
    norm(existing?.name) === norm(incoming?.name)
}

async function readIngredients() {
  try {
    const raw = await readFile(INGREDIENTS_PATH, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const mode = body?.mode || "append"
  const key = body?.key
  const ingredient = body?.ingredient

  if (!ingredient || typeof ingredient !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing ingredient object"
    })
  }

  const ingredients = await readIngredients()
  const matches = ingredients.map((existing, index) => matchesIngredient(existing, key, ingredient) ? index : -1)
    .filter(index => index >= 0)
  if (matches.length > 1) {
    throw createError({ statusCode: 409, statusMessage: "More than one ingredient matches. Use the ingredient's unique ID or key." })
  }
  const idx = matches[0] ?? -1

  if (mode === "update") {
    if (idx === -1) {
      ingredients.push(ingredient)
    } else {
      ingredients[idx] = {
        ...ingredients[idx],
        ...ingredient
      }
    }
  } else {
    if (idx === -1) {
      ingredients.push(ingredient)
    } else {
      ingredients[idx] = {
        ...ingredients[idx],
        ...ingredient
      }
    }
  }

  await mkdir(dirname(INGREDIENTS_PATH), { recursive: true })
  await writeFile(INGREDIENTS_PATH, JSON.stringify(ingredients, null, 2) + "\n", "utf8")

  return {
    ok: true,
    count: ingredients.length,
    mode,
    key: ingredient.key || ingredient.id || ingredient.cas || key || null
  }
})
