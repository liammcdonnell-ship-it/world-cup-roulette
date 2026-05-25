import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.get("world_cup_admin")?.value === "yes";

  if (!isLoggedIn) {
    redirect("/admin-login");
  }

  return <>{children}</>;
}