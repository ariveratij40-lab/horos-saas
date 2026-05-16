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
- [x] Sidebar: 7 sub-ítems en CCTV (Inventario, Mantenimiento, Calendario, Incidentes y SLA, Capex, Póliza, Respaldo BD)
- [x] Página /cctv/maintenance - Mantenimiento preventivo/correctivo de equipos CCTV
- [x] Página /cctv/calendar - Calendario de actividades de mantenimiento CCTV
- [x] Página /cctv/incidents - Incidentes y SLA específicos de CCTV
- [x] Página /cctv/capex - Análisis CAPEX/OPEX de activos CCTV
- [x] Página /cctv/policy - Póliza de servicio asociada a CCTV
- [x] Página /cctv/backup - Respaldo de base de datos CCTV

## CCTV - Correcciones de Calidad
- [x] Corregir /cctv/calendar para renderizar nombre del evento (name en lugar de title)
- [x] Corregir /cctv/incidents para filtrar solo tickets CCTV reales (sin el || !t.category)
- [x] Corregir /cctv/policy para mostrar solo pólizas CCTV (eliminar || true del filtro)
- [x] Agregar análisis OPEX a /cctv/capex (costos operativos: mantenimiento, licencias)
- [x] Reemplazar respaldo simulado en /cctv/backup con exportación real JSON sin mock

## CCTV - Imagen de Escena de Cámara
- [x] Schema BD: agregar campo sceneImageUrl y sceneImageKey a cctv_cameras
- [x] Router CCTV: endpoint uploadCameraScene para subir imagen al storage S3
- [x] Router CCTV: incluir sceneImageUrl en el endpoint list y getSheet
- [x] Frontend: toggle Lista/Tarjetas en CamerasTab
- [x] Frontend: vista de tarjetas con imagen de escena, badge de estado, código, nombre, sucursal
- [x] Frontend: botón de subida de imagen en cada tarjeta y en el formulario de edición
- [x] Frontend: preview de imagen en la ficha técnica CctvTechSheet
- [x] Frontend: campo de imagen de escena inline en el formulario de crear/editar cámara
- [x] Frontend: mostrar branchId (sucursal) en la tarjeta de cámara
- [x] Backend: labelMap de getSheet actualizado con sceneImageUrl/sceneDescription

## CCTV - Pestaña Resumen en Inventario
- [x] Agregar pestaña "Resumen" como primera pestaña en el módulo /cctv
- [x] Pestaña Resumen: fichas de totales por tipo de equipo (Cámaras, IDF/MDF, Licencias, Pantallas, Servidores, Switches, UPS)
- [x] Pestaña Resumen: distribución de cámaras por tipo (domo, bala, ptz, poe, retiradas)
- [x] Pestaña Resumen: alertas de licencias próximas a vencer (90 días)
- [x] Pestaña Resumen: KPIs globales (total equipos, activos, mantenimiento, licencias expiradas)
- [x] Mover las fichas de totales globales (actualmente sobre las pestañas) a la pestaña Resumen
- [x] Limpiar las fichas de totales individuales de CamerasTab para que no se vean saturadas

## CCTV - Campo CTPAT en Cámaras
- [x] Schema Drizzle: agregar campo ctpat (boolean) a cctvCameras
- [x] Migración SQL: ALTER TABLE cctv_cameras ADD COLUMN ctpat
- [x] Router CCTV: incluir ctpat en cameraSchema y en stats
- [x] Frontend: switch CTPAT en formulario de alta/edición de cámara
- [x] Frontend: filtro CTPAT en la lista de cámaras (botón toggle en toolbar)
- [x] Frontend: badge CTPAT en tarjeta y columna en vista lista
- [x] Frontend: contador de cámaras CTPAT en la pestaña Resumen (KPI)

