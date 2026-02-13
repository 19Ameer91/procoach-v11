-- Pro Coach Training System Database Schema
-- نظام التدريب الاحترافي للمدربين

-- جدول الفرق (Teams)
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  country TEXT,
  league TEXT,
  logo_url TEXT,
  coach_name TEXT NOT NULL,
  formation TEXT DEFAULT '4-3-3',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول اللاعبين (Players)
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL, -- GK, DF, MF, FW
  jersey_number INTEGER,
  
  -- FIFA-style ratings (0-100)
  overall_rating INTEGER DEFAULT 70,
  pace INTEGER DEFAULT 70,
  shooting INTEGER DEFAULT 70,
  passing INTEGER DEFAULT 70,
  dribbling INTEGER DEFAULT 70,
  defending INTEGER DEFAULT 70,
  physical INTEGER DEFAULT 70,
  
  -- Player info
  age INTEGER,
  nationality TEXT,
  preferred_foot TEXT, -- Left, Right, Both
  
  -- Training progress
  training_progress INTEGER DEFAULT 0, -- نسبة التقدم في التدريب
  fitness_level INTEGER DEFAULT 100, -- مستوى اللياقة
  morale INTEGER DEFAULT 75, -- معنويات اللاعب
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- جدول الخطط التدريبية (Training Plans)
CREATE TABLE IF NOT EXISTS training_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER DEFAULT 4, -- مدة الخطة بالأسابيع
  focus_area TEXT NOT NULL, -- Physical, Technical, Tactical, Mental
  intensity TEXT DEFAULT 'Medium', -- Low, Medium, High
  status TEXT DEFAULT 'active', -- active, completed, archived
  
  -- أهداف الخطة
  target_fitness INTEGER, -- الهدف للياقة
  target_morale INTEGER, -- الهدف للمعنويات
  
  start_date DATE,
  end_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- جدول الجلسات التدريبية (Training Sessions)
CREATE TABLE IF NOT EXISTS training_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  session_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL, -- Strength, Endurance, Speed, Skills, Tactics, Recovery
  duration_minutes INTEGER DEFAULT 90,
  
  -- تأثير الجلسة على الصفات
  fitness_impact INTEGER DEFAULT 0, -- -10 to +10
  morale_impact INTEGER DEFAULT 0,
  fatigue_impact INTEGER DEFAULT 5, -- كمية التعب
  
  -- تفاصيل التمارين
  drills TEXT, -- JSON array of drill details
  
  completed BOOLEAN DEFAULT 0,
  completion_date DATETIME,
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
);

-- جدول حضور اللاعبين في التدريبات (Player Attendance)
CREATE TABLE IF NOT EXISTS player_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  attended BOOLEAN DEFAULT 1,
  performance_rating INTEGER, -- 1-10 تقييم أداء اللاعب في الجلسة
  notes TEXT,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- جدول تقارير التقدم (Progress Reports)
CREATE TABLE IF NOT EXISTS progress_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  player_id INTEGER,
  report_type TEXT NOT NULL, -- team, player
  period_start DATE,
  period_end DATE,
  
  -- إحصائيات
  sessions_completed INTEGER DEFAULT 0,
  average_attendance REAL,
  average_performance REAL,
  fitness_change INTEGER,
  morale_change INTEGER,
  
  summary TEXT,
  recommendations TEXT, -- توصيات للمدرب
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
);

-- جدول التشكيلات والتكتيكات (Formations & Tactics)
CREATE TABLE IF NOT EXISTS tactics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  formation TEXT NOT NULL, -- 4-3-3, 4-4-2, 3-5-2, etc.
  
  -- أسلوب اللعب
  attacking_style TEXT, -- Possession, Counter-Attack, Long Ball, Wing Play
  defensive_style TEXT, -- High Press, Low Block, Zone Defense, Man Marking
  tempo TEXT, -- Slow, Medium, Fast
  width TEXT, -- Narrow, Balanced, Wide
  
  -- تعليمات اللاعبين (JSON)
  player_instructions TEXT,
  
  is_default BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_team_id ON training_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_plan_id ON training_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_player_attendance_session_id ON player_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_player_attendance_player_id ON player_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_team_id ON progress_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_tactics_team_id ON tactics(team_id);
