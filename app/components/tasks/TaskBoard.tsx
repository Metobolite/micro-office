"use client";

import type { Task, TaskStatus } from "@/app/types/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  CalendarClock,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { memo } from "react";
import {
  getDueDateMeta,
  TASK_PRIORITY_CONFIG,
  TASK_STATUSES,
  TASK_STATUS_CONFIG,
} from "./task-ui";

type TasksByStatus = Record<TaskStatus, Task[]>;

type TaskBoardProps = {
  tasksByStatus: TasksByStatus;
  visibleTasksByStatus: TasksByStatus;
  hasActiveFilters: boolean;
  isReordering: boolean;
  onDragEnd: (result: DropResult) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

type TaskCardProps = {
  task: Task;
  index: number;
  isReordering: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

const TaskCard = memo(function TaskCard({
  task,
  index,
  isReordering,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const dueDateMeta = getDueDateMeta(task);
  const priority = TASK_PRIORITY_CONFIG[task.priority];

  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={isReordering}
    >
      {(dragProvided, dragSnapshot) => (
        <article
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          className={cn(
            "rounded-xl border bg-card p-4 shadow-sm transition-[box-shadow,transform,opacity] hover:shadow-md",
            dragSnapshot.isDragging && "rotate-1 opacity-95 shadow-lg",
          )}
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              {...dragProvided.dragHandleProps}
              className="-ml-2 flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
              aria-label={`Move ${task.title}`}
            >
              <GripVertical className="size-4" />
            </button>

            <h4 className="min-w-0 flex-1 pt-1 text-sm font-semibold leading-5">
              {task.title}
            </h4>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-mr-2 size-8 shrink-0 text-muted-foreground"
                  disabled={isReordering}
                  aria-label={`Actions for ${task.title}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(task)}>
                  <Pencil className="size-4" />
                  Edit task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onDelete(task)}
                >
                  <Trash2 className="size-4" />
                  Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description ? (
            <p className="mt-2 line-clamp-2 pl-8 text-sm leading-5 text-muted-foreground">
              {task.description}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pl-8">
            <span
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-xs",
                dueDateMeta?.className ?? "text-muted-foreground",
              )}
            >
              <CalendarClock className="size-3.5 shrink-0" />
              <span className="truncate">
                {dueDateMeta?.label ?? "No due date"}
              </span>
            </span>
            <Badge
              variant="outline"
              className={cn("rounded-full font-medium", priority.className)}
            >
              {priority.label}
            </Badge>
          </div>
        </article>
      )}
    </Draggable>
  );
});

const TaskBoard = memo(function TaskBoard({
  tasksByStatus,
  visibleTasksByStatus,
  hasActiveFilters,
  isReordering,
  onDragEnd,
  onEdit,
  onDelete,
}: TaskBoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <section
        aria-label="Task board"
        className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0"
      >
        <div className="grid auto-cols-[min(86vw,360px)] grid-flow-col gap-4 xl:grid-flow-row xl:grid-cols-3 xl:auto-cols-auto">
          {TASK_STATUSES.map((status) => {
            const config = TASK_STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const columnTasks = visibleTasksByStatus[status];
            const totalColumnTasks = tasksByStatus[status].length;

            return (
              <div
                key={status}
                className="flex min-h-[470px] min-w-0 snap-start flex-col rounded-xl border bg-muted/30"
              >
                <div className="flex items-center gap-3 border-b px-4 py-3.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      config.iconClassName,
                    )}
                  >
                    <StatusIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          config.dotClassName,
                        )}
                      />
                      <h3 className="font-semibold">{config.label}</h3>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {hasActiveFilters
                      ? `${columnTasks.length}/${totalColumnTasks}`
                      : totalColumnTasks}
                  </Badge>
                </div>

                <Droppable droppableId={status}>
                  {(dropProvided, dropSnapshot) => (
                    <div
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      className={cn(
                        "flex flex-1 flex-col p-3 transition-colors",
                        dropSnapshot.isDraggingOver && "bg-primary/[0.03]",
                      )}
                    >
                      <div className="space-y-3">
                        {columnTasks.map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            isReordering={isReordering}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        ))}
                      </div>

                      {columnTasks.length === 0 ? (
                        <div className="flex min-h-44 flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-background/40 px-6 text-center">
                          <StatusIcon className="mb-3 size-7 text-muted-foreground/50" />
                          <p className="text-sm font-medium">
                            {hasActiveFilters && totalColumnTasks > 0
                              ? "No matching tasks"
                              : config.emptyTitle}
                          </p>
                          <p className="mt-1 max-w-48 text-xs leading-5 text-muted-foreground">
                            {hasActiveFilters && totalColumnTasks > 0
                              ? "Try a different search or priority filter."
                              : config.emptyDescription}
                          </p>
                        </div>
                      ) : null}
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </section>
    </DragDropContext>
  );
});

export default TaskBoard;
