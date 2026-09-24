/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin maintenance ops (contact/user email conflicts).
 */

import { getPrisma } from './prismaClient.ts';

export type ContactEmailConflict = {
  customerId: string;
  customerName: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  userId?: string;
  userName?: string;
};

export type ContactConflictMigrationResult = {
  analyzed: number;
  linked: number;
  assignmentsMigrated: number;
  contactsDeleted: number;
  errors: string[];
};

export async function analyzeContactEmailConflicts(): Promise<ContactEmailConflict[]> {
  const customers = await getPrisma().customer.findMany();
  const conflicts: ContactEmailConflict[] = [];

  for (const customer of customers) {
    const [contacts, users] = await Promise.all([
      getPrisma().contact.findMany({ where: { customerId: customer.id } }),
      getPrisma().platformUser.findMany({ where: { customerId: customer.id } }),
    ]);
    const userEmails = new Map(
      users.map((u) => [u.email.toLowerCase(), u]),
    );

    for (const contact of contacts) {
      const contactEmail = (contact.email || '').toLowerCase();
      if (!contactEmail) continue;
      const matchingUser = userEmails.get(contactEmail);
      if (!matchingUser) continue;
      conflicts.push({
        customerId: customer.id,
        customerName: customer.name,
        contactId: contact.id,
        contactName: contact.name,
        contactEmail: contact.email,
        userId: matchingUser.id,
        userName: matchingUser.name,
      });
    }
  }

  return conflicts;
}

export async function migrateContactEmailConflicts(): Promise<ContactConflictMigrationResult> {
  const results: ContactConflictMigrationResult = {
    analyzed: 0,
    linked: 0,
    assignmentsMigrated: 0,
    contactsDeleted: 0,
    errors: [],
  };

  const customers = await getPrisma().customer.findMany();

  for (const customer of customers) {
    const [contacts, users] = await Promise.all([
      getPrisma().contact.findMany({ where: { customerId: customer.id } }),
      getPrisma().platformUser.findMany({ where: { customerId: customer.id } }),
    ]);

    for (const contact of contacts) {
      const contactEmail = (contact.email || '').toLowerCase();
      if (!contactEmail) continue;

      const matchingUser = users.find((u) => u.email.toLowerCase() === contactEmail);
      if (!matchingUser) continue;

      results.analyzed++;
      try {
        if (!matchingUser.contactId || matchingUser.contactId !== contact.id) {
          await getPrisma().platformUser.update({
            where: { id: matchingUser.id },
            data: { contactId: contact.id },
          });
          results.linked++;
        }

        const migrated = await getPrisma().assignment.updateMany({
          where: {
            recipientId: contact.id,
            recipientType: 'contact',
          },
          data: {
            recipientId: matchingUser.id,
            recipientType: 'user',
          },
        });
        results.assignmentsMigrated += migrated.count;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.errors.push(`Failed to migrate ${contactEmail}: ${message}`);
      }
    }
  }

  return results;
}
