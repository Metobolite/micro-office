"use client";

import { DashboardHeaderActions } from "@/app/components/dashboard/dashboard-header-actions";
import { useTeamPresence } from "@/app/components/presence/TeamPresenceProvider";
import { supabase } from "@/app/lib/supabase";
import type { Message, TeamChatProps } from "@/app/types/message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Smile } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const INITIAL_MESSAGE_LIMIT = 200;
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "always",
});
const relativeTimeUnits: Array<{
  divisor: number;
  unit: Intl.RelativeTimeFormatUnit;
}> = [
  { divisor: 60, unit: "second" },
  { divisor: 60, unit: "minute" },
  { divisor: 24, unit: "hour" },
  { divisor: 7, unit: "day" },
  { divisor: 4.34524, unit: "week" },
  { divisor: 12, unit: "month" },
  { divisor: Number.POSITIVE_INFINITY, unit: "year" },
];

function formatRelativeMessageTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  let duration = (timestamp - Date.now()) / 1000;

  for (const { divisor, unit } of relativeTimeUnits) {
    if (Math.abs(duration) < divisor) {
      return relativeTimeFormatter.format(Math.round(duration), unit);
    }
    duration /= divisor;
  }

  return "";
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "NA";

const ChatMessage = memo(function ChatMessage({
  message,
  userId,
}: {
  message: Message;
  userId: string;
}) {
  const isOwn = message.user_id === userId;
  const initials = getInitials(message.user_name);
  const time = formatRelativeMessageTime(message.inserted_at);

  return (
    <div
      className={`flex items-start space-x-3 [contain-intrinsic-size:auto_5rem] [content-visibility:auto] ${
        isOwn ? "flex-row-reverse space-x-reverse" : ""
      }`}
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isOwn ? "text-right" : ""}`}>
        <div
          className={`inline-block max-w-xs rounded-lg p-3 lg:max-w-md ${
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          <p className="text-sm">{message.content}</p>
        </div>
        <div className="mb-1 flex items-center justify-end space-x-2">
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
      </div>
    </div>
  );
});

export default function TeamChat({
  userId,
  userName,
  teamId,
  members,
  membersLoaded,
  initialMessages,
  initialMessagesLoaded,
  initialMessagesRequestedAt,
}: TeamChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedMessagesRef = useRef(false);
  const hasSyncedInitialMessagesRef = useRef(false);
  const { statusByUserId, connection, errorMessage, isSynced } =
    useTeamPresence(teamId);
  const { onlineMembers, awayMembers, availableMembers, visibleMembers } =
    useMemo(() => {
      const online = [];
      const away = [];

      for (const member of members) {
        const status = statusByUserId[member.userId];
        if (status === "online") online.push(member);
        else if (status === "away") away.push(member);
      }

      const available = [...online, ...away];
      return {
        onlineMembers: online,
        awayMembers: away,
        availableMembers: available,
        visibleMembers: available.slice(0, 4),
      };
    }, [members, statusByUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: hasLoadedMessagesRef.current ? "smooth" : "auto",
    });
    if (messages.length > 0) hasLoadedMessagesRef.current = true;
  }, [messages]);

  useEffect(() => {
    let disposed = false;

    const syncMessages = async () => {
      let query = supabase
        .from("messages")
        .select("id, team_id, content, user_id, user_name, inserted_at")
        .eq("team_id", teamId);

      if (initialMessagesLoaded) {
        const newestInitialMessage = initialMessages.at(-1);
        query = query.gte(
          "inserted_at",
          newestInitialMessage?.inserted_at ?? initialMessagesRequestedAt,
        );
      }

      const { data, error } = await query
        .order("inserted_at", { ascending: false })
        .limit(INITIAL_MESSAGE_LIMIT);

      if (disposed) return;
      if (error) {
        console.error("Messages could not be synchronized:", error);
        return;
      }

      setMessages((currentMessages) => {
        const messagesById = new Map(
          [...((data ?? []) as Message[]), ...currentMessages]
            .filter((message) => message.team_id === teamId)
            .map((message) => [message.id, message]),
        );

        return Array.from(messagesById.values()).sort(
          (first, second) =>
            new Date(first.inserted_at).getTime() -
            new Date(second.inserted_at).getTime(),
        );
      });
    };

    const subscription = supabase
      .channel(`team-chat:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const incomingMessage = payload.new as Message;
          if (disposed || incomingMessage.team_id !== teamId) return;

          setMessages((currentMessages) =>
            currentMessages.some(
              (message) => message.id === incomingMessage.id,
            )
              ? currentMessages
              : [...currentMessages, incomingMessage],
          );
        },
      )
      .subscribe((status) => {
        if (disposed) return;

        if (status === "SUBSCRIBED" && !hasSyncedInitialMessagesRef.current) {
          hasSyncedInitialMessagesRef.current = true;
          void syncMessages();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          hasSyncedInitialMessagesRef.current = false;
        }
      });

    return () => {
      disposed = true;
      void supabase.removeChannel(subscription);
    };
  }, [
    initialMessages,
    initialMessagesLoaded,
    initialMessagesRequestedAt,
    teamId,
  ]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("messages").insert({
      user_id: userId,
      team_id: teamId,
      content: newMessage,
      user_name: userName,
    });

    if (error) {
      console.error("Message could not be sent:", error);
    } else {
      setNewMessage("");
    }
  }, [newMessage, teamId, userId, userName]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DashboardHeaderActions>
        <div
          className="hidden items-center gap-3 sm:flex"
          aria-live="polite"
          aria-label="Team presence"
        >
          {isSynced && visibleMembers.length > 0 ? (
            <div className="flex -space-x-2">
              {visibleMembers.map((member) => {
                const status = statusByUserId[member.userId];

                return (
                  <div
                    key={member.userId}
                    className="relative"
                    title={member.name}
                  >
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={member.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background ${
                        status === "online"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                  </div>
                );
              })}
              {availableMembers.length > visibleMembers.length ? (
                <div className="relative z-10 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-background bg-muted px-1 text-xs font-medium">
                  +{availableMembers.length - visibleMembers.length}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="text-right text-sm">
            {connection === "error" ? (
              <span
                className="text-destructive"
                title={errorMessage ?? undefined}
              >
                Presence unavailable
              </span>
            ) : !membersLoaded ? (
              <span className="text-destructive">Members unavailable</span>
            ) : !isSynced ? (
              <span className="text-muted-foreground">Connecting...</span>
            ) : (
              <>
                <div className="font-medium">{onlineMembers.length} active</div>
                {awayMembers.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {awayMembers.length} away
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </DashboardHeaderActions>

      <div className="flex-1 flex overflow-hidden">
        <Card className="flex-1 m-6 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col flex-1 overflow-hidden px-6 pb-1">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userId={userId}
                />
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
              <Button variant="ghost" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={handleSend} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
