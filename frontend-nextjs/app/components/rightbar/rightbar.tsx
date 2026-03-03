"use client";

import { User } from "@/app/hooks/user/useAllUsers";
import useCurrentUser from "@/app/hooks/user/useCurrentUser";
import { Card } from "@/components/ui/card";

const Rightbar = ({ receiverId }: { receiverId: number | null }) => {
  const user: User | null = useCurrentUser(Number(receiverId));

  if (!receiverId || !user) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a chat to see details
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto backdrop-blur-xl bg-white/5 p-4 space-y-4">

      {/* Profile */}
      <Card className="p-4 bg-white/10 backdrop-blur-xl border-white/20">
        <h2 className="text-lg font-semibold">{user.fullName}</h2>
        <p className="text-sm opacity-70">{user.email}</p>
        <p className="text-sm opacity-70">{user.role}</p>
      </Card>

      {/* Example Section */}
      <Card className="p-4 bg-white/10 border-white/20">
        <h3 className="font-medium mb-2">Shared Files</h3>
        <p className="text-sm opacity-60">No files yet</p>
      </Card>

    </div>
  );
};

export default Rightbar;
