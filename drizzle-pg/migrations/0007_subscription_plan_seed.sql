INSERT INTO subscription_plans (
  code,
  name,
  description,
  included_system_count,
  billing_period
)
VALUES
  (
    'CORE_1',
    'HOROS Core + 1 Sistema',
    'Infraestructura HOROS incluida y un sistema administrado.',
    1,
    'monthly'
  ),
  (
    'CORE_2',
    'HOROS Core + 2 Sistemas',
    'Infraestructura HOROS incluida y dos sistemas administrados.',
    2,
    'monthly'
  ),
  (
    'CORE_3',
    'HOROS Core + 3 Sistemas',
    'Infraestructura HOROS incluida y tres sistemas administrados.',
    3,
    'monthly'
  ),
  (
    'CORE_4',
    'HOROS Core + 4 Sistemas',
    'Infraestructura HOROS incluida y cuatro sistemas administrados.',
    4,
    'monthly'
  ),
  (
    'CORE_5',
    'HOROS Core + 5 Sistemas',
    'Infraestructura HOROS incluida y cinco sistemas administrados.',
    5,
    'monthly'
  )
ON CONFLICT (code) DO NOTHING;
