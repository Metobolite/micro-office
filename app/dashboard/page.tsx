"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data?.user) {
        router.push('/auth/login');
      } else {
        setUserEmail(data.user.email ?? '');
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-xl mx-auto bg-white shadow-lg p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p>Hoş geldin: <strong>{userEmail}</strong></p>
        <button
          onClick={handleLogout}
          className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}