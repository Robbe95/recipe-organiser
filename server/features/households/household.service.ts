import {
  asc,
  eq,
} from 'drizzle-orm'

import { db } from '../../db'
import {
  household,
  householdMember,
} from './schema'

export async function getHouseholdForUser(userId: string) {
  const membership = await db.query.householdMember.findFirst({
    orderBy: (table) => asc(table.joinedAt),
    where: eq(householdMember.userId, userId),
  })

  if (membership) {
    return membership.householdId
  }

  return db.transaction(async (tx) => {
    const existing = await tx.query.householdMember.findFirst({
      orderBy: (table) => asc(table.joinedAt),
      where: eq(householdMember.userId, userId),
    })

    if (existing) {
      return existing.householdId
    }

    const [
      createdHousehold,
    ] = await tx.insert(household).values({
      createdById: userId,
      name: 'My kitchen',
    }).returning({
      id: household.id,
    })

    if (!createdHousehold) {
      throw new Error('Could not create a household.')
    }

    await tx.insert(householdMember).values({
      householdId: createdHousehold.id,
      userId,
      role: 'owner',
    })

    return createdHousehold.id
  })
}
