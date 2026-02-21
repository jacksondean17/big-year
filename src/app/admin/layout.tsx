import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Challenge management</p>
      </div>
      {children}
    </div>
  );
}
