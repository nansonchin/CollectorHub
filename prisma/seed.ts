import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { CARDS } from "./cards-data";
import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function imageUrlFor(number: number) {
  return `/cards/${String(number).padStart(3, "0")}.png`;
}

async function main() {
  for (const card of CARDS) {
    const data = { ...card, imageUrl: imageUrlFor(card.number) };

    await prisma.card.upsert({
      where: { number: card.number },
      update: data,
      create: data,
    });
  }

  const total = await prisma.card.count();
  console.log(`Seed finished. Cards in database: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
