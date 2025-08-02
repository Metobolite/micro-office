"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import AddEventModal from "./AddEventModal";
import { EventType } from "@/app/types/EventType";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });

    if (error) console.error("Etkinlikler alınamadı:", error);
    else setEvents(data as EventType[]);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const today = useMemo(() => new Date(), []);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = (() => {
    const day = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    ).getDay();
    return (day + 6) % 7;
  })();

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  // events'i tarih bazında grupla (lookup objesi)
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

  // Bugünün tarih string'i (saatten bağımsız)
  const todayString = useMemo(() => new Date().toDateString(), []);

  // Bugün olan etkinlikler
  const todayEvents = useMemo(() => {
    return events.filter(
      (event) => new Date(event.date).toDateString() === todayString
    );
  }, [events, todayString]);

  // Yaklaşan etkinlikler (bugünden sonraki)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events.filter((event) => new Date(event.date) > now);
  }, [events]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + (direction === "next" ? 1 : -1),
        1
      )
    );
  };

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-24 border border-border/50" />
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
        </div>
      );
    }

    return days;
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Takvim</h1>
          <AddEventModal onEventAdded={fetchEvents} />
        </div>
      </header>
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Takvim */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {monthNames[currentDate.getMonth()]}{" "}
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
                    Bugün
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
                {dayNames.map((day) => (
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

          {/* Bugünkü Etkinlikler */}
          <Card>
            <CardHeader>
              <CardTitle>Bugünkü Etkinlikler</CardTitle>
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
                      {event.type === "meeting"
                        ? "Toplantı"
                        : event.type === "review"
                        ? "İnceleme"
                        : "Sunum"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{event.time?.slice(0, 5)}</span>
                    <span>•</span>
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
                          <AvatarImage src={att.avatar} />
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
                      {event.attendees?.length || 0} katılımcı
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Yaklaşan Etkinlikler */}
        <Card>
          <CardHeader>
            <CardTitle>Yaklaşan Etkinlikler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-medium">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("tr-TR")} -{" "}
                    {event.time?.slice(0, 5)}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {event.type === "planning"
                      ? "Planlama"
                      : event.type === "review"
                      ? "İnceleme"
                      : event.type === "meeting"
                      ? "Toplantı"
                      : "Sunum"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
