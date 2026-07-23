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
    <Card className="max-w-md mx-auto mt-20 shadow-lg p-6">
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-center">
          Create New Project
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="Project name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
