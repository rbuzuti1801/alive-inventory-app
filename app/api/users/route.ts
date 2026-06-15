import bcrypt from "bcryptjs";
import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { userSchema } from "@/lib/validators";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (!canManageUsers(user!)) return errorResponse(new Error("Apenas admin pode gerenciar usuários."), 403);

  const { data, error } = await supabaseAdmin
    .from("users_internal")
    .select("id,name,username,role,sector_id,active,created_at,updated_at,sectors(name)")
    .order("name");

  if (error) return errorResponse(error);
  return Response.json({ users: data });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (!canManageUsers(user!)) return errorResponse(new Error("Apenas admin pode gerenciar usuários."), 403);

  const payload = userSchema.parse(await request.json());
  if (!payload.password) return errorResponse(new Error("Senha obrigatória ao criar usuário."));

  const password_hash = await bcrypt.hash(payload.password, 12);
  const { password: _password, ...rest } = payload;
  const { data, error } = await supabaseAdmin
    .from("users_internal")
    .insert({ ...rest, password_hash, active: payload.active ?? true })
    .select("id,name,username,role,sector_id,active")
    .single();

  if (error) return errorResponse(error);
  return Response.json({ user: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (!canManageUsers(user!)) return errorResponse(new Error("Apenas admin pode gerenciar usuários."), 403);

  const body = await request.json();
  if (!body.id) return errorResponse(new Error("ID obrigatório."));
  const payload = userSchema.parse(body);
  const { password, ...rest } = payload;
  const update: Record<string, unknown> = { ...rest, active: payload.active ?? false };
  if (password) update.password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabaseAdmin
    .from("users_internal")
    .update(update)
    .eq("id", body.id)
    .select("id,name,username,role,sector_id,active")
    .single();

  if (error) return errorResponse(error);
  return Response.json({ user: data });
}
