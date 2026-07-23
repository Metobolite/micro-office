"use client";

import { DashboardHeaderActions } from "@/app/components/dashboard/dashboard-header-actions";
import { supabase } from "@/app/lib/supabase";
import type { CalendarProps, EventType } from "@/app/types/EventType";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import AddEventModal from "./AddEventModal";
import DeleteEventModal from "./DeleteEventModal";
import EditEventModal from "./EditEventModal";

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

export default function Calendar({
  userId,
  teamId,
  initialEvents,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>(initialEvents);

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, description, type, date, time, duration, attendees",
      )
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (error) console.error("Events could not be loaded:", error);
    else setEvents(data as EventType[]);
  }, [teamId, userId]);

  const today = useMemo(() => new Date(), []);
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
    events.forEach((event) => {
      const d = new Date(event.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [events]);

  const todayString = useMemo(() => new Date().toDateString(), []);
  const todayEvents = useMemo(
    () =>
      events.filter(
        (event) => new Date(event.date).toDateString() === todayString,
      ),
    [events, todayString],
  );
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events.filter((event) => new Date(event.date) > now);
  }, [events]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + (direction === "next" ? 1 : -1),
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
      const isToday =
        today.getDate() === day &&
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear();
      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
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
          onEventAdded={fetchEvents}
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
                    onDeleted={fetchEvents}
                    userId={userId}
                  />
                  <EditEventModal
                    event={event}
                    onEventUpdated={fetchEvents}
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
              {upcomingEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-medium">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("en-US")} -{" "}
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
                    onDeleted={fetchEvents}
                    userId={userId}
                  />

                  <EditEventModal
                    event={event}
                    onEventUpdated={fetchEvents}
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
