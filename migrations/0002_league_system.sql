-- Pro Coach League System - نظام إدارة الدوريات
-- Migration 0002: Users, Leagues, Matches, Tournament System

-- جدول المستخدمين (Users) - للمشرفين والمدربين
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'admin', 'coach'
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ربط المدربين بالفرق
ALTER TABLE teams ADD COLUMN user_id INTEGER REFERENCES users(id);

-- جدول الدوريات (Leagues)
CREATE TABLE IF NOT EXISTS leagues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  admin_id INTEGER NOT NULL, -- المشرف الذي أنشأ الدوري
  country TEXT,
  season TEXT, -- مثال: "2024/2025"
  league_type TEXT DEFAULT 'knockout', -- 'league', 'knockout', 'group_then_knockout'
  max_teams INTEGER DEFAULT 16,
  status TEXT DEFAULT 'registration', -- 'registration', 'ongoing', 'completed'
  
  -- إعدادات الدوري
  start_date DATE,
  end_date DATE,
  match_duration INTEGER DEFAULT 90, -- مدة المباراة بالدقائق
  
  -- جوائز
  prize_first TEXT,
  prize_second TEXT,
  prize_third TEXT,
  
  logo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول دعوات الفرق (Team Invitations)
CREATE TABLE IF NOT EXISTS league_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  invitation_code TEXT UNIQUE NOT NULL, -- كود الدعوة (مثل: "LEAGUE2024-ABC123")
  max_uses INTEGER DEFAULT 1, -- عدد مرات الاستخدام (-1 = غير محدود)
  current_uses INTEGER DEFAULT 0,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_by INTEGER NOT NULL, -- المشرف
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول المشاركات في الدوري (League Participations)
CREATE TABLE IF NOT EXISTS league_participations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  joined_via_code TEXT, -- كود الدعوة المستخدم
  registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- إحصائيات الدوري (للدوري النقاط)
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  
  -- حالة في البطولة
  is_active BOOLEAN DEFAULT 1,
  elimination_round TEXT, -- الدور الذي خرج منه (Round of 16, Quarter, Semi, etc.)
  final_position INTEGER, -- المركز النهائي
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE(league_id, team_id)
);

-- جدول المباريات (Matches)
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  
  -- الفرق
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  
  -- معلومات المباراة
  match_date DATETIME,
  match_round TEXT, -- 'Group A', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'
  match_number INTEGER, -- ترتيب المباراة في الدور
  
  -- النتيجة
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished', 'postponed', 'cancelled'
  
  -- تفاصيل إضافية
  venue TEXT, -- الملعب
  referee TEXT, -- الحكم
  attendance INTEGER, -- الحضور
  
  -- للمباريات خروج المغلوب
  is_knockout BOOLEAN DEFAULT 0,
  winner_team_id INTEGER, -- الفائز (للمباريات الإقصائية)
  penalty_shootout BOOLEAN DEFAULT 0, -- هل انتهت بركلات الترجيح
  home_penalties INTEGER,
  away_penalties INTEGER,
  
  -- ربط بمباراة تالية (للشجرة)
  next_match_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id),
  FOREIGN KEY (winner_team_id) REFERENCES teams(id),
  FOREIGN KEY (next_match_id) REFERENCES matches(id)
);

-- جدول أحداث المباراة (Match Events)
CREATE TABLE IF NOT EXISTS match_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  player_id INTEGER,
  
  event_type TEXT NOT NULL, -- 'goal', 'yellow_card', 'red_card', 'substitution', 'penalty'
  minute INTEGER NOT NULL,
  additional_time INTEGER DEFAULT 0, -- الوقت الإضافي
  
  description TEXT,
  
  -- للتبديلات
  player_in_id INTEGER, -- اللاعب الداخل
  player_out_id INTEGER, -- اللاعب الخارج
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (player_in_id) REFERENCES players(id),
  FOREIGN KEY (player_out_id) REFERENCES players(id)
);

-- جدول التشكيلة الأساسية (Match Lineups)
CREATE TABLE IF NOT EXISTS match_lineups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  position TEXT NOT NULL, -- المركز في التشكيلة
  is_starter BOOLEAN DEFAULT 1, -- أساسي أم احتياطي
  jersey_number INTEGER,
  
  -- إحصائيات اللاعب في المباراة
  minutes_played INTEGER DEFAULT 0,
  rating REAL, -- تقييم الأداء
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- جدول هيكل البطولة (Tournament Bracket)
CREATE TABLE IF NOT EXISTS tournament_bracket (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  round_name TEXT NOT NULL, -- 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'
  round_order INTEGER NOT NULL, -- 1, 2, 3, 4
  bracket_position INTEGER, -- موقع في الشجرة
  match_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- جدول إحصائيات اللاعبين في الدوري (League Player Stats)
CREATE TABLE IF NOT EXISTS league_player_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  
  -- إحصائيات
  matches_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE(league_id, player_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_leagues_admin_id ON leagues(admin_id);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status);
CREATE INDEX IF NOT EXISTS idx_league_invitations_code ON league_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_league_participations_league_id ON league_participations(league_id);
CREATE INDEX IF NOT EXISTS idx_league_participations_team_id ON league_participations(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_league_id ON matches(league_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_lineups_match_id ON match_lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_bracket_league_id ON tournament_bracket(league_id);
CREATE INDEX IF NOT EXISTS idx_league_player_stats_league_id ON league_player_stats(league_id);
CREATE INDEX IF NOT EXISTS idx_league_player_stats_player_id ON league_player_stats(player_id);
