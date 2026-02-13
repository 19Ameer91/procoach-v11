-- نظام سوق الانتقالات والإعارات
-- Transfer Market and Loan System

-- جدول سجلات اللاعبين (مع الرقم المدني للتحقق من الهوية)
-- Player Registry with National ID for identity verification
CREATE TABLE IF NOT EXISTS player_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  national_id TEXT UNIQUE NOT NULL, -- الرقم المدني (فريد لكل لاعب)
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  nationality TEXT NOT NULL,
  position TEXT NOT NULL, -- GK, DF, MF, FW
  preferred_foot TEXT DEFAULT 'Right', -- Right, Left, Both
  height INTEGER, -- بالسنتيمتر
  weight INTEGER, -- بالكيلوجرام
  photo_url TEXT,
  is_verified BOOLEAN DEFAULT 0, -- تم التحقق من الهوية
  verified_at DATETIME,
  verified_by_admin_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (verified_by_admin_id) REFERENCES users(id)
);

-- ربط اللاعب المسجل بالفريق
-- Link registered player to team
CREATE TABLE IF NOT EXISTS player_team_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_registry_id INTEGER NOT NULL,
  player_id INTEGER, -- ربط مع جدول players الموجود
  team_id INTEGER NOT NULL,
  contract_type TEXT NOT NULL, -- permanent, loan
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  loan_parent_team_id INTEGER, -- الفريق الأصلي في حالة الإعارة
  jersey_number INTEGER,
  salary_amount DECIMAL(10, 2),
  contract_status TEXT DEFAULT 'active', -- active, expired, terminated
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_registry_id) REFERENCES player_registry(id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (loan_parent_team_id) REFERENCES teams(id),
  CHECK (contract_type IN ('permanent', 'loan')),
  CHECK (contract_status IN ('active', 'expired', 'terminated'))
);

-- سوق الانتقالات (اللاعبون المعروضون)
-- Transfer Market (Players available for transfer/loan)
CREATE TABLE IF NOT EXISTS transfer_market (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_registry_id INTEGER NOT NULL,
  current_team_id INTEGER NOT NULL,
  listed_by_manager_id INTEGER NOT NULL,
  listing_type TEXT NOT NULL, -- transfer, loan, free_agent
  asking_price DECIMAL(10, 2), -- سعر الانتقال
  loan_duration_months INTEGER, -- مدة الإعارة بالأشهر
  loan_fee DECIMAL(10, 2), -- رسوم الإعارة
  salary_contribution_percentage INTEGER DEFAULT 0, -- نسبة المساهمة في الراتب (0-100)
  available_from_date DATE DEFAULT CURRENT_DATE,
  listing_expires_at DATETIME,
  description TEXT,
  listing_status TEXT DEFAULT 'active', -- active, sold, loaned, expired, cancelled
  is_featured BOOLEAN DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_registry_id) REFERENCES player_registry(id),
  FOREIGN KEY (current_team_id) REFERENCES teams(id),
  FOREIGN KEY (listed_by_manager_id) REFERENCES team_managers(id),
  CHECK (listing_type IN ('transfer', 'loan', 'free_agent')),
  CHECK (listing_status IN ('active', 'sold', 'loaned', 'expired', 'cancelled')),
  CHECK (salary_contribution_percentage BETWEEN 0 AND 100)
);

-- عروض الانتقال والإعارة
-- Transfer and Loan Offers
CREATE TABLE IF NOT EXISTS transfer_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_listing_id INTEGER NOT NULL,
  offering_team_id INTEGER NOT NULL,
  offering_manager_id INTEGER NOT NULL,
  offer_type TEXT NOT NULL, -- transfer, loan
  offered_amount DECIMAL(10, 2), -- المبلغ المعروض للانتقال
  loan_duration_months INTEGER, -- مدة الإعارة المقترحة
  loan_fee_offered DECIMAL(10, 2), -- رسوم الإعارة المقترحة
  salary_contribution_offered INTEGER DEFAULT 0, -- نسبة المساهمة في الراتب
  offered_jersey_number INTEGER,
  additional_terms TEXT, -- شروط إضافية
  offer_message TEXT,
  offer_status TEXT DEFAULT 'pending', -- pending, accepted, rejected, withdrawn, expired
  responded_at DATETIME,
  response_message TEXT,
  offer_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (market_listing_id) REFERENCES transfer_market(id),
  FOREIGN KEY (offering_team_id) REFERENCES teams(id),
  FOREIGN KEY (offering_manager_id) REFERENCES team_managers(id),
  CHECK (offer_type IN ('transfer', 'loan')),
  CHECK (offer_status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
  CHECK (salary_contribution_offered BETWEEN 0 AND 100)
);

