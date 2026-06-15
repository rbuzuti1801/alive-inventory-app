import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const name = process.env.INITIAL_ADMIN_NAME ?? "Administrador Alive";
const username = process.env.INITIAL_ADMIN_USERNAME ?? "admin";
const password = process.env.INITIAL_ADMIN_PASSWORD;

if (!url || !serviceKey || !password) {
  throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e INITIAL_ADMIN_PASSWORD.");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

(async () => {
  const password_hash = await bcrypt.hash(password, 12);

  const { error } = await supabase.from("users_internal").upsert(
    {
      name,
      username,
      password_hash,
      role: "admin",
      active: true,
    },
    { onConflict: "username" },
  );

  if (error) throw error;
  console.log(`Admin interno pronto: ${username}`);
})();
