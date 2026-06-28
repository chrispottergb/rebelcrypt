# Global Music AI Ecosystem

A 60-layer, enterprise-grade AI platform for the global music industry. Built with TypeScript, this monorepo contains 600+ modules, 2,800+ workflows, 7,000+ nodes, 14 backend services, and 5 frontend applications with full CI/CD and Kubernetes deployment.

## Architecture Overview

### Core Platform (Layer 1-15)
- **Workflow Engine**: DAG-based execution with parallel group support, 50+ node types
- **Multi-Tenant Database**: PostgreSQL + pgvector for embeddings, comprehensive RLS
- **Security Layer**: JWT authentication, RBAC (6 roles), AES-256-GCM encryption, API keys
- **Node Registry**: 10 categories of execution nodes (core, data, transform, AI, music, rights, analytics, SRE, notification, system)

### Music Intelligence (Layer 16-30)
- **Genre Taxonomy**: 40+ root genres, 200+ subgenres, regional mappings
- **Language Registry**: 100+ languages with music traditions
- **Rights Engine**: Territory management (50+ territories), royalty calculations, contract management
- **Catalog System**: Ingestion pipeline, metadata normalization, deduplication, fingerprinting
- **Music Generation**: AI-powered music creation with genre/mood/BPM control
- **Recommendation Engine**: Content-based, collaborative, hybrid strategies
- **Mood Analysis**: 12 mood categories with energy/valence profiling
- **Artist Analytics**: Profile tracking, metrics, demographics, similarity

### AI/ML Layer (Layer 31-45)
- **LLM Client**: Multi-provider abstraction (OpenAI, Anthropic, Google, Cohere, local)
- **Embeddings**: Vector generation and similarity search (cosine, euclidean, dot product)
- **Quality Evaluation**: 5-dimension scoring (production, musicality, originality, genre adherence, brand safety)
- **Guardrails**: Content safety checks (explicit, hate speech, violence, copyright, etc.)
- **Prompt Management**: Template system with variable substitution

### Analytics & Experimentation (Layer 46-55)
- **ETL Pipeline**: Multi-source data integration with transform steps
- **Forecasting**: Time series prediction (linear, exponential, ARIMA, Prophet, neural)
- **A/B Testing**: Experiment management, variant assignment, statistical analysis
- **KPI Engine**: 10+ default KPIs with threshold monitoring
- **User Segmentation**: Criteria-based user grouping and overlap analysis

### Enterprise Features (Layer 56-60)
- **Observability**: Logs, metrics, distributed tracing with OpenTelemetry
- **Governance**: Compliance rules (GDPR, CCPA, content moderation, copyright), audit trails
- **Connectors**: 20+ platform integrations (Spotify, Apple Music, YouTube, TikTok, Stripe, etc.)
- **Notifications**: Multi-channel delivery (email, Slack, webhook, SMS, push)
- **Go-To-Market**: Market segmentation, pricing tiers, TAM/SAM/SOM calculations, revenue projections

## Repository Structure

