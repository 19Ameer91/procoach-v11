-- بيانات تجريبية لنظام سوق الانتقالات والإعارات

-- تسجيل لاعبي الأهلي في السجل الوطني (بأرقام مدنية)
INSERT INTO player_registry (national_id, full_name, birth_date, nationality, position, preferred_foot, height, weight, is_verified, verified_at, verified_by_admin_id) VALUES 
  ('29012199012345', 'محمد الشناوي', '1990-01-29', 'مصر', 'GK', 'Right', 188, 84, 1, '2024-01-01 10:00:00', 1),
  ('29506199112346', 'ياسر إبراهيم', '1991-06-29', 'مصر', 'DF', 'Right', 183, 78, 1, '2024-01-01 10:00:00', 1),
  ('15081993123457', 'محمود متولي', '1993-08-15', 'مصر', 'DF', 'Right', 175, 72, 1, '2024-01-01 10:00:00', 1),
  ('10021988123458', 'علي معلول', '1988-02-10', 'تونس', 'DF', 'Left', 181, 76, 1, '2024-01-01 10:00:00', 1),
  ('12031989123459', 'رامي ربيعة', '1989-03-12', 'مصر', 'DF', 'Right', 186, 82, 1, '2024-01-01 10:00:00', 1),
  ('07041994123460', 'أليو ديانغ', '1994-04-07', 'مالي', 'MF', 'Right', 183, 80, 1, '2024-01-01 10:00:00', 1),
  ('20081995123461', 'حمدي فتحي', '1995-08-20', 'مصر', 'MF', 'Right', 178, 74, 1, '2024-01-01 10:00:00', 1),
  ('12071993123462', 'أفشة', '1993-07-12', 'مصر', 'MF', 'Right', 172, 68, 1, '2024-01-01 10:00:00', 1),
  ('06051995123463', 'محمد شريف', '1995-05-06', 'مصر', 'FW', 'Right', 180, 75, 1, '2024-01-01 10:00:00', 1),
  ('01031994123464', 'حسين الشحات', '1994-03-01', 'مصر', 'FW', 'Right', 176, 70, 1, '2024-01-01 10:00:00', 1),
  ('18091996123465', 'طاهر محمد طاهر', '1996-09-18', 'مصر', 'FW', 'Left', 174, 69, 1, '2024-01-01 10:00:00', 1);

-- ربط اللاعبين بالفرق (عقود دائمة)
INSERT INTO player_team_contracts (player_registry_id, player_id, team_id, contract_type, contract_start_date, contract_end_date, jersey_number, salary_amount, contract_status) VALUES 
  (1, 1, 1, 'permanent', '2022-07-01', '2026-06-30', 1, 150000.00, 'active'),
  (2, 2, 1, 'permanent', '2022-07-01', '2025-06-30', 6, 120000.00, 'active'),
  (3, 3, 1, 'permanent', '2023-01-01', '2026-06-30', 12, 100000.00, 'active'),
  (4, 4, 1, 'permanent', '2019-07-01', '2025-06-30', 21, 180000.00, 'active'),
  (5, 5, 1, 'permanent', '2020-07-01', '2025-06-30', 5, 130000.00, 'active'),
  (6, 6, 1, 'permanent', '2021-07-01', '2026-06-30', 8, 200000.00, 'active'),
  (7, 7, 1, 'permanent', '2022-07-01', '2025-06-30', 17, 110000.00, 'active'),
  (8, 8, 1, 'permanent', '2021-07-01', '2026-06-30', 10, 190000.00, 'active'),
  (9, 9, 1, 'permanent', '2023-07-01', '2027-06-30', 11, 140000.00, 'active'),
  (10, 10, 1, 'permanent', '2021-07-01', '2025-06-30', 14, 160000.00, 'active'),
  (11, 11, 1, 'permanent', '2023-01-01', '2026-06-30', 7, 120000.00, 'active');

-- تسجيل اللاعبين في الدوري (كأس البطولة المصرية 2024)
INSERT INTO league_player_registrations (league_id, season, player_registry_id, current_team_id, registration_status, is_eligible) VALUES 
  (1, '2024/2025', 1, 1, 'active', 1),
  (1, '2024/2025', 2, 1, 'active', 1),
  (1, '2024/2025', 3, 1, 'active', 1),
  (1, '2024/2025', 4, 1, 'active', 1),
  (1, '2024/2025', 5, 1, 'active', 1),
  (1, '2024/2025', 6, 1, 'active', 1),
  (1, '2024/2025', 7, 1, 'active', 1),
  (1, '2024/2025', 8, 1, 'active', 1),
  (1, '2024/2025', 9, 1, 'active', 1),
  (1, '2024/2025', 10, 1, 'active', 1),
  (1, '2024/2025', 11, 1, 'active', 1);

