// server/api/accords.get.js
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const ACCORDS_PATH = join(process.cwd(), "assets", "data", "accords.json")

export default defineEventHandler(async () => {
  try {
    const raw = await readFile(ACCORDS_PATH, "utf8")
    const parsed = JSON.parse(raw)
    return {
      ok: true,
      accords: Array.isArray(parsed) ? parsed : []
    }
  } catch {
    return {
      ok: true,
      accords: []
    }
  }
})