## CCTV - Tabla expandible en vista de lista
- [x] Vista lista: cada fila tiene botón chevron para expandir/colapsar
- [x] Panel expandido: imagen de escena, ID/serie, marca/modelo, IP/MAC, zona/área, tipo, notas, CTPAT
- [x] Panel expandido: botones "Ficha Técnica", "Editar" e "Imagen" inline
- [x] Botón "Expandir todo / Colapsar todo" en la cabecera de la tabla

## CCTV - Ordenamiento y exportación
- [x] Tabla cámaras: ordenamiento por columna (marca, estado, área, IP) asc/desc
- [x] Toolbar: botón "Exportar CSV" que descargue la lista filtrada actual
- [x] Toolbar: botón "Exportar Excel" (.xlsx) con la lista filtrada actual

## CCTV - Tabla expandible en otros módulos
- [x] IDF/MDF: vista lista expandible con panel de detalle
- [x] Licencias: vista lista expandible con panel de detalle
- [x] Switches: vista lista expandible con panel de detalle
- [x] UPS: vista lista expandible con panel de detalle
- [x] Servidores: vista lista expandible con panel de detalle
- [x] Pantallas/Monitores: vista lista expandible con panel de detalle

## CCTV - Importación de Inventario
- [x] Backend: endpoint tRPC parseFile que acepta archivo base64 + tipo + categoría
- [x] Backend: parseo de CSV/Excel con xlsx, Word con mammoth, PDF con LLM
- [x] Backend: mapeo inteligente de columnas con IA (LLM + fallback fuzzy)
- [x] Backend: inserción masiva en la tabla correspondiente según categoría (importRows)
- [x] Frontend: página /cctv/import con stepper de 4 pasos
- [x] Frontend: Paso 1 - selección de categoría (7 tarjetas con ícono y número de columnas)
- [x] Frontend: Paso 2 - subida de archivo drag & drop (PDF/Excel/Word/CSV)
- [x] Frontend: Paso 3 - mapeo de columnas con sugerencias IA y vista previa de datos
- [x] Frontend: Paso 4 - resultado con contadores de importados/errores/total
- [x] Frontend: botón "Importar" en el toolbar del módulo CCTV

## CCTV - Campos Factura y Monto en todos los inventarios
- [x] Schema Drizzle: invoiceNumber (varchar 100) y amount (decimal 12,2) en las 7 tablas
- [x] Migración SQL aplicada en las 7 tablas CCTV
- [x] Router CCTV: invoiceNumber y amount en los 7 schemas Zod
- [x] Frontend: campos No. Factura y Monto en los 7 formularios de alta/edición

## CCTV - Imagen en IDF/MDF
- [x] Schema Drizzle: agregar campos idfImageUrl e idfImageKey a cctvIdfs
- [x] Migración SQL: ALTER TABLE cctv_idfs ADD COLUMN idfImageUrl, idfImageKey
- [x] Router CCTV: endpoint uploadImage para subir imagen al storage S3
- [x] Frontend: campo de subida de imagen en el formulario de edición de IDF/MDF con preview
- [x] Frontend: preview de imagen en el panel expandido de la tabla lista IDF/MDF

## CCTV - Galería múltiple de imágenes en IDF/MDF
- [x] Schema Drizzle: tabla cctv_idf_images (id, idfId, tenantId, url, key, label, sortOrder, createdAt)
- [x] Migración SQL: CREATE TABLE cctv_idf_images
- [x] Router CCTV: endpoints idfs.addImage, deleteImage, listImages, updateImageLabel
- [x] Frontend: galería de miniaturas en el formulario de edición IDF/MDF (máx 10 fotos)
- [x] Frontend: selector de etiqueta por imagen (Frontal, Lateral, Cableado, Rack, Gabinete, UPS, Otro)
- [x] Frontend: botón eliminar en cada miniatura (hover)
- [x] Frontend: componente IdfImagesMini en el panel expandido de la tabla lista
- [x] Frontend: lightbox para ver imagen en tamaño completo al hacer clic

