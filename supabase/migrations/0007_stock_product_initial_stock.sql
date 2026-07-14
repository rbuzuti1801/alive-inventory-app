-- ── 0007: criação de produto com estoque inicial ────────────────────────────
-- O cadastro de produto passou a aceitar "quantidade inicial" + "localização
-- inicial". Gravar a quantidade direto em stock_levels burlaria a trilha de
-- auditoria (apply_stock_movement é a ÚNICA porta de escrita em
-- stock_levels/stock_movements), e fazer insert + RPC em duas chamadas HTTP
-- deixaria produto criado com saldo inconsistente caso a segunda falhasse.
--
-- Esta função resolve os dois pontos: roda numa única transação (qualquer
-- exception desfaz também o insert do produto) e delega a movimentação para
-- apply_stock_movement, sem reimplementar nada.

create or replace function public.create_stock_product_with_initial_stock(
  p_name                text,
  p_category            text,
  p_unit                text,
  p_min_quantity        numeric default 0,
  p_barcode             text    default null,
  p_notes               text    default null,
  p_active              boolean default true,
  p_initial_quantity    numeric default 0,
  p_initial_location_id uuid    default null,
  p_user_id             uuid    default null
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_product   record;
  v_active    boolean := coalesce(p_active, true);
  v_initial   numeric := coalesce(p_initial_quantity, 0);
  v_movement  jsonb   := null;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Nome obrigatório.';
  end if;
  if coalesce(p_min_quantity, 0) < 0 then
    raise exception 'Estoque mínimo não pode ser negativo.';
  end if;
  if v_initial < 0 then
    raise exception 'Quantidade inicial não pode ser negativa.';
  end if;
  if v_initial > 0 and p_initial_location_id is null then
    raise exception 'Informe a localização inicial para a quantidade informada.';
  end if;
  -- apply_stock_movement recusa produto inativo; antecipamos com mensagem clara.
  if v_initial > 0 and not v_active then
    raise exception 'Produto inativo não pode receber estoque inicial.';
  end if;

  insert into public.stock_products
    (name, category, unit, min_quantity, barcode, notes, active, created_by)
  values
    (btrim(p_name), p_category, p_unit, coalesce(p_min_quantity, 0),
     p_barcode, p_notes, v_active, p_user_id)
  returning * into v_product;

  -- Entrada inicial: mesma lógica transacional das entradas normais. Se ela
  -- falhar (localização inválida/inativa, etc.), a exception aborta a transação
  -- inteira e o produto acima não chega a existir.
  if v_initial > 0 then
    v_movement := public.apply_stock_movement(
      p_product_id       => v_product.id,
      p_movement_type    => 'entrada',
      p_quantity         => v_initial,
      p_from_location_id => null,
      p_to_location_id   => p_initial_location_id,
      p_reason           => 'Estoque inicial',
      p_user_id          => p_user_id
    );
  end if;

  return jsonb_build_object(
    'product', to_jsonb(v_product),
    'movement', v_movement
  );
end;
$function$;

-- Mesma postura das demais RPCs: acessível apenas via service role.
revoke all on function public.create_stock_product_with_initial_stock(
  text, text, text, numeric, text, text, boolean, numeric, uuid, uuid
) from anon, authenticated;
