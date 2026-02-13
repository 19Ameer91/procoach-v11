-- Migration 0009: Authentication System + League Privacy & Auto-Approval
-- نظام تسجيل الدخول + خصوصية الدوريات + الموافقة التلقائية

-- ==================== نظام المصادقة ====================

-- تحديث جدول المستخدمين لدعم التسجيل الكامل
-- SQLite لا يدعم ALTER COLUMN، لذا نستخدم جدول جديد
DROP TABLE IF EXISTS users_new;

CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'coach', 'referee', 'team_manager')),
  phone TEXT,
  avatar_url TEXT,
  
  -- معلومات إضافية
  country TEXT,
  city TEXT,
  date_of_birth DATE,
  national_id TEXT UNIQUE,
  
  -- حالة الحساب
  is_active BOOLEAN DEFAULT 1,
  is_verified BOOLEAN DEFAULT 0,
  verification_token TEXT,
  verification_sent_at DATETIME,
  
  -- أمان
  last_login DATETIME,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  password_reset_token TEXT,
  password_reset_expires DATETIME,
  
  -- تواريخ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- فهرس
  UNIQUE(email, national_id)
);

-- نسخ البيانات القديمة
INSERT INTO users_new (
  id, email, password_hash, full_name, role, phone, avatar_url,
  is_active, created_at, updated_at
)
SELECT 
  id, email, password_hash, full_name, role, phone, avatar_url,
  is_active, created_at, updated_at
FROM users;

-- حذف الجدول القديم
DROP TABLE users;

-- إعادة تسمية
ALTER TABLE users_new RENAME TO users;

-- إنشاء الفهارس
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_national_id ON users(national_id);

-- جدول جلسات تسجيل الدخول
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  
  -- معلومات الجلسة
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  
  -- الصلاحية
  expires_at DATETIME NOT NULL,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);

-- ==================== خصوصية الدوريات ====================

-- إضافة أعمدة الخصوصية لجدول الدوريات
ALTER TABLE leagues ADD COLUMN privacy_type TEXT DEFAULT 'public' CHECK(privacy_type IN ('public', 'private'));
ALTER TABLE leagues ADD COLUMN is_visible_in_search BOOLEAN DEFAULT 1;
ALTER TABLE leagues ADD COLUMN require_approval BOOLEAN DEFAULT 0; -- هل يتطلب موافقة المشرف
ALTER TABLE leagues ADD COLUMN auto_approve_on_requirements BOOLEAN DEFAULT 1; -- موافقة تلقائية إذا استوفى الشروط

-- ==================== شروط قبول الفريق ====================

-- جدول شروط الانضمام للدوري
CREATE TABLE IF NOT EXISTS league_entry_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  
  -- متطلبات الفريق
  min_players INTEGER DEFAULT 11,
  max_players INTEGER DEFAULT 25,
  min_goalkeepers INTEGER DEFAULT 1,
  max_goalkeepers INTEGER DEFAULT 3,
  
  -- متطلبات تقييمات اللاعبين (FIFA ratings)
  min_team_overall_rating INTEGER, -- متوسط تقييم الفريق الكلي
  max_team_overall_rating INTEGER,
  min_player_rating INTEGER, -- أقل تقييم مسموح للاعب
  max_player_rating INTEGER, -- أعلى تقييم مسموح للاعب
  
  -- متطلبات إضافية
  require_verified_players BOOLEAN DEFAULT 0, -- هل يجب أن يكون اللاعبون موثقين
  require_national_id BOOLEAN DEFAULT 1, -- هل يجب وجود رقم مدني
  allow_foreign_players BOOLEAN DEFAULT 1,
  max_foreign_players INTEGER,
  
  -- متطلبات المدرب
  require_coach_license BOOLEAN DEFAULT 0,
  min_coach_experience_years INTEGER,
  
  -- الرسوم
  entry_fee DECIMAL(10, 3) DEFAULT 0,
  entry_fee_currency TEXT DEFAULT 'OMR' CHECK(entry_fee_currency IN ('OMR', 'USD')),
  
  -- ملاحظات
  additional_requirements TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  UNIQUE(league_id)
);

-- جدول طلبات الانضمام للدوري
CREATE TABLE IF NOT EXISTS league_join_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  coach_user_id INTEGER NOT NULL,
  
  -- حالة الطلب
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
  
  -- معلومات القرار
  reviewed_by_admin_id INTEGER,
  reviewed_at DATETIME,
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- التحقق من الشروط
  requirements_met BOOLEAN DEFAULT 0,
  requirements_check_result TEXT, -- JSON
  
  -- معلومات الفريق عند التقديم
  team_snapshot TEXT, -- JSON snapshot of team data at time of application
  players_count INTEGER,
  goalkeepers_count INTEGER,
  team_rating DECIMAL(5, 2),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (coach_user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id),
  UNIQUE(league_id, team_id) -- فريق واحد لا يمكنه التقديم أكثر من مرة
);

CREATE INDEX idx_join_requests_league ON league_join_requests(league_id);
CREATE INDEX idx_join_requests_team ON league_join_requests(team_id);
CREATE INDEX idx_join_requests_status ON league_join_requests(status);

-- جدول إشعارات طلبات الانضمام
CREATE TABLE IF NOT EXISTS join_request_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  join_request_id INTEGER NOT NULL,
  recipient_user_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL, -- 'request_submitted', 'request_approved', 'request_rejected'
  
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (join_request_id) REFERENCES league_join_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id)
);

CREATE INDEX idx_join_notifications_user ON join_request_notifications(recipient_user_id, is_read);
