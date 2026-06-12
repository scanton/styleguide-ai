import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/drizzle/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://build-placeholder:unused@localhost/placeholder";
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
