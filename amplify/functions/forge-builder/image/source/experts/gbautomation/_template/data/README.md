# {{EXPERT}} data surfaces

Declare only tables and views this expert or its selected skills touch. Copy
`surfaces.json.example` to `surfaces.json`, fill the connections and source
evidence, then register the path in `config/schema-catalogs.json`. An empty
example is guidance, not an active connection or permission grant.

The maintained catalog shows columns and PostgreSQL types, ordered primary and
foreign keys, unique/check constraint names, indexes, RLS flags, policies, grants
and backing-view dependencies. It follows view dependencies and one hop of FK
targets (including shared skill registries); further targets remain boundary
references. Shared Langfuse, session, receipt and artifact tables belong here
when the expert actually uses them. External services are named separately.

Refresh from the repository root:

```text
python scripts/expert_schema_catalog.py --manifest experts/{{TREE}}/{{EXPERT}}/data/surfaces.json
```

Open `artifacts/schema-catalogs/{{TREE}}/{{EXPERT}}/index.html`. JSON, Mermaid,
change history and the last successful snapshot live alongside it. Read
`status.json` and the observation time before relying on the catalog. A failed
refresh produces an incomplete report and preserves `last-good.json`.

The refresh cadence is nightly and after successful migrations on an installed
host. See `config/schema-catalogs.md` for activation and verification. Metadata
refreshes do not migrate a database, export business rows or grant access.

Keep initialization, upgrades and recovery with the owning service's canonical
`supabase/migrations/`; link those files as evidence instead of duplicating SQL.
DBForge remains the production DDL owner. Sanitized tutorial seeds, if added,
must be separate from live database proof.

When a skill, table, connection or query changes, update the declaration and
source pointers in the same PR. New literal `public.table` references found in
the declared sources are review findings; dynamic identifiers need a deliberate
manifest update. This is a maintained, scoped inventory, not static analysis
proof that every possible runtime query has been found.
