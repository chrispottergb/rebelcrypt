-- 006_ai.sql
-- AI generations, evaluations, embeddings metadata, and prompt templates
-- Manages the full AI/ML lifecycle within the music ecosystem.

BEGIN;

-- ---------------------------------------------------------------------------
-- Enable pgvector
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- PROMPT_TEMPLATES
-- ---------------------------------------------------------------------------
CREATE TABLE prompt_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'general'
                        CHECK (category IN ('general', 'generation', 'analysis',
                                            'classification', 'transformation',
                                            'evaluation', 'enrichment', 'mastering')),
    model_provider  TEXT NOT NULL DEFAULT 'openai'
                        CHECK (model_provider IN ('openai', 'anthropic', 'google',
                                                   'huggingface', 'replicate', 'custom')),
    model_id        TEXT NOT NULL,           -- e.g. 'gpt-4o', 'musicgen-large'
    system_prompt   TEXT,
    user_prompt_template TEXT NOT NULL,       -- with {{variable}} placeholders
    variables       JSONB NOT NULL DEFAULT '[]',  -- [{name, type, required, default}]
    output_schema   JSONB NOT NULL DEFAULT '{}',
    temperature     NUMERIC(3,2) DEFAULT 0.7,
    max_tokens      INT,
    top_p           NUMERIC(3,2),
    stop_sequences  TEXT[] NOT NULL DEFAULT '{}',
    version         INT NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, slug, version)
);

CREATE INDEX idx_prompt_templates_tenant ON prompt_templates (tenant_id);
CREATE INDEX idx_prompt_templates_category ON prompt_templates (tenant_id, category);
CREATE INDEX idx_prompt_templates_active ON prompt_templates (tenant_id, is_active) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- AI_GENERATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE ai_generations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    generation_type TEXT NOT NULL
                        CHECK (generation_type IN ('music', 'lyrics', 'vocals',
                                                    'stems', 'master', 'mix',
                                                    'cover_art', 'metadata',
                                                    'arrangement', 'analysis')),
    model_provider  TEXT NOT NULL,
    model_id        TEXT NOT NULL,
    model_version   TEXT,
    prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
    prompt          TEXT NOT NULL,
    system_prompt   TEXT,
    parameters      JSONB NOT NULL DEFAULT '{}',  -- model-specific params
    input_data      JSONB NOT NULL DEFAULT '{}',  -- input references/config
    input_track_ids UUID[] NOT NULL DEFAULT '{}',
    output_type     TEXT NOT NULL DEFAULT 'audio'
                        CHECK (output_type IN ('audio', 'midi', 'text', 'image',
                                                'structured', 'embedding', 'mixed')),
    output_data     JSONB NOT NULL DEFAULT '{}',
    output_url      TEXT,
    output_track_id UUID,                     -- resulting track, if any
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'queued', 'processing',
                                          'completed', 'failed', 'cancelled')),
    error           JSONB,
    quality_score   NUMERIC(5,3),             -- AI self-assessment 0..1
    human_rating    NUMERIC(3,1),             -- human 1..5
    duration_ms     INT,
    cost_usd        NUMERIC(10,6),            -- API cost
    tokens_input    INT,
    tokens_output   INT,
    seed            BIGINT,                   -- for reproducibility
    guardrail_results JSONB NOT NULL DEFAULT '{}',
    workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_generations_tenant ON ai_generations (tenant_id);
CREATE INDEX idx_ai_generations_type ON ai_generations (tenant_id, generation_type);
CREATE INDEX idx_ai_generations_model ON ai_generations (model_provider, model_id);
CREATE INDEX idx_ai_generations_status ON ai_generations (tenant_id, status);
CREATE INDEX idx_ai_generations_template ON ai_generations (prompt_template_id) WHERE prompt_template_id IS NOT NULL;
CREATE INDEX idx_ai_generations_output_track ON ai_generations (output_track_id) WHERE output_track_id IS NOT NULL;
CREATE INDEX idx_ai_generations_workflow ON ai_generations (workflow_run_id) WHERE workflow_run_id IS NOT NULL;
CREATE INDEX idx_ai_generations_created ON ai_generations (created_at DESC);
CREATE INDEX idx_ai_generations_cost ON ai_generations (tenant_id, cost_usd) WHERE cost_usd IS NOT NULL;

-- ---------------------------------------------------------------------------
-- AI_EVALUATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE ai_evaluations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    generation_id   UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
    evaluator_type  TEXT NOT NULL
                        CHECK (evaluator_type IN ('automated', 'human', 'ab_test',
                                                   'model_judge', 'crowd')),
    evaluator_id    TEXT,                     -- user_id or model identifier
    dimension       TEXT NOT NULL
                        CHECK (dimension IN ('quality', 'relevance', 'creativity',
                                              'accuracy', 'safety', 'musicality',
                                              'originality', 'production_quality',
                                              'mix_balance', 'arrangement')),
    score           NUMERIC(5,3) NOT NULL
                        CHECK (score BETWEEN 0 AND 1),
    rating          INT CHECK (rating BETWEEN 1 AND 5),
    feedback        TEXT,
    rubric          JSONB NOT NULL DEFAULT '{}',
    comparison_id   UUID REFERENCES ai_generations(id) ON DELETE SET NULL,  -- for A/B
    preference      TEXT CHECK (preference IN ('a', 'b', 'tie', NULL)),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_evaluations_tenant ON ai_evaluations (tenant_id);
CREATE INDEX idx_ai_evaluations_generation ON ai_evaluations (generation_id);
CREATE INDEX idx_ai_evaluations_dimension ON ai_evaluations (dimension);
CREATE INDEX idx_ai_evaluations_evaluator ON ai_evaluations (evaluator_type);

-- ---------------------------------------------------------------------------
-- EMBEDDINGS_METADATA
-- ---------------------------------------------------------------------------
CREATE TABLE embeddings_metadata (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL
                        CHECK (entity_type IN ('track', 'artist', 'album', 'lyrics',
                                                'audio_segment', 'prompt', 'user_preference')),
    entity_id       UUID NOT NULL,
    embedding_model TEXT NOT NULL,            -- e.g. 'openai-text-3-large', 'clap-laion'
    embedding_dim   INT NOT NULL,             -- e.g. 1536, 768, 512
    embedding       vector,                   -- pgvector column (dimension set per-row)
    content_hash    TEXT NOT NULL,            -- SHA-256 of source content
    segment_index   INT DEFAULT 0,           -- for chunked content
    segment_text    TEXT,                     -- source text chunk if applicable
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, entity_type, entity_id, embedding_model, segment_index)
);

CREATE INDEX idx_embeddings_tenant ON embeddings_metadata (tenant_id);
CREATE INDEX idx_embeddings_entity ON embeddings_metadata (entity_type, entity_id);
CREATE INDEX idx_embeddings_model ON embeddings_metadata (embedding_model);
-- HNSW index for similarity search (created after data load for best performance)
-- CREATE INDEX idx_embeddings_vector ON embeddings_metadata
--     USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON prompt_templates
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_generations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON embeddings_metadata
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings_metadata ENABLE ROW LEVEL SECURITY;

COMMIT;
