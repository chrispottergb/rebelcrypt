-- 004_rights.sql
-- Rights bundles, contracts, royalty splits, and territory rights
-- Full rights-management layer for music IP.

BEGIN;

-- ---------------------------------------------------------------------------
-- CONTRACTS
-- ---------------------------------------------------------------------------
CREATE TABLE contracts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_type   TEXT NOT NULL
                        CHECK (contract_type IN ('recording', 'publishing', 'sync',
                                                  'distribution', 'management', 'license',
                                                  'work_for_hire', 'collaboration')),
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending_review', 'active', 'expired',
                                          'terminated', 'disputed')),
    effective_date  DATE,
    expiration_date DATE,
    auto_renew      BOOLEAN NOT NULL DEFAULT FALSE,
    renewal_terms   JSONB NOT NULL DEFAULT '{}',
    parties         JSONB NOT NULL DEFAULT '[]',  -- [{party_id, party_type, role}]
    terms           JSONB NOT NULL DEFAULT '{}',
    document_urls   TEXT[] NOT NULL DEFAULT '{}',
    governing_law   TEXT,                    -- jurisdiction, e.g. 'US-CA', 'UK'
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_contracts_tenant ON contracts (tenant_id);
CREATE INDEX idx_contracts_type ON contracts (tenant_id, contract_type);
CREATE INDEX idx_contracts_status ON contracts (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_effective ON contracts (effective_date, expiration_date);
CREATE INDEX idx_contracts_parties ON contracts USING GIN (parties);

-- ---------------------------------------------------------------------------
-- RIGHTS_BUNDLES
-- ---------------------------------------------------------------------------
CREATE TABLE rights_bundles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL
                        CHECK (entity_type IN ('track', 'album', 'composition')),
    entity_id       UUID NOT NULL,
    contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
    rights_type     TEXT NOT NULL
                        CHECK (rights_type IN ('master', 'publishing', 'mechanical',
                                                'performance', 'sync', 'print',
                                                'neighboring', 'digital')),
    holder_type     TEXT NOT NULL
                        CHECK (holder_type IN ('artist', 'label', 'publisher',
                                                'distributor', 'other')),
    holder_id       UUID NOT NULL,            -- polymorphic: artist, tenant, etc.
    holder_name     TEXT NOT NULL,
    share_pct       NUMERIC(7,4) NOT NULL
                        CHECK (share_pct BETWEEN 0 AND 100),
    territories     TEXT[] NOT NULL DEFAULT '{"WW"}',  -- 'WW' = worldwide
    start_date      DATE,
    end_date        DATE,
    exclusive        BOOLEAN NOT NULL DEFAULT FALSE,
    sub_licensable   BOOLEAN NOT NULL DEFAULT FALSE,
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'pending', 'expired', 'revoked', 'disputed')),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rights_bundles_tenant ON rights_bundles (tenant_id);
CREATE INDEX idx_rights_bundles_entity ON rights_bundles (entity_type, entity_id);
CREATE INDEX idx_rights_bundles_holder ON rights_bundles (holder_type, holder_id);
CREATE INDEX idx_rights_bundles_contract ON rights_bundles (contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_rights_bundles_type ON rights_bundles (rights_type);
CREATE INDEX idx_rights_bundles_status ON rights_bundles (tenant_id, status);
CREATE INDEX idx_rights_bundles_territories ON rights_bundles USING GIN (territories);

-- ---------------------------------------------------------------------------
-- ROYALTY_SPLITS
-- ---------------------------------------------------------------------------
CREATE TABLE royalty_splits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rights_bundle_id UUID NOT NULL REFERENCES rights_bundles(id) ON DELETE CASCADE,
    recipient_type  TEXT NOT NULL
                        CHECK (recipient_type IN ('artist', 'writer', 'producer',
                                                   'label', 'publisher', 'other')),
    recipient_id    UUID NOT NULL,
    recipient_name  TEXT NOT NULL,
    split_pct       NUMERIC(7,4) NOT NULL
                        CHECK (split_pct BETWEEN 0 AND 100),
    payment_method  TEXT DEFAULT 'default'
                        CHECK (payment_method IN ('default', 'wire', 'paypal',
                                                   'crypto', 'check', 'held')),
    payment_details JSONB NOT NULL DEFAULT '{}',
    min_payout      NUMERIC(12,2) DEFAULT 0,
    currency        TEXT NOT NULL DEFAULT 'USD',
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'closed')),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_royalty_splits_tenant ON royalty_splits (tenant_id);
CREATE INDEX idx_royalty_splits_bundle ON royalty_splits (rights_bundle_id);
CREATE INDEX idx_royalty_splits_recipient ON royalty_splits (recipient_type, recipient_id);

-- Enforce: splits per bundle should not exceed 100%
-- (advisory; enforced at application layer with CHECK constraint on inserts)

-- ---------------------------------------------------------------------------
-- TERRITORY_RIGHTS
-- ---------------------------------------------------------------------------
CREATE TABLE territory_rights (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rights_bundle_id UUID NOT NULL REFERENCES rights_bundles(id) ON DELETE CASCADE,
    territory_code  TEXT NOT NULL,            -- ISO 3166-1 alpha-2 or 'WW'
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'blocked', 'pending', 'expired')),
    restrictions    JSONB NOT NULL DEFAULT '{}',
    start_date      DATE,
    end_date        DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (rights_bundle_id, territory_code)
);

CREATE INDEX idx_territory_rights_tenant ON territory_rights (tenant_id);
CREATE INDEX idx_territory_rights_bundle ON territory_rights (rights_bundle_id);
CREATE INDEX idx_territory_rights_territory ON territory_rights (territory_code);
CREATE INDEX idx_territory_rights_status ON territory_rights (status);

-- ---------------------------------------------------------------------------
-- ROYALTY_STATEMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE royalty_statements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_id    UUID NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'USD',
    gross_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    deductions      NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'finalized', 'paid', 'disputed')),
    line_items      JSONB NOT NULL DEFAULT '[]',
    payment_ref     TEXT,
    paid_at         TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_royalty_stmts_tenant ON royalty_statements (tenant_id);
CREATE INDEX idx_royalty_stmts_recipient ON royalty_statements (recipient_id);
CREATE INDEX idx_royalty_stmts_period ON royalty_statements (period_start, period_end);
CREATE INDEX idx_royalty_stmts_status ON royalty_statements (tenant_id, status);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON rights_bundles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON royalty_splits
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON territory_rights
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON royalty_statements
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rights_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_statements ENABLE ROW LEVEL SECURITY;

COMMIT;
