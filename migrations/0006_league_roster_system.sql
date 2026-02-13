-- نظام تحديد عدد اللاعبين حسب نوع الدوري
-- League Roster Size System

-- تعديل جدول الدوريات لإضافة حقول جديدة
ALTER TABLE leagues ADD COLUMN league_category TEXT DEFAULT 'professional'; -- professional, champions
ALTER TABLE leagues ADD COLUMN max_roster_size INTEGER DEFAULT 18; -- إجمالي عدد اللاعبين المسموح
ALTER TABLE leagues ADD COLUMN max_starters INTEGER DEFAULT 11; -- عدد اللاعبين الأساسيين
ALTER TABLE leagues ADD COLUMN max_substitutes INTEGER DEFAULT 7; -- عدد لاعبي الاحتياط
ALTER TABLE leagues ADD COLUMN roster_requirements TEXT; -- JSON: متطلبات إضافية

-- جدول المشاركين في الدوري (جميع الأدوار)
-- League Participants (All Roles)
CREATE TABLE IF NOT EXISTS league_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  participant_type TEXT NOT NULL, -- admin, referee, coach, team_manager, assistant_coach
  user_id INTEGER,
  person_name TEXT NOT NULL, -- الاسم الكامل
  role_title TEXT, -- المسمى الوظيفي (مثل: مشرف عام، حكم دولي، مدرب فريق)
  team_id INTEGER, -- للمدربين ومديري الفرق
  email TEXT,
  phone TEXT,
  license_number TEXT, -- رقم الرخصة (للحكام والمدربين)
  registration_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  CHECK (participant_type IN ('admin', 'referee', 'coach', 'team_manager', 'assistant_coach', 'technical_director'))
);

-- جدول قوائم الفرق في الدوري (مع التحقق من العدد)
-- Team Rosters in League (with size validation)
CREATE TABLE IF NOT EXISTS league_team_rosters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  season TEXT NOT NULL,
  roster_size INTEGER DEFAULT 0, -- العدد الحالي للاعبين
  starters_count INTEGER DEFAULT 0, -- عدد اللاعبين الأساسيين
  substitutes_count INTEGER DEFAULT 0, -- عدد الاحتياط
  is_roster_complete BOOLEAN DEFAULT 0, -- هل القائمة مكتملة؟
  is_roster_locked BOOLEAN DEFAULT 0, -- هل القائمة مغلقة؟ (بعد بدء الدوري)
  submitted_by_manager_id INTEGER,
  submitted_at DATETIME,
  approved_by_admin_id INTEGER,
  approved_at DATETIME,
  approval_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (submitted_by_manager_id) REFERENCES team_managers(id),
  FOREIGN KEY (approved_by_admin_id) REFERENCES users(id),
  CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  UNIQUE(league_id, team_id, season)
);

-- جدول لاعبي القائمة في الدوري
-- League Roster Players
CREATE TABLE IF NOT EXISTS league_roster_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roster_id INTEGER NOT NULL,
  player_registry_id INTEGER NOT NULL,
  jersey_number INTEGER NOT NULL,
  player_role TEXT NOT NULL, -- starter, substitute, goalkeeper
  position TEXT NOT NULL, -- GK, DF, MF, FW
  is_captain BOOLEAN DEFAULT 0,
  registration_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roster_id) REFERENCES league_team_rosters(id),
  FOREIGN KEY (player_registry_id) REFERENCES player_registry(id),
  CHECK (player_role IN ('starter', 'substitute', 'goalkeeper')),
  UNIQUE(roster_id, player_registry_id),
  UNIQUE(roster_id, jersey_number)
);

-- جدول سجل التغييرات في القائمة
-- Roster Change Log
CREATE TABLE IF NOT EXISTS roster_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roster_id INTEGER NOT NULL,
  change_type TEXT NOT NULL, -- player_added, player_removed, player_role_changed
  player_registry_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  changed_by_manager_id INTEGER,
  change_reason TEXT,
  change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roster_id) REFERENCES league_team_rosters(id),
  FOREIGN KEY (player_registry_id) REFERENCES player_registry(id),
  FOREIGN KEY (changed_by_manager_id) REFERENCES team_managers(id),
  CHECK (change_type IN ('player_added', 'player_removed', 'player_role_changed', 'jersey_number_changed'))
);

-- Trigger للتحقق من عدد اللاعبين عند الإضافة
CREATE TRIGGER IF NOT EXISTS validate_roster_size_before_insert
BEFORE INSERT ON league_roster_players
BEGIN
  SELECT CASE
    WHEN (
      SELECT COUNT(*) 
      FROM league_roster_players lrp
      JOIN league_team_rosters ltr ON lrp.roster_id = ltr.id
      WHERE lrp.roster_id = NEW.roster_id
    ) >= (
      SELECT l.max_roster_size
      FROM league_team_rosters ltr
      JOIN leagues l ON ltr.league_id = l.id
      WHERE ltr.id = NEW.roster_id
    )
    THEN RAISE(ABORT, 'تجاوز الحد الأقصى لعدد اللاعبين المسموح في هذا الدوري')
  END;
END;

-- Trigger لتحديث عدد اللاعبين في القائمة
CREATE TRIGGER IF NOT EXISTS update_roster_counts_after_insert
AFTER INSERT ON league_roster_players
BEGIN
  UPDATE league_team_rosters
  SET 
    roster_size = (
      SELECT COUNT(*) 
      FROM league_roster_players 
      WHERE roster_id = NEW.roster_id AND is_active = 1
    ),
    starters_count = (
      SELECT COUNT(*) 
      FROM league_roster_players 
      WHERE roster_id = NEW.roster_id AND player_role = 'starter' AND is_active = 1
    ),
    substitutes_count = (
      SELECT COUNT(*) 
      FROM league_roster_players 
      WHERE roster_id = NEW.roster_id AND player_role = 'substitute' AND is_active = 1
    )
  WHERE id = NEW.roster_id;
END;

-- Trigger لتحديث عدد اللاعبين عند الحذف
CREATE TRIGGER IF NOT EXISTS update_roster_counts_after_delete
AFTER DELETE ON league_roster_players
BEGIN
  UPDATE league_team_rosters
  SET 
    roster_size = (
      SELECT COUNT(*) 
      FROM league_roster_players 
      WHERE roster_id = OLD.roster_id AND is_active = 1
    ),
    starters_count = (
      SELECT COUNT(*) 
      FROM league_roster_players 
      WHERE roster_id = OLD.roster_id AND player_role = 'starter' AND is_active = 1
    ),
    substitutes_count = (
      SELECT COUNT(*) 
      FROM league_roster_players 
      WHERE roster_id = OLD.roster_id AND player_role = 'substitute' AND is_active = 1
    )
  WHERE id = OLD.roster_id;
END;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_league_participants_league ON league_participants(league_id);
CREATE INDEX IF NOT EXISTS idx_league_participants_type ON league_participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_league_team_rosters_league ON league_team_rosters(league_id, team_id);
CREATE INDEX IF NOT EXISTS idx_league_roster_players_roster ON league_roster_players(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_change_log_roster ON roster_change_log(roster_id);
