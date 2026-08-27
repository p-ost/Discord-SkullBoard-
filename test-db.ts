import { db } from "./src/db";
import { skulls } from "./src/db/schema";
async function run() {
  try {
    const data = await db.select().from(skulls);
    console.log("Data:", data);
  } catch (err) {
    console.error("DB error:", err);
  }
}
run();
