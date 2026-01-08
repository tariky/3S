import { db } from "./src/db/db";
import { auth } from "@/lib/auth";

async function main() {
  const createdUser = await auth.api.signUpEmail({
    body: {
      name: process.env.ADMIN_NAME!,
      email: process.env.ADMIN_EMAIL!,
      password: process.env.ADMIN_PASSWORD!,
    },
  });

  await db.user.update({
    where: { id: createdUser.user.id },
    data: { role: "admin" },
  });

  if (createdUser) {
    console.log("User created and role updated");
    console.log(`Admin email: ${process.env.ADMIN_EMAIL!}`);
    console.log(`Admin password: ${process.env.ADMIN_PASSWORD!}`);
  } else {
    console.log("User creation failed");
  }
  return;
}

await main();
