import { acceptInvitation } from "@/app/action/accept-invitation";
import { ThemeToggle } from "@/app/components/theme";
import { hashInvitationToken } from "@/app/lib/invitations";
import { createClient } from "@/app/lib/supabaseServer";
import type {
  InvitationTeamData,
  InvitePageProps,
} from "@/app/types/invitation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

function getFirstParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getErrorMessage(error?: string) {
  switch (error) {
    case "accept":
      return "Something went wrong while accepting the invitation.";
    case "email":
      return "Your account does not have an email address.";
    case "expired":
      return "This invitation has expired.";
    case "invalid":
      return "This invitation was not found or is no longer valid.";
    case "membership":
      return "The team membership could not be created.";
    case "mismatch":
      return "This invitation was created for a different email address.";
    case "used":
      return "This invitation has already been used.";
    default:
      return null;
  }
}

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const pageError = getErrorMessage(getFirstParam(resolvedSearchParams?.error));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/invite/${token}`);
  }

  const { data: invitation } = await supabase
    .from("team_invitations")
    .select("email, role, status, expires_at, teams(name)")
    .eq("token_hash", hashInvitationToken(token))
    .maybeSingle();

  const teamData = invitation?.teams as InvitationTeamData | null | undefined;
  const teamName = Array.isArray(teamData)
    ? teamData[0]?.name
    : teamData?.name;
  const normalizedUserEmail = user.email?.trim().toLowerCase();
  const normalizedInvitationEmail = invitation?.email?.trim().toLowerCase();
  const isInvitationExpired = invitation
    ? new Date(invitation.expires_at).getTime() <= Date.now()
    : false;
  const canAccept =
    invitation &&
    invitation.status === "pending" &&
    !isInvitationExpired &&
    normalizedUserEmail === normalizedInvitationEmail;
  const acceptInvitationWithToken = acceptInvitation.bind(null, token);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <ThemeToggle className="absolute right-6 top-6" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <Badge variant={canAccept ? "default" : "secondary"} className="mb-2">
            Team Invitation
          </Badge>
          <CardTitle className="text-2xl">
            {teamName ? `Invitation to ${teamName}` : "Micro Office invitation"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {pageError ? (
            <p className="text-sm text-destructive">{pageError}</p>
          ) : null}

          {!invitation ? (
            <p className="text-sm text-muted-foreground">
              The invitation was not found or cannot be viewed with this
              account.
            </p>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Invited email:
                <span className="ml-1 font-medium text-foreground">
                  {invitation.email}
                </span>
              </p>
              <p>
                Signed-in account:
                <span className="ml-1 font-medium text-foreground">
                  {user.email}
                </span>
              </p>
              <p>
                Workspace role:
                <Badge variant="outline" className="ml-2 capitalize">
                  {invitation.role || "member"}
                </Badge>
              </p>
            </div>
          )}

          {canAccept ? (
            <form action={acceptInvitationWithToken}>
              <Button type="submit" className="w-full">
                Accept invitation
              </Button>
            </form>
          ) : (
            <Button asChild variant="secondary" className="w-full">
              <Link href="/teams">Back to my teams</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
