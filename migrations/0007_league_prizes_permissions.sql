-- Migration 0007: League Prizes & Permissions System
-- ضبط صلاحيات الجوائز - فقط المشرفون يمكنهم إضافة/تعديل الجوائز

-- جدول جوائز الدوريات (منفصل لمزيد من التحكم)
CREATE TABLE IF NOT EXISTS league_prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  rank_position INTEGER NOT NULL, -- 1 = المركز الأول، 2 = المركز الثاني، إلخ
  prize_type TEXT NOT NULL, -- 'cash', 'trophy', 'medal', 'certificate', 'mixed'
  
  -- تفاصيل الجائزة المالية
  cash_amount DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  
  -- تفاصيل الجوائز العينية
  trophy_name TEXT, -- مثال: "كأس البطولة الذهبية"
  medal_type TEXT, -- 'gold', 'silver', 'bronze'
  certificate_title TEXT,
  
  -- وصف شامل للجائزة
  prize_description TEXT,
  
  -- صلاحيات ومعلومات
  created_by_admin_id INTEGER NOT NULL, -- فقط المشرف يمكنه الإضافة
  last_modified_by INTEGER,
  is_announced BOOLEAN DEFAULT 0, -- هل تم الإعلان عن الجائزة للجمهور
  announcement_date DATETIME,
  
  -- تواريخ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_admin_id) REFERENCES users(id),
  FOREIGN KEY (last_modified_by) REFERENCES users(id),
  UNIQUE(league_id, rank_position) -- لا يمكن تكرار نفس المركز في نفس الدوري
);

-- فهرس لتسريع البحث
CREATE INDEX idx_league_prizes_league ON league_prizes(league_id);
CREATE INDEX idx_league_prizes_rank ON league_prizes(league_id, rank_position);

-- جدول سجل تعديلات الجوائز (Audit Log)
CREATE TABLE IF NOT EXISTS prize_modification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prize_id INTEGER NOT NULL,
  league_id INTEGER NOT NULL,
  modified_by_admin_id INTEGER NOT NULL,
  modification_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'announced'
  old_value TEXT, -- قيمة JSON للبيانات القديمة
  new_value TEXT, -- قيمة JSON للبيانات الجديدة
  modification_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (prize_id) REFERENCES league_prizes(id) ON DELETE CASCADE,
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (modified_by_admin_id) REFERENCES users(id)
);

CREATE INDEX idx_prize_log_prize ON prize_modification_log(prize_id);
CREATE INDEX idx_prize_log_admin ON prize_modification_log(modified_by_admin_id);

-- جدول صلاحيات إدارة الدوري (League Admin Permissions)
CREATE TABLE IF NOT EXISTS league_admin_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  permission_level TEXT NOT NULL, -- 'owner', 'co_admin', 'moderator'
  
  -- الصلاحيات المحددة
  can_modify_prizes BOOLEAN DEFAULT 0,
  can_announce_prizes BOOLEAN DEFAULT 0,
  can_add_teams BOOLEAN DEFAULT 0,
  can_schedule_matches BOOLEAN DEFAULT 0,
  can_assign_referees BOOLEAN DEFAULT 0,
  can_modify_settings BOOLEAN DEFAULT 0,
  can_delete_league BOOLEAN DEFAULT 0,
  
  granted_by_admin_id INTEGER NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- صلاحية مؤقتة (اختياري)
  is_active BOOLEAN DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (granted_by_admin_id) REFERENCES users(id),
  UNIQUE(league_id, admin_id) -- لا يمكن تكرار نفس المشرف في نفس الدوري
);

CREATE INDEX idx_league_permissions_league ON league_admin_permissions(league_id);
CREATE INDEX idx_league_permissions_admin ON league_admin_permissions(admin_id);

-- إضافة عمود لتتبع من أنشأ الدوري (إذا لم يكن موجوداً)
-- admin_id في جدول leagues هو المشرف الرئيسي (Owner)

-- جدول إشعارات الجوائز
CREATE TABLE IF NOT EXISTS prize_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  prize_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  rank_position INTEGER NOT NULL,
  
  notification_type TEXT NOT NULL, -- 'prize_won', 'prize_announced', 'prize_updated'
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (prize_id) REFERENCES league_prizes(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX idx_prize_notifications_team ON prize_notifications(team_id, is_read);
