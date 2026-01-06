import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function applyMigration() {
  const connection = await mysql.createConnection({
    uri: process.env.MYSQL_URL!,
  });

  try {
    console.log("Reading migration file...");
    const migrationSQL = readFileSync(
      join(process.cwd(), "drizzle", "0001_late_roland_deschain.sql"),
      "utf-8"
    );

    // Split by statement breakpoints and filter out empty statements
    const statements = migrationSQL
      .split("--> statement-breakpoint")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`Found ${statements.length} statements to execute`);

    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await connection.query(statement);
        console.log("✓ Success");
      } catch (error: any) {
        // If table already exists, that's okay - skip it
        if (error.code === "ER_TABLE_EXISTS_ERROR") {
          console.log("⚠ Table already exists, skipping...");
          continue;
        }
        // If index already exists, that's okay too
        if (error.code === "ER_DUP_KEYNAME") {
          console.log("⚠ Index already exists, skipping...");
          continue;
        }
        // Otherwise, throw the error
        throw error;
      }
    }

    console.log("\n✅ Migration applied successfully!");
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

applyMigration().catch((error) => {
  console.error(error);
  process.exit(1);
});

