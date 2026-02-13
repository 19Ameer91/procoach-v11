-- بيانات تجريبية لنظام الدوريات

-- إضافة مستخدمين (مشرف ومدربين)
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES 
  ('admin@procoach.com', 'hashed_password_admin', 'محمد المشرف', 'admin', '+201234567890'),
  ('coach1@procoach.com', 'hashed_password_1', 'محمد أحمد', 'coach', '+201234567891'),
  ('coach2@procoach.com', 'hashed_password_2', 'أحمد حسن', 'coach', '+201234567892'),
  ('coach3@procoach.com', 'hashed_password_3', 'خالد المدرب', 'coach', '+201234567893'),
  ('coach4@procoach.com', 'hashed_password_4', 'عمر الكابتن', 'coach', '+201234567894');

-- ربط الفرق الموجودة بالمدربين
UPDATE teams SET user_id = 2 WHERE id = 1; -- الأهلي
UPDATE teams SET user_id = 3 WHERE id = 2; -- الزمالك

-- إضافة فرق إضافية
INSERT INTO teams (name, country, league, coach_name, formation, user_id) VALUES 
  ('بيراميدز', 'مصر', 'الدوري المصري', 'خالد المدرب', '4-2-3-1', 4),
  ('الإسماعيلي', 'مصر', 'الدوري المصري', 'عمر الكابتن', '3-5-2', 5);

-- إنشاء دوري تجريبي
INSERT INTO leagues (name, description, admin_id, country, season, league_type, max_teams, status, start_date, end_date, match_duration, prize_first, prize_second, prize_third) VALUES 
  (
    'كأس البطولة المصرية 2024',
    'بطولة خروج المغلوب للأندية المصرية الكبرى',
    1, -- المشرف
    'مصر',
    '2024/2025',
    'knockout',
    16,
    'registration',
    '2024-03-01',
    '2024-06-30',
    90,
    'كأس ذهبي + 1,000,000 جنيه',
    'كأس فضي + 500,000 جنيه',
    'كأس برونزي + 250,000 جنيه'
  ),
  (
    'دوري المحترفين 2024',
    'دوري الدرجة الأولى بنظام النقاط',
    1,
    'مصر',
    '2024/2025',
    'league',
    18,
    'registration',
    '2024-09-01',
    '2025-05-31',
    90,
    'كأس الدوري + 2,000,000 جنيه',
    'ميدالية فضية + 1,000,000 جنيه',
    'ميدالية برونزية + 500,000 جنيه'
  );

-- إنشاء أكواد دعوة للدوري الأول
INSERT INTO league_invitations (league_id, invitation_code, max_uses, created_by, expires_at) VALUES 
  (1, 'CUP2024-AHLY', 1, 1, '2024-02-28 23:59:59'),
  (1, 'CUP2024-ZAMALEK', 1, 1, '2024-02-28 23:59:59'),
  (1, 'CUP2024-PYRAMIDS', 1, 1, '2024-02-28 23:59:59'),
  (1, 'CUP2024-ISMAILY', 1, 1, '2024-02-28 23:59:59'),
  (1, 'CUP2024-OPEN', -1, 1, '2024-02-28 23:59:59'); -- كود مفتوح

-- تسجيل الفرق في الدوري الأول
INSERT INTO league_participations (league_id, team_id, joined_via_code) VALUES 
  (1, 1, 'CUP2024-AHLY'),
  (1, 2, 'CUP2024-ZAMALEK'),
  (1, 3, 'CUP2024-PYRAMIDS'),
  (1, 4, 'CUP2024-ISMAILY');

-- تحديث استخدام الأكواد
UPDATE league_invitations SET current_uses = 1 WHERE invitation_code IN ('CUP2024-AHLY', 'CUP2024-ZAMALEK', 'CUP2024-PYRAMIDS', 'CUP2024-ISMAILY');

