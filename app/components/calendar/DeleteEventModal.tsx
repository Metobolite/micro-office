"use client";

import { supabase } from "@/app/lib/supabase";
import type { DeleteEventModalProps } from "@/app/types/EventType";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DeleteEventModal({
  userId,
  eventId,
  onDeleted,
}: DeleteEventModalProps) {
  const handleDelete = async () => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", userId);
    if (error) {
      toast.error("Event could not be deleted.");
      console.error(error);
    } else {
      toast.success("Event deleted.");
      onDeleted();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full">
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Delete this event?</DialogTitle>
        <div className="flex justify-end gap-2 mt-4">
          <DialogTrigger asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogTrigger>
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="hover:bg-destructive/90"
          >
            Yes, delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
