/**
 * Promote a user to admin by email.
 *
 * Usage:
 *   npx ts-node scripts/make-admin.ts user@example.com
 *
 * This is intentionally out-of-band (no API endpoint) to reduce attack surface.
 * Only someone with direct server/DB access should be able to grant admin rights.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx ts-node scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.updateMany({
    where: { email },
    data: { isAdmin: true },
  });

  if (user.count === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`✓ Granted admin to ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
