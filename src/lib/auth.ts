import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { grantStarterPack } from "../features/economy/starter-pack.service";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { bannedAt: true, banReason: true },
          });
          if(user?.bannedAt){
            throw new APIError("FORBIDDEN", {
              message: user.banReason
                ? `This account has been suspended: ${user.banReason}`
                : "This account has been suspended.",
            });
          }
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          try {
            await grantStarterPack(user.id);
          } catch (error) {
            console.error(
              `grantStarterPack failed for user ${user.id}:`,
              error,
            );
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
