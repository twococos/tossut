-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0009: reset de l'historial de documents (RPC de neteja física)
--
-- En fer un "Esborrar l'historial de documents" el client emet una barrera
-- document_barrier i, a més, crida aquesta RPC per esborrar físicament del log:
--   · tots els events document_create / document_edit / document_renew /
--     document_comment / document_comment_delete / document_delete anteriors al tall
--     (clau d'ordre < cut), i
--   · totes les document_barrier VELLES excepte la barrera de reset nova.
--
-- La barrera de reset nova (keep_barrier_id) SEMPRE es conserva: és la salvaguarda
-- determinista que neutralitza qualsevol event de document vell que un dispositiu offline
-- pogués repujar després del reset. El log segueix sent la font de veritat; aquesta RPC
-- només allibera espai i evita reaparicions.
--
-- La condició de tall replica EXACTAMENT compareKey del client (occurredAt → deviceId →
-- seq); els events amb clau ESTRICTAMENT < cut s'esborren. Mirall de 0008_fault_reset.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.reset_document_events(
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
    -- events de document anteriors al tall (clau d'ordre < cut)
    (
      e.type in (
        'document_create', 'document_edit', 'document_renew',
        'document_comment', 'document_comment_delete', 'document_delete',
        'document_restore'
      )
      and (
        e.occurred_at < cut_occurred_at
        or (e.occurred_at = cut_occurred_at and e.device_id < cut_device_id)
        or (e.occurred_at = cut_occurred_at and e.device_id = cut_device_id and e.seq < cut_seq)
      )
    )
    -- barreres velles (qualsevol document_barrier que no sigui la de reset nova)
    or (e.type = 'document_barrier' and e.id <> keep_barrier_id);

  get diagnostics deleted = row_count;
  return deleted;
end $$;

-- Només usuaris autenticats poden cridar la RPC.
revoke all on function public.reset_document_events(timestamptz, text, bigint, uuid) from public;
grant execute on function public.reset_document_events(timestamptz, text, bigint, uuid) to authenticated;
