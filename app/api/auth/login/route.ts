import bcrypt from "bcryptjs";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { createSession } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { supabaseAdmin } from "@/lib/supabase";

const limiter = new RateLimiterMemory({
  points: 5,       // 5 tentativas
  duration: 60,    // por minuto por IP
  blockDuration: 300, // bloqueia 5 min após esgotar
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    await limiter.consume(ip);
  } catch {
    return Response.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429, headers: { "retry-after": "300" } },
    );
  }

  try {
    const body = await request.json();
    const credentials = loginSchema.parse(body);

    const { data: user, error } = await supabaseAdmin
      .from("users_internal")
      .select("id,name,username,password_hash,role,sector_id,active")
      .eq("username", credentials.username)
      .single();

    if (error || !user?.active) {
      return errorResponse(new Error("Usuário ou senha inválidos."), 401);
    }

    const ok = await bcrypt.compare(credentials.password, user.password_hash);
    if (!ok) return errorResponse(new Error("Usuário ou senha inválidos."), 401);

    await limiter.reward(ip); // reseta o contador em login bem-sucedido
    await createSession({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      sector_id: user.sector_id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, 400);
  }
}
