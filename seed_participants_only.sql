-- بيانات المشاركين والقوائم فقط

-- تسجيل جميع المشاركين في كأس البطولة المصرية (league_id = 1)

-- المشرفون (Admins)
INSERT INTO league_participants (league_id, participant_type, person_name, role_title, email, phone) VALUES 
  (1, 'admin', 'محمد المشرف', 'مشرف عام للبطولة', 'mohamed.supervisor@procoach.com', '+201234567890'),
  (1, 'admin', 'أحمد عبد الله', 'مشرف فني مساعد', 'ahmed.abdullah@procoach.com', '+201234567891');

-- الحكام (Referees)
INSERT INTO league_participants (league_id, participant_type, person_name, role_title, email, phone, license_number) VALUES 
  (1, 'referee', 'جهاد جريشة', 'حكم دولي - حكم رئيسي', 'jihad.greisha@procoach.com', '+201234567800', 'REF-EGY-001'),
  (1, 'referee', 'محمد معروف', 'حكم وطني - حكم رئيسي', 'mohamed.marouf@procoach.com', '+201234567801', 'REF-EGY-002'),
  (1, 'referee', 'عماد سرور', 'حكم وطني - حكم مساعد', 'emad.sarour@procoach.com', '+201234567802', 'REF-EGY-003'),
  (1, 'referee', 'أحمد حسن', 'حكم وطني - حكم مساعد', 'ahmed.hassan@procoach.com', '+201234567803', 'REF-EGY-004'),
  (1, 'referee', 'محمود البناني', 'حكم وطني - حكم رابع', 'mahmoud.banany@procoach.com', '+201234567804', 'REF-EGY-005');

-- المدربون (Coaches)
INSERT INTO league_participants (league_id, participant_type, person_name, role_title, team_id, email, phone, license_number) VALUES 
  (1, 'coach', 'محمد أحمد', 'المدرب الرئيسي للأهلي', 1, 'mohamed.ahmed@ahly.com', '+201234567820', 'COACH-EGY-001'),
  (1, 'assistant_coach', 'ياسر رضوان', 'مساعد المدرب للأهلي', 1, 'yasser.radwan@ahly.com', '+201234567821', NULL),
  (1, 'coach', 'أحمد حسن', 'المدرب الرئيسي للزمالك', 2, 'ahmed.hassan@zamalek.com', '+201234567822', 'COACH-EGY-002'),
  (1, 'assistant_coach', 'طارق مصطفى', 'مساعد المدرب للزمالك', 2, 'tarek.mostafa@zamalek.com', '+201234567823', NULL),
  (1, 'coach', 'خالد البلطي', 'المدرب الرئيسي لبيراميدز', 3, 'khaled.belti@pyramids.com', '+201234567824', 'COACH-EGY-003'),
  (1, 'coach', 'حسام حسن', 'المدرب الرئيسي للإسماعيلي', 4, 'hossam.hassan@ismaily.com', '+201234567825', 'COACH-EGY-004');

-- مديرو الفرق (Team Managers)
INSERT INTO league_participants (league_id, participant_type, person_name, role_title, team_id, email, phone) VALUES 
  (1, 'team_manager', 'سيد عبد الحفيظ', 'مدير الكرة للأهلي', 1, 'sayed.abdelhafiz@ahly.com', '+201234567810'),
  (1, 'team_manager', 'أيمن يونس', 'مدير الكرة للزمالك', 2, 'ayman.younes@zamalek.com', '+201234567811'),
  (1, 'team_manager', 'أحمد حسن', 'مدير الكرة لبيراميدز', 3, 'ahmed.hassan@pyramids.com', '+201234567812'),
  (1, 'team_manager', 'طارق مصطفى', 'مدير الكرة للإسماعيلي', 4, 'tarek.mostafa@ismaily.com', '+201234567813');

-- المديرون الفنيون
INSERT INTO league_participants (league_id, participant_type, person_name, role_title, team_id, email, phone) VALUES 
  (1, 'technical_director', 'محمود الخطيب', 'المدير الفني للأهلي', 1, 'mahmoud.elkhatib@ahly.com', '+201234567830'),
  (1, 'technical_director', 'حسين لبيب', 'المدير الفني للزمالك', 2, 'hussein.labib@zamalek.com', '+201234567831');

-- إنشاء قوائم الفرق في الدوري
INSERT INTO league_team_rosters (
  league_id, team_id, season, submitted_by_manager_id, approval_status
) VALUES 
  (1, 1, '2024/2025', 1, 'approved'), -- الأهلي
  (1, 2, '2024/2025', 2, 'approved'), -- الزمالك
  (1, 3, '2024/2025', 3, 'pending'),  -- بيراميدز
  (1, 4, '2024/2025', 4, 'pending');  -- الإسماعيلي

-- إضافة لاعبي الأهلي للقائمة (18 لاعب - دوري محترفين)
-- roster_id = 1
INSERT INTO league_roster_players (roster_id, player_registry_id, jersey_number, player_role, position, is_captain) VALUES 
  -- حراس المرمى
  (1, 1, 1, 'goalkeeper', 'GK', 0),
  (1, 12, 16, 'substitute', 'GK', 0),
  
  -- خط الدفاع
  (1, 2, 6, 'starter', 'DF', 0),
  (1, 3, 12, 'starter', 'DF', 0),
  (1, 4, 21, 'starter', 'DF', 0),
  (1, 5, 5, 'starter', 'DF', 0),
  (1, 13, 3, 'substitute', 'DF', 0),
  (1, 14, 2, 'substitute', 'DF', 0),
  
  -- خط الوسط
  (1, 6, 8, 'starter', 'MF', 1), -- قائد
  (1, 7, 17, 'starter', 'MF', 0),
  (1, 8, 10, 'starter', 'MF', 0),
  (1, 15, 25, 'substitute', 'MF', 0),
  (1, 16, 27, 'substitute', 'MF', 0),
  
  -- خط الهجوم
  (1, 9, 11, 'starter', 'FW', 0),
  (1, 10, 14, 'starter', 'FW', 0),
  (1, 11, 7, 'starter', 'FW', 0),
  (1, 17, 18, 'substitute', 'FW', 0),
  (1, 18, 23, 'substitute', 'FW', 0);

-- تحديث حالة القائمة كمكتملة
UPDATE league_team_rosters 
SET is_roster_complete = 1, approved_at = '2024-06-01 10:00:00', approved_by_admin_id = 1
WHERE id = 1;
