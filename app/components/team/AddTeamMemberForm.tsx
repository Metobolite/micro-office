"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendInvitation } from "@/app/action/send-invitation";

export function AddTeamMemberForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);
    await sendInvitation(email);
    setEmail("");
    setLoading(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <span className="mr-2">+</span> Üye Ekle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Takıma Üye Ekle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Input
            placeholder="Üye e-posta adresi"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? "Gönderiliyor..." : "Davet Gönder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