```
rebelcrypt/
├── packages/
│   ├── core/
│   │   ├── engine/           # Workflow execution engine
│   │   ├── storage/          # Database layer + repositories
│   │   └── security/         # Auth, RBAC, encryption
│   ├── music/
│   │   ├── genre-registry/   # Genre taxonomy (40+ genres, 200+ subgenres)
│   │   ├── language-registry/# Language registry (100+ languages)
│   │   ├── rights/           # Rights + royalties engine
│   │   ├── catalog/          # Catalog ingestion + matching
│   │   ├── generator/        # AI music generation
│   │   ├── recommendation/   # Recommendation algorithms
│   │   ├── mood/             # Mood analysis
│   │   ├── metadata/         # Metadata enrichment
│   │   └── artist/           # Artist analytics
│   ├── ai/
│   │   ├── llm-client/       # Multi-provider LLM client
│   │   ├── evaluation/       # Quality scoring + guardrails
│   │   ├── embedding/        # Vector embeddings
│   │   ├── guardrails/       # Content safety
│   │   └── prompts/          # Prompt templates
│   ├── analytics/
│   │   ├── etl/              # ETL pipelines
│   │   ├── forecasting/      # Time series forecasting
│   │   ├── experimentation/  # A/B testing
│   │   ├── kpi/              # KPI tracking
│   │   └── segmentation/     # User segmentation
│   ├── enterprise/
│   │   ├── observability/    # Logs, metrics, traces
│   │   ├── governance/       # Compliance + audit
│   │   ├── connectors/       # Platform integrations
│   │   ├── notifications/    # Multi-channel notifications
│   │   └── gtm/              # Go-to-market engine
│   ├── api/                  # REST API gateway (94 routes)
│   └── ui/
│       ├── workflow-studio/  # Visual workflow builder
│       ├── industry-console/ # Catalog + rights management
│       ├── ops-dashboard/    # Operations + monitoring
│       ├── exec-portal/      # Executive analytics
│       └── education-console/# Learning platform
├── k8s/                      # Kubernetes manifests
├── .github/workflows/        # CI/CD pipelines
├── infrastructure/           # Prometheus, Grafana, Terraform
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── turbo.json

```

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.4+
- **Build**: Turborepo for monorepo orchestration
- **Database**: PostgreSQL 16 with pgvector extension
- **Cache**: Redis 7
- **API**: Express.js REST API with 94 endpoints
- **Frontend**: Next.js 14 + React 18 + TailwindCSS
- **Container**: Docker + Docker Compose
- **Orchestration**: Kubernetes with HPA, Ingress, PVC
- **CI/CD**: GitHub Actions (lint, test, build, security, deploy)
- **Monitoring**: Prometheus + Grafana
- **Authentication**: JWT with HMAC-SHA256
- **Encryption**: AES-256-GCM
- **Vector Search**: pgvector with cosine/euclidean/dot product

## Getting Started

### Prerequisites
- Node.js >= 20
- Docker + Docker Compose
- Kubernetes cluster (for production deployment)

### Installation

```bash
# Install dependencies
yarn install
# or
make install

# Build all packages
yarn build
# or
make build

# Run tests
yarn test
# or
make test
```

### Development

```bash
# Start all services with Docker Compose
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down
```

### Local Development (without Docker)

```bash
# Install dependencies
yarn install

# Build packages
yarn build

# Start dev servers
yarn dev
```

## API Routes (94 endpoints)

### Authentication (10 routes)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user
- And 5 more...

### Workflows (10 routes)
- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows` - Create workflow
- `POST /api/v1/workflows/:id/execute` - Execute workflow
- `GET /api/v1/workflows/:id/runs` - Get run history
- And 6 more...

### Music (19 routes)
- `GET /api/v1/tracks` - List tracks
- `POST /api/v1/tracks` - Create track
- `POST /api/v1/tracks/search` - Search tracks
- `GET /api/v1/artists` - List artists
- `GET /api/v1/genres` - List genres
- `POST /api/v1/catalog/ingest` - Ingest catalog
- And 13 more...

### Rights & Royalties (11 routes)
- `GET /api/v1/rights/contracts` - List contracts
- `POST /api/v1/rights/contracts` - Create contract
- `GET /api/v1/rights/territories` - List territories
- `POST /api/v1/royalties/calculate` - Calculate royalties
- And 7 more...

### Analytics (13 routes)
- `GET /api/v1/analytics/kpis` - Get KPIs
- `POST /api/v1/analytics/forecasts/generate` - Generate forecast
- `GET /api/v1/experiments` - List experiments
- `POST /api/v1/experiments/:id/start` - Start experiment
- And 9 more...

### Admin (16 routes)
- `GET /api/v1/admin/tenants` - List tenants
- `POST /api/v1/admin/users` - Create user
- `GET /api/v1/admin/audit-logs` - Audit logs
- `GET /api/v1/health` - Health check
- And 12 more...

### AI (15 routes)
- `POST /api/v1/ai/generate/music` - Generate music
- `POST /api/v1/ai/evaluate` - Evaluate quality
- `POST /api/v1/ai/guardrails/check` - Check content safety
- `POST /api/v1/ai/embeddings/generate` - Generate embeddings
- `POST /api/v1/ai/llm/generate` - LLM generation
- And 10 more...

## Deployment

### Docker Compose (Development)

```bash
make docker-build
make docker-up
```

Services will be available at:
- API: http://localhost:3000
- Workflow Studio: http://localhost:3001
- Industry Console: http://localhost:3002
- Ops Dashboard: http://localhost:3003
- Exec Portal: http://localhost:3004
- Education Console: http://localhost:3005
- Grafana: http://localhost:3006
- Prometheus: http://localhost:9090

### Kubernetes (Production)

```bash
# Deploy to Kubernetes
make k8s-deploy

