-- بيانات تجريبية لنظام التحكيم

-- إضافة حكام
INSERT INTO referees (full_name, email, phone, license_number, license_level, specialization, years_experience, matches_refereed) VALUES 
  ('جهاد جريشة', 'jihad.greisha@procoach.com', '+201234567800', 'REF-EGY-001', 'International', 'Main Referee', 15, 250),
  ('محمد معروف', 'mohamed.marouf@procoach.com', '+201234567801', 'REF-EGY-002', 'National', 'Main Referee', 10, 180),
  ('عماد سرور', 'emad.sarour@procoach.com', '+201234567802', 'REF-EGY-003', 'National', 'Assistant Referee', 8, 150),
  ('أحمد حسن', 'ahmed.hassan@procoach.com', '+201234567803', 'REF-EGY-004', 'National', 'Assistant Referee', 7, 140),
  ('محمود البناني', 'mahmoud.banany@procoach.com', '+201234567804', 'REF-EGY-005', 'National', 'Fourth Official', 5, 100);

-- ربط الحكام بالمباراة المكتملة (المباراة رقم 4)
INSERT INTO match_referees (match_id, referee_id, role) VALUES 
  (4, 1, 'main'),
  (4, 3, 'assistant_1'),
  (4, 4, 'assistant_2'),
  (4, 5, 'fourth_official');

-- إنشاء سجلات اللاعبين في الدوري لجميع لاعبي الأهلي
INSERT INTO player_league_records (league_id, player_id, team_id, matches_played, minutes_played, matches_started, goals, assists) VALUES 
  (1, 9, 1, 1, 90, 1, 2, 0),  -- محمد شريف: 2 أهداف
  (1, 10, 1, 1, 90, 1, 1, 1), -- حسين الشحات: 1 هدف + 1 تمريرة
  (1, 8, 1, 1, 90, 1, 0, 2),  -- أفشة: 2 تمريرات
  (1, 1, 1, 1, 90, 1, 0, 0),  -- محمد الشناوي
  (1, 2, 1, 1, 90, 1, 0, 0),  -- ياسر إبراهيم
  (1, 3, 1, 1, 90, 1, 0, 0),  -- محمود متولي
  (1, 4, 1, 1, 90, 1, 0, 0),  -- علي معلول
  (1, 5, 1, 1, 90, 1, 0, 0),  -- رامي ربيعة
  (1, 6, 1, 1, 90, 1, 0, 0),  -- أليو ديانغ (بطاقة صفراء)
  (1, 7, 1, 1, 75, 1, 0, 0),  -- حمدي فتحي
  (1, 11, 1, 1, 85, 1, 0, 0); -- طاهر محمد طاهر

-- تحديث البطاقات
UPDATE player_league_records SET yellow_cards = 1 WHERE league_id = 1 AND player_id = 6;

-- سجل الأحداث المباشرة للمباراة 4
INSERT INTO live_match_log (match_id, referee_id, event_type, minute, additional_time, half, team_id, player_id, goal_type, description) VALUES 
  (4, 1, 'kickoff', 0, 0, '1st_half', NULL, NULL, NULL, 'بداية الشوط الأول'),
  (4, 1, 'goal', 15, 0, '1st_half', 1, 9, 'open_play', 'هدف من محمد شريف - تمريرة من أفشة'),
  (4, 1, 'goal', 34, 0, '1st_half', 1, 10, 'open_play', 'هدف من حسين الشحات - تمريرة من أفشة'),
  (4, 1, 'yellow_card', 45, 2, '1st_half', 1, 6, NULL, 'بطاقة صفراء لأليو ديانغ - خطأ قوي'),
  (4, 1, 'halftime', 45, 3, '1st_half', NULL, NULL, NULL, 'نهاية الشوط الأول'),
  (4, 1, 'kickoff', 45, 0, '2nd_half', NULL, NULL, NULL, 'بداية الشوط الثاني'),
  (4, 1, 'goal', 67, 0, '2nd_half', 4, NULL, 'open_play', 'هدف للإسماعيلي'),
  (4, 1, 'substitution', 70, 0, '2nd_half', 1, 7, NULL, 'خروج حمدي فتحي'),
  (4, 1, 'goal', 82, 0, '2nd_half', 1, 9, 'open_play', 'هدف ثاني لمحمد شريف'),
  (4, 1, 'substitution', 85, 0, '2nd_half', 1, 11, NULL, 'خروج طاهر محمد طاهر'),
  (4, 1, 'fulltime', 90, 4, '2nd_half', NULL, NULL, NULL, 'نهاية المباراة');

-- تحديث تمريرات الأهداف
UPDATE live_match_log SET assist_player_id = 8 WHERE match_id = 4 AND minute = 15; -- أفشة لمحمد شريف
UPDATE live_match_log SET assist_player_id = 8 WHERE match_id = 4 AND minute = 34; -- أفشة لحسين الشحات

-- سجل العقوبات
INSERT INTO disciplinary_records (league_id, player_id, match_id, offense_type, offense_details, suspension_matches, status, issued_by_referee_id) VALUES 
  (1, 6, 4, 'yellow_card', 'خطأ قوي على لاعب الخصم في الدقيقة 45', 0, 'served', 1);

-- إنشاء جلسة تحكيم مكتملة للمباراة 4
INSERT INTO live_refereeing_sessions (
  match_id, main_referee_id, match_status, 
  kickoff_time, halftime_start, second_half_start, fulltime,
  home_score, away_score, first_half_added_time, second_half_added_time,
  started_at, ended_at
) VALUES (
  4, 1, 'finished',
  '2024-06-10 18:00:00', '2024-06-10 18:48:00', '2024-06-10 19:05:00', '2024-06-10 19:54:00',
  3, 1, 3, 4,
  '2024-06-10 17:45:00', '2024-06-10 19:54:00'
);

-- إنشاء جلسة تحكيم جديدة للمباراة القادمة (المباراة 1 - نصف النهائي)
INSERT INTO match_referees (match_id, referee_id, role) VALUES 
  (1, 2, 'main'),
  (1, 3, 'assistant_1'),
  (1, 4, 'assistant_2'),
  (1, 5, 'fourth_official');

INSERT INTO live_refereeing_sessions (
  match_id, main_referee_id, match_status,
  home_score, away_score
) VALUES (
  1, 2, 'pre_match', 0, 0
);

-- إضافة سجلات للاعبي الفريقين في نصف النهائي (جاهزة للتحديث)
-- الأهلي
INSERT OR IGNORE INTO player_league_records (league_id, player_id, team_id) 
SELECT 1, id, team_id FROM players WHERE team_id = 1;

-- الزمالك
INSERT OR IGNORE INTO player_league_records (league_id, player_id, team_id) 
SELECT 1, id, team_id FROM players WHERE team_id = 2;

-- بيراميدز  
INSERT OR IGNORE INTO player_league_records (league_id, player_id, team_id) 
SELECT 1, id, team_id FROM players WHERE team_id = 3;

-- الإسماعيلي
INSERT OR IGNORE INTO player_league_records (league_id, player_id, team_id) 
SELECT 1, id, team_id FROM players WHERE team_id = 4;
