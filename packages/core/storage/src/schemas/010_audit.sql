-- 010_audit.sql
-- Audit logs, governance records, and compliance checks
-- Full audit trail and regulatory compliance layer.

BEGIN;

-- ---------------------------------------------------------------------------
-- AUDIT_LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_type      TEXT NOT NULL
                        CHECK (actor_type IN ('user', 'system', 'api_key',
                                               'service', 'webhook', 'scheduler')),
    actor_id        TEXT NOT NULL,
    actor_ip        INET,
    actor_user_agent TEXT,
    action          TEXT NOT NULL,            -- 'create', 'update', 'delete', 'read', 'export', 'login', ...
    resource_type   TEXT NOT NULL,            -- 'track', 'workflow', 'user', ...
    resource_id     UUID,
    resource_name   TEXT,
    changes         JSONB NOT NULL DEFAULT '{}',  -- {field: {old, new}}
    request_id      TEXT,                     -- correlation ID
    session_id      UUID,
    status          TEXT NOT NULL DEFAULT 'success'
                        CHECK (status IN ('success', 'failure', 'denied', 'error')),
    error_message   TEXT,
    duration_ms     INT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optimized for time-series queries and compliance audits
CREATE INDEX idx_audit_logs_tenant_time ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_type, actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_status ON audit_logs (status) WHERE status != 'success';
CREATE INDEX idx_audit_logs_request ON audit_logs (request_id) WHERE request_id IS NOT NULL;

-- Consider partitioning by month for high-volume deployments:
-- CREATE TABLE audit_logs (...) PARTITION BY RANGE (created_at);

-- ---------------------------------------------------------------------------
-- GOVERNANCE_RECORDS
-- ---------------------------------------------------------------------------
CREATE TABLE governance_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    record_type     TEXT NOT NULL
                        CHECK (record_type IN ('data_processing', 'consent',
                                                'retention', 'deletion_request',
                                                'access_request', 'portability_request',
                                                'breach_notification', 'impact_assessment',
                                                'policy_update', 'training_record')),
    subject_type    TEXT NOT NULL
                        CHECK (subject_type IN ('user', 'artist', 'listener', 'partner')),
    subject_id      UUID NOT NULL,
    regulation      TEXT NOT NULL
                        CHECK (regulation IN ('gdpr', 'ccpa', 'lgpd', 'pipeda',
                                               'uk_gdpr', 'appi', 'pdpa', 'custom')),
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_progress', 'completed',
                                          'rejected', 'expired')),
    description     TEXT,
    legal_basis     TEXT,
    data_categories TEXT[] NOT NULL DEFAULT '{}',
    processing_purposes TEXT[] NOT NULL DEFAULT '{}',
    retention_period_days INT,
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    evidence        JSONB NOT NULL DEFAULT '{}',
    handler_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_governance_records_tenant ON governance_records (tenant_id);
CREATE INDEX idx_governance_records_type ON governance_records (tenant_id, record_type);
CREATE INDEX idx_governance_records_subject ON governance_records (subject_type, subject_id);
CREATE INDEX idx_governance_records_regulation ON governance_records (regulation);
CREATE INDEX idx_governance_records_status ON governance_records (tenant_id, status);
CREATE INDEX idx_governance_records_due ON governance_records (due_date)
    WHERE status IN ('pending', 'in_progress');

-- ---------------------------------------------------------------------------
-- COMPLIANCE_CHECKS
-- ---------------------------------------------------------------------------
CREATE TABLE compliance_checks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    check_type      TEXT NOT NULL
                        CHECK (check_type IN ('copyright', 'content_id', 'rights_clearance',
                                               'metadata_completeness', 'format_compliance',
                                               'territory_compliance', 'age_rating',
                                               'explicit_content', 'ai_disclosure',
                                               'data_residency', 'accessibility',
                                               'royalty_accuracy')),
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'passed', 'failed',
                                          'warning', 'skipped', 'error')),
    severity        TEXT NOT NULL DEFAULT 'medium'
                        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    checker_type    TEXT NOT NULL DEFAULT 'automated'
                        CHECK (checker_type IN ('automated', 'manual', 'third_party')),
    checker_id      TEXT,                     -- model or user identifier
    score           NUMERIC(5,3),             -- 0..1
    findings        JSONB NOT NULL DEFAULT '[]',  -- [{type, message, severity, location}]
    remediation     TEXT,
    auto_remediated BOOLEAN NOT NULL DEFAULT FALSE,
    run_duration_ms INT,
    last_run_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    next_run_at     TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_checks_tenant ON compliance_checks (tenant_id);
CREATE INDEX idx_compliance_checks_type ON compliance_checks (tenant_id, check_type);
CREATE INDEX idx_compliance_checks_entity ON compliance_checks (entity_type, entity_id);
CREATE INDEX idx_compliance_checks_status ON compliance_checks (tenant_id, status);
CREATE INDEX idx_compliance_checks_failed ON compliance_checks (tenant_id, check_type)
    WHERE status = 'failed';
CREATE INDEX idx_compliance_checks_severity ON compliance_checks (severity)
    WHERE status = 'failed';

-- ---------------------------------------------------------------------------
-- DATA_RETENTION_POLICIES
-- ---------------------------------------------------------------------------
CREATE TABLE data_retention_policies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_name      TEXT NOT NULL,
    retention_days  INT NOT NULL,
    archive_strategy TEXT NOT NULL DEFAULT 'delete'
                        CHECK (archive_strategy IN ('delete', 'archive', 'anonymize')),
    archive_location TEXT,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    last_executed   TIMESTAMPTZ,
    next_execution  TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, table_name)
);

CREATE INDEX idx_retention_policies_tenant ON data_retention_policies (tenant_id);
CREATE INDEX idx_retention_policies_next ON data_retention_policies (next_execution)
    WHERE enabled = TRUE;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON governance_records
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON compliance_checks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

COMMIT;
