import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@/db/schema";
export const db = drizzle(process.env.MYSQL_URL!, {
  schema: schema,
  mode: "default",
});
