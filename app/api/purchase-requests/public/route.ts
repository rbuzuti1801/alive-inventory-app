import { RateLimiterMemory } from "rate-limiter-flexible";
import { errorResponse } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase";
import { purchaseRequestSchema } from "@/lib/validators";

// Envio PÚBLICO da Solicitação de Compra (sem login) — caminho-folha liberado
// no middleware (lib/access.ts). É rota de escrita aberta, então:
//   • só cria (nunca lê nem altera solicitações existentes);
//   • status e número são definidos pelo banco — nada do corpo os influencia;
//   • rate limit por IP, como no login.
const limiter = new RateLimiterMemory({
  points: 5,        // 5 solicitações
  duration: 600,    // por 10 minutos, por IP
  blockDuration: 600,
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    await limiter.consume(ip);
  } catch {
    return Response.json(
      { error: "Muitas solicitações enviadas. Aguarde alguns minutos." },
      { status: 429, headers: { "retry-after": "600" } },
    );
  }

  try {
    const payload = purchaseRequestSchema.parse(await request.json());

    const { data, error } = await supabaseAdmin
      .from("purchase_requests")
      .insert({
        requester_name: payload.requester_name,
        requester_contact: payload.requester_contact,
        item_name: payload.item_name,
        quantity: payload.quantity,
        justification: payload.justification,
        department: payload.department ?? null,
        estimated_value: payload.estimated_value ?? null,
        brand: payload.brand ?? null,
        reference_link: payload.reference_link ?? null,
        desired_date: payload.desired_date ?? null,
        observations: payload.observations ?? null,
        status: "pendente",
      })
      // Resposta pública: devolve apenas o protocolo, nunca a linha inteira.
      .select("request_number")
      .single();

    if (error) return errorResponse(error);
    return Response.json({ request_number: data.request_number }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