-- إشعارات سوق الانتقالات
-- Transfer Market Notifications
CREATE TABLE IF NOT EXISTS transfer_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_type TEXT NOT NULL, -- new_listing, new_offer, offer_accepted, offer_rejected, player_signed
  related_listing_id INTEGER,
  related_offer_id INTEGER,
  recipient_manager_id INTEGER NOT NULL,
  sender_manager_id INTEGER,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  action_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (related_listing_id) REFERENCES transfer_market(id),
  FOREIGN KEY (related_offer_id) REFERENCES transfer_offers(id),
  FOREIGN KEY (recipient_manager_id) REFERENCES team_managers(id),
  FOREIGN KEY (sender_manager_id) REFERENCES team_managers(id),
  CHECK (notification_type IN ('new_listing', 'new_offer', 'offer_accepted', 'offer_rejected', 'player_signed', 'listing_expired'))
);

-- سجل الانتقالات (تاريخ انتقالات اللاعب)
-- Transfer History
CREATE TABLE IF NOT EXISTS transfer_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_registry_id INTEGER NOT NULL,
  from_team_id INTEGER,
  to_team_id INTEGER NOT NULL,
  transfer_type TEXT NOT NULL, -- permanent, loan, free_agent
  transfer_fee DECIMAL(10, 2),
  loan_fee DECIMAL(10, 2),
  loan_duration_months INTEGER,
  transfer_date DATE DEFAULT CURRENT_DATE,
  season TEXT,
  contract_duration_years DECIMAL(3, 1),
  was_loan_made_permanent BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_registry_id) REFERENCES player_registry(id),
  FOREIGN KEY (from_team_id) REFERENCES teams(id),
  FOREIGN KEY (to_team_id) REFERENCES teams(id),
  CHECK (transfer_type IN ('permanent', 'loan', 'free_agent'))
);

-- منع التسجيل المكرر (فحص اللاعبين المسجلين في الدوري)
-- Prevent duplicate registration in league
CREATE TABLE IF NOT EXISTS league_player_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  season TEXT NOT NULL,
  player_registry_id INTEGER NOT NULL,
  current_team_id INTEGER NOT NULL,
  registration_date DATE DEFAULT CURRENT_DATE,
  registration_status TEXT DEFAULT 'active', -- active, transferred, loaned_out, released
  is_eligible BOOLEAN DEFAULT 1, -- مؤهل للعب
  ineligibility_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (player_registry_id) REFERENCES player_registry(id),
  FOREIGN KEY (current_team_id) REFERENCES teams(id),
  CHECK (registration_status IN ('active', 'transferred', 'loaned_out', 'released')),
  UNIQUE(league_id, season, player_registry_id) -- لاعب واحد لكل دوري في الموسم
);

-- مراجعة طلبات التسجيل (للتحقق من الهوية)
-- Registration Review (for identity verification)
CREATE TABLE IF NOT EXISTS player_registration_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_registry_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  league_id INTEGER,
  submitted_by_manager_id INTEGER NOT NULL,
  national_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  supporting_documents TEXT, -- JSON: روابط المستندات الداعمة
  review_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by_admin_id INTEGER,
  reviewed_at DATETIME,
  rejection_reason TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_registry_id) REFERENCES player_registry(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (submitted_by_manager_id) REFERENCES team_managers(id),
  FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id),
  CHECK (review_status IN ('pending', 'approved', 'rejected'))
);

-- Indexes للبحث السريع
CREATE INDEX IF NOT EXISTS idx_player_registry_national_id ON player_registry(national_id);
CREATE INDEX IF NOT EXISTS idx_player_registry_is_verified ON player_registry(is_verified);
CREATE INDEX IF NOT EXISTS idx_transfer_market_listing_status ON transfer_market(listing_status);
CREATE INDEX IF NOT EXISTS idx_transfer_market_listing_type ON transfer_market(listing_type);
CREATE INDEX IF NOT EXISTS idx_transfer_offers_status ON transfer_offers(offer_status);
CREATE INDEX IF NOT EXISTS idx_transfer_notifications_recipient ON transfer_notifications(recipient_manager_id, is_read);
CREATE INDEX IF NOT EXISTS idx_league_registrations_unique ON league_player_registrations(league_id, season, player_registry_id);
CREATE INDEX IF NOT EXISTS idx_player_contracts_active ON player_team_contracts(team_id, is_active);
