"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

export default function CreateTeamForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name: teamName, owner_id: userId })
        .select()
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
          name:
            user?.user_metadata?.full_name || user?.user_metadata?.name || "",
          email: user?.email || "",
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
          Yeni Proje Oluştur
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="Proje adı"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Oluşturuluyor..." : "Projeyi Oluştur"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
