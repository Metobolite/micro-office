"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
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

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch and subscribe to messages
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
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-gray-800 p-4 rounded shadow h-[500px] overflow-y-auto space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.user_id === userId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg text-white max-w-xs ${
                msg.user_id === userId ? "bg-blue-600" : "bg-gray-600"
              }`}
            >
              <div className="text-xs opacity-80 mb-1">{msg.user_name}</div>
              <div>{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          className="flex-1 p-2 border border-gray-300 rounded"
          placeholder="Mesajınızı yazın..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
