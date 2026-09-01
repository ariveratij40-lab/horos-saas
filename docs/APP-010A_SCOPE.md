# APP-010A — Memoria Técnica Operativa Digital

## Objetivo
Convertir la operación documental actual de mantenimiento en un flujo canónico PostgreSQL tenant-safe que permita ejecutar y documentar mantenimientos por activo y generar posteriormente una memoria técnica estructurada.

## Caso piloto
BD Alaris — CCTV, Control de Acceso y Voceo.

## Flujo objetivo
Póliza → Inventario cubierto → Orden de mantenimiento → Activos intervenidos → Hallazgos → Evidencia Antes/Durante/Después → Acciones correctivas → Cierre técnico → Memoria técnica.

## Primer corte
1. Reutilizar `assets` canónico como maestro de activos.
2. Crear orden de mantenimiento canónica vinculable a póliza, sucursal y ticket.
3. Registrar activos incluidos en cada orden.
4. Registrar hallazgos por activo.
5. Registrar acciones correctivas por hallazgo.
6. Registrar evidencia por activo con etapa `before | during | after | supporting`.
7. Registrar cierre técnico de orden.
8. Mantener RLS tenant-safe y ledger auditable.

## Reglas
- No se guardarán credenciales de equipos en evidencia ni reportes.
- La evidencia se vincula a activos y órdenes, no a PDFs monolíticos.
- La memoria técnica se generará después desde datos estructurados; el PDF no será la fuente primaria.
- No se duplicará el catálogo de activos existente.
