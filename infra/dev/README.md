# HOROS Local Development Infrastructure

Local infrastructure for HOROS development.

Services:

- PostgreSQL 16
- Redis 7

Host bindings:

- PostgreSQL: 127.0.0.1:55432
- Redis: 127.0.0.1:56379

The non-standard host ports intentionally avoid collisions with other
development systems running on the workstation.

Start:

    docker compose -f infra/dev/docker-compose.yml up -d

Status:

    docker compose -f infra/dev/docker-compose.yml ps

Stop:

    docker compose -f infra/dev/docker-compose.yml down

Stopping the containers does not delete persistent data.

To explicitly destroy DEV data:

    docker compose -f infra/dev/docker-compose.yml down -v

Do not use these development credentials in staging or production.
