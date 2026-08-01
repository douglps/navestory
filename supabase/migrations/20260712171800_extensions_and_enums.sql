-- @spec RULES.md S2/S9 -- extensões e enums base do domínio navestory
create extension if not exists pg_cron;

create type profile_type as enum ('autonomous', 'small_fleet', 'large_fleet');
create type vehicle_operational_status as enum ('parking', 'workshop', 'accident', 'impounded');
create type vehicle_type as enum ('carro', 'moto', 'caminhao', 'onibus', 'utilitario', 'outro');
create type maintenance_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type fine_status as enum ('pending', 'paid', 'appealing', 'cancelled');
create type recurring_cost_type as enum ('ipva', 'crlv', 'insurance', 'other');
