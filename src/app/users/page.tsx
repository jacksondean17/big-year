import { getAllUsersWithSaveCounts } from "@/lib/users";
import { UserList } from "@/components/user-list";
import { createClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const users = await getAllUsersWithSaveCounts();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          {users.length} {users.length === 1 ? "person" : "people"} participating in challenges.
        </p>
      </div>
      <UserList users={users} currentUserId={user?.id} />
    </div>
  );
}
