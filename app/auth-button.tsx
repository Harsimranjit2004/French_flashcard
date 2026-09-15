"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/utils/supabase/client";

export function AuthButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setLoaded(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!loaded) return <span className="avatar">…</span>;

  if (!email) return <Link className="auth-link" href="/auth">Sign in</Link>;

  return (
    <button className="avatar auth-avatar" title={`${email} — Sign out`} onClick={signOut}>
      {email.charAt(0).toUpperCase()}
    </button>
  );
}
