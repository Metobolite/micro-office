"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamTimeTrackerProps } from "@/app/types/time-tracker";

export default function TeamTimeTracker({
  taskId,
  userId,
}: TeamTimeTrackerProps) {
  void taskId;
  void userId;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Time Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The time tracking tool will appear here soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
