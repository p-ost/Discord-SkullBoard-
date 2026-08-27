import "dotenv/config";
import { db } from "./src/db";
import { skulls } from "./src/db/schema";
async function run() {
  try {
    const data = await db.select().from(skulls);
    console.log("Success");
  } catch (err) {
    console.error("Error", err);
  }
}
run();
