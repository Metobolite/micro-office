"use client";

import { sendInvitation } from "@/app/action/send-invitation";
import type { InvitationRole } from "@/app/types/invitation";
import type { AddTeamMemberFormProps } from "@/app/types/team";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export function AddTeamMemberForm({
  teamId,
  inviterRole,
}: AddTeamMemberFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("member");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setRole("member");
  };

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) return;

    setLoading(true);

    try {
      const result = await sendInvitation(trimmedEmail, teamId, role);

      if (result.success) {
        toast.success(result.message);
        resetForm();
        setOpen(false);
        router.refresh();
        return;
      }

      if ("inviteCreated" in result && result.inviteCreated) {
        toast.warning(result.message);
        resetForm();
        setOpen(false);
        router.refresh();
        return;
      }

      toast.error(result.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !loading) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button aria-label="Add member" className="px-3 sm:px-4">
          <UserPlus />
          <span className="hidden sm:inline">Add Member</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            {inviterRole === "owner"
              ? "Send an invitation and choose the access level for this workspace."
              : "Send a member invitation to this workspace."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="invitation-email">Email address</Label>
            <Input
              id="invitation-email"
              type="email"
              autoComplete="email"
              placeholder="colleague@example.com"
              required
              disabled={loading}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invitation-role">Workspace role</Label>
            {inviterRole === "owner" ? (
              <select
                id="invitation-role"
                value={role}
                disabled={loading}
                aria-describedby="invitation-role-description"
                onChange={(event) =>
                  setRole(event.target.value as InvitationRole)
                }
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <Input
                id="invitation-role"
                value="Member"
                readOnly
                aria-describedby="invitation-role-description"
                className="bg-muted font-medium"
              />
            )}
            <p
              id="invitation-role-description"
              className="text-xs leading-5 text-muted-foreground"
            >
              {inviterRole !== "owner"
                ? "Admins can invite members but cannot grant admin access."
                : role === "admin"
                  ? "Admins can manage members, invitations and workspace settings."
                  : "Members can collaborate but cannot manage workspace access."}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
