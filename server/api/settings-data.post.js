// server/api/settings-data.post.js
import { writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"

const FILES = {
  allergens: join(process.cwd(), "assets", "data", "allergens.json"),
  ifra51: join(process.cwd(), "assets", "data", "ifra51.json"),
  tags: join(process.cwd(), "assets", "data", "tags.json"),
  dilutants: join(process.cwd(), "assets", "data", "dilutants.json")
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const file = String(body?.file || "").trim()
  const data = body?.data

  if (!FILES[file]) {
    throw createError({ statusCode: 400, statusMessage: "Unsupported settings data file" })
  }

  if (!Array.isArray(data)) {
    throw createError({ statusCode: 400, statusMessage: "Settings data must be an array" })
  }

  await mkdir(dirname(FILES[file]), { recursive: true })
  await writeFile(FILES[file], JSON.stringify(data, null, 2) + "\n", "utf8")

  return { ok: true, file, count: data.length }
})
