-- 005_workflows.sql
-- Workflows, workflow nodes, edges, runs, and run nodes
-- DAG-based workflow engine for orchestrating music & AI pipelines.

BEGIN;

-- ---------------------------------------------------------------------------
-- WORKFLOWS
-- ---------------------------------------------------------------------------
CREATE TABLE workflows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    description     TEXT,
    category        TEXT NOT NULL DEFAULT 'general'
                        CHECK (category IN ('general', 'ingestion', 'mastering',
                                            'distribution', 'ai_pipeline', 'approval',
                                            'royalty', 'analytics', 'compliance')),
    version         INT NOT NULL DEFAULT 1,
    is_template     BOOLEAN NOT NULL DEFAULT FALSE,
    forked_from_id  UUID REFERENCES workflows(id) ON DELETE SET NULL,
    trigger_type    TEXT NOT NULL DEFAULT 'manual'
                        CHECK (trigger_type IN ('manual', 'schedule', 'event', 'webhook', 'api')),
    trigger_config  JSONB NOT NULL DEFAULT '{}',
    config          JSONB NOT NULL DEFAULT '{}',
    timeout_ms      INT DEFAULT 3600000,     -- 1 hour default
    max_retries     INT DEFAULT 3,
    retry_delay_ms  INT DEFAULT 5000,
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'paused', 'archived', 'deprecated')),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE (tenant_id, slug, version)
);

CREATE INDEX idx_workflows_tenant ON workflows (tenant_id);
CREATE INDEX idx_workflows_category ON workflows (tenant_id, category);
CREATE INDEX idx_workflows_status ON workflows (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflows_template ON workflows (tenant_id, is_template) WHERE is_template = TRUE;

-- ---------------------------------------------------------------------------
-- WORKFLOW_NODES
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_nodes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    node_type       TEXT NOT NULL
                        CHECK (node_type IN ('start', 'end', 'task', 'decision',
                                              'parallel_split', 'parallel_join',
                                              'wait', 'webhook', 'ai_task',
                                              'human_review', 'notification', 'sub_workflow')),
    handler         TEXT NOT NULL,            -- module/function identifier
    config          JSONB NOT NULL DEFAULT '{}',
    input_schema    JSONB NOT NULL DEFAULT '{}',
    output_schema   JSONB NOT NULL DEFAULT '{}',
    timeout_ms      INT,
    retry_policy    JSONB NOT NULL DEFAULT '{}',
    position_x      NUMERIC(10,2) DEFAULT 0,  -- for UI canvas rendering
    position_y      NUMERIC(10,2) DEFAULT 0,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes (workflow_id);
CREATE INDEX idx_workflow_nodes_tenant ON workflow_nodes (tenant_id);
CREATE INDEX idx_workflow_nodes_type ON workflow_nodes (node_type);

-- ---------------------------------------------------------------------------
-- WORKFLOW_EDGES
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_edges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_node_id  UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    target_node_id  UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    condition       JSONB NOT NULL DEFAULT '{}',  -- condition expression for decision edges
    priority        INT NOT NULL DEFAULT 0,
    label           TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (workflow_id, source_node_id, target_node_id)
);

CREATE INDEX idx_workflow_edges_workflow ON workflow_edges (workflow_id);
CREATE INDEX idx_workflow_edges_source ON workflow_edges (source_node_id);
CREATE INDEX idx_workflow_edges_target ON workflow_edges (target_node_id);

-- ---------------------------------------------------------------------------
-- WORKFLOW_RUNS
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_number      SERIAL,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'paused', 'completed',
                                          'failed', 'cancelled', 'timed_out')),
    trigger_type    TEXT NOT NULL DEFAULT 'manual',
    trigger_data    JSONB NOT NULL DEFAULT '{}',
    input           JSONB NOT NULL DEFAULT '{}',
    output          JSONB NOT NULL DEFAULT '{}',
    error           JSONB,
    context         JSONB NOT NULL DEFAULT '{}',  -- runtime context/variables
    current_node_ids UUID[] NOT NULL DEFAULT '{}',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,
    retry_count     INT NOT NULL DEFAULT 0,
    parent_run_id   UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
    initiated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_runs_workflow ON workflow_runs (workflow_id);
CREATE INDEX idx_workflow_runs_tenant ON workflow_runs (tenant_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs (tenant_id, status);
CREATE INDEX idx_workflow_runs_created ON workflow_runs (created_at DESC);
CREATE INDEX idx_workflow_runs_parent ON workflow_runs (parent_run_id) WHERE parent_run_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- WORKFLOW_RUN_NODES
-- ---------------------------------------------------------------------------
CREATE TABLE workflow_run_nodes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id          UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    node_id         UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'completed', 'failed',
                                          'skipped', 'cancelled', 'waiting')),
    input           JSONB NOT NULL DEFAULT '{}',
    output          JSONB NOT NULL DEFAULT '{}',
    error           JSONB,
    attempt         INT NOT NULL DEFAULT 1,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,
    logs            JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_run_nodes_run ON workflow_run_nodes (run_id);
CREATE INDEX idx_run_nodes_node ON workflow_run_nodes (node_id);
CREATE INDEX idx_run_nodes_tenant ON workflow_run_nodes (tenant_id);
CREATE INDEX idx_run_nodes_status ON workflow_run_nodes (run_id, status);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_nodes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_runs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_run_nodes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_run_nodes ENABLE ROW LEVEL SECURITY;

COMMIT;
