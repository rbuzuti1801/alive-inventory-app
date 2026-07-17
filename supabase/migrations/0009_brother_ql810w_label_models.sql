-- Modelos físicos Brother QL-810W. Mantém o registro histórico de impressão,
-- apenas traduzindo os nomes genéricos anteriores para os novos modelos DK.

-- Remove o check antigo ANTES do update: os novos valores dk* não passariam
-- pela restrição anterior ('compacta','media','completa').
alter table public.inventory_items
  drop constraint if exists inventory_items_label_type_check;

update public.inventory_items
set label_type = case label_type
  when 'compacta' then 'dk11221'
  when 'media' then 'dk11209'
  else 'dk22205'
end;

alter table public.inventory_items
  add constraint inventory_items_label_type_check
  check (label_type in ('dk22205', 'dk2205', 'dk11209', 'dk11221'));

-- O default anterior ('compacta') deixaria de satisfazer o novo check; itens
-- criados sem label_type explícito passam a nascer no modelo padrão dk22205.
alter table public.inventory_items
  alter column label_type set default 'dk22205';
