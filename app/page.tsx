import Link from "next/link";

import { createClient } from "./lib/supabaseServer";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const loggedIn = Boolean(data.user);
  const destination = loggedIn ? "/teams" : "/auth/login";

  return (
    <main>
      <div className="flex flex-col min-w-full items-center justify-center min-h-screen bg-[#1B3C53] text-white">
        <h1 className="text-[96px] font-bold mb-6">Welcome to Micro Office</h1>
        <div className="flex flex-col text-center gap-4">
          <p>Micro Office is a simple task management app.</p>
          <h2>Please sign in to continue.</h2>
          <Link
            href={destination}
            className="bg-[#D2C1B6] text-black text-2xl px-6 py-2 rounded-lg hover:bg-[#e9d6cb] transition duration-300 hover:-translate-y-1 hover:shadow-[#F9F3EF] hover:shadow-md"
          >
            {loggedIn ? "Go to Teams" : "Sign in"}
          </Link>
        </div>
      </div>
    </main>
  );
}
