-- بيانات جوائز جديدة بالريال العماني والدولار

-- أولاً: إضافة صلاحيات المشرفين
INSERT INTO league_admin_permissions (
  league_id, admin_id, permission_level,
  can_modify_prizes, can_announce_prizes, can_add_teams,
  can_schedule_matches, can_assign_referees, can_modify_settings,
  can_delete_league, granted_by_admin_id
) VALUES 
  (1, 1, 'owner', 1, 1, 1, 1, 1, 1, 1, 1),
  (2, 1, 'owner', 1, 1, 1, 1, 1, 1, 1, 1);

-- جوائز كأس البطولة المصرية 2024 (دوري 1) - بالريال العماني
INSERT INTO league_prizes (
  league_id, rank_position, prize_type,
  cash_amount, currency, trophy_name,
  prize_description, created_by_admin_id, is_announced
) VALUES 
  (
    1, 1, 'mixed',
    20000.000, 'OMR', 'كأس البطولة الذهبية',
    'كأس ذهبية + 20,000 ريال عماني + ميداليات ذهبية لجميع اللاعبين',
    1, 1
  ),
  (
    1, 2, 'mixed',
    10000.000, 'OMR', 'كأس الوصيف الفضية',
    'كأس فضية + 10,000 ريال عماني + ميداليات فضية لجميع اللاعبين',
    1, 1
  ),
  (
    1, 3, 'mixed',
    5000.000, 'OMR', NULL,
    'ميداليات برونزية + 5,000 ريال عماني',
    1, 1
  );

-- جوائز دوري المحترفين 2024 (دوري 2) - بالدولار
INSERT INTO league_prizes (
  league_id, rank_position, prize_type,
  cash_amount, currency, trophy_name, medal_type,
  prize_description, created_by_admin_id, is_announced
) VALUES 
  (
    2, 1, 'mixed',
    50000.000, 'USD', 'درع الدوري',
    'gold',
    'درع الدوري + 50,000 دولار أمريكي + ميداليات ذهبية + شهادة البطولة',
    1, 1
  ),
  (
    2, 2, 'mixed',
    25000.000, 'USD', NULL,
    'silver',
    '25,000 دولار + ميداليات فضية + شهادة الوصيف',
    1, 1
  ),
  (
    2, 3, 'mixed',
    10000.000, 'USD', NULL,
    'bronze',
    '10,000 دولار + ميداليات برونزية + شهادة المركز الثالث',
    1, 1
  );

-- سجل إنشاء الجوائز
INSERT INTO prize_modification_log (
  prize_id, league_id, modified_by_admin_id,
  modification_type, new_value, modification_reason
) VALUES 
  (1, 1, 1, 'created', '{"cash_amount": 20000, "currency": "OMR", "trophy": "كأس البطولة الذهبية"}', 'إنشاء جوائز البطولة بالريال العماني'),
  (2, 1, 1, 'created', '{"cash_amount": 10000, "currency": "OMR", "trophy": "كأس الوصيف الفضية"}', 'إنشاء جوائز البطولة بالريال العماني'),
  (3, 1, 1, 'created', '{"cash_amount": 5000, "currency": "OMR"}', 'إنشاء جوائز البطولة بالريال العماني'),
  (4, 2, 1, 'created', '{"cash_amount": 50000, "currency": "USD", "trophy": "درع الدوري"}', 'إنشاء جوائز دوري المحترفين بالدولار'),
  (5, 2, 1, 'created', '{"cash_amount": 25000, "currency": "USD"}', 'إنشاء جوائز دوري المحترفين بالدولار'),
  (6, 2, 1, 'created', '{"cash_amount": 10000, "currency": "USD"}', 'إنشاء جوائز دوري المحترفين بالدولار');
