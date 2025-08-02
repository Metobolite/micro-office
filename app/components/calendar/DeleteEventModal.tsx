"use client";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function DeleteEventModal({
  eventId,
  onDeleted,
}: {
  eventId: string;
  onDeleted: () => void;
}) {
  const handleDelete = async () => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      toast.error("Etkinlik silinemedi.");
      console.error(error);
    } else {
      toast.success("Etkinlik silindi.");
      onDeleted();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full">
          <Trash2 className="w-4 h-4 mr-1" /> Sil
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Etkinliği silmek istiyor musunuz?</DialogTitle>
        <div className="flex justify-end gap-2 mt-4">
          <DialogTrigger asChild>
            <Button variant="secondary" className="hover:bg-[#e6e6e6]">
              İptal
            </Button>
          </DialogTrigger>
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="hover:bg-[#D32F2F]"
          >
            Evet, Sil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
