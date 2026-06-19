-- 003_catalog.sql
-- Catalog entries, metadata records, and ingestion jobs
-- Manages the distribution catalog and bulk data ingestion pipeline.

BEGIN;

-- ---------------------------------------------------------------------------
-- CATALOG_ENTRIES
-- ---------------------------------------------------------------------------
CREATE TABLE catalog_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL
                        CHECK (entity_type IN ('track', 'album', 'bundle', 'playlist')),
    entity_id       UUID NOT NULL,           -- polymorphic FK to tracks/albums/etc.
    catalog_number  TEXT,
    distributor     TEXT,
    distribution_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (distribution_status IN ('pending', 'submitted', 'live', 'taken_down', 'expired')),
    territories     TEXT[] NOT NULL DEFAULT '{}',  -- ISO 3166-1 alpha-2 codes
    release_date    DATE,
    takedown_date   DATE,
    price_tier      TEXT,
    pricing         JSONB NOT NULL DEFAULT '{}',
    store_urls      JSONB NOT NULL DEFAULT '{}',  -- {"spotify": "...", "apple": "..."}
    delivery_format TEXT DEFAULT 'ddex'
                        CHECK (delivery_format IN ('ddex', 'cwr', 'custom_api', 'manual')),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_entries_tenant ON catalog_entries (tenant_id);
CREATE INDEX idx_catalog_entries_entity ON catalog_entries (entity_type, entity_id);
CREATE INDEX idx_catalog_entries_status ON catalog_entries (tenant_id, distribution_status);
CREATE INDEX idx_catalog_entries_release ON catalog_entries (release_date);
CREATE INDEX idx_catalog_entries_territories ON catalog_entries USING GIN (territories);

-- ---------------------------------------------------------------------------
-- METADATA_RECORDS
-- ---------------------------------------------------------------------------
CREATE TABLE metadata_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL
                        CHECK (entity_type IN ('track', 'album', 'artist')),
    entity_id       UUID NOT NULL,
    schema_version  TEXT NOT NULL DEFAULT '1.0',
    standard        TEXT NOT NULL DEFAULT 'ddex'
                        CHECK (standard IN ('ddex', 'musicbrainz', 'gracenote', 'isrc_net', 'custom')),
    payload         JSONB NOT NULL,          -- The full metadata record
    validation_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    validation_errors JSONB NOT NULL DEFAULT '[]',
    source          TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'import', 'api', 'ai_enrichment', 'sync')),
    source_id       TEXT,                    -- external system reference
    hash            TEXT NOT NULL,           -- SHA-256 of payload for dedup
    supersedes_id   UUID REFERENCES metadata_records(id) ON DELETE SET NULL,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_metadata_records_hash ON metadata_records (tenant_id, hash);
CREATE INDEX idx_metadata_records_entity ON metadata_records (entity_type, entity_id);
CREATE INDEX idx_metadata_records_tenant ON metadata_records (tenant_id);
CREATE INDEX idx_metadata_records_status ON metadata_records (tenant_id, validation_status);
CREATE INDEX idx_metadata_records_standard ON metadata_records (standard);

-- ---------------------------------------------------------------------------
-- INGESTION_JOBS
-- ---------------------------------------------------------------------------
CREATE TABLE ingestion_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_type        TEXT NOT NULL
                        CHECK (job_type IN ('bulk_upload', 'ddex_import', 'api_sync',
                                            'csv_import', 'catalog_update', 'metadata_enrichment')),
    status          TEXT NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued', 'running', 'paused', 'completed',
                                          'failed', 'cancelled', 'partial')),
    priority        INT NOT NULL DEFAULT 5
                        CHECK (priority BETWEEN 1 AND 10),
    source_url      TEXT,
    source_format   TEXT,
    total_items      INT NOT NULL DEFAULT 0,
    processed_items  INT NOT NULL DEFAULT 0,
    failed_items     INT NOT NULL DEFAULT 0,
    skipped_items    INT NOT NULL DEFAULT 0,
    progress_pct    NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (progress_pct BETWEEN 0 AND 100),
    error_log       JSONB NOT NULL DEFAULT '[]',
    result_summary  JSONB NOT NULL DEFAULT '{}',
    config          JSONB NOT NULL DEFAULT '{}',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_jobs_tenant ON ingestion_jobs (tenant_id);
CREATE INDEX idx_ingestion_jobs_status ON ingestion_jobs (tenant_id, status);
CREATE INDEX idx_ingestion_jobs_type ON ingestion_jobs (tenant_id, job_type);
CREATE INDEX idx_ingestion_jobs_created ON ingestion_jobs (created_at DESC);

-- ---------------------------------------------------------------------------
-- INGESTION_JOB_ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE ingestion_job_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_index      INT NOT NULL,
    entity_type     TEXT,
    entity_id       UUID,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    input_data      JSONB NOT NULL DEFAULT '{}',
    output_data     JSONB NOT NULL DEFAULT '{}',
    error_message   TEXT,
    processing_time_ms INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_items_job ON ingestion_job_items (job_id);
CREATE INDEX idx_ingestion_items_status ON ingestion_job_items (job_id, status);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON catalog_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON metadata_records
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ingestion_jobs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE catalog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_job_items ENABLE ROW LEVEL SECURITY;

COMMIT;