## CCTV - Vaciar Inventario y Anti-duplicados
- [x] Router CCTV: endpoint clearAll por categoría (cameras/idfs/licenses/monitors/servers/switches/ups)
- [x] Frontend: botón "Vaciar Inventario" en el header del módulo CCTV con diálogo de confirmación
- [x] Frontend: el diálogo pide escribir "CONFIRMAR" antes de borrar para evitar accidentes
- [x] Frontend: el botón Vaciar solo borra la categoría activa (pestaña seleccionada)
- [x] Importación: validación anti-duplicados por idCamera/idIdf/idLicencia/etc. antes de insertar
- [x] Importación: mostrar en el Paso 4 los registros omitidos por duplicado (nombre + motivo)
- [x] Importación: opción "Actualizar si existe" vs "Omitir si existe" en el Paso 3 (pendiente para siguiente iteración)

## CCTV - Rediseño IdfsTab (vista tarjetas/lista + búsqueda + filtros)
- [x] IdfsTab: vista de tarjetas IdfCard con imagen principal de la galería, nombre, tipo, estado, racks/switches
- [x] IdfsTab: vista de lista expandible con panel de detalle y galería IdfImagesMini
- [x] IdfsTab: barra de búsqueda por nombre, ID o ubicación
- [x] IdfsTab: filtros por tipo (IDF/MDF/gabinete) y estado (Operativo/Inactivo/Mantenimiento)
- [x] IdfsTab: toggle Lista/Tarjetas en toolbar
- [x] IdfsTab: galería de imágenes en la tarjeta (imagen principal + contador de fotos)
- [x] IdfsTab: galería de imágenes en el panel expandido de la lista
- [x] IdfsTab: botones Ficha Técnica, Editar, Eliminar en tarjeta y panel expandido
- [x] IdfsTab: ordenamiento por columna en vista lista (ID, Nombre, Tipo, Ubicación, Racks, Switches, Estado)

## CCTV - Rediseño Servidores/Switches/UPS/Pantallas
- [x] ServidoresTab: vista tarjetas/lista, búsqueda, filtros tipo/estado, toggle
- [x] SwitchesTab: vista tarjetas/lista, búsqueda, filtros tipo/estado, toggle
- [x] UpsTab: vista tarjetas/lista, búsqueda, filtros tipo/estado, toggle
- [ ] PantallasTab: vista tarjetas/lista, búsqueda, filtros tipo/estado, toggle

## CCTV - Galería imágenes Servidores y Switches
- [ ] Schema: tabla cctv_server_images (id, serverId, tenantId, url, key, label, sortOrder)
- [ ] Schema: tabla cctv_switch_images (id, switchId, tenantId, url, key, label, sortOrder)
- [ ] Migración SQL aplicada
- [ ] Router: endpoints addImage/deleteImage/listImages/updateLabel para Servidores
- [ ] Router: endpoints addImage/deleteImage/listImages/updateLabel para Switches
- [ ] Frontend: galería múltiple en formulario y panel expandido de Servidores
- [ ] Frontend: galería múltiple en formulario y panel expandido de Switches

## Importación - Opción Actualizar/Omitir
- [x] Frontend: selector en Paso 3 "Omitir duplicados" vs "Actualizar si existe"
- [x] Backend: importRows soporta modo upsert cuando duplicateMode="update"
- [x] Frontend: Paso 4 muestra contadores importados/actualizados/omitidos/errores

