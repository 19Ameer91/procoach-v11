-- بيانات تجريبية لنظام Pro Coach

-- إضافة فريق تجريبي
INSERT INTO teams (name, country, league, coach_name, formation) VALUES 
  ('النادي الأهلي', 'مصر', 'الدوري المصري', 'محمد أحمد', '4-3-3'),
  ('الزمالك', 'مصر', 'الدوري المصري', 'أحمد حسن', '4-4-2');

-- إضافة لاعبين للفريق الأول (ID: 1)
INSERT INTO players (team_id, name, position, jersey_number, overall_rating, pace, shooting, passing, dribbling, defending, physical, age, nationality, preferred_foot, fitness_level, morale) VALUES
  -- حراس مرمى
  (1, 'محمد الشناوي', 'GK', 1, 85, 50, 40, 60, 45, 85, 80, 34, 'مصر', 'Right', 95, 85),
  
  -- مدافعون
  (1, 'ياسر إبراهيم', 'DF', 6, 82, 70, 45, 72, 65, 88, 85, 30, 'مصر', 'Right', 92, 80),
  (1, 'محمود متولي', 'DF', 12, 80, 75, 50, 70, 68, 85, 82, 28, 'مصر', 'Left', 90, 82),
  (1, 'علي معلول', 'DF', 21, 83, 78, 55, 74, 70, 82, 80, 33, 'تونس', 'Left', 88, 85),
  (1, 'رامي ربيعة', 'DF', 5, 81, 68, 48, 71, 64, 86, 84, 35, 'مصر', 'Right', 85, 78),
  
  -- وسط ميدان
  (1, 'أليو ديانغ', 'MF', 8, 84, 72, 70, 80, 75, 78, 88, 30, 'مالي', 'Right', 93, 88),
  (1, 'حمدي فتحي', 'MF', 17, 79, 70, 65, 76, 72, 75, 80, 29, 'مصر', 'Right', 91, 80),
  (1, 'أفشة', 'MF', 10, 87, 80, 78, 85, 88, 60, 72, 28, 'مصر', 'Right', 94, 90),
  
  -- مهاجمون
  (1, 'محمد شريف', 'FW', 11, 86, 85, 88, 75, 80, 45, 78, 28, 'مصر', 'Right', 95, 88),
  (1, 'حسين الشحات', 'FW', 14, 84, 88, 80, 78, 85, 50, 70, 31, 'مصر', 'Right', 90, 85),
  (1, 'طاهر محمد طاهر', 'FW', 7, 82, 90, 75, 72, 83, 48, 68, 26, 'مصر', 'Left', 92, 82);

-- إضافة خطة تدريبية شاملة
INSERT INTO training_plans (team_id, name, description, duration_weeks, focus_area, intensity, target_fitness, target_morale, start_date, end_date) VALUES
  (1, 'خطة الإعداد البدني - المرحلة الأولى', 'برنامج تدريبي مكثف لتحسين اللياقة البدنية والقوة للاعبين', 4, 'Physical', 'High', 95, 85, date('now'), date('now', '+4 weeks')),
  (1, 'تطوير المهارات الفنية', 'التركيز على تحسين التمرير والسيطرة على الكرة', 3, 'Technical', 'Medium', 90, 88, date('now', '+4 weeks'), date('now', '+7 weeks')),
  (1, 'التكتيكات والخطط', 'تدريب على التشكيلات والتحركات الجماعية', 2, 'Tactical', 'Medium', 92, 90, date('now', '+7 weeks'), date('now', '+9 weeks'));

