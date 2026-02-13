-- ==========================================================
-- إضافة بيانات المشاركين الكاملة (المشرفون، الحكام، المدربون، مديرو الفرق)
-- ==========================================================

-- المشرفون (Admins)
INSERT INTO league_participants (league_id, participant_type, user_id, person_name, role_title, email, phone)
VALUES 
  (1, 'admin', 1, 'محمد المشرف', 'مشرف عام للبطولة', 'mohamed.supervisor@procoach.com', '+201234567890'),
  (1, 'admin', NULL, 'أحمد عبد الله', 'مشرف فني مساعد', 'ahmed.abdullah@procoach.com', '+201234567891'),
  (2, 'admin', 1, 'محمد المشرف', 'مشرف عام دوري المحترفين', 'mohamed.supervisor@procoach.com', '+201234567890'),
  (3, 'admin', NULL, 'سامي حسن', 'مشرف دوري الأبطال', 'samy.hassan@procoach.com', '+201234567892');

-- الحكام (Referees)
INSERT INTO league_participants (league_id, participant_type, user_id, person_name, role_title, email, phone, license_number)
VALUES 
  -- دوري 1
  (1, 'referee', NULL, 'جهاد جريشة', 'حكم دولي - حكم رئيسي', 'jihad.greisha@procoach.com', '+201234567800', 'REF-EGY-001'),
  (1, 'referee', NULL, 'محمد معروف', 'حكم وطني - حكم رئيسي', 'mohamed.marouf@procoach.com', '+201234567801', 'REF-EGY-002'),
  (1, 'referee', NULL, 'عماد سرور', 'حكم وطني - حكم مساعد', 'emad.sarour@procoach.com', '+201234567802', 'REF-EGY-003'),
  (1, 'referee', NULL, 'أحمد حسن', 'حكم وطني - حكم مساعد', 'ahmed.hassan.ref@procoach.com', '+201234567803', 'REF-EGY-004'),
  (1, 'referee', NULL, 'محمود البناني', 'حكم وطني - حكم رابع', 'mahmoud.banany@procoach.com', '+201234567804', 'REF-EGY-005'),
  -- دوري 2
  (2, 'referee', NULL, 'جهاد جريشة', 'حكم دولي - حكم رئيسي', 'jihad.greisha@procoach.com', '+201234567800', 'REF-EGY-001'),
  (2, 'referee', NULL, 'محمد معروف', 'حكم وطني - حكم رئيسي', 'mohamed.marouf@procoach.com', '+201234567801', 'REF-EGY-002'),
  -- دوري 3
  (3, 'referee', NULL, 'عماد سرور', 'حكم وطني - حكم رئيسي', 'emad.sarour@procoach.com', '+201234567802', 'REF-EGY-003'),
  (3, 'referee', NULL, 'أحمد حسن', 'حكم وطني - حكم مساعد', 'ahmed.hassan.ref@procoach.com', '+201234567803', 'REF-EGY-004');

-- المدربون (Coaches) ومساعدوهم
INSERT INTO league_participants (league_id, participant_type, user_id, person_name, role_title, team_id, email, phone, license_number)
VALUES 
  -- دوري 1 - الأهلي
  (1, 'coach', NULL, 'محمد أحمد', 'المدرب الرئيسي للأهلي', 1, 'mohamed.ahmed@ahly.com', '+201234567820', 'COACH-EGY-001'),
  (1, 'assistant_coach', NULL, 'ياسر رضوان', 'مساعد المدرب للأهلي', 1, 'yasser.radwan@ahly.com', '+201234567821', NULL),
  -- دوري 1 - الزمالك
  (1, 'coach', NULL, 'أحمد حسن', 'المدرب الرئيسي للزمالك', 2, 'ahmed.hassan.coach@zamalek.com', '+201234567822', 'COACH-EGY-002'),
  (1, 'assistant_coach', NULL, 'طارق مصطفى', 'مساعد المدرب للزمالك', 2, 'tarek.mostafa.coach@zamalek.com', '+201234567823', NULL),
  -- دوري 1 - بيراميدز
  (1, 'coach', NULL, 'خالد البلطي', 'المدرب الرئيسي لبيراميدز', 3, 'khaled.belti@pyramids.com', '+201234567824', 'COACH-EGY-003'),
  -- دوري 1 - الإسماعيلي
  (1, 'coach', NULL, 'حسام حسن', 'المدرب الرئيسي للإسماعيلي', 4, 'hossam.hassan@ismaily.com', '+201234567825', 'COACH-EGY-004'),
  -- دوري 2 - نفس المدربين
  (2, 'coach', NULL, 'محمد أحمد', 'المدرب الرئيسي للأهلي', 1, 'mohamed.ahmed@ahly.com', '+201234567820', 'COACH-EGY-001'),
  (2, 'coach', NULL, 'أحمد حسن', 'المدرب الرئيسي للزمالك', 2, 'ahmed.hassan.coach@zamalek.com', '+201234567822', 'COACH-EGY-002'),
  (2, 'coach', NULL, 'خالد البلطي', 'المدرب الرئيسي لبيراميدز', 3, 'khaled.belti@pyramids.com', '+201234567824', 'COACH-EGY-003'),
  (2, 'coach', NULL, 'حسام حسن', 'المدرب الرئيسي للإسماعيلي', 4, 'hossam.hassan@ismaily.com', '+201234567825', 'COACH-EGY-004');

-- مديرو الفرق (Team Managers)
INSERT INTO league_participants (league_id, participant_type, user_id, person_name, role_title, team_id, email, phone)
VALUES 
  -- دوري 1
  (1, 'team_manager', NULL, 'سيد عبد الحفيظ', 'مدير الكرة للأهلي', 1, 'sayed.abdelhafiz@ahly.com', '+201234567810'),
  (1, 'team_manager', NULL, 'أيمن يونس', 'مدير الكرة للزمالك', 2, 'ayman.younes@zamalek.com', '+201234567811'),
  (1, 'team_manager', NULL, 'أحمد حسن المنجر', 'مدير الكرة لبيراميدز', 3, 'ahmed.hassan.manager@pyramids.com', '+201234567812'),
  (1, 'team_manager', NULL, 'طارق مصطفى المنجر', 'مدير الكرة للإسماعيلي', 4, 'tarek.mostafa.manager@ismaily.com', '+201234567813'),
  -- دوري 2
  (2, 'team_manager', NULL, 'سيد عبد الحفيظ', 'مدير الكرة للأهلي', 1, 'sayed.abdelhafiz@ahly.com', '+201234567810'),
  (2, 'team_manager', NULL, 'أيمن يونس', 'مدير الكرة للزمالك', 2, 'ayman.younes@zamalek.com', '+201234567811'),
  (2, 'team_manager', NULL, 'أحمد حسن المنجر', 'مدير الكرة لبيراميدز', 3, 'ahmed.hassan.manager@pyramids.com', '+201234567812'),
  (2, 'team_manager', NULL, 'طارق مصطفى المنجر', 'مدير الكرة للإسماعيلي', 4, 'tarek.mostafa.manager@ismaily.com', '+201234567813');

-- المديرون الفنيون (Technical Directors)
INSERT INTO league_participants (league_id, participant_type, user_id, person_name, role_title, team_id, email, phone)
VALUES 
  (1, 'technical_director', NULL, 'حسن شحاتة', 'مدير فني استشاري - الأهلي', 1, 'hassan.shehata@ahly.com', '+201234567830'),
  (2, 'technical_director', NULL, 'حسن شحاتة', 'مدير فني استشاري - الأهلي', 1, 'hassan.shehata@ahly.com', '+201234567830');