## CCTV - Sistema de Etiquetas RFID
- [x] Schema Drizzle: campo rfidTag (varchar 50) en las 7 tablas CCTV
- [x] Migración SQL: ALTER TABLE para agregar rfidTag a las 7 tablas
- [x] Schema Drizzle: tabla rfid_registry (id, rfidTag, category, itemId, tenantId, snapshot, generatedAt)
- [x] Migración SQL: CREATE TABLE rfid_registry
- [x] Backend: endpoint rfid.generateTag — genera consecutivo HOROS-{CAT}-{NNNNNN} y lo asigna al equipo
- [x] Backend: endpoint rfid.lookup — busca equipo por rfidTag y devuelve ficha completa
- [x] Backend: endpoint rfid.listByTenant — lista todos los tags del tenant con info del equipo
- [x] Backend: endpoint rfid.refreshSnapshot — actualiza snapshot del equipo en rfid_registry
- [x] Backend: endpoint rfid.deleteTag — elimina tag y limpia campo rfidTag del equipo
- [x] Frontend: componente RfidTagField (botón generar, badge, copiar, imprimir, refresh)
- [x] Frontend: campo rfidTag integrado en los 7 formularios de edición CCTV
- [x] Frontend: página /rfid — gestión centralizada de etiquetas (tabla, filtros, stats por categoría)
- [x] Frontend: impresión de etiqueta con QR code, datos del equipo y ventana de impresión
- [x] Frontend: página /rfid/scan — módulo móvil para lectura RFID (sin DashboardLayout)
- [x] Frontend: módulo móvil con foco automático para lectores que emulan teclado
- [x] Frontend: ficha completa del equipo en módulo móvil con todos los campos por categoría
- [x] Sidebar: enlace "Etiquetas RFID" en sección CCTV del DashboardLayout
- [ ] Frontend: componente RfidLabel — etiqueta imprimible con QR code + código + datos del equipo
- [ ] Frontend: botón "Imprimir Etiqueta" en ficha técnica y en la página de gestión RFID
- [ ] Frontend: módulo móvil /rfid/scan — input de código RFID + ficha del equipo encontrado
- [ ] Frontend: /rfid/scan accesible sin sidebar (layout móvil optimizado)
- [ ] Agregar ruta /rfid/scan al App.tsx y link desde el sidebar CCTV

## CCTV - Historial y Bitácora de Mantenimiento por Equipo

- [ ] Backend: endpoint cctv.getMaintenanceHistory(category, itemId) — devuelve tareas de mantenimiento del equipo
- [ ] Backend: endpoint cctv.addMaintenanceEntry — agrega entrada manual a la bitácora del equipo
- [ ] Frontend: componente MaintenanceHistorySheet — panel lateral Sheet con historial del equipo
- [ ] Frontend: ícono de herramienta (Wrench) en cada fila de las 7 pestañas del inventario CCTV
- [ ] Frontend: Sheet muestra lista de mantenimientos con fecha, tipo, técnico, descripción y estado
- [ ] Frontend: Sheet permite agregar nueva entrada de bitácora (formulario inline)
- [ ] Frontend: Sheet muestra resumen: total mantenimientos, último mantenimiento, próximo programado

## CCTV - Historial y Bitácora de Mantenimiento por Equipo
- [x] Schema Drizzle: tabla cctv_maintenance_log (id, tenantId, category, itemId, type, status, title, description, findings, actions, technician, scheduledDate, executedDate, durationHours, cost, nextMaintenanceDate, attachmentUrl, createdByUserId, createdByUserName, createdAt)
- [x] Migración SQL: CREATE TABLE cctv_maintenance_log aplicada
- [x] Backend: cctvMaintenanceRouter con endpoints getHistory, getSummary, addEntry, updateEntry, deleteEntry
- [x] Backend: registrado en appRouter principal como cctvMaintenance
- [x] Frontend: componente MaintenanceHistorySheet con panel lateral Sheet
- [x] Frontend: formulario de nueva entrada (tipo, estado, título, descripción, hallazgos, acciones, técnico, fechas, costo, próximo mantenimiento)
- [x] Frontend: historial con timeline de entradas, badges de tipo/estado, edición y eliminación
- [x] Frontend: resumen estadístico (total, completados, última fecha, próximo mantenimiento)
- [x] Frontend: ícono Wrench (amber) en tarjetas de los 7 inventarios CCTV
- [x] Frontend: botón "Mantenimiento" en panel expandido de vista lista de Servidores, Switches y UPS
- [x] Frontend: botón "Mantenimiento" en panel expandido de vista lista de Cámaras, IDF, Licencias y Monitores
- [x] TypeScript: sin errores en todo el proyecto

