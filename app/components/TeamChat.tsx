"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale/tr";

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
}: {
  userId: string;
  userName: string;
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
        .order("inserted_at", { ascending: true });

      if (error) console.error("Mesajlar alınamadı:", error);
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase]);

  // Handle sending message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("messages").insert({
      user_id: userId,
      content: newMessage,
      user_name: userName,
    });

    if (error) {
      console.error("Mesaj gönderilemedi:", error);
    } else {
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Takım Sohbeti</h1>
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <Avatar key={i} className="h-8 w-8 border-2 border-background">
                  <AvatarImage
                    src={`/placeholder.svg?height=32&width=32&text=${i}`}
                  />
                  <AvatarFallback>U{i}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">4 aktif</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Card className="flex-1 m-6 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Genel</CardTitle>
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
                    locale: tr,
                  }
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
                      <div className="flex items-center space-x-2 mb-1 justify-between">
                        <span className="text-sm font-medium">
                          {message.user_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {time}
                        </span>
                      </div>
                      <div
                        className={`inline-block p-3 rounded-lg max-w-xs lg:max-w-md ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
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
                  placeholder="Mesajınızı yazın..."
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
