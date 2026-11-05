// server/api/settings-data.get.js
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const FILES = {
  allergens: join(process.cwd(), "assets", "data", "allergens.json"),
  ifra51: join(process.cwd(), "assets", "data", "ifra51.json"),
  tags: join(process.cwd(), "assets", "data", "tags.json"),
  dilutants: join(process.cwd(), "assets", "data", "dilutants.json")
}

async function readJson(path, fallback = []) {
  try {
    const raw = await readFile(path, "utf8")
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const file = String(query?.file || "").trim()

  if (file) {
    if (!FILES[file]) {
      throw createError({ statusCode: 400, statusMessage: "Unsupported settings data file" })
    }
    return { ok: true, file, data: await readJson(FILES[file], []) }
  }

  const out = {}
  for (const [key, path] of Object.entries(FILES)) {
    out[key] = await readJson(path, [])
  }

  return { ok: true, data: out }
})
