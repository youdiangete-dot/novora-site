-- PLAN FIXTURE ONLY: run solely inside the proposed new isolated test container.
-- These roles/database/defaults must never be applied to an existing cluster.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create database novora_test01;
\connect novora_test01
-- Deliberately permissive defaults prove candidate REVOKEs under real roles.
alter default privileges in schema public grant all on tables to public,anon,authenticated,service_role;
alter default privileges in schema public grant execute on functions to public,anon,authenticated,service_role;