## Licencias - Equipo Asignado como enlace rápido
- [ ] Backend: endpoint cctvLicenses.lookupEquipo — busca equipo por nombre/ID en las 7 tablas CCTV
- [ ] Frontend: componente EquipmentQuickView — sheet lateral con detalles del equipo vinculado
- [ ] Frontend: campo Equipo Asignado en LicensesTab muestra enlace que abre EquipmentQuickView

## Pólizas - Fecha de Renovación y Estado Automático
- [ ] Schema: agregar campo renewalDate (bigint, nullable) a tabla policies
- [ ] Migración SQL: ALTER TABLE policies ADD COLUMN renewal_date
- [ ] Backend: incluir renewalDate en create/update/list de pólizas
- [ ] Backend: calcular coverageStatus automático (active/expiring_soon/expired) según endDate vs hoy
- [ ] Frontend: campo "Fecha de Renovación" en formulario Nueva/Editar Póliza
- [ ] Frontend: badge de estado automático (Activa/Por Vencer/Expirada) en lista y detalle de póliza
- [ ] Frontend: indicador visual en lista de pólizas próximas a vencer

## CCTV - Clasificación SLA Tier por Equipo
- [ ] Schema: campo slaTier (tier1|tier2|tier3) en las 7 tablas CCTV
- [ ] Migración SQL: ALTER TABLE para agregar slaTier a las 7 tablas
- [ ] Frontend: selector SLA Tier en los 7 formularios de alta/edición CCTV
- [ ] Frontend: badge de Tier visible en tarjetas y lista de los 7 inventarios
- [ ] Backend: endpoint incidentes CCTV lee slaTier del equipo y calcula tiempos SLA
- [ ] Frontend: formulario de incidente muestra equipo vinculado + Tier + tiempo SLA calculado
- [ ] Frontend: lista de incidentes muestra badge Tier y countdown SLA

## Incidentes CCTV - Imagen de Evidencia
- [x] Backend: campos evidenceImageUrl y evidenceImageKey en tabla tickets (migración 0013 aplicada)
- [x] Backend: endpoint tickets.uploadEvidence que acepta imageBase64, mimeType, ticketId y sube a S3
- [x] Frontend: campo de subida de imagen en el formulario de nuevo incidente (zona drag-drop + preview)
- [x] Frontend: botón para quitar imagen seleccionada antes de guardar
- [x] Frontend: flujo de 2 pasos: crear ticket → si hay imagen, convertir a base64 y llamar uploadEvidence
- [x] Frontend: mostrar imagen de evidencia en el panel expandido de la lista de incidentes
- [x] Frontend: enlace para ver imagen en tamaño completo al hacer clic
- [x] Backend: createTicket en db.ts retorna el ID del ticket insertado (insertId)

## Mantenimiento CCTV - Programas, Pólizas, Fotos y Reportes
- [x] Schema BD: nuevas tablas cctv_maintenance_programs y cctv_maintenance_program_items
- [x] Schema BD: campos beforePhotoUrl/Key, afterPhotoUrl/Key, clientSignatureUrl/Key, clientName, reportGenerated, policyId, programId en cctv_maintenance_log
- [x] Migración SQL 0014 aplicada
- [x] Backend: router cctvMaintenanceProgramsRouter con endpoints list, getById, create, update, delete, getPolicyCoverage, uploadPhoto, saveSignature, getCalendarEvents
- [x] Backend: create genera automáticamente visitas programadas en cctv_maintenance_log distribuidas por frecuencia
- [x] Backend: getPolicyCoverage calcula mantenimientos cubiertos, usados y restantes de la póliza
- [x] Frontend: CCTVMaintenance.tsx rediseñado con tabs Programas / Visitas Programadas
- [x] Frontend: barra de cobertura de póliza vinculada (usado/total/restante)
- [x] Frontend: diálogo de nuevo programa con búsqueda de equipos, frecuencia, fechas, técnico
- [x] Frontend: tabla de visitas programadas con estado, fecha, técnico y botón de reporte
- [x] Frontend: CCTVCalendar.tsx actualizado para mostrar visitas de programas (getCalendarEvents)
- [x] Frontend: panel lateral en calendario con detalle de visitas del día seleccionado
- [x] Frontend: componente MaintenanceReportDialog con 4 tabs (Info, Fotos, Firma, Reporte)
- [x] Frontend: subida de fotos antes/después con preview
- [x] Frontend: canvas de firma digital del cliente
- [x] Frontend: generación de reporte HTML imprimible/PDF con fotos, firma y observaciones

