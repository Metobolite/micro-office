"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <input className="border px-3 py-2 mb-2" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input className="border px-3 py-2 mb-2" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <button className="bg-black text-white px-4 py-2" onClick={handleLogin}>Login</button>
    </div>
  );
}