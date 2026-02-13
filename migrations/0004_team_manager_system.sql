-- Pro Coach Team Manager System - نظام إدارة الفريق
-- Migration 0004: Team Managers, Match Squads, Substitution Requests, Kit Colors

-- جدول مديري الفرق (Team Managers)
CREATE TABLE IF NOT EXISTS team_managers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  team_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  
  -- معلومات الإدارة
  manager_role TEXT DEFAULT 'team_manager', -- 'team_manager', 'assistant_manager', 'kit_manager'
  start_date DATE,
  
  -- حالة
  is_active BOOLEAN DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- جدول ألوان الزي الرياضي (Team Kits)
CREATE TABLE IF NOT EXISTS team_kits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  
  -- نوع الزي
  kit_type TEXT NOT NULL, -- 'home', 'away', 'third', 'goalkeeper'
  season TEXT, -- '2024/2025'
  
  -- الألوان
  primary_color TEXT NOT NULL, -- '#FF0000' (red)
  secondary_color TEXT, -- '#FFFFFF' (white)
  accent_color TEXT, -- '#000000' (black)
  
  -- تفاصيل التصميم
  shirt_pattern TEXT, -- 'solid', 'stripes_vertical', 'stripes_horizontal', 'gradient'
  shorts_color TEXT NOT NULL,
  socks_color TEXT NOT NULL,
  
  -- صورة الزي
  kit_image_url TEXT,
  
  -- حالة
  is_active BOOLEAN DEFAULT 1,
  is_default BOOLEAN DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- جدول قائمة المباراة (Match Squad)
-- القائمة المسجلة للمباراة قبل بدايتها
CREATE TABLE IF NOT EXISTS match_squads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  
  -- معلومات الزي
  kit_id INTEGER, -- الزي المستخدم في المباراة
  
  -- معلومات القائمة
  squad_size INTEGER DEFAULT 18, -- عدد اللاعبين في القائمة
  starters_count INTEGER DEFAULT 11, -- عدد الأساسيين
  substitutes_count INTEGER DEFAULT 7, -- عدد الاحتياطيين
  
  -- حالة التسجيل
  is_confirmed BOOLEAN DEFAULT 0, -- هل تم تأكيد القائمة
  confirmed_by_manager_id INTEGER,
  confirmed_at DATETIME,
  
  -- موافقة الحكم
  approved_by_referee_id INTEGER,
  approved_at DATETIME,
  
  created_by_manager_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (kit_id) REFERENCES team_kits(id),
  FOREIGN KEY (confirmed_by_manager_id) REFERENCES team_managers(id),
  FOREIGN KEY (approved_by_referee_id) REFERENCES referees(id),
  FOREIGN KEY (created_by_manager_id) REFERENCES team_managers(id),
  UNIQUE(match_id, team_id)
);

-- جدول لاعبي قائمة المباراة (Squad Players)
CREATE TABLE IF NOT EXISTS match_squad_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  
  -- رقم القميص للمباراة
  jersey_number INTEGER NOT NULL,
  
  -- المركز والدور
  position TEXT NOT NULL, -- 'GK', 'DF', 'MF', 'FW'
  role TEXT NOT NULL, -- 'starter', 'substitute', 'captain', 'vice_captain'
  
  -- المركز في التشكيلة
  formation_position TEXT, -- 'GK', 'LB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'
  formation_order INTEGER, -- ترتيب اللاعب في التشكيلة
  
  -- حالة اللاعب
  is_fit BOOLEAN DEFAULT 1, -- هل اللاعب لائق
  is_suspended BOOLEAN DEFAULT 0, -- هل اللاعب موقوف
  
  -- ملاحظات
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (squad_id) REFERENCES match_squads(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE(squad_id, player_id)
);

