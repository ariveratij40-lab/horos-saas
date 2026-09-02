import { readdir, readFile } from "node:fs/promises";

const migrationsDirectory = new URL("../../drizzle-pg/migrations/", import.meta.url);
const journalPath = new URL("../../drizzle-pg/migrations/meta/_journal.json", import.meta.url);

const migrationTags = (await readdir(migrationsDirectory))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .map((name) => name.replace(/\.sql$/, ""))
  .sort();

const journal = JSON.parse(await readFile(journalPath, "utf8"));
const journalTags = journal.entries.map((entry) => entry.tag);

if (new Set(journalTags).size !== journalTags.length) {
  throw new Error("Migration journal contains duplicate tags");
}

for (const [position, entry] of journal.entries.entries()) {
  if (entry.idx !== position) {
    throw new Error(`Migration journal index mismatch at position ${position}`);
  }
}

const missing = migrationTags.filter((tag) => !journalTags.includes(tag));
const orphaned = journalTags.filter((tag) => !migrationTags.includes(tag));

if (missing.length || orphaned.length) {
  throw new Error(
    `Migration journal mismatch: missing=${missing.join(",") || "none"}; orphaned=${orphaned.join(",") || "none"}`,
  );
}

console.log(`Migration journal complete: ${migrationTags.length} entries`);
