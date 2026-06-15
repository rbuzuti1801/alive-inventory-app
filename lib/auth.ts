import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase";

const cookieName = "alive_inventory_session";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
  sector_id: string | null;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.id;
    if (typeof id !== "string") return null;

    const { data, error } = await supabaseAdmin
      .from("users_internal")
      .select("id,name,username,role,sector_id,active")
      .eq("id", id)
      .single();

    if (error || !data?.active) return null;
    return {
      id: data.id,
      name: data.name,
      username: data.username,
      role: data.role,
      sector_id: data.sector_id,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, response: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { user, response: null };
}
