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

## Dashboard - Pestañas por Categoría de Servicio
- [x] Pestaña "Resumen": KPIs globales actuales del dashboard
- [x] Pestaña "CCTV": fichas de cámaras activas, grabadores NVR/DVR, tickets CCTV, activos CCTV críticos
- [x] Pestaña "Control de Acceso": lectores activos, puertas controladas, tickets de acceso, activos de control de acceso
- [x] Pestaña "Voceo": equipos de voceo activos, amplificadores, tickets de voceo, activos de voceo
- [x] Pestaña "Cableado Estructurado": puertos activos, switches/routers, tickets de red, activos de red
- [x] Backend: router de KPIs filtrados por categoría de activo (camera, nvr_dvr, access_control, alarm, network)

## Dashboard - KPIs Granulares por Sub-categoría
- [x] Backend: endpoint kpisDetailedgoryDetailed con fichas por sub-categoría (camera, nvr_dvr, access_control, alarm, network, server, ups)
- [x] CCTV: fichas separadas para Cámaras activas y Grabadores NVR/DVR
- [x] Control de Acceso: fichas separadas para Lectores activos y Puertas controladas
- [x] Voceo: fichas separadas para Altavoces/Equipos activos y Amplificadores
- [x] Cableado Estructurado: fichas separadas para Switches/Routers, Servidores y UPS
- [x] Pruebas unitarias para los nuevos KPIs granulares

## Módulo Inventario CCTV - 7 Tipos de Equipo
- [x] Schema BD: tabla cctv_cameras con todos los campos de la plantilla CSV
- [x] Schema BD: tabla cctv_idfs (IDF/MDF con racks, gabinetes, fibra, switches, etc.)
- [x] Schema BD: tabla cctv_licenses (tipo, contrato, fechas, equipo asignado)
- [x] Schema BD: tabla cctv_monitors (tipo, tamaño, resolución, tecnología, puerto)
- [x] Schema BD: tabla cctv_servers (tipo VMS, versión, licencias, SO, hardware, red)
- [x] Schema BD: tabla cctv_switches (tipo, firmware, puertos, PoE, cámaras conectadas)
- [x] Schema BD: tabla cctv_ups (tipo, capacidad, autonomía, equipos conectados)
- [x] Backend: routers tRPC CRUD para los 7 tipos de equipo CCTV
- [x] Frontend: módulo /cctv con 7 pestañas (Cámaras, IDF, Licencias, Pantallas, Servidores, Switches, UPS)
- [x] Frontend: formularios de alta/edición con todos los campos de cada plantilla
- [x] Frontend: tablas de listado con filtros y búsqueda por tipo de equipo
- [x] Frontend: navegación desde Dashboard pestaña CCTV hacia el módulo
- [x] Pruebas unitarias para los nuevos routers CCTV

## Fichas Técnicas CCTV
- [x] Router tRPC: endpoint getEquipmentSheet por tipo y id (devuelve todos los campos del equipo)
- [x] Componente CctvTechSheet: modal de ficha técnica con secciones colapsables y diseño elegante
- [x] Botón "Ficha Técnica" en cada fila de las 7 pestañas CCTV
- [x] Exportación a PDF desde el navegador (window.print con estilos de impresión)
- [x] Encabezado de ficha con logo HOROS, nombre del equipo, fecha de generación y estado
- [x] Secciones por categoría: Identificación, Red/Conectividad, Hardware, Garantía/Proveedor, Observaciones
- [x] Pruebas unitarias para el endpoint getEquipmentSheet

## Sidebar - Reorganización Infraestructura
- [x] Agrupar módulos de Infraestructura por sistema: CCTV, Control de Acceso, Cableado Estructurado, Voceo
- [x] Sub-secciones colapsables con ícono y etiqueta de sistema

## CCTV - Sub-menús del Sidebar
- [ ] Sidebar: 7 sub-ítems en CCTV (Inventario, Mantenimiento, Calendario, Incidentes y SLA, Capex, Póliza, Respaldo BD)
- [ ] Página /cctv/maintenance - Mantenimiento preventivo/correctivo de equipos CCTV
- [ ] Página /cctv/calendar - Calendario de actividades de mantenimiento CCTV
- [ ] Página /cctv/incidents - Incidentes y SLA específicos de CCTV
- [ ] Página /cctv/capex - Análisis CAPEX/OPEX de activos CCTV
- [ ] Página /cctv/policy - Póliza de servicio asociada a CCTV
- [ ] Página /cctv/backup - Respaldo de base de datos CCTV
