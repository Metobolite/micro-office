"use client";

import { supabase } from "@/app/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { formatDistanceToNow } from "date-fns";
import { Paperclip, Send, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  inserted_at: string;
}

export default function TeamChat({
  userId,
  userName,
  teamId,
}: {
  userId: string;
  userName: string;
  teamId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("team_id", teamId)
        .order("inserted_at", { ascending: true });

      if (error) console.error("Messages could not be loaded:", error);
      else setMessages(data as Message[]);
    };

    fetchMessages();

    const subscription = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [teamId]);

  const handleSend = async () => {
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
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Team Chat</h1>
          <div className="flex items-center space-x-2">
            <div className="flex">
              {[1, 2, 3, 4].map((i) => (
                <Avatar key={i} className="h-8 w-8 border-2 border-background">
                  <AvatarImage
                    src={`/placeholder.svg?height=32&width=32&text=${i}`}
                  />
                  <AvatarFallback>U{i}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">4 active</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Card className="flex-1 m-6 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col flex-1 overflow-hidden px-6 pb-1">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
              {messages.map((message) => {
                const isOwn = message.user_id === userId;
                const initials = message.user_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();
                const time = formatDistanceToNow(
                  new Date(message.inserted_at),
                  {
                    addSuffix: true,
                  },
                );

                return (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      isOwn ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwn ? "text-right" : ""}`}>
                      <div
                        className={`inline-block p-3 rounded-lg max-w-xs lg:max-w-md ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className="flex items-center space-x-2 mb-1 justify-end">
                        <span className="text-xs text-muted-foreground">
                          {time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