# Check status
make k8s-status

# Delete deployment
make k8s-delete
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/music_ai
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# API Keys (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
COHERE_API_KEY=...

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_PASSWORD=admin
```

## Security

- **Authentication**: JWT tokens with HMAC-SHA256 signing
- **Authorization**: RBAC with 6 roles (admin, builder, operator, partner, viewer, exec)
- **Encryption**: AES-256-GCM for data at rest
- **API Keys**: SHA-256 hashed with "mai_" prefix
- **Rate Limiting**: 60 requests/minute per user/IP
- **Multi-Tenancy**: Row-level security (RLS) in PostgreSQL
- **Audit Logging**: Comprehensive audit trail for all operations

## RBAC Roles & Permissions

1. **Admin**: Full system access
2. **Builder**: Create/edit workflows, manage catalog
3. **Operator**: Execute workflows, view analytics
4. **Partner**: Limited API access for integrations
5. **Viewer**: Read-only access
6. **Exec**: Executive dashboard + reports

## Music Domain Features

### Genre Coverage (40+ Root Genres)
Rock, Pop, Hip-Hop, R&B, Electronic, Jazz, Blues, Country, Classical, Metal, Punk, Soul, Funk, Disco, Reggae, Folk, Gospel, World Music, Latin, K-Pop, J-Pop, Bollywood, Indian Classical, C-Pop, Arabic, Turkish, Persian, Dancehall, Soca, Calypso, Afrobeat, Highlife, Amapiano, Flamenco, Fado, Celtic, Klezmer, Ska, New Age, Soundtrack, Experimental, Children's, Comedy, Ambient, Gamelan

### Territory Coverage (50+ Territories)
North America (US, CA, MX), Europe (UK, DE, FR, IT, ES, NL, SE, NO, FI, DK, etc.), Asia Pacific (JP, CN, IN, AU, KR, etc.), Latin America, Middle East, Africa

### Language Support (100+ Languages)
Comprehensive coverage of global languages with music tradition metadata

## AI/ML Capabilities

- **Music Generation**: Style transfer, genre blending, mood-based creation
- **Quality Scoring**: Multi-dimensional evaluation (5 metrics)
- **Content Safety**: 8 guardrail categories
- **Embeddings**: 1536-dimension vectors (configurable)
- **Similarity Search**: Cosine, Euclidean, Dot Product
- **LLM Integration**: OpenAI, Anthropic, Google, Cohere, local models
- **Forecasting**: Time series prediction with multiple algorithms
- **A/B Testing**: Statistical significance testing

## Analytics & Insights

- **10+ Pre-built KPIs**: Streams, revenue, users, quality, latency, errors, etc.
- **Time Series Forecasting**: Linear, exponential, ARIMA, Prophet, neural
- **User Segmentation**: Flexible criteria-based grouping
- **Experiment Management**: Full A/B testing framework
- **Revenue Modeling**: TAM/SAM/SOM calculations, projections

## Contributing

This is an enterprise platform. For contribution guidelines, contact the platform team.

## License

Proprietary - All Rights Reserved

## Support

For support and inquiries:
- Technical: dev@music-ai-platform.com
- Business: sales@music-ai-platform.com
- Security: security@music-ai-platform.com

---

**Built with Claude Code** - A comprehensive AI-powered music platform for the global industry
