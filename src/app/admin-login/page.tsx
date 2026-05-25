import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function login(formData: FormData) {
  "use server";

  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const cookieStore = await cookies();

    cookieStore.set("world_cup_admin", "yes", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect("/admin/games");
  }

  redirect("/admin-login?error=1");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-2">Admin Login</h1>
        <p className="mb-8 text-gray-600">
          Enter the admin username and password.
        </p>

        {params?.error && (
          <div className="mb-6 rounded-xl border bg-red-50 p-4 font-semibold">
            Wrong username or password.
          </div>
        )}

        <form
          action={login}
          className="rounded-xl border bg-white shadow-sm p-6 grid gap-4"
        >
          <label className="grid gap-2">
            <span className="font-semibold">Username</span>
            <input
              name="username"
              required
              className="border rounded-lg p-3"
              placeholder="liam"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-semibold">Password</span>
            <input
              name="password"
              type="password"
              required
              className="border rounded-lg p-3"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200"
          >
            Log in
          </button>
        </form>
      </div>
    </main>
  );
}