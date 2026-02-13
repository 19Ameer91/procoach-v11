-- بيانات تجريبية لنظام الجوائز والصلاحيات

-- إضافة صلاحيات للمشرف الرئيسي (admin_id = 1) لجميع الدوريات
INSERT INTO league_admin_permissions (
  league_id, admin_id, permission_level,
  can_modify_prizes, can_announce_prizes, can_add_teams,
  can_schedule_matches, can_assign_referees, can_modify_settings,
  can_delete_league, granted_by_admin_id
) VALUES 
  (1, 1, 'owner', 1, 1, 1, 1, 1, 1, 1, 1),
  (2, 1, 'owner', 1, 1, 1, 1, 1, 1, 1, 1),
  (3, 1, 'owner', 1, 1, 1, 1, 1, 1, 1, 1);

-- جوائز كأس البطولة المصرية 2024 (دوري 1)
INSERT INTO league_prizes (
  league_id, rank_position, prize_type,
  cash_amount, currency, trophy_name,
  prize_description, created_by_admin_id, is_announced
) VALUES 
  (
    1, 1, 'mixed',
    1000000, 'EGP', 'كأس البطولة الذهبية',
    'كأس ذهبية + مليون جنيه مصري + ميداليات ذهبية لجميع اللاعبين',
    1, 1
  ),
  (
    1, 2, 'mixed',
    500000, 'EGP', 'كأس الوصيف الفضية',
    'كأس فضية + 500,000 جنيه مصري + ميداليات فضية لجميع اللاعبين',
    1, 1
  ),
  (
    1, 3, 'mixed',
    250000, 'EGP', NULL,
    'ميداليات برونزية + 250,000 جنيه مصري',
    1, 1
  );

-- جوائز دوري المحترفين 2024 (دوري 2)
INSERT INTO league_prizes (
  league_id, rank_position, prize_type,
  cash_amount, currency, trophy_name, medal_type,
  prize_description, created_by_admin_id, is_announced
) VALUES 
  (
    2, 1, 'mixed',
    2000000, 'EGP', 'درع الدوري',
    'gold',
    'درع الدوري + مليونا جنيه + ميداليات ذهبية + شهادة البطولة',
    1, 1
  ),
  (
    2, 2, 'mixed',
    1000000, 'EGP', NULL,
    'silver',
    'مليون جنيه + ميداليات فضية + شهادة الوصيف',
    1, 1
  ),
  (
    2, 3, 'mixed',
    500000, 'EGP', NULL,
    'bronze',
    '500,000 جنيه + ميداليات برونزية + شهادة المركز الثالث',
    1, 1
  );

-- جوائز دوري الأبطال المصري 2024 (دوري 3)
INSERT INTO league_prizes (
  league_id, rank_position, prize_type,
  cash_amount, currency, trophy_name,
  prize_description, created_by_admin_id, is_announced
) VALUES 
  (
    3, 1, 'mixed',
    500000, 'EGP', 'كأس الأبطال',
    'كأس الأبطال + 500,000 جنيه + التأهل لدوري المحترفين',
    1, 1
  ),
  (
    3, 2, 'mixed',
    250000, 'EGP', NULL,
    'ميدالية فضية + 250,000 جنيه',
    1, 1
  ),
  (
    3, 3, 'mixed',
    100000, 'EGP', NULL,
    'ميدالية برونزية + 100,000 جنيه',
    1, 1
  );

-- سجل إنشاء الجوائز
INSERT INTO prize_modification_log (
  prize_id, league_id, modified_by_admin_id,
  modification_type, new_value, modification_reason
) VALUES 
  (1, 1, 1, 'created', '{"cash_amount": 1000000, "trophy": "كأس البطولة الذهبية"}', 'إنشاء جوائز البطولة الأولى'),
  (2, 1, 1, 'created', '{"cash_amount": 500000, "trophy": "كأس الوصيف الفضية"}', 'إنشاء جوائز البطولة الأولى'),
  (3, 1, 1, 'created', '{"cash_amount": 250000}', 'إنشاء جوائز البطولة الأولى'),
  (4, 2, 1, 'created', '{"cash_amount": 2000000, "trophy": "درع الدوري"}', 'إنشاء جوائز دوري المحترفين'),
  (5, 2, 1, 'created', '{"cash_amount": 1000000}', 'إنشاء جوائز دوري المحترفين'),
  (6, 2, 1, 'created', '{"cash_amount": 500000}', 'إنشاء جوائز دوري المحترفين'),
  (7, 3, 1, 'created', '{"cash_amount": 500000, "trophy": "كأس الأبطال"}', 'إنشاء جوائز دوري الأبطال'),
  (8, 3, 1, 'created', '{"cash_amount": 250000}', 'إنشاء جوائز دوري الأبطال'),
  (9, 3, 1, 'created', '{"cash_amount": 100000}', 'إنشاء جوائز دوري الأبطال');
