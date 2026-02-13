-- بيانات تجريبية محدثة - أسماء عامة وليست مصرية

-- المستخدمون (مشرفين ومدربين)
INSERT INTO users (id, email, password_hash, full_name, role, phone, country, is_verified) VALUES
  (1, 'admin@procoach.com', '$2a$10$dummy_hash_for_testing', 'أحمد المشرف', 'admin', '+968 91234567', 'عمان', 1),
  (2, 'coach1@procoach.com', '$2a$10$dummy_hash_for_testing', 'محمد المدرب', 'coach', '+968 91234568', 'عمان', 1),
  (3, 'coach2@procoach.com', '$2a$10$dummy_hash_for_testing', 'خالد المدرب', 'coach', '+968 91234569', 'عمان', 1);

-- الدوريات المحدثة بأسماء عامة
INSERT INTO leagues (
  id, name, description, admin_id, country, season,
  league_type, max_teams, status, start_date, end_date,
  league_category, max_roster_size, max_starters, max_substitutes,
  privacy_type, is_visible_in_search, require_approval, auto_approve_on_requirements
) VALUES
  -- دوري عام (Public)
  (
    1, 'كأس البطولة الدولية 2024',
    'بطولة خروج المغلوب للأندية الكبرى',
    1, 'دولي', '2024/2025',
    'knockout', 16, 'registration', '2024-06-15', '2024-07-15',
    'professional', 18, 11, 7,
    'public', 1, 1, 1
  ),
  -- دوري عام آخر
  (
    2, 'دوري المحترفين الدولي 2024',
    'دوري النقاط للفرق الاحترافية - نظام الذهاب والإياب',
    1, 'دولي', '2024/2025',
    'league', 12, 'registration', '2024-08-01', '2025-04-30',
    'professional', 18, 11, 7,
    'public', 1, 1, 1
  ),
  -- دوري خاص (Private)
  (
    3, 'دوري الأبطال المغلق 2024',
    'دوري خاص بالدعوة فقط - للأندية الصاعدة',
    1, 'محلي', '2024/2025',
    'league', 12, 'registration', '2024-08-01', '2025-04-30',
    'champions', 14, 11, 3,
    'private', 0, 1, 1
  );

-- شروط الانضمام للدوريات
INSERT INTO league_entry_requirements (
  league_id,
  min_players, max_players,
  min_goalkeepers, max_goalkeepers,
  min_team_overall_rating, max_team_overall_rating,
  min_player_rating,
  require_verified_players, require_national_id,
  allow_foreign_players, max_foreign_players,
  require_coach_license,
  entry_fee, entry_fee_currency,
  additional_requirements
) VALUES
  -- متطلبات دوري 1 (صارمة)
  (
    1,
    18, 18,  -- بالضبط 18 لاعب
    2, 3,    -- من 2 إلى 3 حراس
    75, 85,  -- متوسط تقييم الفريق بين 75-85
    65,      -- أقل تقييم للاعب 65
    1, 1,    -- يتطلب توثيق والرقم المدني
    1, 5,    -- يسمح بـ 5 لاعبين أجانب كحد أقصى
    1,       -- يتطلب رخصة تدريب
    100.000, 'OMR',
    'يجب أن يكون الفريق مسجلاً رسمياً ويمتلك ملعب تدريب'
  ),
  -- متطلبات دوري 2 (متوسطة)
  (
    2,
    16, 20,  -- من 16 إلى 20 لاعب
    2, 3,
    70, 80,
    60,
    1, 1,
    1, 7,
    0,
    50.000, 'OMR',
    'الفريق يجب أن يكون نشطاً في الموسم الحالي'
  ),
  -- متطلبات دوري 3 (مخففة - خاص)
  (
    3,
    14, 14,  -- بالضبط 14 لاعب
    1, 2,
    NULL, NULL,  -- بدون قيود على التقييم
    NULL,
    0, 1,    -- لا يتطلب توثيق لكن يتطلب رقم مدني
    0, 0,    -- لا يسمح بأجانب
    0,
    25.000, 'OMR',
    'دوري خاص بالدعوة فقط للأندية المحلية الصاعدة'
  );

-- الفرق
INSERT INTO teams (id, name, city, user_id) VALUES
  (1, 'النادي الأول', 'مسقط', 2),
  (2, 'النادي الثاني', 'صلالة', 3),
  (3, 'نادي البيراميدز', 'صحار', 2),
  (4, 'النادي الساحلي', 'نزوى', 3);
