-- 002_music_core.sql
-- Tracks, artists, albums, genres, languages
-- Core music-domain tables for the ecosystem.

BEGIN;

-- ---------------------------------------------------------------------------
-- GENRES
-- ---------------------------------------------------------------------------
CREATE TABLE genres (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    parent_id       UUID REFERENCES genres(id) ON DELETE SET NULL,
    description     TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_genres_tenant ON genres (tenant_id);
CREATE INDEX idx_genres_parent ON genres (parent_id) WHERE parent_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- LANGUAGES
-- ---------------------------------------------------------------------------
CREATE TABLE languages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT NOT NULL UNIQUE,    -- ISO 639-1 / 639-3
    name            TEXT NOT NULL,
    native_name     TEXT,
    script          TEXT,                    -- e.g. 'Latn', 'Deva'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_languages_code ON languages (code);

-- ---------------------------------------------------------------------------
-- ARTISTS
-- ---------------------------------------------------------------------------
CREATE TABLE artists (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    sort_name       TEXT,                    -- "Lastname, Firstname" for sorting
    artist_type     TEXT NOT NULL DEFAULT 'person'
                        CHECK (artist_type IN ('person', 'group', 'orchestra', 'choir', 'character', 'other')),
    bio             TEXT,
    country         TEXT,                    -- ISO 3166-1 alpha-2
    isni            TEXT,                    -- International Standard Name Identifier
    ipi             TEXT,                    -- Interested Parties Information
    spotify_id      TEXT,
    apple_music_id  TEXT,
    image_url       TEXT,
    social_links    JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'archived')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_artists_tenant ON artists (tenant_id);
CREATE INDEX idx_artists_name ON artists (tenant_id, name);
CREATE INDEX idx_artists_status ON artists (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_artists_isni ON artists (isni) WHERE isni IS NOT NULL;
CREATE INDEX idx_artists_ipi ON artists (ipi) WHERE ipi IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ALBUMS
-- ---------------------------------------------------------------------------
CREATE TABLE albums (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    album_type      TEXT NOT NULL DEFAULT 'album'
                        CHECK (album_type IN ('album', 'single', 'ep', 'compilation', 'soundtrack', 'live', 'remix')),
    release_date    DATE,
    upc             TEXT,                    -- Universal Product Code
    catalog_number  TEXT,
    label           TEXT,
    cover_art_url   TEXT,
    total_tracks    INT,
    total_discs     INT DEFAULT 1,
    primary_genre_id UUID REFERENCES genres(id) ON DELETE SET NULL,
    primary_language_id UUID REFERENCES languages(id) ON DELETE SET NULL,
    description     TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'review', 'approved', 'released', 'archived')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_albums_tenant ON albums (tenant_id);
CREATE INDEX idx_albums_title ON albums (tenant_id, title);
CREATE INDEX idx_albums_release ON albums (tenant_id, release_date);
CREATE INDEX idx_albums_upc ON albums (upc) WHERE upc IS NOT NULL;
CREATE INDEX idx_albums_status ON albums (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_albums_genre ON albums (primary_genre_id) WHERE primary_genre_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ALBUM_ARTISTS (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE album_artists (
    album_id        UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'primary'
                        CHECK (role IN ('primary', 'featured', 'producer', 'remixer')),
    sort_order      INT NOT NULL DEFAULT 0,

    PRIMARY KEY (album_id, artist_id, role)
);

CREATE INDEX idx_album_artists_artist ON album_artists (artist_id);

-- ---------------------------------------------------------------------------
-- TRACKS
-- ---------------------------------------------------------------------------
CREATE TABLE tracks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    duration_ms     INT,                     -- duration in milliseconds
    isrc            TEXT,                     -- International Standard Recording Code
    iswc            TEXT,                     -- International Standard Musical Work Code
    bpm             NUMERIC(6,2),
    key_signature   TEXT,                     -- e.g. 'C#m', 'Ab'
    time_signature  TEXT DEFAULT '4/4',
    loudness_lufs   NUMERIC(6,2),
    explicit        BOOLEAN NOT NULL DEFAULT FALSE,
    lyrics          TEXT,
    lyrics_language_id UUID REFERENCES languages(id) ON DELETE SET NULL,
    album_id        UUID REFERENCES albums(id) ON DELETE SET NULL,
    disc_number     INT DEFAULT 1,
    track_number    INT,
    primary_genre_id UUID REFERENCES genres(id) ON DELETE SET NULL,
    audio_file_url  TEXT,
    waveform_url    TEXT,
    preview_url     TEXT,
    audio_format    TEXT,                     -- 'wav', 'flac', 'mp3', 'aac'
    sample_rate     INT,                      -- e.g. 44100, 48000, 96000
    bit_depth       INT,                      -- e.g. 16, 24, 32
    channels        INT DEFAULT 2,
    file_size_bytes BIGINT,
    fingerprint     TEXT,                     -- acoustic fingerprint (Chromaprint, etc.)
    ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
    generation_id   UUID,                     -- FK to ai_generations if AI-created
    source          TEXT NOT NULL DEFAULT 'upload'
                        CHECK (source IN ('upload', 'recording', 'ai_generated', 'import', 'sync')),
    metadata        JSONB NOT NULL DEFAULT '{}',
    tags            TEXT[] NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'processing', 'review', 'approved', 'released', 'archived', 'rejected')),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tracks_tenant ON tracks (tenant_id);
CREATE INDEX idx_tracks_title ON tracks (tenant_id, title);
CREATE INDEX idx_tracks_album ON tracks (album_id) WHERE album_id IS NOT NULL;
CREATE INDEX idx_tracks_isrc ON tracks (isrc) WHERE isrc IS NOT NULL;
CREATE INDEX idx_tracks_iswc ON tracks (iswc) WHERE iswc IS NOT NULL;
CREATE INDEX idx_tracks_genre ON tracks (primary_genre_id) WHERE primary_genre_id IS NOT NULL;
CREATE INDEX idx_tracks_status ON tracks (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tracks_ai ON tracks (tenant_id, ai_generated) WHERE ai_generated = TRUE;
CREATE INDEX idx_tracks_source ON tracks (tenant_id, source);
CREATE INDEX idx_tracks_bpm ON tracks (tenant_id, bpm) WHERE bpm IS NOT NULL;
CREATE INDEX idx_tracks_tags ON tracks USING GIN (tags);
CREATE INDEX idx_tracks_created_by ON tracks (created_by) WHERE created_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- TRACK_ARTISTS (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE track_artists (
    track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'primary'
                        CHECK (role IN ('primary', 'featured', 'writer', 'producer',
                                        'composer', 'lyricist', 'arranger', 'mixer',
                                        'mastering_engineer', 'performer', 'remixer')),
    sort_order      INT NOT NULL DEFAULT 0,
    contribution    TEXT,                     -- free-text description of contribution

    PRIMARY KEY (track_id, artist_id, role)
);

CREATE INDEX idx_track_artists_artist ON track_artists (artist_id);

-- ---------------------------------------------------------------------------
-- TRACK_GENRES (many-to-many, secondary genres)
-- ---------------------------------------------------------------------------
CREATE TABLE track_genres (
    track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    genre_id        UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    confidence      NUMERIC(4,3) DEFAULT 1.0,  -- AI-assigned confidence
    source          TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'ai', 'import')),

    PRIMARY KEY (track_id, genre_id)
);

CREATE INDEX idx_track_genres_genre ON track_genres (genre_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON genres
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON artists
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON albums
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tracks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_genres ENABLE ROW LEVEL SECURITY;

COMMIT;