-- لاعبون معروضون في سوق الانتقالات
-- اللاعب 7 (حمدي فتحي) معروض للإعارة
INSERT INTO transfer_market (
  player_registry_id, current_team_id, listed_by_manager_id, 
  listing_type, loan_duration_months, loan_fee, salary_contribution_percentage,
  available_from_date, listing_expires_at, description, listing_status
) VALUES 
  (7, 1, 1, 'loan', 6, 50000.00, 30, '2024-06-20', '2024-07-31 23:59:59', 
   'لاعب وسط متميز ذو خبرة، متاح للإعارة لمدة 6 أشهر. فرصة ممتازة لتعزيز خط الوسط.', 'active'),
  
  (3, 1, 1, 'loan', 12, 80000.00, 20, '2024-06-20', '2024-08-31 23:59:59',
   'مدافع شاب واعد، يحتاج للمشاركة الأساسية. متاح للإعارة الموسمية.', 'active');

-- عروض على اللاعبين المعروضين
-- عرض من بيراميدز على حمدي فتحي (listing_id = 1)
INSERT INTO transfer_offers (
  market_listing_id, offering_team_id, offering_manager_id,
  offer_type, loan_duration_months, loan_fee_offered, 
  salary_contribution_offered, offered_jersey_number,
  offer_message, offer_status, offer_expires_at
) VALUES 
  (1, 3, 3, 'loan', 6, 55000.00, 40, 15, 
   'نحن مهتمون بضم اللاعب للموسم المقبل. نقدم نسبة أعلى من المساهمة في الراتب وفرصة المشاركة الأساسية.', 
   'pending', '2024-07-10 23:59:59'),
   
  (1, 4, 4, 'loan', 6, 50000.00, 35, 8,
   'نرغب في إعارة اللاعب مع ضمان المشاركة في جميع المباريات الرسمية.', 
   'pending', '2024-07-12 23:59:59');

-- عرض مقبول سابقاً (مثال)
INSERT INTO transfer_offers (
  market_listing_id, offering_team_id, offering_manager_id,
  offer_type, loan_duration_months, loan_fee_offered,
  salary_contribution_offered, offered_jersey_number,
  offer_message, offer_status, responded_at, response_message
) VALUES 
  (2, 4, 4, 'loan', 12, 85000.00, 25, 5,
   'نحتاج مدافع بهذه المواصفات. نقدم عقد إعارة كامل الموسم مع خيار الشراء.',
   'rejected', '2024-06-25 14:30:00', 'نشكركم على العرض، لكن القرار النهائي هو عدم إعارة اللاعب في الوقت الحالي.');

-- إشعارات سوق الانتقالات
INSERT INTO transfer_notifications (
  notification_type, related_listing_id, related_offer_id,
  recipient_manager_id, sender_manager_id, title, message, is_read
) VALUES 
  ('new_offer', 1, 1, 1, 3, 'عرض جديد على حمدي فتحي', 
   'تلقيت عرضاً من بيراميدز لإعارة حمدي فتحي لمدة 6 أشهر برسوم 55,000 جنيه ومساهمة 40% في الراتب.', 0),
   
  ('new_offer', 1, 2, 1, 4, 'عرض جديد على حمدي فتحي',
   'تلقيت عرضاً من الإسماعيلي لإعارة حمدي فتحي لمدة 6 أشهر برسوم 50,000 جنيه ومساهمة 35% في الراتب.', 0),
   
  ('offer_rejected', 2, 3, 4, 1, 'تم رفض عرضك',
   'تم رفض عرضك لإعارة محمود متولي. السبب: القرار النهائي هو عدم إعارة اللاعب في الوقت الحالي.', 1);

-- سجل انتقالات تاريخية (مثال)
INSERT INTO transfer_history (
  player_registry_id, from_team_id, to_team_id, transfer_type,
  transfer_fee, transfer_date, season, contract_duration_years, notes
) VALUES 
  (6, NULL, 1, 'permanent', 3500000.00, '2021-07-15', '2021/2022', 5.0, 
   'انتقال من نادي ريال مايوركا الإسباني'),
   
  (4, NULL, 1, 'permanent', 2000000.00, '2019-07-20', '2019/2020', 6.0,
   'انتقال من الترجي التونسي');

-- لاعب جديد يحاول التسجيل (طلب مراجعة)
INSERT INTO player_registry (national_id, full_name, birth_date, nationality, position, preferred_foot, height, weight, is_verified) VALUES 
  ('05091998123470', 'أحمد محمد السيد', '1998-09-05', 'مصر', 'MF', 'Right', 175, 71, 0);

INSERT INTO player_registration_reviews (
  player_registry_id, team_id, league_id, submitted_by_manager_id,
  national_id, full_name, birth_date, review_status, notes
) VALUES 
  (12, 2, 1, 2, '05091998123470', 'أحمد محمد السيد', '1998-09-05', 'pending',
   'لاعب جديد من القطاع الشبابي يرغب في الانضمام للفريق الأول');