## Pólizas - Lectura Inteligente de Documento (PDF/Imagen)
- [x] Backend: endpoint policies.extractFromDocument que acepta PDF o imagen en base64 y usa LLM para extraer campos
- [x] Backend: prompt estructurado para extraer policyNumber, name, clientName, clientEmail, clientPhone, startDate, endDate, monthlyValue, annualValue, type, status, notes, coverages, slaRules, services
- [x] Frontend: zona de subida de PDF/imagen en el formulario de alta de póliza
- [x] Frontend: botón "Leer documento con IA" que llama al endpoint y autollena los campos
- [x] Frontend: indicador de carga mientras la IA procesa el documento
- [x] Frontend: resaltado visual de los campos autollenados para que el usuario pueda revisarlos
- [x] Frontend: posibilidad de editar cualquier campo autollenado antes de guardar

## Pólizas - Vista Previa del Documento junto al Formulario
- [x] Frontend: rediseñar CreatePolicyDialog con layout de dos columnas (documento | formulario)
- [x] Frontend: panel izquierdo muestra imagen directamente con zoom/pan
- [x] Frontend: panel izquierdo muestra PDF embebido con iframe o visor nativo del navegador
- [x] Frontend: el diálogo se expande a pantalla completa cuando hay documento cargado
- [x] Frontend: botón para quitar el documento y volver al layout de una columna

## Programa de Mantenimiento - Selector de Inventario y Programa de Obra
- [ ] Backend: endpoint para obtener todo el inventario CCTV (cámaras, IDFs, monitores, servidores, switches, UPS, licencias)
- [ ] Backend: endpoint para generar programa de obra detallado por día (fecha, equipos asignados, técnico)
- [ ] Frontend: selector de inventario completo con búsqueda, filtros por categoría y selección múltiple
- [ ] Frontend: pregunta de capacidad diaria (cuántas cámaras/equipos por día)
- [ ] Frontend: vista previa del programa de obra generado (tabla día a día con equipos asignados)
- [ ] Frontend: posibilidad de ajustar la distribución antes de guardar

## Autenticación Propia (VPS)
- [ ] Schema: agregar columna `passwordHash` a la tabla `users`
- [ ] Schema: agregar columna `authProvider` (enum: 'manus' | 'local') a la tabla `users`
- [ ] Migración BD aplicada
- [ ] Backend: instalar bcryptjs y @types/bcryptjs
- [ ] Backend: endpoint `auth.localLogin` (email + password → JWT cookie)
- [ ] Backend: endpoint `auth.localRegister` (email + password + name → crear usuario)
- [ ] Frontend: página /login con formulario email+password
- [ ] Frontend: detección automática del provider disponible (Manus vs local)
- [ ] Frontend: redirección correcta según el provider activo

## Recuperación de Contraseña
- [ ] Schema: tabla password_reset_tokens (id, userId, token, expiresAt, usedAt, createdAt)
- [ ] Migración BD aplicada
- [ ] Backend: endpoint auth.requestPasswordReset (email → genera token, envía email)
- [ ] Backend: endpoint auth.confirmPasswordReset (token + newPassword → actualiza hash)
- [ ] Backend: envío de email con nodemailer o API de notificaciones
- [ ] Frontend: página /forgot-password con formulario de email
- [ ] Frontend: página /reset-password?token=xxx con formulario de nueva contraseña
- [ ] Frontend: enlace "Olvidé mi contraseña" en la página /login
- [ ] Frontend: mensajes de éxito y error claros en ambas páginas
