import { drizzle } from 'drizzle-orm/bun-sqlite'

import * as schema from './schema.ts'

export const db = drizzle(process.env.DATABASE_URL!, { schema })
