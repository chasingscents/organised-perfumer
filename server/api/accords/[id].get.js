import { promises as fs } from "node:fs"
import path from "node:path"

function accordsPath() {
  return path.resolve(process.cwd(), "data", "accords.json")
}

async function readAccordsSafe() {
  const file = accordsPath()
  try {
    const txt = await fs.readFile(file, "utf8")
    const data = JSON.parse(txt || "[]")
    return Array.isArray(data) ? data : []
  } catch (e) {
    if (e && e.code === "ENOENT") return []
    throw e
  }
}

export default defineEventHandler(async (event) => {
  const { id } = event.context.params || {}
  const accords = await readAccordsSafe()
  const found = accords.find(a => String(a.id) === String(id))

  if (!found) {
    throw createError({ statusCode: 404, statusMessage: "Accord not found." })
  }

  return found
})
