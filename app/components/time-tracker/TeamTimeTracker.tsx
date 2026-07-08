"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TeamTimeTrackerProps = {
  taskId: string;
  userId: string;
};

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
          <CardTitle>Zaman Takibi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Zaman takip aracı yakında burada görünecek.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
