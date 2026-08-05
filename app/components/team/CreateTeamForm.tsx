"use client";

import { supabase } from "@/app/lib/supabase";
import type { CreateTeamFormProps } from "@/app/types/team";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function CreateTeamForm({
  userId,
  userName,
  userEmail,
}: CreateTeamFormProps) {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name: teamName, owner_id: userId })
        .select("id")
        .single();

      if (teamError || !team) {
        console.error("Team creation error:", teamError);
        return;
      }

      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: userId,
          role: "owner",
          name: userName,
          email: userEmail,
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error("Team member creation error:", memberError);
        return;
      }

      router.push("/teams");
    });
  };

  return (
    <Card className="max-w-md mx-auto mt-12 shadow-sm p-6 rounded-lg">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/teams")}
            className="text-sm text-white hover:text-gray-300 transition-colors p-2 rounded-md bg-accent/80 hover:bg-accent/90"
            aria-label="Back to teams"
          >
            Back to Teams
          </button>
          <h2 className="text-lg font-medium text-center flex-1">
            Create Project
          </h2>
          <div className="w-12" />
        </div>

        <p className="text-sm text-gray-500">
          Add a short name for your project. You can invite members later.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="text"
            placeholder="Project name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            aria-label="Project name"
            className="py-2"
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Creating..." : "Create"}
            </Button>
            <Button
              type="button"
              onClick={() => router.push("/teams")}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
