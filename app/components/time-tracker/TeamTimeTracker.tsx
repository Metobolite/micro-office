"use client";

import { ManualTimeEntryDialog } from "@/app/components/time-tracker/ManualTimeEntryDialog";
import { localDateTimeToISOString } from "@/app/lib/dateTime";
import { supabase } from "@/app/lib/supabase";
import {
  formatTimerDuration,
  formatTrackedDuration,
  getStartOfToday,
  getStartOfWeek,
  getTimeEntryDuration,
  isMissingTimeTrackingSchema,
} from "@/app/lib/time-tracker";
import type {
  ManualTimeEntryInput,
  TeamTimeTrackerProps,
  TimeEntry,
  TimeEntrySummary,
  TrackerPeriod,
} from "@/app/types/time-tracker";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  History,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Square,
  TimerReset,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const TIME_ENTRY_COLUMNS =
  "id, team_id, user_id, task_id, task_title, description, start_time, end_time, duration_sec, status, active_started_at, created_at, updated_at";

const entryDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const entryTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

const periodOptions: Array<{ value: TrackerPeriod; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "all", label: "Recent" },
];

type TrackerAction =
  | "start"
  | "pause"
  | "resume"
  | "stop"
  | "delete"
  | "manual";

const getRpcEntry = (data: unknown): TimeEntry | null => {
  const entry = Array.isArray(data) ? data[0] : data;

  if (!entry || typeof entry !== "object") return null;

  return entry as TimeEntry;
};

const getRpcSummary = (data: unknown): TimeEntrySummary | null => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const summary = data as Record<string, unknown>;
  const taskBreakdown: TimeEntrySummary["task_breakdown"] = [];

  if (Array.isArray(summary.task_breakdown)) {
    summary.task_breakdown.forEach((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;

      const taskSummary = item as Record<string, unknown>;
      const seconds = Number(taskSummary.seconds);
      if (!Number.isFinite(seconds) || seconds <= 0) return;

      taskBreakdown.push({
        task_id:
          typeof taskSummary.task_id === "string"
            ? taskSummary.task_id
            : null,
        task_title:
          typeof taskSummary.task_title === "string"
            ? taskSummary.task_title
            : null,
        seconds,
      });
    });
  }

  const getEntryIds = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((entryId): entryId is string => typeof entryId === "string")
      : [];

  return {
    today_seconds: Number(summary.today_seconds) || 0,
    week_seconds: Number(summary.week_seconds) || 0,
    total_seconds: Number(summary.total_seconds) || 0,
    week_sessions: Number(summary.week_sessions) || 0,
    entry_count: Number(summary.entry_count) || 0,
    active_entry_id:
      typeof summary.active_entry_id === "string"
        ? summary.active_entry_id
        : null,
    active_status:
      summary.active_status === "running" || summary.active_status === "paused"
        ? summary.active_status
        : null,
    active_entry: getRpcEntry(summary.active_entry),
    active_duration_seconds: Number(summary.active_duration_seconds) || 0,
    today_entry_ids: getEntryIds(summary.today_entry_ids),
    week_entry_ids: getEntryIds(summary.week_entry_ids),
    task_breakdown: taskBreakdown,
  };
};

const sortEntries = (entries: TimeEntry[]) =>
  [...entries].sort(
    (first, second) =>
      new Date(second.start_time).getTime() -
      new Date(first.start_time).getTime(),
  );

