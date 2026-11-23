import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "./authz";

export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if(!session){
    return null
  }
   const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, bannedAt: true },
  });
  if(!account || account?.bannedAt){
    return null
  }

    return { ...session, user: { ...session.user, role: account.role as Role } };

});
