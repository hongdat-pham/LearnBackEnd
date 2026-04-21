import { readFile, writeFile } from "fs/promises";

const DB_PATH = "data/notes.json"; // ✅ đổi .js → .json

export async function readData() {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return []; // ✅ err.code, không phải err
    throw err;
  }
}

export async function writeData(data) {
  await writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}
