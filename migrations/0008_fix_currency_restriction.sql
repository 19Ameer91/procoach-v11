-- Migration 0008: تثبيت العملة على الريال العماني أو الدولار فقط
-- Fix Currency: Only OMR (Omani Rial) or USD (US Dollar)

-- تعديل جدول الجوائز لتقييد العملة
-- SQLite لا يدعم ALTER COLUMN مباشرة، لذا نستخدم CHECK constraint

-- إضافة قيد للعملة على الجدول الحالي
DROP TABLE IF EXISTS league_prizes_new;

CREATE TABLE league_prizes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  rank_position INTEGER NOT NULL,
  prize_type TEXT NOT NULL,
  
  -- تفاصيل الجائزة المالية (العملة مقيدة)
  cash_amount DECIMAL(15, 3) DEFAULT 0, -- 3 خانات عشرية للريال العماني
  currency TEXT DEFAULT 'OMR' CHECK(currency IN ('OMR', 'USD')), -- فقط الريال العماني أو الدولار
  
  -- تفاصيل الجوائز العينية
  trophy_name TEXT,
  medal_type TEXT,
  certificate_title TEXT,
  
  -- وصف شامل للجائزة
  prize_description TEXT,
  
  -- صلاحيات ومعلومات
  created_by_admin_id INTEGER NOT NULL,
  last_modified_by INTEGER,
  is_announced BOOLEAN DEFAULT 0,
  announcement_date DATETIME,
  
  -- تواريخ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_admin_id) REFERENCES users(id),
  FOREIGN KEY (last_modified_by) REFERENCES users(id),
  UNIQUE(league_id, rank_position)
);

-- نسخ البيانات القديمة مع تحويل العملات
INSERT INTO league_prizes_new (
  id, league_id, rank_position, prize_type,
  cash_amount, currency,
  trophy_name, medal_type, certificate_title, prize_description,
  created_by_admin_id, last_modified_by, is_announced, announcement_date,
  created_at, updated_at
)
SELECT 
  id, league_id, rank_position, prize_type,
  -- تحويل المبلغ حسب العملة (تقريبي)
  CASE 
    WHEN currency = 'EGP' THEN ROUND(cash_amount * 0.020, 3) -- 1 EGP ≈ 0.020 OMR
    WHEN currency = 'SAR' THEN ROUND(cash_amount * 0.100, 3) -- 1 SAR ≈ 0.100 OMR
    WHEN currency = 'AED' THEN ROUND(cash_amount * 0.105, 3) -- 1 AED ≈ 0.105 OMR
    WHEN currency = 'USD' THEN cash_amount -- نبقي الدولار كما هو
    ELSE ROUND(cash_amount * 0.020, 3) -- افتراضياً نحول لريال عماني
  END as cash_amount,
  'OMR' as currency, -- نحول كل شيء للريال العماني افتراضياً
  trophy_name, medal_type, certificate_title, prize_description,
  created_by_admin_id, last_modified_by, is_announced, announcement_date,
  created_at, updated_at
FROM league_prizes;

-- حذف الجدول القديم
DROP TABLE league_prizes;

-- إعادة تسمية الجدول الجديد
ALTER TABLE league_prizes_new RENAME TO league_prizes;

-- إعادة إنشاء الفهارس
CREATE INDEX idx_league_prizes_league ON league_prizes(league_id);
CREATE INDEX idx_league_prizes_rank ON league_prizes(league_id, rank_position);

-- جدول أسعار الصرف المرجعية (للعرض فقط - لا يستخدم في العمليات الحسابية)
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_currency TEXT NOT NULL, -- العملة الأصلية
  to_currency TEXT NOT NULL CHECK(to_currency IN ('OMR', 'USD')),
  exchange_rate DECIMAL(10, 6) NOT NULL, -- سعر الصرف
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  
  UNIQUE(from_currency, to_currency)
);

-- إدخال أسعار الصرف المرجعية (تقريبية)
INSERT INTO currency_exchange_rates (from_currency, to_currency, exchange_rate) VALUES
  -- إلى الريال العماني
  ('EGP', 'OMR', 0.020),  -- جنيه مصري
  ('SAR', 'OMR', 0.100),  -- ريال سعودي
  ('AED', 'OMR', 0.105),  -- درهم إماراتي
  ('KWD', 'OMR', 1.250),  -- دينار كويتي
  ('BHD', 'OMR', 1.020),  -- دينار بحريني
  ('QAR', 'OMR', 0.106),  -- ريال قطري
  ('USD', 'OMR', 0.385),  -- دولار أمريكي
  
  -- إلى الدولار الأمريكي
  ('EGP', 'USD', 0.020),  -- جنيه مصري
  ('SAR', 'USD', 0.267),  -- ريال سعودي
  ('AED', 'USD', 0.272),  -- درهم إماراتي
  ('OMR', 'USD', 2.598);  -- ريال عماني

-- ملاحظة: هذه أسعار تقريبية للمرجع فقط
-- يجب تحديثها دورياً من API خارجي في الإنتاج
