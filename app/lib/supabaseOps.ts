import { supabase } from "./supabase";

export async function updateTaskStatus(taskId: string, newStatus: string) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);

  if (error) {
    console.error("Görev güncellenirken hata:", error);
    throw error;
  }

  return data;
}