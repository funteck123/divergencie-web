import "dotenv/config";
import Database from "better-sqlite3";

const dbPath = (process.env.DATABASE_URL || "file:./dev.db").replace(/^file:/, "");
const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("cache_size = -32000");
sqlite.pragma("mmap_size = 134217728");
sqlite.pragma("temp_store = MEMORY");
sqlite.pragma("foreign_keys = ON");

sqlite.close();