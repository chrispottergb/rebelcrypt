-- 008_analytics.sql
-- KPI snapshots, cost snapshots, revenue forecasts, and cohort segments
-- Business intelligence and analytics data layer.

BEGIN;

-- ---------------------------------------------------------------------------
-- KPI_SNAPSHOTS
-- ---------------------------------------------------------------------------
CREATE TABLE kpi_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    period_type     TEXT NOT NULL DEFAULT 'daily'
                        CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    category        TEXT NOT NULL
                        CHECK (category IN ('revenue', 'engagement', 'content',
                                            'ai', 'platform', 'distribution',
                                            'quality', 'growth')),
    metric_name     TEXT NOT NULL,
    metric_value    NUMERIC(18,6) NOT NULL,
    previous_value  NUMERIC(18,6),
    change_pct      NUMERIC(8,4),
    unit            TEXT NOT NULL DEFAULT 'count',
    dimensions      JSONB NOT NULL DEFAULT '{}',  -- {genre, territory, source, ...}
    tags            TEXT[] NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partitioned-friendly index strategy
CREATE INDEX idx_kpi_snapshots_tenant_date ON kpi_snapshots (tenant_id, snapshot_date DESC);
CREATE INDEX idx_kpi_snapshots_category ON kpi_snapshots (tenant_id, category, metric_name);
CREATE INDEX idx_kpi_snapshots_period ON kpi_snapshots (period_type, snapshot_date DESC);
CREATE INDEX idx_kpi_snapshots_dimensions ON kpi_snapshots USING GIN (dimensions);
CREATE INDEX idx_kpi_snapshots_tags ON kpi_snapshots USING GIN (tags);

-- Unique constraint to prevent duplicate snapshots
CREATE UNIQUE INDEX idx_kpi_snapshots_unique ON kpi_snapshots
    (tenant_id, snapshot_date, period_type, category, metric_name, dimensions);

-- ---------------------------------------------------------------------------
-- COST_SNAPSHOTS
-- ---------------------------------------------------------------------------
CREATE TABLE cost_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    period_type     TEXT NOT NULL DEFAULT 'daily'
                        CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
    cost_category   TEXT NOT NULL
                        CHECK (cost_category IN ('ai_inference', 'ai_training',
                                                  'storage', 'compute', 'bandwidth',
                                                  'api_calls', 'licensing', 'personnel',
                                                  'infrastructure', 'third_party')),
    provider        TEXT,                     -- 'openai', 'aws', 'gcp', etc.
    service         TEXT,                     -- specific service name
    amount          NUMERIC(14,4) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'USD',
    quantity        NUMERIC(18,4),            -- units consumed
    unit            TEXT,                     -- 'tokens', 'gpu_hours', 'gb', 'requests'
    unit_cost       NUMERIC(12,8),
    budget_amount   NUMERIC(14,4),
    budget_pct      NUMERIC(8,4),             -- % of budget consumed
    dimensions      JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_snapshots_tenant_date ON cost_snapshots (tenant_id, snapshot_date DESC);
CREATE INDEX idx_cost_snapshots_category ON cost_snapshots (tenant_id, cost_category);
CREATE INDEX idx_cost_snapshots_provider ON cost_snapshots (provider) WHERE provider IS NOT NULL;
CREATE UNIQUE INDEX idx_cost_snapshots_unique ON cost_snapshots
    (tenant_id, snapshot_date, period_type, cost_category, provider, service);

-- ---------------------------------------------------------------------------
-- REVENUE_FORECASTS
-- ---------------------------------------------------------------------------
CREATE TABLE revenue_forecasts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    forecast_date   DATE NOT NULL,           -- when this forecast was generated
    target_date     DATE NOT NULL,           -- the date being forecast
    period_type     TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    revenue_stream  TEXT NOT NULL
                        CHECK (revenue_stream IN ('streaming', 'downloads', 'sync',
                                                   'merch', 'live', 'licensing',
                                                   'ai_services', 'subscriptions', 'other')),
    forecast_amount NUMERIC(14,2) NOT NULL,
    lower_bound     NUMERIC(14,2),
    upper_bound     NUMERIC(14,2),
    confidence      NUMERIC(4,3),             -- 0..1
    actual_amount   NUMERIC(14,2),            -- filled in after period closes
    variance_pct    NUMERIC(8,4),
    currency        TEXT NOT NULL DEFAULT 'USD',
    model_name      TEXT,                     -- forecast model used
    model_version   TEXT,
    features        JSONB NOT NULL DEFAULT '{}',  -- input features
    dimensions      JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenue_forecasts_tenant ON revenue_forecasts (tenant_id);
CREATE INDEX idx_revenue_forecasts_target ON revenue_forecasts (tenant_id, target_date);
CREATE INDEX idx_revenue_forecasts_stream ON revenue_forecasts (tenant_id, revenue_stream);
CREATE INDEX idx_revenue_forecasts_forecast_date ON revenue_forecasts (forecast_date DESC);

-- ---------------------------------------------------------------------------
-- COHORT_SEGMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE cohort_segments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    description     TEXT,
    segment_type    TEXT NOT NULL
                        CHECK (segment_type IN ('user', 'artist', 'track', 'listener', 'custom')),
    definition      JSONB NOT NULL,           -- filter rules
    is_dynamic      BOOLEAN NOT NULL DEFAULT TRUE,
    member_count    INT NOT NULL DEFAULT 0,
    last_computed   TIMESTAMPTZ,
    schedule        TEXT,                     -- cron expression for recomputation
    retention_data  JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_cohort_segments_tenant ON cohort_segments (tenant_id);
CREATE INDEX idx_cohort_segments_type ON cohort_segments (tenant_id, segment_type);

-- ---------------------------------------------------------------------------
-- COHORT_MEMBERS
-- ---------------------------------------------------------------------------
CREATE TABLE cohort_members (
    cohort_id       UUID NOT NULL REFERENCES cohort_segments(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    member_type     TEXT NOT NULL,
    member_id       UUID NOT NULL,
    entered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    exited_at       TIMESTAMPTZ,
    properties      JSONB NOT NULL DEFAULT '{}',

    PRIMARY KEY (cohort_id, member_type, member_id)
);

CREATE INDEX idx_cohort_members_tenant ON cohort_members (tenant_id);
CREATE INDEX idx_cohort_members_member ON cohort_members (member_type, member_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON revenue_forecasts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cohort_segments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;

COMMIT;
