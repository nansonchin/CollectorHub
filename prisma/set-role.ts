import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// 设置某个账号的角色。
// 运行方式：npx tsx prisma/set-role.ts 邮箱 ADMIN
//          npx tsx prisma/set-role.ts 邮箱 MODERATOR
//          npx tsx prisma/set-role.ts 邮箱 PLAYER
//
// 为什么用脚本，而不是在网站上做一个"设置角色"的页面：
// 第一个管理员必须有办法产生，而网站上的任何入口都可能被人利用来提升自己的权限
// （这类漏洞叫"权限提升"）。只有能直接访问服务器和数据库的人（也就是你）
// 才能运行这个脚本，所以它比任何网页接口都安全。
// 另一个原因：注册接口只能创建 PLAYER。

const ROLES = ["PLAYER", "MODERATOR", "ADMIN"] as const;

async function main() {
  const [email, role] = process.argv.slice(2);

  if (!email || !role || !ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error("Usage: npx tsx prisma/set-role.ts <email> <PLAYER|MODERATOR|ADMIN>");
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: role as (typeof ROLES)[number] },
    select: { name: true, email: true, role: true },
  });

  console.log(`${user.name} (${user.email}) is now ${user.role}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });