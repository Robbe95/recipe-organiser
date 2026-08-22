import {
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

import { user } from './auth'
import { recipesSchema } from './recipes'

/** Per-user credentials reserved for the future recipe analysis feature. */
export const userAiSettings = recipesSchema.table('user_ai_settings', {
  userId: text('user_id').primaryKey().references(() => user.id, {
    onDelete: 'cascade',
  }),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  openAiApiKeyEncrypted: text('openai_api_key_encrypted'),
})