-- إضافة جلسات تدريبية للخطة الأولى
INSERT INTO training_sessions (plan_id, session_number, title, description, session_type, duration_minutes, fitness_impact, morale_impact, fatigue_impact, drills) VALUES
  (1, 1, 'تدريب القوة والتحمل', 'جلسة تركز على تطوير القوة العضلية والتحمل العام', 'Strength', 90, 8, 2, 7, '[{"name": "تمارين الأثقال", "duration": 30, "sets": 3}, {"name": "الجري المتواصل", "duration": 20, "distance": "5km"}, {"name": "تمارين البطن", "duration": 15, "reps": 50}]'),
  (1, 2, 'السرعة والرشاقة', 'تحسين سرعة الانطلاق وسرعة التغيير', 'Speed', 75, 6, 3, 6, '[{"name": "سباقات قصيرة", "duration": 20, "distance": "30m x 10"}, {"name": "تمارين الرشاقة", "duration": 25, "cones": true}, {"name": "القفز", "duration": 15}]'),
  (1, 3, 'التحمل الدائري', 'تدريب دائري متنوع لجميع عضلات الجسم', 'Endurance', 90, 9, 1, 8, '[{"name": "محطات متنوعة", "duration": 60, "stations": 8}, {"name": "جري استشفائي", "duration": 20}]'),
  (1, 4, 'الاستشفاء النشط', 'جلسة خفيفة للاستشفاء والاسترخاء', 'Recovery', 60, 2, 5, -5, '[{"name": "تمارين الإطالة", "duration": 20}, {"name": "جري خفيف", "duration": 15}, {"name": "يوجا رياضية", "duration": 25}]');

-- إضافة حضور اللاعبين
INSERT INTO player_attendance (session_id, player_id, attended, performance_rating, notes) VALUES
  -- الجلسة 1
  (1, 1, 1, 8, 'أداء ممتاز في تمارين القوة'),
  (1, 2, 1, 9, 'تحسن ملحوظ في التحمل'),
  (1, 3, 1, 7, 'جيد لكن يحتاج المزيد من التركيز'),
  (1, 4, 1, 8, 'أداء قوي'),
  (1, 5, 1, 7, 'جيد'),
  (1, 6, 1, 9, 'ممتاز في جميع التمارين'),
  (1, 7, 1, 8, 'أداء جيد جداً'),
  (1, 8, 1, 9, 'الأفضل في المجموعة'),
  (1, 9, 1, 8, 'قوي وملتزم'),
  (1, 10, 1, 7, 'جيد'),
  (1, 11, 1, 8, 'سريع ورشيق');

-- إضافة تشكيلات وتكتيكات
INSERT INTO tactics (team_id, name, formation, attacking_style, defensive_style, tempo, width, is_default, player_instructions) VALUES
  (1, 'الهجوم الكامل', '4-3-3', 'Possession', 'High Press', 'Fast', 'Wide', 1, '{"forwards": "Stay Central, Get in Behind", "midfielders": "Support Attack", "defenders": "Play Out from Back"}'),
  (1, 'الدفاع المنظم', '4-5-1', 'Counter-Attack', 'Low Block', 'Medium', 'Narrow', 0, '{"forwards": "Target Man", "midfielders": "Stay Back", "defenders": "Deep Defensive Line"}'),
  (1, 'الضغط العالي', '4-2-3-1', 'Wing Play', 'High Press', 'Fast', 'Wide', 0, '{"wingers": "Cut Inside", "fullbacks": "Overlap", "midfielders": "Press Aggressively"}');

-- إضافة تقرير تقدم
INSERT INTO progress_reports (team_id, player_id, report_type, period_start, period_end, sessions_completed, average_attendance, average_performance, fitness_change, morale_change, summary, recommendations) VALUES
  (1, NULL, 'team', date('now', '-1 week'), date('now'), 4, 95.5, 8.1, 5, 3, 'الفريق يظهر تحسناً ملحوظاً في اللياقة البدنية. معنويات اللاعبين عالية والالتزام ممتاز.', 'الاستمرار في البرنامج الحالي مع إضافة المزيد من التدريبات التكتيكية في الأسبوع القادم.'),
  (1, 9, 'player', date('now', '-1 week'), date('now'), 4, 100, 8.5, 3, 5, 'محمد شريف يظهر تطوراً كبيراً في اللياقة والقوة البدنية. التزامه بالتدريبات ممتاز.', 'التركيز على تحسين التمرير والقدرة على اللعب بالظهر للمرمى.');
