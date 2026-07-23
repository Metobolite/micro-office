"use client";

import {
  updateProfileSettings,
  updateWorkspaceSettings,
} from "@/app/action/update-settings";
import { useTheme } from "@/app/components/theme/theme-provider";
import type { SettingsClientProps } from "@/app/types/settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Building2,
  Check,
  CircleUserRound,
  LockKeyhole,
  Moon,
  Palette,
  Save,
  Sun,
} from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

export function SettingsClient({
  profile,
  workspace,
}: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  const [profileForm, setProfileForm] = useState({
    fullName: profile.fullName,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
  });
  const [savedProfile, setSavedProfile] = useState({
    fullName: profile.fullName,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
  });
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [savedWorkspaceName, setSavedWorkspaceName] = useState(workspace.name);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isWorkspacePending, startWorkspaceTransition] = useTransition();

  const initials = useMemo(() => {
    const value = profileForm.fullName || profile.email;

    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile.email, profileForm.fullName]);

  const profileIsDirty =
    profileForm.fullName !== savedProfile.fullName ||
    profileForm.phone !== savedProfile.phone ||
    profileForm.avatarUrl !== savedProfile.avatarUrl;
  const workspaceIsDirty = workspaceName !== savedWorkspaceName;

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedProfile = {
      fullName: profileForm.fullName.trim().replace(/\s+/g, " "),
      phone: profileForm.phone.trim(),
      avatarUrl: profileForm.avatarUrl.trim(),
    };

    startProfileTransition(async () => {
      try {
        const result = await updateProfileSettings(normalizedProfile);

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        if (result.warning) {
          toast.warning(result.message);
        } else {
          toast.success(result.message);
        }

        setProfileForm(normalizedProfile);
        setSavedProfile(normalizedProfile);
      } catch (error) {
        console.error("Profile settings request error:", error);
        toast.error("Profile could not be saved. Please try again.");
      }
    });
  };

  const handleWorkspaceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedWorkspaceName = workspaceName
      .trim()
      .replace(/\s+/g, " ");

    startWorkspaceTransition(async () => {
      try {
        const result = await updateWorkspaceSettings({
          teamId: workspace.id,
          teamName: normalizedWorkspaceName,
        });

        if (result.success) {
          toast.success(result.message);
          setWorkspaceName(normalizedWorkspaceName);
          setSavedWorkspaceName(normalizedWorkspaceName);
          return;
        }

        toast.error(result.message);
      } catch (error) {
        console.error("Workspace settings request error:", error);
        toast.error("Workspace could not be saved. Please try again.");
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Card className="overflow-hidden py-0">
        <div className="h-24 bg-gradient-to-r from-primary via-primary/85 to-primary/60" />
        <CardContent className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="-mt-12 size-24 border-4 border-card bg-card shadow-sm">
              <AvatarImage
                src={profileForm.avatarUrl || undefined}
                alt={profileForm.fullName}
              />
              <AvatarFallback className="text-xl font-semibold">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 sm:pb-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                {profileForm.fullName || "Your profile"}
              </h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:pb-1">
            <Badge variant="secondary" className="capitalize">
              {workspace.role}
            </Badge>
            <Badge variant="outline">{workspace.name}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-lg border bg-muted p-2">
                <CircleUserRound className="size-5" />
              </div>
              <div className="space-y-1">
                <CardTitle>Personal information</CardTitle>
                <CardDescription>
                  Keep the details shown across your dashboards and team cards
                  up to date.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleProfileSubmit}>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  autoComplete="name"
                  maxLength={80}
                  minLength={2}
                  required
                  value={profileForm.fullName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    readOnly
                    className="pr-9 text-muted-foreground"
                  />
                  <LockKeyhole className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Managed by your sign-in provider.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  placeholder="+49 123 456 789"
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="avatar-url">Profile image URL</Label>
                <Input
                  id="avatar-url"
                  type="url"
                  inputMode="url"
                  maxLength={500}
                  placeholder="https://example.com/avatar.jpg"
                  value={profileForm.avatarUrl}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      avatarUrl: event.target.value,
                    }))
                  }
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Use a public image address, or leave empty to use the image
                  from your sign-in provider.
                </p>
              </div>
            </CardContent>
            <CardFooter className="mt-6 flex flex-col-reverse gap-3 border-t sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!profileIsDirty || isProfilePending}
                onClick={() =>
                  setProfileForm({
                    fullName: savedProfile.fullName,
                    phone: savedProfile.phone,
                    avatarUrl: savedProfile.avatarUrl,
                  })
                }
              >
                Reset
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={!profileIsDirty || isProfilePending}
              >
                <Save />
                {isProfilePending ? "Saving..." : "Save profile"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg border bg-muted p-2">
                  <Palette className="size-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Choose how Micro Office looks on this device.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                  ] as const
                ).map((option) => {
                  const isActive = theme === option.value;

                  return (
                    <button
                      type="button"
                      key={option.value}
                      aria-pressed={isActive}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        "relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive && "border-primary ring-1 ring-primary",
                      )}
                    >
                      <option.icon className="size-5" />
                      {option.label}
                      {isActive ? (
                        <span className="absolute right-2 top-2 rounded-full bg-primary p-0.5 text-primary-foreground">
                          <Check className="size-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg border bg-muted p-2">
                  <Building2 className="size-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle>Workspace</CardTitle>
                  <CardDescription>
                    Settings for the active team workspace.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handleWorkspaceSubmit}>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace name</Label>
                  <Input
                    id="workspace-name"
                    maxLength={80}
                    minLength={2}
                    required
                    disabled={!workspace.canManage}
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                  />
                  {!workspace.canManage ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Only owners and admins can edit this value.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspace-id">Workspace ID</Label>
                  <Input
                    id="workspace-id"
                    readOnly
                    value={workspace.id}
                    className="font-mono text-xs text-muted-foreground"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Your role</span>
                  <Badge variant="secondary" className="capitalize">
                    {workspace.role}
                  </Badge>
                </div>
              </CardContent>
              {workspace.canManage ? (
                <CardFooter className="mt-6 border-t">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!workspaceIsDirty || isWorkspacePending}
                  >
                    <Save />
                    {isWorkspacePending ? "Saving..." : "Save workspace"}
                  </Button>
                </CardFooter>
              ) : null}
            </form>
          </Card>

          <div className="rounded-xl border border-dashed bg-card/60 p-4 text-xs leading-5 text-muted-foreground">
            Account created {profile.createdAt}. Your appearance preference is
            stored only on this device.
          </div>
        </div>
      </div>
    </div>
  );
}
