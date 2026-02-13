-- إضافة عمود privacy_code للدوريات الخاصة
-- Migration 0010: Add privacy_code for private leagues

-- إضافة عمود الكود الخاص (بدون UNIQUE لأن SQLite لا يدعمه في ALTER TABLE)
ALTER TABLE leagues ADD COLUMN privacy_code TEXT;

-- إضافة unique index لتسريع البحث ومنع التكرار
CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_privacy_code ON leagues(privacy_code) WHERE privacy_code IS NOT NULL;

-- توليد أكواد للدوريات الخاصة الموجودة
UPDATE leagues 
SET privacy_code = 'PRIV-' || UPPER(substr(hex(randomblob(4)), 1, 8))
WHERE privacy_type = 'private' AND privacy_code IS NULL;
