# HOROS SaaS - TODO

## Base de Datos y Schema
- [x] Tablas: tenants, branches, users (extendida con tenant_id, role)
- [x] Tabla: policies (pólizas) con tenant_id
- [x] Tablas: policy_coverages, policy_services, policy_sla_rules, policy_exclusions, policy_operational_rules
- [x] Tabla: tickets con estados operativos y contractuales
- [x] Tabla: ticket_comments, ticket_history
- [x] Tabla: assets (inventario técnico) con vida útil, depreciación, CAPEX/OPEX
- [x] Tabla: sla_rules, sla_monitoring
- [x] Tabla: maintenance_plans, maintenance_tasks
- [x] Tabla: audit_logs (auditoría enterprise)
- [x] Tabla: ai_chat_sessions, ai_chat_messages
- [x] Migrar todas las tablas a la base de datos

## Backend - Routers tRPC
- [x] Router: tenants (CRUD multi-tenant)
- [x] Router: branches (sucursales)
- [x] Router: policies (pólizas completas)
- [x] Router: tickets (estados operativos + contractuales)
- [x] Router: assets (inventario + CAPEX/OPEX)
- [x] Router: sla (reglas y monitoreo)
- [x] Router: maintenance (preventivo/correctivo)
- [x] Router: audit (registro de acciones)
- [x] Router: ai-assistant (chat con LLM)
- [x] Middleware RBAC (admin, supervisor, technician, client)

## Frontend - Sistema de Diseño
- [x] Paleta de colores elegante (azul profundo, slate, acentos dorados)
- [x] Tipografía refinada (Inter + Plus Jakarta Sans)
- [x] Tema oscuro/claro con variables CSS OKLCH
- [x] Componentes base: StatusBadge, KPICard
- [x] DashboardLayout con sidebar refinado y logo HOROS

## Frontend - Módulos
- [x] Dashboard principal con KPIs en tiempo real
- [x] Módulo de Pólizas (lista, detalle, creación, edición)
- [x] Módulo de Tickets (lista, detalle, cambio de estados dual)
- [x] Módulo de SLA (reglas, monitoreo, alertas, reportes)
- [x] Módulo de Inventario/Activos (lista, detalle, análisis CAPEX/OPEX)
- [x] Módulo de Sucursales (multi-empresa, multi-sitio)
- [x] Módulo de Mantenimiento (calendario, asignación de técnicos)
- [x] Módulo de Auditoría (log de acciones)
- [x] Módulo de Asistente IA (chat integrado con LLM)
- [x] Módulo de Usuarios y RBAC

## Pruebas
- [x] Tests unitarios para routers principales (17 tests)
- [x] Verificación de aislamiento multi-tenant
- [x] Verificación de modelo dual de estados de tickets
