// app/logout/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../lib/supabaseServer' // ← senin server client'ının yolu
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error("Kullanıcı alınırken hata:", error.message)
  }

  if (user) {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error("Çıkış yapılırken hata:", signOutError.message)
    }
  }

  revalidatePath('/', 'layout')

  return NextResponse.redirect(new URL('/auth/login', req.url), {
    status: 302,
  })
}
