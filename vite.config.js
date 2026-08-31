import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/* Supabase config comes from the environment, never from source.

   Vite only exposes VITE_-prefixed vars to the client, but Vercel's
   Supabase integration writes its own unprefixed names (SUPABASE_URL,
   SUPABASE_ANON_KEY, NEXT_PUBLIC_*). On this project the VITE_ pair is
   set on Production only, so a Preview build found neither and silently
   shipped in keyless mode — the login screen would render but no code
   would ever send. That failure is invisible until someone tries to sign
   in, which is exactly the wrong time to find it.

   So: resolve each value from an explicit, ordered list of names. */

/* First non-empty wins. Named vars only — never a prefix sweep, because
   the same environment also holds SUPABASE_SERVICE_ROLE_KEY and
   SUPABASE_SECRET_KEY, and anything resolved here is inlined into client
   JS. Those two names are deliberately absent below and must stay absent. */
export const pickEnv = (env, ...names) => {
  for (const n of names) {
    const v = String(env?.[n] ?? "").trim();
    if (v) return v;
  }
  return "";
};

export const SUPABASE_URL_NAMES = [
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
];

/* Anon and publishable are the same public, RLS-bounded key under two
   names Supabase has used over time. Both are safe in a client bundle. */
export const SUPABASE_ANON_NAMES = [
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  const url = pickEnv(env, ...SUPABASE_URL_NAMES);
  const anon = pickEnv(env, ...SUPABASE_ANON_NAMES);

  /* Say which way it resolved, without printing the values. A build log
     that reads "auth: keyless" is the cheap version of discovering it
     from a buyer who can't sign in. */
  console.log(
    url && anon
      ? "[driverside] supabase auth: configured"
      : "[driverside] supabase auth: KEYLESS — sign-in will run in simulated mode"
  );

  return {
    plugins: [react()],
    /* Inlined so the client sees one canonical name whichever way the
       environment spelled it. */
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(anon),
    },
    server: {
      proxy: {
        "/api": "http://localhost:8787",
      },
    },
  };
});
