"use client";

import { DashboardHeaderActions } from "@/app/components/dashboard/dashboard-header-actions";
import { supabase } from "@/app/lib/supabase";
import {
  CALENDAR_UPCOMING_LIMIT,
  getCalendarGridRange,
  toCalendarDateKey,
  type CalendarProps,
  type EventType,
} from "@/app/types/EventType";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const AddEventModal = dynamic(() => import("./AddEventModal"), { ssr: false });
const DeleteEventModal = dynamic(() => import("./DeleteEventModal"), {
  ssr: false,
});
const EditEventModal = dynamic(() => import("./EditEventModal"), {
  ssr: false,
});

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EVENT_COLUMNS =
  "id, title, description, type, date, time, duration, attendees";

function formatEventDate(dateValue: string) {
  const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);
  const localDate = new Date(year, month - 1, day);

  return Number.isFinite(localDate.getTime())
    ? localDate.toLocaleDateString("en-US")
    : dateValue;
}

export default function Calendar({
  userId,
  teamId,
  initialRangeEvents,
  initialTodayEvents,
  initialUpcomingEvents,
  initialYear,
  initialMonth,
  initialTodayDate,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(
    () => new Date(initialYear, initialMonth, 1),
  );
  const [rangeEvents, setRangeEvents] =
    useState<EventType[]>(initialRangeEvents);
  const [todayEvents, setTodayEvents] =
    useState<EventType[]>(initialTodayEvents);
  const [upcomingEvents, setUpcomingEvents] =
    useState<EventType[]>(initialUpcomingEvents);
  const [todayDate, setTodayDate] = useState(initialTodayDate);
  const [isClientDateReady, setIsClientDateReady] = useState(false);
  const rangeAbortControllerRef = useRef<AbortController | null>(null);
  const agendaAbortControllerRef = useRef<AbortController | null>(null);
  const rangeRequestIdRef = useRef(0);
  const agendaRequestIdRef = useRef(0);
  const loadedMonthRef = useRef(`${initialYear}-${initialMonth}`);
  const shouldRefreshInitialAgendaRef = useRef(false);

  const fetchRangeEvents = useCallback(async (year: number, month: number) => {
    rangeAbortControllerRef.current?.abort();
    const controller = new AbortController();
    rangeAbortControllerRef.current = controller;
    const requestId = ++rangeRequestIdRef.current;
    const { startDate, endDate } = getCalendarGridRange(year, month);

    const rangeResult = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("time", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .abortSignal(controller.signal);

    if (
      controller.signal.aborted ||
      requestId !== rangeRequestIdRef.current
    ) {
      return;
    }

    if (rangeResult.error) {
      console.error("Calendar range could not be loaded:", rangeResult.error);
    } else {
      setRangeEvents((rangeResult.data as EventType[]) ?? []);
    }
  }, [teamId, userId]);

  const fetchAgendaEvents = useCallback(async (localTodayDate: string) => {
    agendaAbortControllerRef.current?.abort();
    const controller = new AbortController();
    agendaAbortControllerRef.current = controller;
    const requestId = ++agendaRequestIdRef.current;

    const [todayResult, upcomingResult] = await Promise.all([
      supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .eq("date", localTodayDate)
        .order("time", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .limit(CALENDAR_UPCOMING_LIMIT)
        .abortSignal(controller.signal),
      supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .gt("date", localTodayDate)
        .order("date", { ascending: true })
        .order("time", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .limit(CALENDAR_UPCOMING_LIMIT)
        .abortSignal(controller.signal),
    ]);

    if (
      controller.signal.aborted ||
      requestId !== agendaRequestIdRef.current
    ) {
      return;
    }

    if (todayResult.error) {
      console.error("Today's events could not be loaded:", todayResult.error);
    } else {
      setTodayEvents((todayResult.data as EventType[]) ?? []);
    }

    if (upcomingResult.error) {
      console.error("Upcoming events could not be loaded:", upcomingResult.error);
    } else {
      setUpcomingEvents((upcomingResult.data as EventType[]) ?? []);
    }
  }, [teamId, userId]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    const localNow = new Date();
    const localMonthKey = `${localNow.getFullYear()}-${localNow.getMonth()}`;
    const localTodayDate = toCalendarDateKey(localNow);

    loadedMonthRef.current =
      localMonthKey === `${initialYear}-${initialMonth}` ? localMonthKey : "";
    shouldRefreshInitialAgendaRef.current =
      localTodayDate !== initialTodayDate;
    setCurrentDate(new Date(localNow.getFullYear(), localNow.getMonth(), 1));
    setTodayDate(localTodayDate);
    setIsClientDateReady(true);
  }, [initialMonth, initialTodayDate, initialYear]);

  useEffect(() => {
    if (!isClientDateReady) return;

    const monthKey = `${currentYear}-${currentMonth}`;
    if (loadedMonthRef.current === monthKey) return;

    loadedMonthRef.current = monthKey;
    void fetchRangeEvents(currentYear, currentMonth);
  }, [currentMonth, currentYear, fetchRangeEvents, isClientDateReady]);

  useEffect(() => {
    if (!isClientDateReady || !shouldRefreshInitialAgendaRef.current) return;

    shouldRefreshInitialAgendaRef.current = false;
    void fetchAgendaEvents(todayDate);
  }, [fetchAgendaEvents, isClientDateReady, todayDate]);

  useEffect(
    () => () => {
      rangeAbortControllerRef.current?.abort();
      agendaAbortControllerRef.current?.abort();
    },
    [],
  );

  const refreshEvents = useCallback(() => {
    const localTodayDate = toCalendarDateKey(new Date());
    setTodayDate(localTodayDate);
    void Promise.all([
      fetchRangeEvents(currentYear, currentMonth),
      fetchAgendaEvents(localTodayDate),
    ]);
  }, [currentMonth, currentYear, fetchAgendaEvents, fetchRangeEvents]);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();
  const firstDayOfMonth = (() => {
    const day = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    ).getDay();
    return (day + 6) % 7;
  })();

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventType[]> = {};
    rangeEvents.forEach((event) => {
      const key = event.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [rangeEvents]);

  const futureEvents = useMemo(
    () => upcomingEvents.slice(0, CALENDAR_UPCOMING_LIMIT),
    [upcomingEvents],
  );

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((date) =>
      new Date(
        date.getFullYear(),
        date.getMonth() + (direction === "next" ? 1 : -1),
        1,
      ),
    );
  };

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-24 border border-border/50" />,
      );
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const key = toCalendarDateKey(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      );
      const isToday = key === todayDate;
      const eventsOnThisDay = eventsByDate[key] || [];

      days.push(
        <div
          key={day}
          className={`min-h-24 border border-border/50 p-2 ${
            isToday ? "bg-primary/10" : ""
          }`}
        >
          <div
            className={`text-sm font-medium mb-1 ${
              isToday ? "text-primary" : ""
            }`}
          >
            {day}
          </div>
          <div className="space-y-1">
            {eventsOnThisDay.map((event) => (
              <div
                key={event.id}
                className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate"
              >
                {event.title} {event.time?.slice(0, 5)}
              </div>
            ))}
          </div>
        </div>,
      );
    }
    return days;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DashboardHeaderActions>
        <AddEventModal
          onEventAdded={refreshEvents}
          teamId={teamId}
          userId={userId}
        />
      </DashboardHeaderActions>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {MONTH_NAMES[currentDate.getMonth()]}{" "}
                  {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-0 mb-4">
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-sm font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0 border border-border/50">
                {renderCalendarDays()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{event.title}</h3>
                    <Badge
                      variant={
                        event.type === "meeting"
                          ? "default"
                          : event.type === "review"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {event.type}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{event.time?.slice(0, 5)}</span>
                    <span>-</span>
                    <span>{event.duration}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-1">
                      {(Array.isArray(event.attendees)
                        ? event.attendees
                        : []
                      ).map((att, i) => (
                        <Avatar
                          key={i}
                          className="h-6 w-6 border-2 border-background"
                        >
                          <AvatarImage
                            src={
                              att.avatar?.startsWith("/placeholder")
                                ? undefined
                                : att.avatar
                            }
                          />
                          <AvatarFallback className="text-xs">
                            {att.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {event.attendees?.length || 0} attendees
                    </span>
                  </div>
                  <DeleteEventModal
                    eventId={event.id}
                    onDeleted={refreshEvents}
                    userId={userId}
                  />
                  <EditEventModal
                    event={event}
                    onEventUpdated={refreshEvents}
                    teamId={teamId}
                    userId={userId}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {futureEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-medium">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatEventDate(event.date)} -{" "}
                    {event.time?.slice(0, 5)}
                  </p>
                  <p className="text-sm bg-accent text-accent-foreground px-2 py-1 rounded">
                    {event.description}
                  </p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {event.type}
                  </Badge>
                  <DeleteEventModal
                    eventId={event.id}
                    onDeleted={refreshEvents}
                    userId={userId}
                  />

                  <EditEventModal
                    event={event}
                    onEventUpdated={refreshEvents}
                    teamId={teamId}
                    userId={userId}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
