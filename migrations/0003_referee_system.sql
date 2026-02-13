-- Pro Coach Referee System - نظام التحكيم الإلكتروني
-- Migration 0003: Referees, Live Match Control, Player Records

-- جدول الحكام (Referees)
CREATE TABLE IF NOT EXISTS referees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE, -- ربط بحساب المستخدم (اختياري)
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  
  -- معلومات التحكيم
  license_number TEXT UNIQUE,
  license_level TEXT, -- 'International', 'National', 'Regional', 'Local'
  specialization TEXT, -- 'Main Referee', 'Assistant Referee', 'Fourth Official', 'VAR'
  
  -- خبرة
  years_experience INTEGER DEFAULT 0,
  matches_refereed INTEGER DEFAULT 0,
  
  -- حالة
  is_active BOOLEAN DEFAULT 1,
  is_available BOOLEAN DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ربط الحكام بالمباريات (Match Referees)
CREATE TABLE IF NOT EXISTS match_referees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  referee_id INTEGER NOT NULL,
  role TEXT NOT NULL, -- 'main', 'assistant_1', 'assistant_2', 'fourth_official', 'var'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (referee_id) REFERENCES referees(id),
  UNIQUE(match_id, referee_id)
);

-- سجل الأحداث المباشرة للمباراة (Live Match Events Log)
CREATE TABLE IF NOT EXISTS live_match_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  referee_id INTEGER NOT NULL, -- الحكم الذي سجل الحدث
  
  -- نوع الحدث
  event_type TEXT NOT NULL, 
  -- 'kickoff', 'goal', 'own_goal', 'penalty_goal', 'penalty_miss',
  -- 'yellow_card', 'red_card', 'second_yellow',
  -- 'substitution', 'injury', 'var_check', 'var_decision',
  -- 'halftime', 'fulltime', 'extra_time_start', 'extra_time_end'
  
  -- التوقيت
  minute INTEGER NOT NULL,
  additional_time INTEGER DEFAULT 0,
  half TEXT, -- '1st_half', '2nd_half', 'extra_time_1', 'extra_time_2'
  
  -- تفاصيل الحدث
  team_id INTEGER,
  player_id INTEGER, -- اللاعب المعني
  
  -- للأهداف
  assist_player_id INTEGER, -- صانع الهدف
  goal_type TEXT, -- 'open_play', 'penalty', 'free_kick', 'corner', 'own_goal'
  
  -- للبطاقات
  card_reason TEXT, -- سبب البطاقة
  
  -- للتبديلات
  player_out_id INTEGER, -- اللاعب الخارج
  player_in_id INTEGER, -- اللاعب الداخل
  
  -- VAR
  var_decision TEXT, -- 'goal_allowed', 'goal_disallowed', 'penalty_given', 'penalty_cancelled', 'card_upgraded', 'card_cancelled'
  original_decision TEXT,
  
  description TEXT,
  is_cancelled BOOLEAN DEFAULT 0, -- إذا تم إلغاء الحدث
  cancelled_by_referee_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (referee_id) REFERENCES referees(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (assist_player_id) REFERENCES players(id),
  FOREIGN KEY (player_out_id) REFERENCES players(id),
  FOREIGN KEY (player_in_id) REFERENCES players(id),
  FOREIGN KEY (cancelled_by_referee_id) REFERENCES referees(id)
);

