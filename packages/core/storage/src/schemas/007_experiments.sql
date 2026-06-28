-- 007_experiments.sql
-- Experiments, experiment variants, metrics, and results
-- A/B testing and experimentation framework for the ecosystem.

BEGIN;

-- ---------------------------------------------------------------------------
-- EXPERIMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE experiments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    hypothesis      TEXT,
    description     TEXT,
    experiment_type TEXT NOT NULL DEFAULT 'ab_test'
                        CHECK (experiment_type IN ('ab_test', 'multivariate',
                                                    'bandit', 'feature_flag',
                                                    'canary', 'shadow')),
    target_entity   TEXT NOT NULL
                        CHECK (target_entity IN ('track', 'workflow', 'model',
                                                  'prompt', 'ui', 'pricing',
                                                  'recommendation', 'generation')),
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'running', 'paused',
                                          'completed', 'cancelled', 'archived')),
    traffic_pct     NUMERIC(5,2) NOT NULL DEFAULT 100
                        CHECK (traffic_pct BETWEEN 0 AND 100),
    targeting_rules JSONB NOT NULL DEFAULT '{}',
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    min_sample_size INT,
    confidence_level NUMERIC(4,3) DEFAULT 0.95,
    primary_metric  TEXT,
    guardrail_metrics TEXT[] NOT NULL DEFAULT '{}',
    config          JSONB NOT NULL DEFAULT '{}',
    conclusion      TEXT,
    winning_variant_id UUID,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_experiments_tenant ON experiments (tenant_id);
CREATE INDEX idx_experiments_status ON experiments (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_experiments_type ON experiments (tenant_id, experiment_type);
CREATE INDEX idx_experiments_entity ON experiments (target_entity);
CREATE INDEX idx_experiments_dates ON experiments (start_date, end_date);

-- ---------------------------------------------------------------------------
-- EXPERIMENT_VARIANTS
-- ---------------------------------------------------------------------------
CREATE TABLE experiment_variants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    is_control      BOOLEAN NOT NULL DEFAULT FALSE,
    traffic_weight  NUMERIC(5,2) NOT NULL DEFAULT 50
                        CHECK (traffic_weight BETWEEN 0 AND 100),
    config          JSONB NOT NULL DEFAULT '{}',  -- variant-specific parameters
    entity_id       UUID,                     -- the specific entity being tested
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (experiment_id, name)
);

CREATE INDEX idx_experiment_variants_experiment ON experiment_variants (experiment_id);
CREATE INDEX idx_experiment_variants_tenant ON experiment_variants (tenant_id);
CREATE INDEX idx_experiment_variants_control ON experiment_variants (experiment_id, is_control) WHERE is_control = TRUE;

-- ---------------------------------------------------------------------------
-- EXPERIMENT_METRICS
-- ---------------------------------------------------------------------------
CREATE TABLE experiment_metrics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    metric_type     TEXT NOT NULL
                        CHECK (metric_type IN ('primary', 'secondary', 'guardrail')),
    aggregation     TEXT NOT NULL DEFAULT 'mean'
                        CHECK (aggregation IN ('mean', 'median', 'sum', 'count',
                                                'p50', 'p90', 'p95', 'p99', 'rate',
                                                'conversion', 'retention')),
    direction       TEXT NOT NULL DEFAULT 'higher_is_better'
                        CHECK (direction IN ('higher_is_better', 'lower_is_better')),
    min_detectable_effect NUMERIC(8,4),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (experiment_id, name)
);

CREATE INDEX idx_experiment_metrics_experiment ON experiment_metrics (experiment_id);
CREATE INDEX idx_experiment_metrics_type ON experiment_metrics (metric_type);

-- ---------------------------------------------------------------------------
-- EXPERIMENT_RESULTS
-- ---------------------------------------------------------------------------
CREATE TABLE experiment_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
    metric_id       UUID NOT NULL REFERENCES experiment_metrics(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sample_size     INT NOT NULL DEFAULT 0,
    metric_value    NUMERIC(14,6) NOT NULL,
    ci_lower        NUMERIC(14,6),            -- confidence interval lower bound
    ci_upper        NUMERIC(14,6),            -- confidence interval upper bound
    p_value         NUMERIC(8,6),
    z_score         NUMERIC(8,4),
    effect_size     NUMERIC(8,6),             -- Cohen's d or relative lift
    is_significant  BOOLEAN NOT NULL DEFAULT FALSE,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    raw_data        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiment_results_experiment ON experiment_results (experiment_id);
CREATE INDEX idx_experiment_results_variant ON experiment_results (variant_id);
CREATE INDEX idx_experiment_results_metric ON experiment_results (metric_id);
CREATE INDEX idx_experiment_results_tenant ON experiment_results (tenant_id);
CREATE INDEX idx_experiment_results_significant ON experiment_results (experiment_id, is_significant)
    WHERE is_significant = TRUE;

-- ---------------------------------------------------------------------------
-- EXPERIMENT_ASSIGNMENTS (which user/entity was assigned to which variant)
-- ---------------------------------------------------------------------------
CREATE TABLE experiment_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject_type    TEXT NOT NULL
                        CHECK (subject_type IN ('user', 'session', 'track', 'device')),
    subject_id      TEXT NOT NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (experiment_id, subject_type, subject_id)
);

CREATE INDEX idx_experiment_assignments_experiment ON experiment_assignments (experiment_id);
CREATE INDEX idx_experiment_assignments_variant ON experiment_assignments (variant_id);
CREATE INDEX idx_experiment_assignments_subject ON experiment_assignments (subject_type, subject_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON experiment_variants
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;

COMMIT;