export default function TeamTimeTracker({
  userId,
  teamId,
  teamName,
  initialTasks,
}: TeamTimeTrackerProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<TimeEntrySummary | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [period, setPeriod] = useState<TrackerPeriod>("week");
  const [taskFilter, setTaskFilter] = useState("all");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasLoadedEntries, setHasLoadedEntries] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeAction, setActiveAction] = useState<TrackerAction | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [schemaNeedsSetup, setSchemaNeedsSetup] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null);
  const latestFetchRequestRef = useRef(0);
  const mutationLockRef = useRef(false);

  const activeEntryId = activeEntry?.id;
  const isTimerPaused = activeEntry?.status === "paused";

  const beginAction = (action: TrackerAction) => {
    if (mutationLockRef.current) return false;

    mutationLockRef.current = true;
    latestFetchRequestRef.current += 1;
    setIsRefreshing(false);
    setActiveAction(action);
    return true;
  };

  const finishAction = () => {
    mutationLockRef.current = false;
    setActiveAction(null);
  };

  const taskLookup = useMemo(
    () => new Map(initialTasks.map((task) => [task.id, task])),
    [initialTasks],
  );

  const setDatabaseError = useCallback(
    (error: { code?: string; message?: string }, fallbackMessage: string) => {
      const isSchemaMissing = isMissingTimeTrackingSchema(error);
      setSchemaNeedsSetup(isSchemaMissing);
      setLoadError(
        isSchemaMissing
          ? "Time tracking needs the latest database migration before it can store entries."
          : fallbackMessage,
      );
    },
    [],
  );

  const fetchEntries = useCallback(
    async (showRefreshState = false) => {
      const requestId = latestFetchRequestRef.current + 1;
      latestFetchRequestRef.current = requestId;

      if (showRefreshState) setIsRefreshing(true);

      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const [entriesResult, summaryResult] = await Promise.all([
        supabase
          .from("time_entries")
          .select(TIME_ENTRY_COLUMNS)
          .eq("team_id", teamId)
          .eq("user_id", userId)
          .order("start_time", { ascending: false })
          .limit(1000),
        supabase.rpc("get_time_entry_summary", {
          p_team_id: teamId,
          p_timezone: timezone,
        }),
      ]);

      if (requestId !== latestFetchRequestRef.current) return;

      const error = entriesResult.error ?? summaryResult.error;

      if (error) {
        setDatabaseError(error, "Time entries could not be loaded.");
      } else {
        const latestEntries = (entriesResult.data ?? []) as TimeEntry[];
        const nextSummary = getRpcSummary(summaryResult.data);
        const runningEntry = nextSummary
          ? nextSummary.active_entry
          : latestEntries.find((entry) => entry.end_time === null) ?? null;
        const nextEntries = runningEntry
          ? sortEntries([
              runningEntry,
              ...latestEntries.filter((entry) => entry.id !== runningEntry.id),
            ])
          : latestEntries.filter((entry) => entry.end_time !== null);

        setEntries(nextEntries);
        setSummary(nextSummary);
        setActiveEntry(runningEntry);
        setHasLoadedEntries(true);
        setLoadError(null);
        setSchemaNeedsSetup(false);

        if (runningEntry) {
          setSelectedTaskId(runningEntry.task_id ?? "");
          setDescription(runningEntry.description ?? "");
        }
      }

      setIsInitialLoading(false);
      setIsRefreshing(false);
    },
    [setDatabaseError, teamId, userId],
  );

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());

    updateCurrentTime();
    const intervalId = window.setInterval(() => {
      updateCurrentTime();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!mutationLockRef.current) void fetchEntries();
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [fetchEntries]);

  useEffect(() => {
    if (!activeEntry) {
      setElapsedSeconds(0);
      return;
    }

    const hasMatchingServerBaseline =
      summary?.active_entry_id === activeEntry.id &&
      summary.active_status === activeEntry.status &&
      summary.active_entry?.updated_at === activeEntry.updated_at;
    const baselineSeconds = Math.max(
      0,
      Math.floor(
        hasMatchingServerBaseline
          ? summary.active_duration_seconds
          : (activeEntry.duration_sec ?? 0),
      ),
    );

    setElapsedSeconds(baselineSeconds);
    if (activeEntry.status !== "running") return;

    const tickStartedAt = performance.now();
    const updateElapsedTime = () => {
      const locallyElapsedSeconds = Math.floor(
        Math.max(0, performance.now() - tickStartedAt) / 1000,
      );
      setElapsedSeconds(baselineSeconds + locallyElapsedSeconds);
    };
    const intervalId = window.setInterval(updateElapsedTime, 250);

    return () => window.clearInterval(intervalId);
  }, [activeEntry, summary]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (
        document.visibilityState === "visible" &&
        !mutationLockRef.current
      ) {
        void fetchEntries();
      }
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () =>
      document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [fetchEntries]);

  const trackerInsights = useMemo(() => {
    const calculationTime = activeEntryId
      ? Date.now()
      : currentTime || Date.now();
    const todayStart = getStartOfToday().getTime();
    const weekStart = getStartOfWeek().getTime();
    let todaySeconds = 0;
    let weekSeconds = 0;
    let totalSeconds = 0;
    let weekSessions = 0;
    const secondsByTask = new Map<string, number>();

    entries.forEach((entry) => {
      const startTime = new Date(entry.start_time).getTime();
      if (!Number.isFinite(startTime)) return;

      const duration =
        entry.id === activeEntryId
          ? elapsedSeconds
          : getTimeEntryDuration(entry);
      const endTime = entry.end_time
        ? new Date(entry.end_time).getTime()
        : calculationTime;

      if (!Number.isFinite(endTime)) return;

      const todayDuration = Math.min(
        duration,
        Math.max(
          0,
          (Math.min(endTime, calculationTime) -
            Math.max(startTime, todayStart)) /
            1000,
        ),
      );
      const weekDuration = Math.min(
        duration,
        Math.max(
          0,
          (Math.min(endTime, calculationTime) -
            Math.max(startTime, weekStart)) /
            1000,
        ),
      );

      totalSeconds += duration;

      todaySeconds += todayDuration;
      weekSeconds += weekDuration;

      if (weekDuration > 0) {
        weekSessions += 1;
        const taskKey =
          entry.task_id ??
          (entry.task_title ? `snapshot:${entry.task_title}` : "general");
        secondsByTask.set(
          taskKey,
          (secondsByTask.get(taskKey) ?? 0) + weekDuration,
        );
      }
    });

    const activeSummaryDelta =
      summary && summary.active_entry_id === activeEntryId
        ? Math.max(
            0,
            elapsedSeconds - summary.active_duration_seconds,
          )
        : 0;

    if (summary) {
      secondsByTask.clear();
      summary.task_breakdown.forEach((taskSummary) => {
        const taskKey =
          taskSummary.task_id ??
          (taskSummary.task_title
            ? `snapshot:${taskSummary.task_title}`
            : "general");
        secondsByTask.set(
          taskKey,
          (secondsByTask.get(taskKey) ?? 0) + taskSummary.seconds,
        );
      });

      if (activeSummaryDelta > 0 && activeEntry) {
        const activeTaskKey =
          activeEntry.task_id ??
          (activeEntry.task_title
            ? `snapshot:${activeEntry.task_title}`
            : "general");
        secondsByTask.set(
          activeTaskKey,
          (secondsByTask.get(activeTaskKey) ?? 0) + activeSummaryDelta,
        );
      }
    }

    const taskBreakdown = Array.from(secondsByTask.entries())
      .map(([taskId, seconds]) => ({
        taskId,
        title:
          taskId === "general"
            ? "General work"
            : taskId.startsWith("snapshot:")
              ? taskId.slice("snapshot:".length)
            : taskLookup.get(taskId)?.title ?? "Deleted task",
        seconds,
      }))
      .sort((first, second) => second.seconds - first.seconds)
      .slice(0, 5);

    return {
      todaySeconds: summary
        ? summary.today_seconds + activeSummaryDelta
        : todaySeconds,
      weekSeconds: summary
        ? summary.week_seconds + activeSummaryDelta
        : weekSeconds,
      totalSeconds: summary
        ? summary.total_seconds + activeSummaryDelta
        : totalSeconds,
      weekSessions: summary?.week_sessions ?? weekSessions,
      taskBreakdown,
    };
  }, [
    activeEntry,
    activeEntryId,
    currentTime,
    elapsedSeconds,
    entries,
    summary,
    taskLookup,
  ]);

  const filteredEntries = useMemo(() => {
    const periodStart =
      period === "today"
        ? getStartOfToday().getTime()
        : period === "week"
          ? getStartOfWeek().getTime()
          : null;
    const periodEntryIds = summary
      ? new Set(
          period === "today"
            ? summary.today_entry_ids
            : period === "week"
              ? summary.week_entry_ids
              : [],
        )
      : null;

    return entries.filter((entry) => {
      const entryEndTime = entry.end_time
        ? new Date(entry.end_time).getTime()
        : currentTime || Date.now();
      const matchesPeriod =
        periodStart === null ||
        (periodEntryIds
          ? periodEntryIds.has(entry.id)
          : entryEndTime > periodStart);
      const matchesTask =
        taskFilter === "all" ||
        (taskFilter === "general"
          ? entry.task_id === null && entry.task_title === null
          : entry.task_id === taskFilter);

      return matchesPeriod && matchesTask;
    });
  }, [currentTime, entries, period, summary, taskFilter]);

  const startTracking = async () => {
    if (activeEntry || !beginAction("start")) return;

    const { data, error } = await supabase.rpc("start_time_entry", {
      p_team_id: teamId,
      p_task_id: selectedTaskId || null,
      p_description: description.trim() || null,
    });

    if (error) {
      if (error.code === "23505" || error.code === "23P01") {
        toast.error("A timer is already running for this team.");
        await fetchEntries();
      } else {
        setDatabaseError(error, "The timer could not be started.");
        toast.error("The timer could not be started.");
      }
      finishAction();
      return;
    }

    const startedEntry = getRpcEntry(data);

    if (!startedEntry) {
      toast.error("The timer started, but its entry could not be loaded.");
      await fetchEntries();
      finishAction();
      return;
    }

    setEntries((currentEntries) =>
      sortEntries([
        startedEntry,
        ...currentEntries.filter((entry) => entry.id !== startedEntry.id),
      ]),
    );
    setActiveEntry(startedEntry);
    setElapsedSeconds(0);
    setLoadError(null);
    setSchemaNeedsSetup(false);
    await fetchEntries();
    finishAction();
    toast.success("Timer started.");
  };

  const changeTimerState = async (
    action: "pause" | "resume",
    rpcName: "pause_time_entry" | "resume_time_entry",
    expectedStatus: "running" | "paused",
  ) => {
    if (
      !activeEntry ||
      activeEntry.status !== expectedStatus ||
      !beginAction(action)
    ) {
      return;
    }

    const { data, error } = await supabase.rpc(rpcName, {
      p_entry_id: activeEntry.id,
    });

    if (error) {
      if (error.code === "55000" || error.code === "P0002") {
        toast.error("The timer status changed elsewhere. Refreshing it now.");
      } else {
        const fallbackMessage =
          action === "pause"
            ? "The timer could not be paused."
            : "The timer could not be resumed.";
        setDatabaseError(error, fallbackMessage);
        toast.error(fallbackMessage);
      }

      await fetchEntries();
      finishAction();
      return;
    }

    const updatedEntry = getRpcEntry(data);
    if (updatedEntry) {
      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry,
        ),
      );
      setActiveEntry(updatedEntry);
      setElapsedSeconds(
        Math.max(0, Math.floor(updatedEntry.duration_sec ?? 0)),
      );
    }

    setLoadError(null);
    setSchemaNeedsSetup(false);
    await fetchEntries();
    finishAction();
    toast.success(action === "pause" ? "Timer paused." : "Timer resumed.");
  };

  const pauseTracking = () =>
    changeTimerState("pause", "pause_time_entry", "running");

  const resumeTracking = () =>
    changeTimerState("resume", "resume_time_entry", "paused");

  const stopTracking = async () => {
    if (!activeEntry || !beginAction("stop")) return;
    const { data, error } = await supabase.rpc("stop_time_entry", {
      p_entry_id: activeEntry.id,
    });

    if (error) {
      setDatabaseError(error, "The timer could not be stopped.");
      toast.error("The timer could not be stopped.");
      await fetchEntries();
      finishAction();
      return;
    }

    const stoppedEntry = getRpcEntry(data);

    if (stoppedEntry) {
      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === stoppedEntry.id ? stoppedEntry : entry,
        ),
      );
    } else {
      await fetchEntries();
    }

    setActiveEntry(null);
    setElapsedSeconds(0);
    setDescription("");
    setLoadError(null);
    await fetchEntries();
    finishAction();
    toast.success("Timer stopped and entry saved.");
  };

  const addManualEntry = async (entry: ManualTimeEntryInput) => {
    if (!beginAction("manual")) return false;

    const startTime = localDateTimeToISOString(entry.date, entry.startTime);

    if (!startTime) {
      toast.error("Choose a valid date and start time.");
      finishAction();
      return false;
    }

    const startTimestamp = new Date(startTime).getTime();
    const endTimestamp = startTimestamp + entry.durationSeconds * 1000;

    if (endTimestamp > Date.now()) {
      toast.error("A manual entry cannot end in the future.");
      finishAction();
      return false;
    }

    const { data, error } = await supabase.rpc("create_manual_time_entry", {
      p_team_id: teamId,
      p_task_id: entry.taskId,
      p_description: entry.description || null,
      p_start_time: startTime,
      p_duration_sec: entry.durationSeconds,
    });

    if (error) {
      if (error.code !== "23P01") {
        setDatabaseError(error, "The manual time entry could not be saved.");
      }
      toast.error(
        error.code === "23P01"
          ? "This time overlaps an existing entry."
          : error.message || "The manual time entry could not be saved.",
      );
      finishAction();
      return false;
    }

    const savedEntry = getRpcEntry(data);
    if (savedEntry) {
      setEntries((currentEntries) =>
        sortEntries([
          savedEntry,
          ...currentEntries.filter((item) => item.id !== savedEntry.id),
        ]),
      );
    } else {
      await fetchEntries();
    }

    setLoadError(null);
    setSchemaNeedsSetup(false);
    await fetchEntries();
    finishAction();
    toast.success("Manual time entry added.");
    return true;
  };

  const deleteEntry = async () => {
    if (!entryToDelete || !beginAction("delete")) return;
    const entryId = entryToDelete.id;
    const { error } = await supabase.rpc("delete_time_entry", {
      p_entry_id: entryId,
    });

    if (error) {
      setDatabaseError(error, "The time entry could not be deleted.");
      toast.error("The time entry could not be deleted.");
    } else {
      setEntries((currentEntries) =>
        currentEntries.filter((entry) => entry.id !== entryId),
      );
      setEntryToDelete(null);
      await fetchEntries();
      toast.success("Time entry deleted.");
    }

    finishAction();
  };

  const summaryCards = [
    {
      title: "Today",
      value: formatTrackedDuration(trackerInsights.todaySeconds),
      helper: "Tracked since midnight",
      icon: Clock3,
      iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      title: "This week",
      value: formatTrackedDuration(trackerInsights.weekSeconds),
      helper: "Monday through today",
      icon: CalendarDays,
      iconClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      title: "Total tracked",
      value: formatTrackedDuration(trackerInsights.totalSeconds),
      helper: "Across all saved entries",
      icon: TimerReset,
      iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Weekly sessions",
      value: String(trackerInsights.weekSessions),
      helper: "Sessions tracked this week",
      icon: History,
      iconClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="flex-1 space-y-6 overflow-auto p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Focus and time overview
          </h2>
          <p className="text-sm text-muted-foreground">
            Track focused work{teamName ? ` for ${teamName}` : ""} and keep it
            connected to your tasks.
          </p>
        </div>
        <Button
          variant="outline"
          className="self-start rounded-full sm:self-auto"
          onClick={() => setManualEntryOpen(true)}
          disabled={
            !hasLoadedEntries || schemaNeedsSetup || activeAction !== null
          }
        >
          <Plus />
          Add time
        </Button>
      </div>

      {loadError ? (
        <Card
          className="gap-3 border-destructive/40 bg-destructive/5 py-4"
          role="alert"
        >
          <CardContent className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="font-medium text-destructive">
                {schemaNeedsSetup ? "Database setup required" : "Unable to load time tracking"}
              </p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchEntries(true)}
              disabled={isRefreshing || activeAction !== null}
            >
              {isRefreshing ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <RefreshCw />
              )}
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((summary) => (
          <Card key={summary.title} className="gap-4 py-5">
            <CardContent className="flex items-start justify-between px-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {summary.title}
                </p>
                <p className="text-2xl font-semibold tracking-tight">
                  {hasLoadedEntries ? summary.value : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.helper}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${summary.iconClassName}`}>
                <summary.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden border-border/80 py-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-br from-card via-card to-muted/60 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Live timer
                </p>
                <h3 className="mt-1 text-xl font-semibold">
                  {activeEntry
                    ? isTimerPaused
                      ? "Session paused"
                      : "Session in progress"
                    : "Ready when you are"}
                </h3>
              </div>
              {activeEntry ? (
                <Badge
                  className={`gap-2 rounded-full px-3 py-1 ${
                    isTimerPaused
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      isTimerPaused
                        ? "bg-amber-500"
                        : "animate-pulse bg-emerald-500 motion-reduce:animate-none"
                    }`}
                  />
                  {isTimerPaused ? "Paused" : "Running"}
                </Badge>
              ) : null}
            </div>

            <output
              className="my-8 block text-center font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-7xl"
              aria-label={`${
                activeEntry
                  ? isTimerPaused
                    ? "Paused timer"
                    : "Running timer"
                  : "Stopped timer"
              }, elapsed time ${formatTimerDuration(elapsedSeconds)}`}
              aria-live="off"
              role="timer"
            >
              {formatTimerDuration(elapsedSeconds)}
            </output>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="time-tracker-task">Task</Label>
                <select
                  id="time-tracker-task"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
                  value={selectedTaskId}
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                  disabled={Boolean(activeEntry) || activeAction !== null}
                >
                  <option value="">General work</option>
                  {initialTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-tracker-note">Note</Label>
                <Input
                  id="time-tracker-note"
                  className="h-11"
                  maxLength={500}
                  placeholder="What are you working on?"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={Boolean(activeEntry) || activeAction !== null}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              {activeEntry ? (
                <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                  <Button
                    size="lg"
                    variant={isTimerPaused ? "default" : "outline"}
                    className="h-12 min-w-44 rounded-full text-base shadow-lg"
                    onClick={() =>
                      void (isTimerPaused ? resumeTracking() : pauseTracking())
                    }
                    disabled={activeAction !== null}
                  >
                    {activeAction === "pause" || activeAction === "resume" ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" />
                    ) : isTimerPaused ? (
                      <Play className="fill-current" />
                    ) : (
                      <Pause className="fill-current" />
                    )}
                    {isTimerPaused ? "Resume timer" : "Pause timer"}
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="h-12 min-w-44 rounded-full text-base shadow-lg"
                    onClick={() => void stopTracking()}
                    disabled={activeAction !== null}
                  >
                    {activeAction === "stop" ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Square className="fill-current" />
                    )}
                    Stop timer
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="h-12 min-w-48 rounded-full text-base shadow-lg"
                  onClick={() => void startTracking()}
                  disabled={
                    !hasLoadedEntries ||
                    activeAction !== null ||
                    schemaNeedsSetup
                  }
                >
                  {activeAction === "start" ? (
                    <Loader2 className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Play className="fill-current" />
                  )}
                  Start timer
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                {activeEntry
                  ? isTimerPaused
                    ? "Paused time is not added to this session. You can safely close this page."
                    : "You can close this page. The timer will continue from the saved start time."
                  : "Choose a task or track general work, then start your session."}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Task breakdown</CardTitle>
                <CardDescription className="mt-1">
                  Where your time went this week
                </CardDescription>
              </div>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <BarChart3 className="size-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!hasLoadedEntries ? (
              <div className="flex min-h-44 items-center justify-center text-muted-foreground">
                {isInitialLoading ? (
                  <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <span className="text-sm">Time data is unavailable.</span>
                )}
              </div>
            ) : trackerInsights.taskBreakdown.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-center">
                <TimerReset className="size-8 text-muted-foreground/60" />
                <p className="text-sm font-medium">No time tracked this week</p>
                <p className="max-w-56 text-xs text-muted-foreground">
                  Start the timer to see a task-by-task breakdown here.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {trackerInsights.taskBreakdown.map((item) => {
                  const percentage =
                    trackerInsights.weekSeconds > 0
                      ? Math.max(
                          4,
                          Math.round(
                            (item.seconds / trackerInsights.weekSeconds) * 100,
                          ),
                        )
                      : 0;

                  return (
                    <div key={item.taskId} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{item.title}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatTrackedDuration(item.seconds)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 border-b sm:grid-cols-[1fr_auto]">
          <div>
            <CardTitle>Time entries</CardTitle>
            <CardDescription className="mt-1">
              {summary && summary.entry_count > entries.length
                ? `Showing the latest ${entries.length.toLocaleString("en-US")} of ${summary.entry_count.toLocaleString("en-US")} saved sessions.`
                : "Review your saved work sessions and active timer."}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              aria-label="Filter time entries by period"
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as TrackerPeriod)
              }
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="h-9 max-w-56 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              aria-label="Filter time entries by task"
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value)}
            >
              <option value="all">All tasks</option>
              <option value="general">General work</option>
              {initialTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {!hasLoadedEntries ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              {isInitialLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  Loading time entries...
                </>
              ) : (
                "Time entries are unavailable."
              )}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
              <History className="size-9 text-muted-foreground/60" />
              <p className="font-medium">No matching time entries</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Start a live timer or add time manually. Your work history will
                appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEntries.map((entry) => {
                const task = entry.task_id
                  ? taskLookup.get(entry.task_id)
                  : null;
                const entryTitle =
                  task?.title ?? entry.task_title ?? "General work";
                const isOpen = entry.end_time === null;
                const isPaused = isOpen && entry.status === "paused";
                const isRunning = isOpen && entry.status === "running";
                const duration =
                  entry.id === activeEntryId
                    ? elapsedSeconds
                    : getTimeEntryDuration(entry);
                const startDate = new Date(entry.start_time);
                const endDate = entry.end_time
                  ? new Date(entry.end_time)
                  : null;
                const crossesDateBoundary =
                  endDate !== null &&
                  endDate.toDateString() !== startDate.toDateString();

                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-lg p-2 ${
                          isPaused
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : isRunning
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isPaused ? (
                          <Pause className="size-4 fill-current" />
                        ) : isRunning ? (
                          <Play className="size-4 fill-current" />
                        ) : (
                          <Clock3 className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">
                            {entryTitle}
                          </p>
                          {isRunning ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              Running
                            </Badge>
                          ) : isPaused ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              Paused
                            </Badge>
                          ) : null}
                          {task ? (
                            <Badge variant="outline" className="capitalize">
                              {task.status.replace("_", " ")}
                            </Badge>
                          ) : null}
                        </div>
                        {entry.description ? (
                          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                            {entry.description}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entryDateFormatter.format(startDate)} ·{" "}
                          {entryTimeFormatter.format(startDate)} –{" "}
                          {endDate
                            ? `${
                                crossesDateBoundary
                                  ? `${entryDateFormatter.format(endDate)} `
                            : ""
                              }${entryTimeFormatter.format(endDate)}`
                            : isPaused
                              ? "paused"
                              : "now"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pl-11 sm:justify-end sm:pl-0">
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        {isOpen
                          ? formatTimerDuration(duration)
                          : formatTrackedDuration(duration)}
                      </span>
                      {!isOpen ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${entryTitle} time entry from ${entryDateFormatter.format(startDate)}`}
                          onClick={() => setEntryToDelete(entry)}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {manualEntryOpen ? (
        <ManualTimeEntryDialog
          open={manualEntryOpen}
          onOpenChange={setManualEntryOpen}
          tasks={initialTasks}
          isSaving={activeAction === "manual"}
          onSubmit={addManualEntry}
        />
      ) : null}

      <AlertDialog
        open={Boolean(entryToDelete)}
        onOpenChange={(open) => {
          if (!open && activeAction !== "delete") setEntryToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this time entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This tracked session will be permanently removed from your
              reports. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activeAction === "delete"}>
              Cancel
            </AlertDialogCancel>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void deleteEntry()}
              disabled={activeAction === "delete"}
            >
              {activeAction === "delete" ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Trash2 />
              )}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
