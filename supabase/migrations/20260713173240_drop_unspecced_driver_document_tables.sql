-- @spec docs/IMPLEMENTATION_STRATEGY.md Tarefa T0.2 — remove entidades implementadas no banco sem spec aprovada
-- Decisão de douglps em 2026-07-13: drivers, vehicle_drivers e documents não têm spec em specs/,
-- não estão em specs/RULES.md e não constam na Fase 2+ do roadmap com spec aprovada.
-- DROP TABLE remove em cascata os triggers, policies e índices próprios dessas tabelas.

drop table if exists public.vehicle_drivers;
drop table if exists public.drivers;
drop table if exists public.documents;
