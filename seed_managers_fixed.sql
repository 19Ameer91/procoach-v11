-- بيانات تجريبية لنظام مدير الفريق

-- أولاً: إضافة لاعبين احتياط للأهلي (حتى يصبح لدينا 18 لاعباً)
INSERT INTO players (team_id, name, position, jersey_number, overall_rating, pace, shooting, passing, dribbling, defending, physical, age, nationality, preferred_foot, fitness_level, morale) VALUES 
  (1, 'مصطفى شوبير', 'GK', 16, 75, 60, 45, 68, 55, 70, 78, 32, 'مصر', 'Right', 88, 82),
  (1, 'كريم فؤاد', 'DF', 3, 76, 72, 52, 70, 66, 80, 78, 27, 'مصر', 'Left', 85, 80),
  (1, 'محمد هاني', 'DF', 2, 78, 74, 54, 72, 68, 82, 76, 29, 'مصر', 'Right', 87, 81),
  (1, 'إمام عاشور', 'MF', 25, 80, 75, 70, 79, 80, 60, 72, 26, 'مصر', 'Right', 90, 85),
  (1, 'مروان عطية', 'MF', 27, 76, 70, 65, 75, 72, 58, 68, 25, 'مصر', 'Right', 88, 82),
  (1, 'كهربا', 'FW', 18, 83, 88, 78, 75, 85, 45, 70, 30, 'مصر', 'Left', 86, 79),
  (1, 'بيرسي تاو', 'FW', 23, 82, 90, 80, 72, 83, 42, 68, 29, 'جنوب أفريقيا', 'Right', 89, 83);

-- إضافة مديري فرق
INSERT INTO team_managers (user_id, team_id, full_name, email, phone, manager_role, start_date) VALUES 
  (NULL, 1, 'سيد عبد الحفيظ', 'sayed.abdelhafiz@ahly.com', '+201234567810', 'team_manager', '2023-01-01'),
  (NULL, 2, 'أيمن يونس', 'ayman.younes@zamalek.com', '+201234567811', 'team_manager', '2023-01-01'),
  (NULL, 3, 'أحمد حسن', 'ahmed.hassan@pyramids.com', '+201234567812', 'team_manager', '2023-01-01'),
  (NULL, 4, 'طارق مصطفى', 'tarek.mostafa@ismaily.com', '+201234567813', 'team_manager', '2023-01-01');

-- إضافة ألوان الزي للفرق
INSERT INTO team_kits (team_id, kit_type, season, primary_color, secondary_color, accent_color, shirt_pattern, shorts_color, socks_color, is_default) VALUES 
  -- الأهلي
  (1, 'home', '2024/2025', '#FF0000', '#FFFFFF', '#000000', 'solid', '#FFFFFF', '#FF0000', 1),
  (1, 'away', '2024/2025', '#FFFFFF', '#FF0000', '#000000', 'solid', '#FF0000', '#FFFFFF', 0),
  (1, 'goalkeeper', '2024/2025', '#00FF00', '#000000', '#FFFFFF', 'solid', '#000000', '#00FF00', 0),
  
  -- الزمالك
  (2, 'home', '2024/2025', '#FFFFFF', '#FF0000', '#000000', 'solid', '#FFFFFF', '#FFFFFF', 1),
  (2, 'away', '2024/2025', '#0000FF', '#FFFFFF', '#FF0000', 'solid', '#0000FF', '#0000FF', 0),
  (2, 'goalkeeper', '2024/2025', '#FFFF00', '#000000', '#0000FF', 'solid', '#000000', '#FFFF00', 0),
  
  -- بيراميدز
  (3, 'home', '2024/2025', '#0066CC', '#FFFFFF', '#FFD700', 'solid', '#0066CC', '#0066CC', 1),
  (3, 'away', '2024/2025', '#FFFFFF', '#0066CC', '#FFD700', 'solid', '#FFFFFF', '#FFFFFF', 0),
  
  -- الإسماعيلي
  (4, 'home', '2024/2025', '#FFFF00', '#000000', '#0000FF', 'solid', '#000000', '#FFFF00', 1),
  (4, 'away', '2024/2025', '#0000FF', '#FFFF00', '#000000', 'solid', '#0000FF', '#0000FF', 0);

-- إنشاء قائمة المباراة للمباراة 1 (الأهلي vs الزمالك - نصف النهائي)
INSERT INTO match_squads (match_id, team_id, kit_id, squad_size, starters_count, substitutes_count, is_confirmed, confirmed_by_manager_id, confirmed_at, created_by_manager_id) VALUES 
  (1, 1, 1, 18, 11, 7, 1, 1, '2024-06-14 12:00:00', 1), -- الأهلي
  (1, 2, 4, 18, 11, 7, 1, 2, '2024-06-14 12:00:00', 2); -- الزمالك

