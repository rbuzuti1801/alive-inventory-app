-- ============================================================================
-- Hardening de segurança: fixa o search_path das funções de trigger.
-- Resolve o alerta "function_search_path_mutable" do linter do Supabase.
-- ============================================================================

alter function public.touch_updated_at() set search_path = public, pg_temp;
alter function public.generate_sku()     set search_path = public, pg_temp;
alter function public.protect_sku()       set search_path = public, pg_temp;
