-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0011: push_events robust davant duplicats (device_id, seq)
--
-- Problema: la taula `events` té un índex únic sobre (device_id, seq) (migració 0001).
-- La versió original de push_events (0003) feia un sol INSERT amb `on conflict (id)
-- do nothing`. Si dos esdeveniments DIFERENTS (id distint) del mateix dispositiu
-- compartien el mateix `seq` —p. ex. una doble emissió quasi-simultània del mateix
-- command abans que la reserva de seq es completés— el conflicte saltava per
-- (device_id, seq), NO per id, i això AVORTAVA TOT EL LOT (error 23505). Resultat:
-- tots els esdeveniments pendents quedaven bloquejats indefinidament a cada cicle.
--
-- Fix: filtrar al servidor, abans d'inserir, qualsevol fila l'id o el parell
-- (device_id, seq) de la qual ja existeixi. Així un duplicat s'ignora silenciosament
-- (com ja passava amb els id repetits) sense fer caure la resta del lot.
--
-- És determinista i segur: `seq` només és desempat d'ordenació; l'ordre real del fold
-- el marca `occurred_at`. Conservar la primera fila que va arribar per a un (device,seq)
-- donat és consistent a tots els clients (tots deriven del mateix log del servidor).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.push_events(batch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.events (id, type, occurred_at, device_id, seq, user_name, payload)
  select id, type, occurred_at, device_id, seq, user_name, payload
  from (
    -- Dedup DINS del lot: si arriben dos elements amb el mateix (device_id, seq),
    -- en conservem només un (el primer per ordre del lot). Així el lot no es
    -- contradiu a si mateix abans ni d'arribar a la taula.
    select distinct on (device_id, seq)
      (e->>'id')::uuid          as id,
      e->>'type'                as type,
      (e->>'occurredAt')::timestamptz as occurred_at,
      e->>'deviceId'            as device_id,
      (e->>'seq')::bigint       as seq,
      e->>'userName'            as user_name,
      e                         as payload,
      ord
    from jsonb_array_elements(batch) with ordinality as t(e, ord)
    order by device_id, seq, ord
  ) as candidate
  -- Descarta els que JA existeixen a la taula per id O per (device_id, seq), perquè
  -- cap dels dos conflictes avorti el lot. (Un sol `on conflict` no cobreix dues claus.)
  where not exists (
    select 1 from public.events ex
    where ex.id = candidate.id
       or (ex.device_id = candidate.device_id and ex.seq = candidate.seq)
  )
  on conflict (id) do nothing;
end $$;

revoke all on function public.push_events(jsonb) from public;
grant execute on function public.push_events(jsonb) to authenticated;
