import "dotenv/config";
import { grantStarterPack } from "../src/features/economy/starter-pack.service";
import { prisma } from "../src/lib/prisma";

// npx tsx prisma/backfill-starter-packs.ts

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });

  for (const user of users) {
    const result = await grantStarterPack(user.id);
    console.log(`${user.email}: ${result.granted ? "granted" : "already has a wallet"}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });