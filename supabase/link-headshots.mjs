/**
 * Links existing headshot media to team_members.photo_url by matching names.
 *   node supabase/link-headshots.mjs
 * Headshots were uploaded to storage but the team rows still had null photos.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(".env", "utf8");
const env = {};
for (const l of raw.split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const base = env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/media/";

const { data: media } = await db
  .from("media")
  .select("storage_path, alt_text")
  .ilike("storage_path", "headshot-%");
const { data: team } = await db.from("team_members").select("id, name");

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\b(dr|prof|professor|mr|mrs|ms)\b\.?/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();

let linked = 0;
for (const person of team ?? []) {
  const pn = norm(person.name);
  // Match when the headshot's alt (the person's name) normalises to the same,
  // or the file slug contains the surname.
  const surname = pn.split(" ").pop();
  const hit = (media ?? []).find(
    (m) =>
      norm(m.alt_text ?? "") === pn ||
      m.storage_path.toLowerCase().includes(surname),
  );
  if (hit) {
    const url = base + hit.storage_path;
    const { error } = await db
      .from("team_members")
      .update({ photo_url: url })
      .eq("id", person.id);
    if (!error) {
      linked++;
      console.log(`  ${person.name} -> ${hit.storage_path}`);
    }
  } else {
    console.log(`  (no headshot) ${person.name}`);
  }
}
console.log(`\nlinked ${linked} headshots.`);
