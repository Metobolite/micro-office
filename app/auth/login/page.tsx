"use client";

import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      alert('Giriş başarısız: ' + error.message);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-10 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Giriş Yap</h1>
        <button
          onClick={handleLogin}
          className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200 transition"
        >
          Google ile Giriş Yap
        </button>
      </div>
    </div>
  );
}