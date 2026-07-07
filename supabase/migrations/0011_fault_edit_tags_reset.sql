-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0011: incloure 'fault_edit' i 'fault_tags' al reset d'avaries
--
-- S'han afegit els events fault_edit (editar metadades d'una avaria) i fault_tags
-- (substituir la llista d'etiquetes). La RPC de neteja física del reset d'avaries
-- (reset_fault_events, migracions 0008/0010) ha de tenir-los en compte perquè, en esborrar
-- l'historial, també s'esborrin els fault_edit/fault_tags anteriors al tall.
--
-- Aquesta migració REEMPLAÇA la funció amb la llista de tipus ampliada. La resta de la
-- lògica és idèntica a 0010.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.reset_fault_events(
  cut_occurred_at timestamptz,
  cut_device_id   text,
  cut_seq         bigint,
  keep_barrier_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted int;
begin
  delete from public.events e
  where
    -- events d'avaria anteriors al tall (clau d'ordre < cut)
    (
      e.type in ('fault_report', 'fault_update', 'fault_edit', 'fault_tags', 'fault_resolve', 'fault_reopen')
      and (
        e.occurred_at < cut_occurred_at
        or (e.occurred_at = cut_occurred_at and e.device_id < cut_device_id)
        or (e.occurred_at = cut_occurred_at and e.device_id = cut_device_id and e.seq < cut_seq)
      )
    )
    -- barreres velles (qualsevol fault_barrier que no sigui la de reset nova)
    or (e.type = 'fault_barrier' and e.id <> keep_barrier_id);

  get diagnostics deleted = row_count;
  return deleted;
end $$;

revoke all on function public.reset_fault_events(timestamptz, text, bigint, uuid) from public;
grant execute on function public.reset_fault_events(timestamptz, text, bigint, uuid) to authenticated;
