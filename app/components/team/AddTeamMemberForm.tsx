"use client";

import { sendInvitation } from "@/app/action/send-invitation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AddTeamMemberForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) return;

    setLoading(true);

    try {
      const result = await sendInvitation(trimmedEmail, teamId);

      if (result.success) {
        toast.success(result.message);
        setEmail("");
        router.refresh();
        return;
      }

      if ("inviteCreated" in result && result.inviteCreated) {
        toast.warning(result.message);
        setEmail("");
        router.refresh();
        return;
      }

      toast.error(result.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <span className="mr-2">+</span> Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Input
            placeholder="Member email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleInvite} disabled={loading || !email.trim()}>
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
