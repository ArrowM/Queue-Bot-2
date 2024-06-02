import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.ts";

export const db = drizzle(Database("db/main.sqlite").defaultSafeIntegers(), { schema });