-- جدول طلبات التبديل (Substitution Requests)
CREATE TABLE IF NOT EXISTS substitution_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  
  -- التبديل
  player_out_id INTEGER NOT NULL, -- اللاعب الخارج
  player_in_id INTEGER NOT NULL, -- اللاعب الداخل
  
  -- معلومات الطلب
  requested_minute INTEGER, -- الدقيقة المطلوبة
  request_reason TEXT, -- 'tactical', 'injury', 'fatigue', 'yellow_card_risk'
  
  -- حالة الطلب
  status TEXT DEFAULT 'pending', 
  -- 'pending': في انتظار موافقة الحكم
  -- 'approved': تمت الموافقة
  -- 'completed': تم التنفيذ
  -- 'rejected': تم الرفض
  -- 'cancelled': تم الإلغاء من المدير
  
  -- توقيت الموافقة والتنفيذ
  approved_at DATETIME,
  approved_by_referee_id INTEGER,
  completed_at DATETIME,
  actual_minute INTEGER, -- الدقيقة الفعلية للتبديل
  
  -- ملاحظات
  manager_notes TEXT,
  referee_notes TEXT,
  
  -- من قام بالطلب
  requested_by_manager_id INTEGER NOT NULL,
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (player_out_id) REFERENCES players(id),
  FOREIGN KEY (player_in_id) REFERENCES players(id),
  FOREIGN KEY (approved_by_referee_id) REFERENCES referees(id),
  FOREIGN KEY (requested_by_manager_id) REFERENCES team_managers(id)
);

-- جدول رسائل المباراة (Match Messages)
-- للتواصل بين مدير الفريق والحكم
CREATE TABLE IF NOT EXISTS match_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  
  -- المرسل والمستقبل
  sender_type TEXT NOT NULL, -- 'manager', 'referee'
  sender_id INTEGER NOT NULL,
  receiver_type TEXT NOT NULL, -- 'manager', 'referee'
  receiver_id INTEGER,
  
  -- نوع الرسالة
  message_type TEXT NOT NULL, 
  -- 'substitution_request', 'injury_report', 'protest', 'question', 'general'
  
  -- المحتوى
  message TEXT NOT NULL,
  related_request_id INTEGER, -- ربط مع طلب تبديل
  
  -- حالة القراءة
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (related_request_id) REFERENCES substitution_requests(id)
);

-- جدول إحصائيات المدير (Manager Statistics)
CREATE TABLE IF NOT EXISTS manager_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manager_id INTEGER NOT NULL,
  season TEXT,
  
  -- إحصائيات
  matches_managed INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  
  -- التبديلات
  total_substitutions INTEGER DEFAULT 0,
  successful_substitutions INTEGER DEFAULT 0, -- التبديلات التي أثرت إيجابياً
  
  -- الانضباط
  yellow_cards_received INTEGER DEFAULT 0,
  red_cards_received INTEGER DEFAULT 0,
  
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (manager_id) REFERENCES team_managers(id) ON DELETE CASCADE,
  UNIQUE(manager_id, season)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_managers_user_id ON team_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_team_managers_team_id ON team_managers(team_id);
CREATE INDEX IF NOT EXISTS idx_team_kits_team_id ON team_kits(team_id);
CREATE INDEX IF NOT EXISTS idx_team_kits_type ON team_kits(kit_type);
CREATE INDEX IF NOT EXISTS idx_match_squads_match_id ON match_squads(match_id);
CREATE INDEX IF NOT EXISTS idx_match_squads_team_id ON match_squads(team_id);
CREATE INDEX IF NOT EXISTS idx_match_squad_players_squad_id ON match_squad_players(squad_id);
CREATE INDEX IF NOT EXISTS idx_match_squad_players_player_id ON match_squad_players(player_id);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_match_id ON substitution_requests(match_id);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_status ON substitution_requests(status);
CREATE INDEX IF NOT EXISTS idx_match_messages_match_id ON match_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_match_messages_receiver ON match_messages(receiver_type, receiver_id);
CREATE INDEX IF NOT EXISTS idx_manager_statistics_manager_id ON manager_statistics(manager_id);