-- تسجيل لاعبي قائمة الأهلي (التشكيل الأساسي)
INSERT INTO match_squad_players (squad_id, player_id, jersey_number, position, role, formation_position, formation_order, is_fit) VALUES 
  -- حراسة المرمى
  (1, 1, 1, 'GK', 'starter', 'GK', 1, 1),
  
  -- خط الدفاع
  (1, 4, 21, 'DF', 'starter', 'LB', 2, 1),
  (1, 2, 6, 'DF', 'starter', 'CB', 3, 1),
  (1, 5, 5, 'DF', 'starter', 'CB', 4, 1),
  (1, 3, 12, 'DF', 'starter', 'RB', 5, 1),
  
  -- خط الوسط
  (1, 6, 8, 'MF', 'captain', 'CDM', 6, 1),
  (1, 7, 17, 'MF', 'starter', 'CM', 7, 1),
  (1, 8, 10, 'MF', 'starter', 'CAM', 8, 1),
  
  -- خط الهجوم
  (1, 10, 14, 'FW', 'starter', 'RW', 9, 1),
  (1, 9, 11, 'FW', 'starter', 'ST', 10, 1),
  (1, 11, 7, 'FW', 'starter', 'LW', 11, 1);

-- لاعبو الاحتياط (سيتم إضافتهم تلقائياً من اللاعبين الجدد)
-- player_id من 12 إلى 18 (7 لاعبين احتياط)
INSERT INTO match_squad_players (squad_id, player_id, jersey_number, position, role, is_fit) VALUES 
  (1, 12, 16, 'GK', 'substitute', 1),
  (1, 13, 3, 'DF', 'substitute', 1),
  (1, 14, 2, 'DF', 'substitute', 1),
  (1, 15, 25, 'MF', 'substitute', 1),
  (1, 16, 27, 'MF', 'substitute', 1),
  (1, 17, 18, 'FW', 'substitute', 1),
  (1, 18, 23, 'FW', 'substitute', 1);

-- طلبات تبديل تجريبية للمباراة المكتملة (المباراة 4)
-- player_out_id 7 (حمدي فتحي) يخرج، player_in_id 15 (إمام عاشور) يدخل
-- player_out_id 11 (طاهر محمد طاهر) يخرج، player_in_id 17 (كهربا) يدخل
INSERT INTO substitution_requests (match_id, team_id, player_out_id, player_in_id, requested_minute, request_reason, status, approved_at, approved_by_referee_id, completed_at, actual_minute, manager_notes, requested_by_manager_id, requested_at) VALUES 
  (4, 1, 7, 15, 70, 'tactical', 'completed', '2024-06-10 19:25:00', 1, '2024-06-10 19:26:00', 70, 'تبديل تكتيكي - تعزيز الهجوم', 1, '2024-06-10 19:24:00'),
  (4, 1, 11, 17, 85, 'fatigue', 'completed', '2024-06-10 19:40:00', 1, '2024-06-10 19:41:00', 85, 'إراحة اللاعب - تعب واضح', 1, '2024-06-10 19:39:00');

-- رسائل المباراة
INSERT INTO match_messages (match_id, sender_type, sender_id, receiver_type, receiver_id, message_type, message, related_request_id, is_read, read_at) VALUES 
  (4, 'manager', 1, 'referee', 1, 'substitution_request', 'طلب تبديل حمدي فتحي بسبب خطة تكتيكية', 1, 1, '2024-06-10 19:25:00'),
  (4, 'referee', 1, 'manager', 1, 'substitution_request', 'تمت الموافقة على طلب التبديل', 1, 1, '2024-06-10 19:25:30'),
  (4, 'manager', 1, 'referee', 1, 'substitution_request', 'طلب تبديل طاهر محمد طاهر للإراحة', 2, 1, '2024-06-10 19:40:00'),
  (4, 'referee', 1, 'manager', 1, 'substitution_request', 'تمت الموافقة على التبديل', 2, 1, '2024-06-10 19:40:30');

-- إحصائيات المديرين
INSERT INTO manager_statistics (manager_id, season, matches_managed, wins, draws, losses, total_substitutions, successful_substitutions, yellow_cards_received, red_cards_received) VALUES 
  (1, '2024/2025', 1, 1, 0, 0, 2, 2, 0, 0),
  (2, '2024/2025', 0, 0, 0, 0, 0, 0, 0, 0),
  (3, '2024/2025', 0, 0, 0, 0, 0, 0, 0, 0),
  (4, '2024/2025', 1, 0, 0, 1, 0, 0, 0, 0);

-- تحديث role في users لإضافة دور team_manager
UPDATE users SET role = 'team_manager' WHERE id IN (
  SELECT user_id FROM team_managers WHERE user_id IS NOT NULL
);
