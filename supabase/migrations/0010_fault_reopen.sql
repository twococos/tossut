-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0010: incloure 'fault_reopen' al reset d'avaries
--
-- S'ha afegit l'event fault_reopen (reobrir una avaria solucionada). La RPC de neteja
-- física del reset d'avaries (reset_fault_events, migració 0008) ha de tenir-lo en compte
-- perquè, en esborrar l'historial, també s'esborrin els fault_reopen anteriors al tall.
--
-- Aquesta migració REEMPLAÇA la funció amb la llista de tipus ampliada. La resta de la
-- lògica és idèntica a 0008.
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
      e.type in ('fault_report', 'fault_update', 'fault_resolve', 'fault_reopen')
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
