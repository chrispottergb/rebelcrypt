-- 009_sre.sql
-- Incidents, system health snapshots, guardrail scores, and alert rules
-- Site Reliability Engineering observability and incident management.

BEGIN;

-- ---------------------------------------------------------------------------
-- ALERT_RULES
-- ---------------------------------------------------------------------------
CREATE TABLE alert_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    category        TEXT NOT NULL
                        CHECK (category IN ('system', 'ai', 'business', 'security',
                                            'compliance', 'cost', 'quality')),
    severity        TEXT NOT NULL DEFAULT 'warning'
                        CHECK (severity IN ('info', 'warning', 'critical', 'fatal')),
    condition       JSONB NOT NULL,           -- rule expression
    threshold       NUMERIC(18,6),
    comparison      TEXT NOT NULL DEFAULT 'gt'
                        CHECK (comparison IN ('gt', 'gte', 'lt', 'lte', 'eq', 'neq',
                                               'between', 'outside')),
    window_seconds  INT NOT NULL DEFAULT 300, -- evaluation window
    cooldown_seconds INT NOT NULL DEFAULT 600, -- minimum time between alerts
    channels        TEXT[] NOT NULL DEFAULT '{}',  -- 'email', 'slack', 'pagerduty', 'webhook'
    channel_config  JSONB NOT NULL DEFAULT '{}',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    auto_resolve    BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_policy JSONB NOT NULL DEFAULT '{}',
    last_triggered_at TIMESTAMPTZ,
    last_resolved_at TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_rules_tenant ON alert_rules (tenant_id);
CREATE INDEX idx_alert_rules_category ON alert_rules (tenant_id, category);
CREATE INDEX idx_alert_rules_severity ON alert_rules (severity);
CREATE INDEX idx_alert_rules_enabled ON alert_rules (tenant_id, enabled) WHERE enabled = TRUE;

-- ---------------------------------------------------------------------------
-- INCIDENTS
-- ---------------------------------------------------------------------------
CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    incident_number SERIAL,
    title           TEXT NOT NULL,
    description     TEXT,
    severity        TEXT NOT NULL DEFAULT 'p3'
                        CHECK (severity IN ('p1', 'p2', 'p3', 'p4')),
    status          TEXT NOT NULL DEFAULT 'detected'
                        CHECK (status IN ('detected', 'acknowledged', 'investigating',
                                          'identified', 'mitigating', 'resolved',
                                          'postmortem', 'closed')),
    category        TEXT NOT NULL DEFAULT 'system'
                        CHECK (category IN ('system', 'ai', 'data', 'security',
                                            'performance', 'availability', 'integration')),
    alert_rule_id   UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    affected_services TEXT[] NOT NULL DEFAULT '{}',
    affected_tenants UUID[] NOT NULL DEFAULT '{}',
    impact_level    TEXT NOT NULL DEFAULT 'low'
                        CHECK (impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
    root_cause      TEXT,
    resolution      TEXT,
    timeline        JSONB NOT NULL DEFAULT '[]',
    assignee_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    responders      UUID[] NOT NULL DEFAULT '{}',
    external_refs   JSONB NOT NULL DEFAULT '{}',  -- {pagerduty_id, jira_id, ...}
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    ttd_seconds     INT,                      -- time to detect
    tta_seconds     INT,                      -- time to acknowledge
    ttr_seconds     INT,                      -- time to resolve
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_tenant ON incidents (tenant_id);
CREATE INDEX idx_incidents_severity ON incidents (severity);
CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_incidents_category ON incidents (tenant_id, category);
CREATE INDEX idx_incidents_alert ON incidents (alert_rule_id) WHERE alert_rule_id IS NOT NULL;
CREATE INDEX idx_incidents_detected ON incidents (detected_at DESC);
CREATE INDEX idx_incidents_assignee ON incidents (assignee_id) WHERE assignee_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- SYSTEM_HEALTH_SNAPSHOTS
-- ---------------------------------------------------------------------------
CREATE TABLE system_health_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
    service_name    TEXT NOT NULL,
    instance_id     TEXT,
    health_status   TEXT NOT NULL DEFAULT 'healthy'
                        CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    cpu_pct         NUMERIC(5,2),
    memory_pct      NUMERIC(5,2),
    disk_pct        NUMERIC(5,2),
    request_rate    NUMERIC(12,2),            -- req/sec
    error_rate      NUMERIC(8,4),             -- errors/sec
    latency_p50_ms  NUMERIC(10,2),
    latency_p95_ms  NUMERIC(10,2),
    latency_p99_ms  NUMERIC(10,2),
    active_connections INT,
    queue_depth     INT,
    custom_metrics  JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TimescaleDB-friendly indexing (works with or without hypertable)
CREATE INDEX idx_health_snapshots_service ON system_health_snapshots (service_name, snapshot_time DESC);
CREATE INDEX idx_health_snapshots_tenant ON system_health_snapshots (tenant_id, snapshot_time DESC);
CREATE INDEX idx_health_snapshots_status ON system_health_snapshots (health_status)
    WHERE health_status != 'healthy';

-- ---------------------------------------------------------------------------
-- GUARDRAIL_SCORES
-- ---------------------------------------------------------------------------
CREATE TABLE guardrail_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL
                        CHECK (entity_type IN ('generation', 'track', 'prompt',
                                                'output', 'workflow_run')),
    entity_id       UUID NOT NULL,
    guardrail_type  TEXT NOT NULL
                        CHECK (guardrail_type IN ('content_safety', 'copyright',
                                                   'bias', 'quality', 'toxicity',
                                                   'pii', 'hallucination',
                                                   'cost_limit', 'rate_limit')),
    score           NUMERIC(5,3) NOT NULL
                        CHECK (score BETWEEN 0 AND 1),
    threshold       NUMERIC(5,3) NOT NULL,
    passed          BOOLEAN NOT NULL,
    details         JSONB NOT NULL DEFAULT '{}',
    model_used      TEXT,
    evaluation_time_ms INT,
    action_taken    TEXT
                        CHECK (action_taken IN ('allowed', 'flagged', 'blocked',
                                                 'modified', 'escalated', NULL)),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guardrail_scores_tenant ON guardrail_scores (tenant_id);
CREATE INDEX idx_guardrail_scores_entity ON guardrail_scores (entity_type, entity_id);
CREATE INDEX idx_guardrail_scores_type ON guardrail_scores (guardrail_type);
CREATE INDEX idx_guardrail_scores_failed ON guardrail_scores (tenant_id, guardrail_type)
    WHERE passed = FALSE;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrail_scores ENABLE ROW LEVEL SECURITY;

COMMIT;
