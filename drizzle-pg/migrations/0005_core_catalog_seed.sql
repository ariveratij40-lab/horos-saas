-- HOROS CORE-001A
-- Canonical platform catalogs.

INSERT INTO systems_catalog (
  code,
  name,
  description,
  sort_order
)
VALUES
  (
    'CCTV',
    'CCTV',
    'Video surveillance and recording systems',
    10
  ),
  (
    'ACCESS_CONTROL',
    'Control de Acceso',
    'Electronic access control systems',
    20
  ),
  (
    'STRUCTURED_CABLING',
    'Cableado Estructurado',
    'Copper and fiber structured cabling systems',
    30
  ),
  (
    'PAGING',
    'Voceo',
    'Paging and public address systems',
    40
  ),
  (
    'POWER',
    'Energía',
    'UPS, PDU and supporting power infrastructure',
    50
  )
ON CONFLICT (code) DO NOTHING;


INSERT INTO asset_types (
  code,
  name,
  category,
  is_infrastructure,
  is_physical
)
VALUES
  -- Shared infrastructure
  ('SWITCH', 'Switch', 'NETWORK', true, true),
  ('PATCH_PANEL', 'Patch Panel', 'CABLING', true, true),
  ('UPS', 'UPS', 'POWER', true, true),
  ('PDU', 'PDU', 'POWER', true, true),
  ('SERVER', 'Servidor', 'COMPUTE', true, true),

  -- CCTV
  ('CAMERA', 'Cámara', 'CCTV', false, true),
  ('NVR', 'NVR', 'CCTV', false, true),
  ('VMS_SERVER', 'Servidor VMS', 'CCTV', false, true),
  ('MONITOR', 'Monitor', 'CCTV', false, true),

  -- Access control
  ('READER', 'Lector', 'ACCESS_CONTROL', false, true),
  ('ACCESS_CONTROLLER', 'Controladora de Acceso', 'ACCESS_CONTROL', false, true),
  ('DOOR', 'Puerta', 'ACCESS_CONTROL', false, true),

  -- Paging
  ('SPEAKER', 'Bocina', 'PAGING', false, true),
  ('AMPLIFIER', 'Amplificador', 'PAGING', false, true),
  ('PAGING_CONSOLE', 'Consola de Voceo', 'PAGING', false, true),

  -- Cabling
  ('COPPER_LINK', 'Enlace de Cobre', 'STRUCTURED_CABLING', true, true),
  ('FIBER_LINK', 'Enlace de Fibra', 'STRUCTURED_CABLING', true, true),
  ('OUTLET', 'Roseta / Salida', 'STRUCTURED_CABLING', true, true)
ON CONFLICT (code) DO NOTHING;