-- سجل اللاعب في الدوري (Player League Record)
-- يتم تحديثه تلقائياً مع كل حدث
CREATE TABLE IF NOT EXISTS player_league_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  
  -- إحصائيات المباريات
  matches_played INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  matches_started INTEGER DEFAULT 0, -- مباريات كأساسي
  matches_substitute INTEGER DEFAULT 0, -- مباريات كبديل
  
  -- الأهداف
  goals INTEGER DEFAULT 0,
  penalties_scored INTEGER DEFAULT 0,
  penalties_missed INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  own_goals INTEGER DEFAULT 0,
  
  -- البطاقات
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  total_suspensions INTEGER DEFAULT 0, -- عدد مباريات الإيقاف
  current_suspension INTEGER DEFAULT 0, -- مباريات الإيقاف المتبقية
  
  -- الأخطاء
  fouls_committed INTEGER DEFAULT 0,
  fouls_suffered INTEGER DEFAULT 0,
  
  -- التبديلات
  times_substituted_off INTEGER DEFAULT 0,
  times_substituted_on INTEGER DEFAULT 0,
  
  -- حالة اللاعب
  is_suspended BOOLEAN DEFAULT 0,
  is_injured BOOLEAN DEFAULT 0,
  injury_return_date DATE,
  
  -- آخر تحديث
  last_match_id INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (last_match_id) REFERENCES matches(id),
  UNIQUE(league_id, player_id)
);

-- سجل العقوبات والإيقافات (Disciplinary Records)
CREATE TABLE IF NOT EXISTS disciplinary_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  
  -- نوع العقوبة
  offense_type TEXT NOT NULL, -- 'yellow_card', 'red_card', 'violent_conduct', 'unsporting_behavior'
  offense_details TEXT,
  
  -- الإيقاف
  suspension_matches INTEGER DEFAULT 0, -- عدد المباريات
  suspension_start_date DATE,
  suspension_end_date DATE,
  
  -- الغرامة (إن وجدت)
  fine_amount REAL,
  fine_currency TEXT,
  
  -- حالة
  status TEXT DEFAULT 'active', -- 'active', 'served', 'appealed', 'cancelled'
  
  issued_by_referee_id INTEGER,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (issued_by_referee_id) REFERENCES referees(id)
);

-- جلسة التحكيم المباشرة (Live Refereeing Session)
-- للتحكم في المباراة جارية
CREATE TABLE IF NOT EXISTS live_refereeing_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER UNIQUE NOT NULL,
  main_referee_id INTEGER NOT NULL,
  
  -- حالة المباراة
  match_status TEXT DEFAULT 'pre_match', 
  -- 'pre_match', 'first_half', 'halftime', 'second_half', 
  -- 'extra_time_1', 'extra_time_2', 'penalty_shootout', 'finished'
  
  -- التوقيت
  kickoff_time DATETIME,
  halftime_start DATETIME,
  second_half_start DATETIME,
  fulltime DATETIME,
  
  -- الوقت الحالي
  current_minute INTEGER DEFAULT 0,
  current_additional_time INTEGER DEFAULT 0,
  
  -- النتيجة الحالية
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  
  -- ركلات الترجيح
  home_penalties INTEGER DEFAULT 0,
  away_penalties INTEGER DEFAULT 0,
  
  -- ملاحظات الحكم
  referee_notes TEXT,
  
  -- إعدادات
  first_half_added_time INTEGER DEFAULT 0,
  second_half_added_time INTEGER DEFAULT 0,
  
  started_at DATETIME,
  ended_at DATETIME,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (main_referee_id) REFERENCES referees(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referees_email ON referees(email);
CREATE INDEX IF NOT EXISTS idx_referees_license ON referees(license_number);
CREATE INDEX IF NOT EXISTS idx_match_referees_match_id ON match_referees(match_id);
CREATE INDEX IF NOT EXISTS idx_match_referees_referee_id ON match_referees(referee_id);
CREATE INDEX IF NOT EXISTS idx_live_match_log_match_id ON live_match_log(match_id);
CREATE INDEX IF NOT EXISTS idx_live_match_log_player_id ON live_match_log(player_id);
CREATE INDEX IF NOT EXISTS idx_live_match_log_event_type ON live_match_log(event_type);
CREATE INDEX IF NOT EXISTS idx_player_league_records_league_id ON player_league_records(league_id);
CREATE INDEX IF NOT EXISTS idx_player_league_records_player_id ON player_league_records(player_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_records_player_id ON disciplinary_records(player_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_records_status ON disciplinary_records(status);
CREATE INDEX IF NOT EXISTS idx_live_refereeing_sessions_match_id ON live_refereeing_sessions(match_id);
