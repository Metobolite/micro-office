"use client";

import { supabase } from "@/app/lib/supabase";
import type {
  Task,
  TaskPriority,
  TasksPageClientProps,
  TaskStatus,
} from "@/app/types/task";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DropResult } from "@hello-pangea/dnd";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import TaskBoard from "./TaskBoard";
import {
  getDueDateMeta,
  getSortedTasks,
  TASK_PRIORITY_CONFIG,
  TASK_STATUSES,
} from "./task-ui";

const AddTaskForm = dynamic(() => import("./AddTaskForm"), { ssr: false });
const EditTaskDialog = dynamic(() => import("./EditTaskDialog"), {
  ssr: false,
});
const DeleteTaskDialog = dynamic(() => import("./DeleteTaskDialog"), {
  ssr: false,
});

export default function TasksPageClient({
  userId,
  teamId,
  initialTasks,
  initialLoadFailed = false,
}: TasksPageClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    TaskPriority | "all"
  >("all");

  const tasksByStatus = useMemo<Record<TaskStatus, Task[]>>(
    () => ({
      todo: getSortedTasks(tasks, "todo"),
      in_progress: getSortedTasks(tasks, "in_progress"),
      done: getSortedTasks(tasks, "done"),
    }),
    [tasks],
  );

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const hasActiveFilters =
    normalizedSearchQuery.length > 0 || priorityFilter !== "all";

  const visibleTasksByStatus = useMemo<Record<TaskStatus, Task[]>>(() => {
    const filterTasks = (status: TaskStatus) =>
      tasksByStatus[status].filter((task) => {
        const matchesPriority =
          priorityFilter === "all" || task.priority === priorityFilter;
        const searchableText = `${task.title} ${task.description ?? ""}`.toLocaleLowerCase();
        const matchesSearch =
          !normalizedSearchQuery ||
          searchableText.includes(normalizedSearchQuery);

        return matchesPriority && matchesSearch;
      });

    return {
      todo: filterTasks("todo"),
      in_progress: filterTasks("in_progress"),
      done: filterTasks("done"),
    };
  }, [normalizedSearchQuery, priorityFilter, tasksByStatus]);

  const completedCount = tasksByStatus.done.length;
  const overdueCount = useMemo(
    () =>
      tasks.filter((task) => getDueDateMeta(task)?.isOverdue).length,
    [tasks],
  );
  const completionRate = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;
  const visibleTaskCount = TASK_STATUSES.reduce(
    (total, status) => total + visibleTasksByStatus[status].length,
    0,
  );
  const nextTodoSortOrder =
    tasksByStatus.todo.reduce(
      (highestOrder, task) =>
        Math.max(
          highestOrder,
          Number.isFinite(task.sort_order) ? task.sort_order : -1,
        ),
      -1,
    ) + 1;

  const summaryCards = [
    {
      label: "Total tasks",
      value: tasks.length,
      detail: `${tasksByStatus.todo.length} waiting`,
      icon: ListTodo,
      iconClassName: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    },
    {
      label: "In progress",
      value: tasksByStatus.in_progress.length,
      detail: "Currently active",
      icon: Clock3,
      iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Overdue",
      value: overdueCount,
      detail: overdueCount ? "Needs attention" : "All on track",
      icon: AlertCircle,
      iconClassName: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
    {
      label: "Completed",
      value: completedCount,
      detail: `${completionRate}% of all tasks`,
      icon: CheckCircle2,
      iconClassName:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ];

  const clearFilters = () => {
    setSearchQuery("");
    setPriorityFilter("all");
  };

  const handleDragEnd = useCallback(async ({
    source,
    destination,
    draggableId,
  }: DropResult) => {
    if (
      !destination ||
      isReordering ||
      (source.droppableId === destination.droppableId &&
        source.index === destination.index)
    ) {
      return;
    }

    const sourceStatus = source.droppableId as TaskStatus;
    const destinationStatus = destination.droppableId as TaskStatus;
    const sourceColumn = [...tasksByStatus[sourceStatus]];
    const sourceTaskIndex = sourceColumn.findIndex(
      (task) => task.id === draggableId,
    );

    if (sourceTaskIndex < 0) return;

    const [removedTask] = sourceColumn.splice(sourceTaskIndex, 1);
    const destinationColumn =
      sourceStatus === destinationStatus
        ? sourceColumn
        : [...tasksByStatus[destinationStatus]];
    const visibleDestinationIds = visibleTasksByStatus[destinationStatus]
      .filter((task) => task.id !== draggableId)
      .map((task) => task.id);

    let destinationIndex = destinationColumn.length;
    const taskAtDestination = visibleDestinationIds[destination.index];

    if (taskAtDestination) {
      destinationIndex = destinationColumn.findIndex(
        (task) => task.id === taskAtDestination,
      );
    } else if (visibleDestinationIds.length) {
      const lastVisibleTaskId =
        visibleDestinationIds[visibleDestinationIds.length - 1];
      destinationIndex =
        destinationColumn.findIndex(
          (task) => task.id === lastVisibleTaskId,
        ) + 1;
    }

    destinationColumn.splice(destinationIndex, 0, {
      ...removedTask,
      status: destinationStatus,
    });

    const reorderedTasks = new Map<string, Task>();
    sourceColumn.forEach((task, index) => {
      reorderedTasks.set(task.id, {
        ...task,
        status: sourceStatus,
        sort_order: index,
      });
    });
    destinationColumn.forEach((task, index) => {
      reorderedTasks.set(task.id, {
        ...task,
        status: destinationStatus,
        sort_order: index,
      });
    });

    const previousTasks = tasks;
    const nextTasks = tasks.map(
      (task) => reorderedTasks.get(task.id) ?? task,
    );
    const previousTasksById = new Map(
      previousTasks.map((task) => [task.id, task]),
    );
    const changedTasks = nextTasks.filter((task) => {
      const previousTask = previousTasksById.get(task.id);
      return (
        previousTask?.status !== task.status ||
        previousTask.sort_order !== task.sort_order
      );
    });

    if (!changedTasks.length) return;

    setTasks(nextTasks);
    setIsReordering(true);

    try {
      const updateResults = await Promise.all(
        changedTasks.map((task) =>
          supabase
            .from("tasks")
            .update({ status: task.status, sort_order: task.sort_order })
            .eq("id", task.id)
            .eq("user_id", userId)
            .eq("team_id", teamId),
        ),
      );
      const failedUpdate = updateResults.find((result) => result.error);

      if (!failedUpdate?.error) return;

      const successfullyUpdatedTasks = changedTasks.filter(
        (_, index) => !updateResults[index].error,
      );
      const rollbackResults = await Promise.all(
        successfullyUpdatedTasks.map(async (task) => {
          const previousTask = previousTasksById.get(task.id);
          if (!previousTask) return { error: null };

          return supabase
            .from("tasks")
            .update({
              status: previousTask.status,
              sort_order: previousTask.sort_order,
            })
            .eq("id", task.id)
            .eq("user_id", userId)
            .eq("team_id", teamId);
        }),
      );
      const rollbackFailed = rollbackResults.some((result) => result.error);

      const { data: refreshedTasks, error: refreshError } = await supabase
        .from("tasks")
        .select("id, title, description, status, priority, sort_order, due_date")
        .eq("user_id", userId)
        .eq("team_id", teamId)
        .order("status", { ascending: true })
        .order("sort_order", { ascending: true });

      setTasks(
        !refreshError && refreshedTasks
          ? (refreshedTasks as Task[])
          : previousTasks,
      );
      toast.error("Task order could not be saved.", {
        description:
          rollbackFailed || refreshError
            ? "The board could not be fully resynced. Please refresh the page before reordering again."
            : failedUpdate.error.message,
      });
    } catch (error) {
      const { data: refreshedTasks, error: refreshError } = await supabase
        .from("tasks")
        .select("id, title, description, status, priority, sort_order, due_date")
        .eq("user_id", userId)
        .eq("team_id", teamId)
        .order("status", { ascending: true })
        .order("sort_order", { ascending: true });

      setTasks(
        !refreshError && refreshedTasks
          ? (refreshedTasks as Task[])
          : previousTasks,
      );
      toast.error("Task order could not be saved.", {
        description: refreshError
          ? "The board could not be resynced. Please refresh the page before reordering again."
          : error instanceof Error
            ? error.message
            : "Please refresh the page and try again.",
      });
    } finally {
      setIsReordering(false);
    }
  }, [
    isReordering,
    tasks,
    tasksByStatus,
    teamId,
    userId,
    visibleTasksByStatus,
  ]);

  const handleAiOptimize = () => {
    toast.info("AI optimization is the next step.", {
      description:
        "The board is ready for the ChatGPT workflow. No tasks were changed yet.",
    });
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/5 text-foreground">
                  <ListTodo className="size-4" />
                </span>
                My tasks
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Plan and prioritize your work
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep your workload visible, then drag tasks as work moves
                forward.
              </p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-violet-500/20 bg-violet-500/5 text-violet-700 hover:bg-violet-500/10 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200 sm:flex-none"
                onClick={handleAiOptimize}
              >
                <Sparkles className="size-4" />
                Optimize with AI
              </Button>
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                disabled={isReordering || initialLoadFailed}
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="size-4" />
                New task
              </Button>
            </div>
          </section>

          {initialLoadFailed ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium">Tasks could not be loaded.</p>
                <p className="mt-0.5 text-muted-foreground">
                  Refresh the page before making changes to this board.
                </p>
              </div>
            </div>
          ) : null}

          <section
            aria-label="Task overview"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {summaryCards.map((summary) => {
              const SummaryIcon = summary.icon;

              return (
                <Card key={summary.label} className="gap-0 py-0 shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        summary.iconClassName,
                      )}
                    >
                      <SummaryIcon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {summary.label}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-semibold tabular-nums">
                          {summary.value}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {summary.detail}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section
            aria-label="Task filters"
            className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks..."
                aria-label="Search tasks"
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 sm:flex-none">
                    <Filter className="size-4" />
                    {priorityFilter === "all"
                      ? "All priorities"
                      : `${TASK_PRIORITY_CONFIG[priorityFilter].label} priority`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={priorityFilter}
                    onValueChange={(value) =>
                      setPriorityFilter(value as TaskPriority | "all")
                    }
                  >
                    <DropdownMenuRadioItem value="all">
                      All priorities
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="high">
                      High priority
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium">
                      Medium priority
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="low">
                      Low priority
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  aria-label="Clear task filters"
                  title="Clear filters"
                >
                  <X className="size-4" />
                </Button>
              ) : null}

              <span
                className="ml-auto whitespace-nowrap text-xs text-muted-foreground sm:ml-1"
                aria-live="polite"
              >
                {isReordering
                  ? "Saving order..."
                  : `${visibleTaskCount} ${visibleTaskCount === 1 ? "task" : "tasks"}`}
              </span>
            </div>
          </section>

          <TaskBoard
            tasksByStatus={tasksByStatus}
            visibleTasksByStatus={visibleTasksByStatus}
            hasActiveFilters={hasActiveFilters}
            isReordering={isReordering}
            onDragEnd={handleDragEnd}
            onEdit={setEditingTask}
            onDelete={setTaskToDelete}
          />
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create a new task</DialogTitle>
            <DialogDescription>
              Add the details now; you can reprioritize the task on the board
              later.
            </DialogDescription>
          </DialogHeader>
          <AddTaskForm
            userId={userId}
            teamId={teamId}
            sortOrder={nextTodoSortOrder}
            onTaskAdded={(task) => {
              setTasks((currentTasks) => [...currentTasks, task]);
              setShowAddDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {editingTask ? (
        <EditTaskDialog
          key={editingTask.id}
          task={editingTask}
          userId={userId}
          teamId={teamId}
          onClose={() => setEditingTask(null)}
          onSaved={(updatedTask) =>
            setTasks((currentTasks) =>
              currentTasks.map((task) =>
                task.id === updatedTask.id ? updatedTask : task,
              ),
            )
          }
        />
      ) : null}

      {taskToDelete ? (
        <DeleteTaskDialog
          key={taskToDelete.id}
          task={taskToDelete}
          userId={userId}
          teamId={teamId}
          onClose={() => setTaskToDelete(null)}
          onDeleted={(taskId) =>
            setTasks((currentTasks) =>
              currentTasks.filter((task) => task.id !== taskId),
            )
          }
        />
      ) : null}
    </>
  );
}