-- إنشاء مباريات نصف النهائي (مثال)
INSERT INTO matches (league_id, home_team_id, away_team_id, match_date, match_round, match_number, status, is_knockout, venue) VALUES 
  (1, 1, 2, '2024-06-15 20:00:00', 'Semi-finals', 1, 'scheduled', 1, 'ستاد القاهرة الدولي'),
  (1, 3, 4, '2024-06-16 20:00:00', 'Semi-finals', 2, 'scheduled', 1, 'ستاد برج العرب');

-- إضافة مباراة نهائي جاهزة (بدون فرق بعد)
INSERT INTO matches (league_id, home_team_id, away_team_id, match_date, match_round, match_number, status, is_knockout, venue) VALUES 
  (1, 1, 1, '2024-06-30 21:00:00', 'Final', 1, 'scheduled', 1, 'ستاد القاهرة الدولي'); -- سيتم تحديث الفرق بعد نصف النهائي

-- إنشاء هيكل البطولة (Bracket)
INSERT INTO tournament_bracket (league_id, round_name, round_order, bracket_position, match_id) VALUES 
  (1, 'Semi-finals', 3, 1, 1),
  (1, 'Semi-finals', 3, 2, 2),
  (1, 'Final', 4, 1, 3);

-- مباراة مكتملة (مثال)
INSERT INTO matches (league_id, home_team_id, away_team_id, match_date, match_round, match_number, home_score, away_score, status, is_knockout, winner_team_id, venue) VALUES 
  (1, 1, 4, '2024-06-10 18:00:00', 'Quarter-finals', 1, 3, 1, 'finished', 1, 1, 'ستاد السلام');

-- أحداث المباراة المكتملة
INSERT INTO match_events (match_id, team_id, player_id, event_type, minute, description) VALUES 
  (4, 1, 9, 'goal', 15, 'هدف من محمد شريف'),
  (4, 1, 10, 'goal', 34, 'هدف من حسين الشحات'),
  (4, 4, NULL, 'goal', 67, 'هدف للإسماعيلي'),
  (4, 1, 9, 'goal', 82, 'هدف ثاني لمحمد شريف'),
  (4, 1, 6, 'yellow_card', 45, 'بطاقة صفراء لأليو ديانغ');

-- تشكيلة المباراة
INSERT INTO match_lineups (match_id, team_id, player_id, position, is_starter, jersey_number, minutes_played, rating) VALUES 
  (4, 1, 1, 'GK', 1, 1, 90, 7.5),
  (4, 1, 2, 'CB', 1, 6, 90, 7.0),
  (4, 1, 3, 'LB', 1, 12, 90, 6.8),
  (4, 1, 4, 'RB', 1, 21, 90, 7.2),
  (4, 1, 5, 'CB', 1, 5, 90, 7.0),
  (4, 1, 6, 'CDM', 1, 8, 90, 7.5),
  (4, 1, 7, 'CM', 1, 17, 75, 6.5),
  (4, 1, 8, 'CAM', 1, 10, 90, 8.5),
  (4, 1, 9, 'ST', 1, 11, 90, 9.0),
  (4, 1, 10, 'RW', 1, 14, 90, 8.0),
  (4, 1, 11, 'LW', 1, 7, 85, 7.5);

-- إحصائيات اللاعبين في الدوري
INSERT INTO league_player_stats (league_id, player_id, team_id, matches_played, goals, assists, minutes_played) VALUES 
  (1, 9, 1, 1, 2, 0, 90),
  (1, 10, 1, 1, 1, 1, 90),
  (1, 8, 1, 1, 0, 2, 90),
  (1, 6, 1, 1, 0, 0, 90);

-- تحديث إحصائيات الفريق في الدوري
UPDATE league_participations 
SET matches_played = 1, wins = 1, goals_for = 3, goals_against = 1, points = 3
WHERE league_id = 1 AND team_id = 1;

UPDATE league_participations 
SET matches_played = 1, losses = 1, goals_for = 1, goals_against = 3
WHERE league_id = 1 AND team_id = 4;
