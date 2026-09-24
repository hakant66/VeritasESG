# Sustainability Reporting Platform Security Spec

## Data Invariants
- A `Project` cannot exist without a valid `Customer` and `Template`.
- an `Answer` must be associated with a valid `Assignment` and `Question`.
- `Contact` access is strictly ephemeral, gated by JWT tokens validated server-side.
- `Admin` access is required for all data modification except for `Answer` updates during an active assignment.

## The Dirty Dozen (Threat Payloads)
1. Spoofing `ownerId` on a Project to take control.
2. Injecting 1MB junk strings into `kod` fields to cause Denial of Wallet.
3. Updating an `Answer` for a question not assigned to the contact.
4. Accessing PII (emails/phone numbers) of other customers.
5. Escalating privileges by marking a `Contact` as an `Admin` in metadata.
6. Skipping the "Draft" status to "Approved" without AI generation.
7. Modifying `createdAt` timestamps to bypass audit logs.
8. Deleting `Sector` master data as a non-admin.
9. Querying ALL answers across the platform via a blanket `list` call.
10. Injecting malicious scripts into `draftContent`.
11. Bypassing the token expiry on `Assignment` magic links.
12. Creating a `ProjectPage` without a corresponding `sourceTemplatePageId`.

## Security Enforcement Rules (DRAFT)
Written to `DRAFT_firestore.rules` for auditing before final deployment.
