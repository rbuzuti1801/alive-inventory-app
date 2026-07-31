import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { canManageChurchProfile } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { churchProfileSchema } from "@/lib/validators";

// Perfil da Igreja: tabela singleton (0014). A atualização não usa id — escreve
// na única linha existente (`singleton = true`).
export async function PUT(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  try {
    if (!canManageChurchProfile(user!)) {
      return errorResponse(new Error("Apenas administradores editam o perfil da igreja."), 403);
    }

    const payload = churchProfileSchema.parse(await request.json());

    const { data, error } = await supabaseAdmin
      .from("church_profile")
      .update({
        ...payload,
        updated_by: user!.id,
        updated_by_name: user!.name,
      })
      .eq("singleton", true)
      .select("name,legal_name,document,address,phone,email,website,logo_url,updated_by_name,updated_at")
      .single();

    if (error) return errorResponse(error);
    return Response.json({ profile: data });
  } catch (error) {
    return errorResponse(error);
  }
}
