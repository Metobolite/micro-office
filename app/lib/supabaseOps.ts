import { supabase } from "./supabase";

export async function updateTaskStatus(taskId: string, newStatus: string) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);

  if (error) {
    console.error("Error while updating task:", error);
    throw error;
  }

  return data;
}
