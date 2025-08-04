// "use client";

// import { useEffect, useState } from "react";
// import { supabase } from "@/app/lib/supabase";
// import { Button } from "@/components/ui/button";

// export default function TeamTimeTracker({
//   taskId,
//   userId,
// }: {
//   taskId: string;
//   userId: string;
// }) {
//   const [isRunning, setIsRunning] = useState(false);
//   const [startTime, setStartTime] = useState<Date | null>(null);
//   const [elapsed, setElapsed] = useState<number>(0);
//   const [totalTrackedTime, setTotalTrackedTime] = useState<number>(0);

//   // Sayaç güncellenir
//   useEffect(() => {
//     let interval: any;
//     if (isRunning && startTime) {
//       interval = setInterval(() => {
//         setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [isRunning, startTime]);

//   // Toplam süreyi yükle
//   useEffect(() => {
//     fetchTotalTime();
//   }, []);

//   const fetchTotalTime = async () => {
//     const { data, error } = await supabase
//       .from("time_tracking")
//       .select("duration_sec")
//       .eq("task_id", taskId)
//       .eq("user_id", userId);

//     if (!error && data) {
//       const total = data.reduce((acc, row) => acc + (row.duration_sec || 0), 0);
//       setTotalTrackedTime(total);
//     }
//   };

//   const startTracking = async () => {
//     const now = new Date();

//     const { error } = await supabase.from("time_tracking").insert({
//       user_id: userId,
//       task_id: taskId,
//       start_time: now,
//     });

//     if (error) {
//       console.error("Başlatma hatası:", error.message);
//       return;
//     }

//     setStartTime(now);
//     setElapsed(0);
//     setIsRunning(true);
//   };

//   const stopTracking = async () => {
//     const now = new Date();

//     const { data, error } = await supabase
//       .from("time_tracking")
//       .select("*")
//       .eq("task_id", taskId)
//       .eq("user_id", userId)
//       .order("start_time", { ascending: false })
//       .limit(1);

//     if (error || !data || data.length === 0) {
//       console.error("Zaman kaydı bulunamadı.");
//       return;
//     }

//     const trackingId = data[0].id;
//     const durationSec = Math.floor(
//       (now.getTime() - new Date(data[0].start_time).getTime()) / 1000
//     );

//     const { error: updateError } = await supabase
//       .from("time_tracking")
//       .update({
//         end_time: now,
//         duration_sec: durationSec,
//       })
//       .eq("id", trackingId);

//     if (updateError) {
//       console.error("Güncelleme hatası:", updateError.message);
//       return;
//     }

//     setIsRunning(false);
//     setStartTime(null);
//     setElapsed(0);
//     setTotalTrackedTime((prev) => prev + durationSec);
//   };

//   const formatTime = (seconds: number) => {
//     const h = Math.floor(seconds / 3600);
//     const m = Math.floor((seconds % 3600) / 60);
//     const s = seconds % 60;
//     return `${h} sa ${m} dk ${s} sn`;
//   };

//   return (
//     <div className="flex flex-col gap-2 mt-4 text-sm">
//       <div className="flex items-center gap-3">
//         {isRunning ? (
//           <Button variant="destructive" onClick={stopTracking}>
//             Durdur ({formatTime(elapsed)})
//           </Button>
//         ) : (
//           <Button onClick={startTracking}>Zamanı Başlat</Button>
//         )}

//         <span className="text-muted-foreground">
//           Toplam süre:{" "}
//           <strong>
//             {formatTime(totalTrackedTime + (isRunning ? elapsed : 0))}
//           </strong>
//         </span>
//       </div>
//     </div>
//   );
// }
