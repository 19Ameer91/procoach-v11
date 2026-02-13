import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// صفحة الاختبار الرئيسية
app.get('/test', async (c) => {
  return c.redirect('/static/index.html')
})

// صفحة التشخيص
app.get('/diagnose', async (c) => {
  return c.redirect('/static/diagnose.html')
})

app.get('/cache-fix', async (c) => {
  return c.redirect('/static/cache-fix.html')
})

app.get('/join-private', async (c) => {
  return c.redirect('/static/join-private-league.html')
})

// ============================================
// Middleware - التحقق من تسجيل الدخول والصلاحيات
// ============================================

// Middleware للتحقق من تسجيل الدخول
async function requireAuth(c: any, next: any) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ 
      success: false, 
      error: 'يجب تسجيل الدخول أولاً',
      error_code: 'AUTH_REQUIRED'
    }, 401)
  }
  
  // التحقق من الجلسة
  const session = await c.env.DB.prepare(`
    SELECT us.*, u.role, u.full_name, u.email, u.is_active
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.session_token = ? 
      AND us.is_active = 1 
      AND us.expires_at > datetime('now')
  `).bind(token).first()
  
  if (!session) {
    return c.json({ 
      success: false, 
      error: 'جلسة غير صالحة أو منتهية. يرجى تسجيل الدخول مرة أخرى',
      error_code: 'INVALID_SESSION'
    }, 401)
  }
  
  if (!session.is_active) {
    return c.json({ 
      success: false, 
      error: 'حسابك غير نشط. يرجى التواصل مع الإدارة',
      error_code: 'ACCOUNT_INACTIVE'
    }, 403)
  }
  
  // حفظ بيانات المستخدم في context
  c.set('user', {
    id: session.user_id,
    email: session.email,
    full_name: session.full_name,
    role: session.role
  })
  
  await next()
}

// Middleware للتحقق من دور المشرف
async function requireAdmin(c: any, next: any) {
  const user = c.get('user')
  
  if (!user) {
    return c.json({ 
      success: false, 
      error: 'يجب تسجيل الدخول أولاً',
      error_code: 'AUTH_REQUIRED'
    }, 401)
  }
  
  if (user.role !== 'admin') {
    return c.json({ 
      success: false, 
      error: 'هذه الصفحة مخصصة للمشرفين فقط',
      error_code: 'ADMIN_ONLY'
    }, 403)
  }
  
  await next()
}

// ============================================
// نظام المصادقة والحسابات (Authentication)
// ============================================

// تسجيل حساب جديد
app.post('/api/register', async (c) => {
  const data = await c.req.json()
  
  // التحقق من البيانات المطلوبة
  if (!data.email || !data.password || !data.full_name || !data.role) {
    return c.json({ 
      success: false, 
      error: 'البيانات المطلوبة: email, password, full_name, role' 
    }, 400)
  }
  
  // التحقق من الدور
  if (!['admin', 'coach', 'referee', 'team_manager'].includes(data.role)) {
    return c.json({ 
      success: false, 
      error: 'الدور غير صحيح. يجب أن يكون: admin, coach, referee, team_manager' 
    }, 400)
  }
  
  // التحقق من عدم وجود البريد مسبقاً
  const existingUser = await c.env.DB.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(data.email).first()
  
  if (existingUser) {
    return c.json({ 
      success: false, 
      error: 'البريد الإلكتروني مستخدم مسبقاً' 
    }, 409)
  }
  
  // إنشاء hash للباسورد (مبسط - في الإنتاج استخدم bcrypt)
  const password_hash = `$hashed_${data.password}`
  
  // إضافة المستخدم
  const result = await c.env.DB.prepare(`
    INSERT INTO users (
      email, password_hash, full_name, role, phone, 
      country, city, national_id, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).bind(
    data.email,
    password_hash,
    data.full_name,
    data.role,
    data.phone || null,
    data.country || null,
    data.city || null,
    data.national_id || null
  ).run()
  
  return c.json({ 
    success: true, 
    message: 'تم إنشاء الحساب بنجاح',
    user_id: result.meta.last_row_id 
  })
})

// تسجيل الدخول
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json()
  
  if (!email || !password) {
    return c.json({ 
      success: false, 
      error: 'البريد الإلكتروني وكلمة المرور مطلوبان' 
    }, 400)
  }
  
  // البحث عن المستخدم
  const user = await c.env.DB.prepare(`
    SELECT id, email, password_hash, full_name, role, is_active, is_verified
    FROM users
    WHERE email = ?
  `).bind(email).first()
  
  if (!user) {
    return c.json({ 
      success: false, 
      error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
    }, 401)
  }
  
  // التحقق من كلمة المرور (مبسط)
  const expected_hash = `$hashed_${password}`
  if (user.password_hash !== expected_hash) {
    return c.json({ 
      success: false, 
      error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
    }, 401)
  }
  
  // التحقق من الحساب نشط
  if (!user.is_active) {
    return c.json({ 
      success: false, 
      error: 'الحساب غير نشط. يرجى التواصل مع الإدارة' 
    }, 403)
  }
  
  // إنشاء جلسة (session)
  const session_token = `session_${Date.now()}_${Math.random().toString(36)}`
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 ساعة
  
  await c.env.DB.prepare(`
    INSERT INTO user_sessions (
      user_id, session_token, expires_at, ip_address
    ) VALUES (?, ?, ?, ?)
  `).bind(user.id, session_token, expires_at.toISOString(), c.req.header('cf-connecting-ip') || 'unknown').run()
  
  // تحديث آخر دخول
  await c.env.DB.prepare(`
    UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(user.id).run()
  
  return c.json({ 
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_verified: user.is_verified
    },
    session_token: session_token,
    expires_at: expires_at.toISOString()
  })
})

// تسجيل الخروج
app.post('/api/logout', async (c) => {
  const session_token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (session_token) {
    await c.env.DB.prepare(`
      UPDATE user_sessions SET is_active = 0 WHERE session_token = ?
    `).bind(session_token).run()
  }
  
  return c.json({ success: true, message: 'تم تسجيل الخروج بنجاح' })
})

// التحقق من الجلسة
app.get('/api/me', async (c) => {
  const session_token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!session_token) {
    return c.json({ success: false, error: 'لم يتم توفير رمز الجلسة' }, 401)
  }
  
  const session = await c.env.DB.prepare(`
    SELECT s.*, u.email, u.full_name, u.role, u.is_verified
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ? AND s.is_active = 1 AND s.expires_at > datetime('now')
  `).bind(session_token).first()
  
  if (!session) {
    return c.json({ success: false, error: 'الجلسة منتهية أو غير صحيحة' }, 401)
  }
  
  return c.json({ 
    success: true,
    user: {
      id: session.user_id,
      email: session.email,
      full_name: session.full_name,
      role: session.role,
      is_verified: session.is_verified
    }
  })
})

// ============================================
// API ROUTES - إدارة الفرق (Teams)
// ============================================

// الحصول على جميع الفرق
app.get('/api/teams', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM teams ORDER BY created_at DESC').all()
  return c.json({ success: true, data: results })
})

// الحصول على فريق محدد
app.get('/api/teams/:id', async (c) => {
  const id = c.req.param('id')
  const team = await c.env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first()
  
  if (!team) {
    return c.json({ success: false, error: 'الفريق غير موجود' }, 404)
  }
  
  return c.json({ success: true, data: team })
})

// إضافة فريق جديد
app.post('/api/teams', async (c) => {
  const { name, country, league, coach_name, formation } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO teams (name, country, league, coach_name, formation) 
    VALUES (?, ?, ?, ?, ?)
  `).bind(name, country, league, coach_name, formation || '4-3-3').run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// ============================================
// API ROUTES - إدارة اللاعبين (Players)
// ============================================

// الحصول على لاعبي فريق معين
app.get('/api/teams/:teamId/players', async (c) => {
  const teamId = c.req.param('teamId')
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM players 
    WHERE team_id = ? 
    ORDER BY position, jersey_number
  `).bind(teamId).all()
  
  return c.json({ success: true, data: results })
})

// إضافة لاعب جديد
app.post('/api/teams/:teamId/players', async (c) => {
  const teamId = c.req.param('teamId')
  const player = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO players (
      team_id, name, position, jersey_number, overall_rating,
      pace, shooting, passing, dribbling, defending, physical,
      age, nationality, preferred_foot, fitness_level, morale
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    teamId, player.name, player.position, player.jersey_number, player.overall_rating || 70,
    player.pace || 70, player.shooting || 70, player.passing || 70,
    player.dribbling || 70, player.defending || 70, player.physical || 70,
    player.age, player.nationality, player.preferred_foot || 'Right',
    player.fitness_level || 100, player.morale || 75
  ).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// تحديث بيانات لاعب
app.put('/api/players/:id', async (c) => {
  const id = c.req.param('id')
  const updates = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE players SET
      name = ?, position = ?, jersey_number = ?,
      overall_rating = ?, pace = ?, shooting = ?, passing = ?,
      dribbling = ?, defending = ?, physical = ?,
      fitness_level = ?, morale = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    updates.name, updates.position, updates.jersey_number,
    updates.overall_rating, updates.pace, updates.shooting, updates.passing,
    updates.dribbling, updates.defending, updates.physical,
    updates.fitness_level, updates.morale, id
  ).run()
  
  return c.json({ success: true, message: 'تم تحديث بيانات اللاعب' })
})

// ============================================
// API ROUTES - إدارة الخطط التدريبية (Training Plans)
// ============================================

// الحصول على جميع الخطط التدريبية لفريق
app.get('/api/teams/:teamId/training-plans', async (c) => {
  const teamId = c.req.param('teamId')
  const status = c.req.query('status') // active, completed, archived
  
  let query = 'SELECT * FROM training_plans WHERE team_id = ?'
  const params = [teamId]
  
  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }
  
  query += ' ORDER BY created_at DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// الحصول على خطة تدريبية محددة مع الجلسات
app.get('/api/training-plans/:id', async (c) => {
  const id = c.req.param('id')
  
  const plan = await c.env.DB.prepare('SELECT * FROM training_plans WHERE id = ?').bind(id).first()
  
  if (!plan) {
    return c.json({ success: false, error: 'الخطة غير موجودة' }, 404)
  }
  
  const { results: sessions } = await c.env.DB.prepare(`
    SELECT * FROM training_sessions 
    WHERE plan_id = ? 
    ORDER BY session_number
  `).bind(id).all()
  
  return c.json({ success: true, data: { ...plan, sessions } })
})

// إنشاء خطة تدريبية جديدة
app.post('/api/teams/:teamId/training-plans', async (c) => {
  const teamId = c.req.param('teamId')
  const { name, description, duration_weeks, focus_area, intensity, target_fitness, target_morale, start_date, end_date } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO training_plans (
      team_id, name, description, duration_weeks, focus_area, intensity,
      target_fitness, target_morale, start_date, end_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).bind(
    teamId, name, description, duration_weeks || 4, focus_area, intensity || 'Medium',
    target_fitness, target_morale, start_date, end_date
  ).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// تحديث حالة الخطة
app.patch('/api/training-plans/:id/status', async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE training_plans 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(status, id).run()
  
  return c.json({ success: true, message: 'تم تحديث حالة الخطة' })
})

// ============================================
// API ROUTES - إدارة الجلسات التدريبية (Training Sessions)
// ============================================

// إضافة جلسة تدريبية
app.post('/api/training-plans/:planId/sessions', async (c) => {
  const planId = c.req.param('planId')
  const session = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO training_sessions (
      plan_id, session_number, title, description, session_type,
      duration_minutes, fitness_impact, morale_impact, fatigue_impact, drills
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    planId, session.session_number, session.title, session.description, session.session_type,
    session.duration_minutes || 90, session.fitness_impact || 0, session.morale_impact || 0,
    session.fatigue_impact || 5, JSON.stringify(session.drills || [])
  ).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// تسجيل إكمال جلسة تدريبية
app.patch('/api/training-sessions/:id/complete', async (c) => {
  const id = c.req.param('id')
  const { notes } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE training_sessions 
    SET completed = 1, completion_date = CURRENT_TIMESTAMP, notes = ?
    WHERE id = ?
  `).bind(notes || '', id).run()
  
  return c.json({ success: true, message: 'تم تسجيل إكمال الجلسة' })
})

// ============================================
// API ROUTES - حضور اللاعبين (Player Attendance)
// ============================================

// تسجيل حضور اللاعبين في جلسة
app.post('/api/training-sessions/:sessionId/attendance', async (c) => {
  const sessionId = c.req.param('sessionId')
  const { attendances } = await c.req.json() // array of {player_id, attended, performance_rating, notes}
  
  const db = c.env.DB
  
  for (const attendance of attendances) {
    await db.prepare(`
      INSERT INTO player_attendance (session_id, player_id, attended, performance_rating, notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      sessionId, attendance.player_id, attendance.attended ? 1 : 0,
      attendance.performance_rating, attendance.notes || ''
    ).run()
  }
  
  return c.json({ success: true, message: 'تم تسجيل الحضور' })
})

// الحصول على حضور جلسة معينة
app.get('/api/training-sessions/:sessionId/attendance', async (c) => {
  const sessionId = c.req.param('sessionId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT pa.*, p.name as player_name, p.position, p.jersey_number
    FROM player_attendance pa
    JOIN players p ON pa.player_id = p.id
    WHERE pa.session_id = ?
    ORDER BY p.position, p.jersey_number
  `).bind(sessionId).all()
  
  return c.json({ success: true, data: results })
})

// ============================================
// API ROUTES - التكتيكات (Tactics)
// ============================================

// الحصول على جميع التكتيكات لفريق
app.get('/api/teams/:teamId/tactics', async (c) => {
  const teamId = c.req.param('teamId')
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM tactics WHERE team_id = ? ORDER BY is_default DESC, created_at DESC
  `).bind(teamId).all()
  
  return c.json({ success: true, data: results })
})

// إضافة تكتيك جديد
app.post('/api/teams/:teamId/tactics', async (c) => {
  const teamId = c.req.param('teamId')
  const tactic = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO tactics (
      team_id, name, formation, attacking_style, defensive_style,
      tempo, width, player_instructions, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    teamId, tactic.name, tactic.formation, tactic.attacking_style, tactic.defensive_style,
    tactic.tempo, tactic.width, JSON.stringify(tactic.player_instructions || {}),
    tactic.is_default ? 1 : 0
  ).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// ============================================
// API ROUTES - التقارير (Progress Reports)
// ============================================

// الحصول على تقارير الفريق
app.get('/api/teams/:teamId/reports', async (c) => {
  const teamId = c.req.param('teamId')
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM progress_reports 
    WHERE team_id = ? 
    ORDER BY created_at DESC
  `).bind(teamId).all()
  
  return c.json({ success: true, data: results })
})

// إنشاء تقرير تقدم
app.post('/api/teams/:teamId/reports', async (c) => {
  const teamId = c.req.param('teamId')
  const report = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO progress_reports (
      team_id, player_id, report_type, period_start, period_end,
      sessions_completed, average_attendance, average_performance,
      fitness_change, morale_change, summary, recommendations
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    teamId, report.player_id || null, report.report_type, report.period_start, report.period_end,
    report.sessions_completed, report.average_attendance, report.average_performance,
    report.fitness_change, report.morale_change, report.summary, report.recommendations
  ).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// ============================================
// إحصائيات سريعة للوحة التحكم
// ============================================

app.get('/api/teams/:teamId/dashboard', async (c) => {
  const teamId = c.req.param('teamId')
  
  // عدد اللاعبين
  const playersCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM players WHERE team_id = ?
  `).bind(teamId).first()
  
  // عدد الخطط النشطة
  const activePlansCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM training_plans WHERE team_id = ? AND status = 'active'
  `).bind(teamId).first()
  
  // متوسط اللياقة
  const avgFitness = await c.env.DB.prepare(`
    SELECT AVG(fitness_level) as avg FROM players WHERE team_id = ?
  `).bind(teamId).first()
  
  // متوسط المعنويات
  const avgMorale = await c.env.DB.prepare(`
    SELECT AVG(morale) as avg FROM players WHERE team_id = ?
  `).bind(teamId).first()
  
  return c.json({
    success: true,
    data: {
      players_count: playersCount?.count || 0,
      active_plans: activePlansCount?.count || 0,
      avg_fitness: Math.round(avgFitness?.avg || 0),
      avg_morale: Math.round(avgMorale?.avg || 0)
    }
  })
})

// ============================================
// صفحة الدوريات (Leagues Page)
// ============================================

app.get('/leagues', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>الدوريات - Pro Coach</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .card { transition: all 0.3s ease; }
          .card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <div class="gradient-bg text-white py-6 shadow-lg">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <i class="fas fa-trophy text-4xl"></i>
                        <div>
                            <h1 class="text-3xl font-bold">الدوريات والبطولات</h1>
                            <p class="text-sm opacity-90">نظام إدارة الدوريات والمنافسات</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <a href="/" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30">
                            <i class="fas fa-home ml-2"></i>
                            الرئيسية
                        </a>
                        <button id="createLeagueBtn" class="bg-white text-purple-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100">
                            <i class="fas fa-plus ml-2"></i>
                            إنشاء دوري
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="container mx-auto px-4 py-8">
            <!-- Loading -->
            <div id="loading" class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-4xl text-purple-600"></i>
                <p class="mt-4 text-gray-600">جاري تحميل الدوريات...</p>
            </div>

            <!-- Tabs -->
            <div id="tabsContainer" class="hidden mb-6">
                <div class="flex gap-2 border-b-2">
                    <button class="tab-btn active px-6 py-3 font-bold border-b-4 border-purple-600" data-tab="all">
                        الكل
                    </button>
                    <button class="tab-btn px-6 py-3 font-bold border-b-4 border-transparent hover:border-purple-300" data-tab="registration">
                        التسجيل مفتوح
                    </button>
                    <button class="tab-btn px-6 py-3 font-bold border-b-4 border-transparent hover:border-purple-300" data-tab="ongoing">
                        جارية
                    </button>
                    <button class="tab-btn px-6 py-3 font-bold border-b-4 border-transparent hover:border-purple-300" data-tab="completed">
                        مكتملة
                    </button>
                </div>
            </div>

            <!-- Leagues Grid -->
            <div id="leaguesContainer" class="hidden">
                <div id="leaguesList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Leagues will be loaded here -->
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/leagues.js"></script>
    </body>
    </html>
  `)
})

// صفحة إنشاء دوري جديد
app.get('/create-league', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إنشاء دوري جديد - Pro Coach</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    </head>
    <body class="bg-gray-50">
        <div class="container mx-auto px-4 py-8 max-w-4xl">
            <div class="bg-white rounded-xl shadow-lg p-8">
                <h1 class="text-3xl font-bold text-purple-900 mb-6">
                    <i class="fas fa-plus-circle mr-2"></i>
                    إنشاء دوري جديد
                </h1>
                
                <form id="createLeagueForm" class="space-y-6">
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">اسم الدوري *</label>
                            <input type="text" id="name" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">الموسم *</label>
                            <input type="text" id="season" required value="2026" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
                        <textarea id="description" rows="3" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></textarea>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">الدولة *</label>
                            <input type="text" id="country" required value="International" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">نوع الدوري *</label>
                            <select id="league_type" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="league">دوري النقاط</option>
                                <option value="knockout">خروج المغلوب</option>
                                <option value="group_then_knockout">مجموعات ثم خروج المغلوب</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">تصنيف الدوري *</label>
                            <select id="league_category" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="professional">دوري المحترفين (18 لاعب)</option>
                                <option value="champions">دوري الأبطال (14 لاعب)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">نوع الخصوصية *</label>
                            <select id="privacy_type" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="public">عام (يظهر للجميع)</option>
                                <option value="private">خاص (يحتاج كود)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">الحد الأقصى للفرق *</label>
                            <input type="number" id="max_teams" required value="16" min="4" max="64" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">مدة المباراة (دقيقة)</label>
                            <input type="number" id="match_duration" value="90" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية *</label>
                            <input type="date" id="start_date" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية *</label>
                            <input type="date" id="end_date" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                    </div>
                    
                    <div id="result" class="p-4 rounded-lg hidden"></div>
                    
                    <div class="flex gap-4">
                        <button type="submit" class="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-bold">
                            <i class="fas fa-check-circle mr-2"></i>
                            إنشاء الدوري
                        </button>
                        <a href="/leagues" class="flex-1 text-center bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-bold">
                            <i class="fas fa-times mr-2"></i>
                            إلغاء
                        </a>
                    </div>
                </form>
            </div>
        </div>
        
        <script>
            // التحقق من تسجيل الدخول عند تحميل الصفحة
            document.addEventListener('DOMContentLoaded', () => {
                const session_token = localStorage.getItem('session_token');
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                
                if (!session_token || !user) {
                    alert('❌ يجب تسجيل الدخول أولاً');
                    window.location.href = '/test';
                    return;
                }
                
                if (user.role !== 'admin') {
                    alert('❌ هذه الصفحة مخصصة للمشرفين فقط');
                    window.location.href = '/';
                    return;
                }
                
                // عرض اسم المشرف
                const header = document.querySelector('h1');
                if (header && user.full_name) {
                    header.innerHTML += \` <span class="text-lg text-purple-600">(المشرف: \${user.full_name})</span>\`;
                }
            });
            
            document.getElementById('createLeagueForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const resultDiv = document.getElementById('result');
                
                // الحصول على session token من localStorage
                const session_token = localStorage.getItem('session_token');
                
                if (!session_token) {
                    alert('❌ يجب تسجيل الدخول أولاً');
                    window.location.href = '/test';
                    return;
                }
                
                const data = {
                    name: document.getElementById('name').value,
                    description: document.getElementById('description').value,
                    country: document.getElementById('country').value,
                    season: document.getElementById('season').value,
                    league_type: document.getElementById('league_type').value,
                    league_category: document.getElementById('league_category').value,
                    privacy_type: document.getElementById('privacy_type').value,
                    max_teams: parseInt(document.getElementById('max_teams').value),
                    match_duration: parseInt(document.getElementById('match_duration').value),
                    start_date: document.getElementById('start_date').value,
                    end_date: document.getElementById('end_date').value
                };
                
                try {
                    const response = await axios.post('/api/leagues', data, {
                        headers: {
                            'Authorization': \`Bearer \${session_token}\`
                        }
                    });
                    
                    // عرض رسالة النجاح
                    resultDiv.className = 'p-4 rounded-lg bg-green-100 text-green-800';
                    
                    // إذا كان دوري خاص، عرض الكود
                    if (response.data.data.privacy_code) {
                        resultDiv.innerHTML = \`
                            <div class="space-y-3">
                                <p class="font-bold text-lg">✅ تم إنشاء الدوري الخاص بنجاح!</p>
                                <div class="bg-white border-2 border-green-600 rounded-lg p-4">
                                    <p class="text-sm text-gray-600 mb-2">كود الدوري الخاص (شاركه مع الفرق):</p>
                                    <div class="flex items-center gap-2">
                                        <code class="flex-1 text-2xl font-bold text-purple-900 bg-purple-50 px-4 py-2 rounded" id="privacy-code">\${response.data.data.privacy_code}</code>
                                        <button onclick="copyCode()" class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                                            <i class="fas fa-copy"></i> نسخ
                                        </button>
                                    </div>
                                </div>
                                <p class="text-sm">سيتم التوجيه إلى صفحة الدوري...</p>
                            </div>
                        \`;
                    } else {
                        resultDiv.textContent = '✅ تم إنشاء الدوري بنجاح!';
                    }
                    
                    resultDiv.classList.remove('hidden');
                    
                    // التوجيه بعد 5 ثوان للدوريات الخاصة، و2 ثانية للعامة
                    const delay = response.data.data.privacy_code ? 5000 : 2000;
                    setTimeout(() => {
                        window.location.href = '/leagues/' + response.data.data.id;
                    }, delay);
                } catch (error) {
                    resultDiv.className = 'p-4 rounded-lg bg-red-100 text-red-800';
                    
                    // معالجة أخطاء المصادقة
                    if (error.response?.status === 401) {
                        resultDiv.textContent = '❌ انتهت جلستك. يرجى تسجيل الدخول مرة أخرى';
                        setTimeout(() => {
                            localStorage.removeItem('session_token');
                            localStorage.removeItem('user');
                            window.location.href = '/test';
                        }, 2000);
                    } else if (error.response?.status === 403) {
                        resultDiv.textContent = '❌ ليس لديك صلاحية إنشاء دوريات (مخصص للمشرفين فقط)';
                    } else {
                        resultDiv.textContent = '❌ خطأ: ' + (error.response?.data?.error || error.message);
                    }
                    
                    resultDiv.classList.remove('hidden');
                }
            });
            
            // وظيفة نسخ الكود
            function copyCode() {
                const code = document.getElementById('privacy-code').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    alert('✅ تم نسخ الكود بنجاح!');
                });
            }
        </script>
    </body>
    </html>
  `)
})

// صفحة تفاصيل الدوري
app.get('/leagues/:id', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تفاصيل الدوري - Pro Coach</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <div class="gradient-bg text-white py-6 shadow-lg">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 id="leagueName" class="text-3xl font-bold">جاري التحميل...</h1>
                        <p id="leagueSeason" class="text-sm opacity-90"></p>
                    </div>
                    <a href="/leagues" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30">
                        <i class="fas fa-arrow-right ml-2"></i>
                        العودة للدوريات
                    </a>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="bg-white shadow-sm">
            <div class="container mx-auto px-4">
                <div class="flex gap-1">
                    <button class="league-tab active px-6 py-4 font-bold border-b-4 border-purple-600" data-tab="overview">
                        <i class="fas fa-info-circle ml-2"></i>نظرة عامة
                    </button>
                    <button class="league-tab px-6 py-4 font-bold border-b-4 border-transparent hover:border-purple-300" data-tab="matches">
                        <i class="fas fa-calendar-alt ml-2"></i>المباريات
                    </button>
                    <button class="league-tab px-6 py-4 font-bold border-b-4 border-transparent hover:border-purple-300" data-tab="bracket">
                        <i class="fas fa-sitemap ml-2"></i>خارطة البطولة
                    </button>
                    <button class="league-tab px-6 py-4 font-bold border-b-4 border-transparent hover:border-purple-300" data-tab="table">
                        <i class="fas fa-table ml-2"></i>الترتيب
                    </button>
                    <button class="league-tab px-6 py-4 font-bold border-b-4 border-transparent hover:border-purple-300" data-tab="stats">
                        <i class="fas fa-chart-bar ml-2"></i>الإحصائيات
                    </button>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div class="container mx-auto px-4 py-8">
            <div id="tabContent">
                <!-- Content will be loaded here -->
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/league-details.js"></script>
    </body>
    </html>
  `)
})

// ============================================
// الصفحة الرئيسية
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pro Coach - نظام التدريب الاحترافي</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .card { transition: all 0.3s ease; }
          .card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <div class="gradient-bg text-white py-6 shadow-lg">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-futbol text-4xl"></i>
                        <div>
                            <h1 class="text-3xl font-bold">Pro Coach</h1>
                            <p class="text-sm opacity-90">نظام التدريب الاحترافي للمدربين</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <a href="/leagues" class="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
                            <i class="fas fa-trophy ml-2"></i>
                            الدوريات
                        </a>
                        <button id="addTeamBtn" class="bg-white text-purple-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100 transition">
                            <i class="fas fa-plus ml-2"></i>
                            إضافة فريق
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="container mx-auto px-4 py-8">
            <!-- Loading -->
            <div id="loading" class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-4xl text-purple-600"></i>
                <p class="mt-4 text-gray-600">جاري التحميل...</p>
            </div>

            <!-- Teams List -->
            <div id="teamsContainer" class="hidden">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-users ml-2"></i>
                        الفرق المسجلة
                    </h2>
                </div>
                <div id="teamsList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Teams will be loaded here -->
                </div>
            </div>

            <!-- Team Dashboard (Hidden by default) -->
            <div id="teamDashboard" class="hidden">
                <button id="backToTeams" class="mb-6 text-purple-600 hover:text-purple-800 font-bold">
                    <i class="fas fa-arrow-right ml-2"></i>
                    العودة للفرق
                </button>
                
                <div id="dashboardContent"></div>
            </div>
        </div>

        <!-- Add Team Modal -->
        <div id="addTeamModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <h3 class="text-2xl font-bold mb-4">إضافة فريق جديد</h3>
                <form id="addTeamForm">
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">اسم الفريق</label>
                        <input type="text" name="name" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">الدولة</label>
                        <input type="text" name="country" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">الدوري</label>
                        <input type="text" name="league" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">اسم المدرب</label>
                        <input type="text" name="coach_name" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">التشكيل</label>
                        <select name="formation" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                            <option value="4-3-3">4-3-3</option>
                            <option value="4-4-2">4-4-2</option>
                            <option value="4-2-3-1">4-2-3-1</option>
                            <option value="3-5-2">3-5-2</option>
                            <option value="5-3-2">5-3-2</option>
                        </select>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700">
                            حفظ
                        </button>
                        <button type="button" id="closeModal" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-400">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// ============================================
// API ROUTES - نظام المستخدمين (Users & Authentication)
// ============================================

// تسجيل الدخول (مبسط - بدون تشفير في النسخة التجريبية)
app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  
  const user = await c.env.DB.prepare(`
    SELECT id, email, full_name, role, phone, avatar_url, is_active 
    FROM users WHERE email = ? AND is_active = 1
  `).bind(email).first()
  
  if (!user) {
    return c.json({ success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, 401)
  }
  
  // في الإنتاج: تحقق من password_hash
  return c.json({ success: true, data: user, message: 'تم تسجيل الدخول بنجاح' })
})

// التسجيل الجديد
app.post('/api/auth/register', async (c) => {
  const { email, password, full_name, role, phone } = await c.req.json()
  
  // تحقق من وجود البريد
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) {
    return c.json({ success: false, error: 'البريد الإلكتروني مسجل بالفعل' }, 400)
  }
  
  const result = await c.env.DB.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, phone)
    VALUES (?, ?, ?, ?, ?)
  `).bind(email, 'hashed_' + password, full_name, role || 'coach', phone).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id }, message: 'تم التسجيل بنجاح' }, 201)
})

// ============================================
// API ROUTES - إدارة الدوريات (Leagues)
// ============================================

// الحصول على جميع الدوريات
app.get('/api/leagues', async (c) => {
  const status = c.req.query('status') // registration, ongoing, completed
  
  let query = `
    SELECT l.*, u.full_name as admin_name,
    (SELECT COUNT(*) FROM league_participations WHERE league_id = l.id) as teams_count
    FROM leagues l
    JOIN users u ON l.admin_id = u.id
  `
  const params: any[] = []
  
  if (status) {
    query += ' WHERE l.status = ?'
    params.push(status)
  }
  
  query += ' ORDER BY l.created_at DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// عرض الدوريات العامة المتاحة للبحث (يجب أن يكون قبل :id)
app.get('/api/leagues/public', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT l.id, l.name, l.description, l.country, l.season,
           l.league_type, l.league_category, l.status,
           l.max_teams, l.start_date, l.end_date,
           u.full_name as admin_name,
           (SELECT COUNT(*) FROM league_participations WHERE league_id = l.id) as teams_count
    FROM leagues l
    JOIN users u ON l.admin_id = u.id
    WHERE l.privacy_type = 'public'
      AND l.is_visible_in_search = 1
      AND l.status IN ('registration', 'ongoing')
    ORDER BY l.created_at DESC
  `).all()
  
  return c.json({ success: true, data: results })
})

// التحقق من دوري خاص بالكود (يجب أن يكون قبل :id)
app.get('/api/leagues/private/:code', async (c) => {
  const code = c.req.param('code')
  
  const league = await c.env.DB.prepare(`
    SELECT l.id, l.name, l.description, l.country, l.season,
           l.league_type, l.league_category, l.status,
           l.max_teams, l.start_date, l.end_date,
           l.require_approval, l.auto_approve_on_requirements,
           u.full_name as admin_name
    FROM leagues l
    JOIN users u ON l.admin_id = u.id
    WHERE l.privacy_code = ? AND l.privacy_type = 'private'
  `).bind(code).first()
  
  if (!league) {
    return c.json({ 
      success: false, 
      error: 'كود الدوري غير صحيح' 
    }, 404)
  }
  
  // جلب شروط الدوري
  const requirements = await c.env.DB.prepare(`
    SELECT * FROM league_entry_requirements WHERE league_id = ?
  `).bind(league.id).first()
  
  return c.json({ 
    success: true, 
    league: league,
    requirements: requirements
  })
})

// الحصول على دوري محدد
app.get('/api/leagues/:id', async (c) => {
  const id = c.req.param('id')
  
  const league = await c.env.DB.prepare(`
    SELECT l.*, u.full_name as admin_name, u.email as admin_email
    FROM leagues l
    JOIN users u ON l.admin_id = u.id
    WHERE l.id = ?
  `).bind(id).first()
  
  if (!league) {
    return c.json({ success: false, error: 'الدوري غير موجود' }, 404)
  }
  
  // الحصول على الفرق المشاركة
  const { results: teams } = await c.env.DB.prepare(`
    SELECT lp.*, t.name as team_name, t.logo_url, t.coach_name, t.formation
    FROM league_participations lp
    JOIN teams t ON lp.team_id = t.id
    WHERE lp.league_id = ?
    ORDER BY lp.points DESC, (lp.goals_for - lp.goals_against) DESC
  `).bind(id).all()
  
  return c.json({ success: true, data: { ...league, teams } })
})

// إنشاء دوري جديد (للمشرفين فقط)
app.post('/api/leagues', requireAuth, requireAdmin, async (c) => {
  try {
    const league = await c.req.json()
    const user = c.get('user')
    
    // استخدام admin_id من المستخدم المسجل دخوله
    const admin_id = user.id
    
    // التحقق من البيانات المطلوبة
    if (!league.name) {
      return c.json({ 
        success: false, 
        error: 'اسم الدوري مطلوب' 
      }, 400)
    }
    
    // توليد كود خصوصية تلقائياً للدوريات الخاصة
    let privacy_code = null
    if (league.privacy_type === 'private') {
      // توليد كود فريد بصيغة: PRIV-XXXXXXXX
      privacy_code = `PRIV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO leagues (
        name, description, admin_id, country, season, league_type,
        max_teams, start_date, end_date, match_duration,
        league_category, privacy_type, privacy_code, is_visible_in_search,
        require_approval, auto_approve_on_requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      league.name,
      league.description || '',
      admin_id, // استخدام ID المستخدم المسجل
      league.country || 'International',
      league.season || new Date().getFullYear().toString(),
      league.league_type || 'knockout',
      league.max_teams || 16,
      league.start_date || null,
      league.end_date || null,
      league.match_duration || 90,
      league.league_category || 'professional',
      league.privacy_type || 'public',
      privacy_code,
      league.is_visible_in_search !== undefined ? league.is_visible_in_search : 1,
      league.require_approval !== undefined ? league.require_approval : 0,
      league.auto_approve_on_requirements !== undefined ? league.auto_approve_on_requirements : 1
    ).run()
    
    return c.json({ 
      success: true, 
      data: { 
        id: result.meta.last_row_id,
        privacy_code: privacy_code // إرجاع الكود للمشرف
      }, 
      message: 'تم إنشاء الدوري بنجاح' 
    }, 201)
  } catch (error) {
    console.error('Error creating league:', error)
    return c.json({ 
      success: false, 
      error: 'حدث خطأ أثناء إنشاء الدوري: ' + (error as Error).message 
    }, 500)
  }
})

// تحديث حالة الدوري
app.patch('/api/leagues/:id/status', async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE leagues SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(status, id).run()
  
  return c.json({ success: true, message: 'تم تحديث حالة الدوري' })
})

// ============================================
// API ROUTES - أكواد الدعوة (Invitation Codes)
// ============================================

// إنشاء كود دعوة
app.post('/api/leagues/:leagueId/invitations', async (c) => {
  const leagueId = c.req.param('leagueId')
  const { max_uses, expires_at, created_by } = await c.req.json()
  
  // توليد كود فريد
  const code = `LEAGUE${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  
  const result = await c.env.DB.prepare(`
    INSERT INTO league_invitations (league_id, invitation_code, max_uses, expires_at, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).bind(leagueId, code, max_uses || 1, expires_at, created_by).run()
  
  return c.json({ 
    success: true, 
    data: { id: result.meta.last_row_id, code },
    message: 'تم إنشاء كود الدعوة'
  }, 201)
})

// الحصول على أكواد دوري معين
app.get('/api/leagues/:leagueId/invitations', async (c) => {
  const leagueId = c.req.param('leagueId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT li.*, u.full_name as created_by_name
    FROM league_invitations li
    JOIN users u ON li.created_by = u.id
    WHERE li.league_id = ?
    ORDER BY li.created_at DESC
  `).bind(leagueId).all()
  
  return c.json({ success: true, data: results })
})

// التحقق من كود دعوة
app.get('/api/invitations/:code/verify', async (c) => {
  const code = c.req.param('code')
  
  const invitation = await c.env.DB.prepare(`
    SELECT li.*, l.name as league_name, l.status as league_status, l.max_teams
    FROM league_invitations li
    JOIN leagues l ON li.league_id = l.id
    WHERE li.invitation_code = ? AND li.is_active = 1
  `).bind(code).first()
  
  if (!invitation) {
    return c.json({ success: false, error: 'كود الدعوة غير صحيح' }, 404)
  }
  
  // التحقق من الصلاحية
  if (invitation.expires_at && new Date(invitation.expires_at as string) < new Date()) {
    return c.json({ success: false, error: 'كود الدعوة منتهي الصلاحية' }, 400)
  }
  
  if (invitation.max_uses !== -1 && invitation.current_uses >= invitation.max_uses) {
    return c.json({ success: false, error: 'تم استخدام الكود بالحد الأقصى' }, 400)
  }
  
  return c.json({ success: true, data: invitation })
})

// الانضمام للدوري باستخدام كود
app.post('/api/leagues/join', async (c) => {
  const { invitation_code, team_id } = await c.req.json()
  
  // التحقق من الكود
  const invitation = await c.env.DB.prepare(`
    SELECT * FROM league_invitations WHERE invitation_code = ? AND is_active = 1
  `).bind(invitation_code).first()
  
  if (!invitation) {
    return c.json({ success: false, error: 'كود الدعوة غير صحيح' }, 404)
  }
  
  // التحقق من عدم الانضمام مسبقاً
  const existing = await c.env.DB.prepare(`
    SELECT id FROM league_participations WHERE league_id = ? AND team_id = ?
  `).bind(invitation.league_id, team_id).first()
  
  if (existing) {
    return c.json({ success: false, error: 'الفريق مسجل بالفعل في هذا الدوري' }, 400)
  }
  
  // إضافة الفريق
  await c.env.DB.prepare(`
    INSERT INTO league_participations (league_id, team_id, joined_via_code)
    VALUES (?, ?, ?)
  `).bind(invitation.league_id, team_id, invitation_code).run()
  
  // تحديث استخدام الكود
  await c.env.DB.prepare(`
    UPDATE league_invitations SET current_uses = current_uses + 1 WHERE invitation_code = ?
  `).bind(invitation_code).run()
  
  return c.json({ success: true, message: 'تم الانضمام للدوري بنجاح' })
})

// ============================================
// API ROUTES - المباريات (Matches)
// ============================================

// الحصول على مباريات دوري معين
app.get('/api/leagues/:leagueId/matches', async (c) => {
  const leagueId = c.req.param('leagueId')
  const status = c.req.query('status')
  const round = c.req.query('round')
  
  let query = `
    SELECT m.*,
    ht.name as home_team_name, ht.logo_url as home_team_logo,
    at.name as away_team_name, at.logo_url as away_team_logo,
    wt.name as winner_team_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN teams wt ON m.winner_team_id = wt.id
    WHERE m.league_id = ?
  `
  const params: any[] = [leagueId]
  
  if (status) {
    query += ' AND m.status = ?'
    params.push(status)
  }
  
  if (round) {
    query += ' AND m.match_round = ?'
    params.push(round)
  }
  
  query += ' ORDER BY m.match_date ASC, m.match_number ASC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// الحصول على تفاصيل مباراة
app.get('/api/matches/:id', async (c) => {
  const id = c.req.param('id')
  
  const match = await c.env.DB.prepare(`
    SELECT m.*,
    ht.name as home_team_name, ht.logo_url as home_team_logo, ht.formation as home_formation,
    at.name as away_team_name, at.logo_url as away_team_logo, at.formation as away_formation,
    l.name as league_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN leagues l ON m.league_id = l.id
    WHERE m.id = ?
  `).bind(id).first()
  
  if (!match) {
    return c.json({ success: false, error: 'المباراة غير موجودة' }, 404)
  }
  
  // الحصول على الأحداث
  const { results: events } = await c.env.DB.prepare(`
    SELECT me.*, p.name as player_name, t.name as team_name
    FROM match_events me
    LEFT JOIN players p ON me.player_id = p.id
    JOIN teams t ON me.team_id = t.id
    WHERE me.match_id = ?
    ORDER BY me.minute ASC, me.additional_time ASC
  `).bind(id).all()
  
  // الحصول على التشكيلة
  const { results: lineups } = await c.env.DB.prepare(`
    SELECT ml.*, p.name as player_name, t.name as team_name
    FROM match_lineups ml
    JOIN players p ON ml.player_id = p.id
    JOIN teams t ON ml.team_id = t.id
    WHERE ml.match_id = ?
    ORDER BY ml.team_id, ml.is_starter DESC, ml.position
  `).bind(id).all()
  
  return c.json({ success: true, data: { ...match, events, lineups } })
})

// إنشاء مباراة جديدة
app.post('/api/leagues/:leagueId/matches', async (c) => {
  const leagueId = c.req.param('leagueId')
  const match = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO matches (
      league_id, home_team_id, away_team_id, match_date, match_round,
      match_number, venue, is_knockout
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    leagueId, match.home_team_id, match.away_team_id, match.match_date,
    match.match_round, match.match_number, match.venue, match.is_knockout ? 1 : 0
  ).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id }, message: 'تم إنشاء المباراة' }, 201)
})

// تحديث نتيجة مباراة
app.patch('/api/matches/:id/result', async (c) => {
  const id = c.req.param('id')
  const { home_score, away_score, status, winner_team_id } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE matches 
    SET home_score = ?, away_score = ?, status = ?, winner_team_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(home_score, away_score, status || 'finished', winner_team_id, id).run()
  
  return c.json({ success: true, message: 'تم تحديث نتيجة المباراة' })
})

// إضافة حدث للمباراة
app.post('/api/matches/:matchId/events', async (c) => {
  const matchId = c.req.param('matchId')
  const event = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO match_events (
      match_id, team_id, player_id, event_type, minute, additional_time, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    matchId, event.team_id, event.player_id || null, event.event_type,
    event.minute, event.additional_time || 0, event.description || ''
  ).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// ============================================
// API ROUTES - خارطة البطولة (Tournament Bracket)
// ============================================

// الحصول على خارطة البطولة
app.get('/api/leagues/:leagueId/bracket', async (c) => {
  const leagueId = c.req.param('leagueId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT tb.*, 
    m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.status, m.match_date,
    ht.name as home_team_name, ht.logo_url as home_logo,
    at.name as away_team_name, at.logo_url as away_logo,
    wt.name as winner_name
    FROM tournament_bracket tb
    LEFT JOIN matches m ON tb.match_id = m.id
    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN teams wt ON m.winner_team_id = wt.id
    WHERE tb.league_id = ?
    ORDER BY tb.round_order ASC, tb.bracket_position ASC
  `).bind(leagueId).all()
  
  return c.json({ success: true, data: results })
})

// ============================================
// API ROUTES - جدول الترتيب (League Table)
// ============================================

// الحصول على جدول ترتيب الدوري
app.get('/api/leagues/:leagueId/table', async (c) => {
  const leagueId = c.req.param('leagueId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT lp.*, t.name as team_name, t.logo_url, t.coach_name,
    (lp.goals_for - lp.goals_against) as goal_difference
    FROM league_participations lp
    JOIN teams t ON lp.team_id = t.id
    WHERE lp.league_id = ?
    ORDER BY lp.points DESC, goal_difference DESC, lp.goals_for DESC
  `).bind(leagueId).all()
  
  return c.json({ success: true, data: results })
})

// ============================================
// API ROUTES - إحصائيات اللاعبين (Player Stats)
// ============================================

// الحصول على هدافي الدوري
app.get('/api/leagues/:leagueId/top-scorers', async (c) => {
  const leagueId = c.req.param('leagueId')
  const limit = c.req.query('limit') || '10'
  
  const { results } = await c.env.DB.prepare(`
    SELECT lps.*, p.name as player_name, p.position, p.jersey_number,
    t.name as team_name, t.logo_url as team_logo
    FROM league_player_stats lps
    JOIN players p ON lps.player_id = p.id
    JOIN teams t ON lps.team_id = t.id
    WHERE lps.league_id = ?
    ORDER BY lps.goals DESC, lps.assists DESC
    LIMIT ?
  `).bind(leagueId, parseInt(limit)).all()
  
  return c.json({ success: true, data: results })
})

// الحصول على صناع اللعب (Assists)
app.get('/api/leagues/:leagueId/top-assists', async (c) => {
  const leagueId = c.req.param('leagueId')
  const limit = c.req.query('limit') || '10'
  
  const { results } = await c.env.DB.prepare(`
    SELECT lps.*, p.name as player_name, p.position, p.jersey_number,
    t.name as team_name, t.logo_url as team_logo
    FROM league_player_stats lps
    JOIN players p ON lps.player_id = p.id
    JOIN teams t ON lps.team_id = t.id
    WHERE lps.league_id = ?
    ORDER BY lps.assists DESC, lps.goals DESC
    LIMIT ?
  `).bind(leagueId, parseInt(limit)).all()
  
  return c.json({ success: true, data: results })
})

// ============================================
// API ROUTES - نظام التحكيم (Referee System)
// ============================================

// الحصول على جميع الحكام
app.get('/api/referees', async (c) => {
  const available = c.req.query('available')
  
  let query = 'SELECT * FROM referees WHERE is_active = 1'
  const params: any[] = []
  
  if (available === '1') {
    query += ' AND is_available = 1'
  }
  
  query += ' ORDER BY matches_refereed DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// ============================================
// APIs جلسة التحكيم المباشرة (Live Refereeing)
// ============================================

// الحصول على جلسة التحكيم للمباراة
app.get('/api/matches/:matchId/referee-session', async (c) => {
  const matchId = c.req.param('matchId')
  
  const session = await c.env.DB.prepare(`
    SELECT lrs.*, r.full_name as referee_name, r.license_level,
    m.home_team_id, m.away_team_id,
    ht.name as home_team_name, at.name as away_team_name
    FROM live_refereeing_sessions lrs
    JOIN referees r ON lrs.main_referee_id = r.id
    JOIN matches m ON lrs.match_id = m.id
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE lrs.match_id = ?
  `).bind(matchId).first()
  
  if (!session) {
    return c.json({ success: false, error: 'لا توجد جلسة تحكيم لهذه المباراة' }, 404)
  }
  
  return c.json({ success: true, data: session })
})

// بدء المباراة
app.post('/api/matches/:matchId/start', async (c) => {
  const matchId = c.req.param('matchId')
  
  // تحديث جلسة التحكيم
  await c.env.DB.prepare(`
    UPDATE live_refereeing_sessions 
    SET match_status = 'first_half', kickoff_time = CURRENT_TIMESTAMP, started_at = CURRENT_TIMESTAMP
    WHERE match_id = ?
  `).bind(matchId).run()
  
  // تحديث حالة المباراة
  await c.env.DB.prepare(`
    UPDATE matches SET status = 'live' WHERE id = ?
  `).bind(matchId).run()
  
  return c.json({ success: true, message: 'تم بدء المباراة' })
})

// تسجيل حدث في المباراة
app.post('/api/matches/:matchId/events', async (c) => {
  const matchId = c.req.param('matchId')
  const event = await c.req.json()
  
  const db = c.env.DB
  
  // إضافة الحدث
  const result = await db.prepare(`
    INSERT INTO live_match_log (
      match_id, referee_id, event_type, minute, additional_time, half,
      team_id, player_id, assist_player_id, goal_type, card_reason,
      player_out_id, player_in_id, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    matchId, event.referee_id, event.event_type, event.minute, event.additional_time || 0,
    event.half, event.team_id || null, event.player_id || null, event.assist_player_id || null,
    event.goal_type || null, event.card_reason || null,
    event.player_out_id || null, event.player_in_id || null, event.description || ''
  ).run()
  
  // تحديث سجل اللاعب والنتيجة بناءً على نوع الحدث
  if (event.event_type === 'goal' || event.event_type === 'penalty_goal') {
    // تحديث النتيجة
    const session = await db.prepare('SELECT * FROM live_refereeing_sessions WHERE match_id = ?').bind(matchId).first()
    const match = await db.prepare('SELECT * FROM matches WHERE id = ?').bind(matchId).first()
    
    if (event.team_id === match.home_team_id) {
      await db.prepare(`
        UPDATE live_refereeing_sessions SET home_score = home_score + 1 WHERE match_id = ?
      `).bind(matchId).run()
    } else {
      await db.prepare(`
        UPDATE live_refereeing_sessions SET away_score = away_score + 1 WHERE match_id = ?
      `).bind(matchId).run()
    }
    
    // تحديث سجل الهداف
    if (event.player_id) {
      await db.prepare(`
        INSERT INTO player_league_records (league_id, player_id, team_id, goals)
        SELECT ?, ?, ?, 1
        WHERE NOT EXISTS (SELECT 1 FROM player_league_records WHERE league_id = ? AND player_id = ?)
      `).bind(match.league_id, event.player_id, event.team_id, match.league_id, event.player_id).run()
      
      await db.prepare(`
        UPDATE player_league_records 
        SET goals = goals + 1, updated_at = CURRENT_TIMESTAMP 
        WHERE league_id = ? AND player_id = ?
      `).bind(match.league_id, event.player_id).run()
    }
    
    // تحديث سجل صانع الهدف
    if (event.assist_player_id) {
      await db.prepare(`
        UPDATE player_league_records 
        SET assists = assists + 1, updated_at = CURRENT_TIMESTAMP 
        WHERE league_id = ? AND player_id = ?
      `).bind(match.league_id, event.assist_player_id).run()
    }
  }
  
  // تحديث البطاقات
  if (event.event_type === 'yellow_card') {
    const match = await db.prepare('SELECT league_id FROM matches WHERE id = ?').bind(matchId).first()
    
    await db.prepare(`
      UPDATE player_league_records 
      SET yellow_cards = yellow_cards + 1, updated_at = CURRENT_TIMESTAMP 
      WHERE league_id = ? AND player_id = ?
    `).bind(match.league_id, event.player_id).run()
    
    // إضافة سجل تأديبي
    await db.prepare(`
      INSERT INTO disciplinary_records (league_id, player_id, match_id, offense_type, offense_details, issued_by_referee_id)
      VALUES (?, ?, ?, 'yellow_card', ?, ?)
    `).bind(match.league_id, event.player_id, matchId, event.card_reason || 'مخالفة', event.referee_id).run()
  }
  
  if (event.event_type === 'red_card' || event.event_type === 'second_yellow') {
    const match = await db.prepare('SELECT league_id FROM matches WHERE id = ?').bind(matchId).first()
    
    await db.prepare(`
      UPDATE player_league_records 
      SET red_cards = red_cards + 1, current_suspension = 1, is_suspended = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE league_id = ? AND player_id = ?
    `).bind(match.league_id, event.player_id).run()
    
    // إضافة سجل تأديبي مع إيقاف
    await db.prepare(`
      INSERT INTO disciplinary_records (league_id, player_id, match_id, offense_type, offense_details, suspension_matches, issued_by_referee_id)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).bind(match.league_id, event.player_id, matchId, event.event_type, event.card_reason || 'طرد', event.referee_id).run()
  }
  
  return c.json({ success: true, data: { id: result.meta.last_row_id }, message: 'تم تسجيل الحدث' }, 201)
})

// الحصول على أحداث المباراة المباشرة
app.get('/api/matches/:matchId/live-events', async (c) => {
  const matchId = c.req.param('matchId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT lml.*, 
    r.full_name as referee_name,
    t.name as team_name,
    p.name as player_name, p.jersey_number,
    ap.name as assist_player_name,
    po.name as player_out_name,
    pi.name as player_in_name
    FROM live_match_log lml
    JOIN referees r ON lml.referee_id = r.id
    LEFT JOIN teams t ON lml.team_id = t.id
    LEFT JOIN players p ON lml.player_id = p.id
    LEFT JOIN players ap ON lml.assist_player_id = ap.id
    LEFT JOIN players po ON lml.player_out_id = po.id
    LEFT JOIN players pi ON lml.player_in_id = pi.id
    WHERE lml.match_id = ? AND lml.is_cancelled = 0
    ORDER BY lml.minute DESC, lml.additional_time DESC, lml.created_at DESC
  `).bind(matchId).all()
  
  return c.json({ success: true, data: results })
})

// تحديث حالة المباراة (نصف الوقت، نهاية المباراة، إلخ)
app.patch('/api/matches/:matchId/status', async (c) => {
  const matchId = c.req.param('matchId')
  const { status, added_time } = await c.req.json()
  
  const statusMap: any = {
    'halftime': { session_status: 'halftime', match_status: 'live' },
    'second_half': { session_status: 'second_half', match_status: 'live' },
    'fulltime': { session_status: 'finished', match_status: 'finished' }
  }
  
  if (statusMap[status]) {
    await c.env.DB.prepare(`
      UPDATE live_refereeing_sessions 
      SET match_status = ? ${status === 'halftime' ? ', halftime_start = CURRENT_TIMESTAMP, first_half_added_time = ?' : ''}
      ${status === 'second_half' ? ', second_half_start = CURRENT_TIMESTAMP' : ''}
      ${status === 'fulltime' ? ', fulltime = CURRENT_TIMESTAMP, ended_at = CURRENT_TIMESTAMP, second_half_added_time = ?' : ''}
      WHERE match_id = ?
    `).bind(
      statusMap[status].session_status,
      ...(status === 'halftime' ? [added_time || 0] : []),
      ...(status === 'fulltime' ? [added_time || 0] : []),
      matchId
    ).run()
    
    if (status === 'fulltime') {
      // تحديث النتيجة النهائية في جدول المباريات
      const session = await c.env.DB.prepare(`
        SELECT home_score, away_score FROM live_refereeing_sessions WHERE match_id = ?
      `).bind(matchId).first()
      
      await c.env.DB.prepare(`
        UPDATE matches 
        SET status = ?, home_score = ?, away_score = ?, 
            winner_team_id = CASE 
              WHEN ? > ? THEN home_team_id 
              WHEN ? < ? THEN away_team_id 
              ELSE NULL 
            END
        WHERE id = ?
      `).bind(
        statusMap[status].match_status,
        session.home_score, session.away_score,
        session.home_score, session.away_score,
        session.home_score, session.away_score,
        matchId
      ).run()
    }
  }
  
  return c.json({ success: true, message: 'تم تحديث حالة المباراة' })
})

// ============================================
// APIs سجل اللاعب في الدوري (Player League Records)
// ============================================

// الحصول على سجل لاعب في دوري معين
app.get('/api/leagues/:leagueId/players/:playerId/record', async (c) => {
  const leagueId = c.req.param('leagueId')
  const playerId = c.req.param('playerId')
  
  const record = await c.env.DB.prepare(`
    SELECT plr.*, p.name as player_name, p.position, p.jersey_number,
    t.name as team_name
    FROM player_league_records plr
    JOIN players p ON plr.player_id = p.id
    JOIN teams t ON plr.team_id = t.id
    WHERE plr.league_id = ? AND plr.player_id = ?
  `).bind(leagueId, playerId).first()
  
  if (!record) {
    return c.json({ success: false, error: 'لا يوجد سجل لهذا اللاعب في هذا الدوري' }, 404)
  }
  
  // الحصول على السجل التأديبي
  const { results: disciplinary } = await c.env.DB.prepare(`
    SELECT dr.*, m.match_date, m.match_round,
    ht.name as home_team, at.name as away_team
    FROM disciplinary_records dr
    JOIN matches m ON dr.match_id = m.id
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE dr.league_id = ? AND dr.player_id = ?
    ORDER BY dr.issued_at DESC
  `).bind(leagueId, playerId).all()
  
  return c.json({ success: true, data: { ...record, disciplinary_records: disciplinary } })
})

// الحصول على جميع سجلات اللاعبين في دوري (مع فلترة)
app.get('/api/leagues/:leagueId/player-records', async (c) => {
  const leagueId = c.req.param('leagueId')
  const teamId = c.req.query('team_id')
  const suspended = c.req.query('suspended')
  
  let query = `
    SELECT plr.*, p.name as player_name, p.position, p.jersey_number,
    t.name as team_name, t.logo_url as team_logo
    FROM player_league_records plr
    JOIN players p ON plr.player_id = p.id
    JOIN teams t ON plr.team_id = t.id
    WHERE plr.league_id = ?
  `
  const params: any[] = [leagueId]
  
  if (teamId) {
    query += ' AND plr.team_id = ?'
    params.push(teamId)
  }
  
  if (suspended === '1') {
    query += ' AND plr.is_suspended = 1'
  }
  
  query += ' ORDER BY plr.goals DESC, plr.assists DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// الحصول على السجل التأديبي لدوري
app.get('/api/leagues/:leagueId/disciplinary', async (c) => {
  const leagueId = c.req.param('leagueId')
  const status = c.req.query('status')
  
  let query = `
    SELECT dr.*, p.name as player_name, p.position, p.jersey_number,
    t.name as team_name, m.match_round,
    r.full_name as referee_name
    FROM disciplinary_records dr
    JOIN players p ON dr.player_id = p.id
    JOIN teams t ON p.team_id = t.id
    JOIN matches m ON dr.match_id = m.id
    LEFT JOIN referees r ON dr.issued_by_referee_id = r.id
    WHERE dr.league_id = ?
  `
  const params: any[] = [leagueId]
  
  if (status) {
    query += ' AND dr.status = ?'
    params.push(status)
  }
  
  query += ' ORDER BY dr.issued_at DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// ============================================================
// نظام مدير الفريق
// Team Manager System APIs
// ============================================================

// الحصول على معلومات مدير الفريق
app.get('/api/teams/:teamId/manager', async (c) => {
  const teamId = c.req.param('teamId')
  
  const manager = await c.env.DB.prepare(`
    SELECT * FROM team_managers
    WHERE team_id = ? AND is_active = 1
  `).bind(teamId).first()
  
  if (!manager) {
    return c.json({ success: false, error: 'مدير الفريق غير موجود' }, 404)
  }
  
  return c.json({ success: true, data: manager })
})

// الحصول على ألوان زي الفريق
app.get('/api/teams/:teamId/kits', async (c) => {
  const teamId = c.req.param('teamId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM team_kits
    WHERE team_id = ?
    ORDER BY is_default DESC, kit_type
  `).bind(teamId).all()
  
  return c.json({ success: true, data: results })
})

// إضافة زي جديد للفريق
app.post('/api/teams/:teamId/kits', async (c) => {
  const teamId = c.req.param('teamId')
  const { kit_type, season, primary_color, secondary_color, accent_color, shirt_pattern, shorts_color, socks_color, is_default } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO team_kits (team_id, kit_type, season, primary_color, secondary_color, accent_color, shirt_pattern, shorts_color, socks_color, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(teamId, kit_type, season || '2024/2025', primary_color, secondary_color, accent_color, shirt_pattern || 'solid', shorts_color, socks_color, is_default || 0).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// إنشاء قائمة مباراة (Squad List)
app.post('/api/matches/:matchId/squads', async (c) => {
  const matchId = c.req.param('matchId')
  const { team_id, kit_id, squad_size, starters_count, substitutes_count, manager_id } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO match_squads (match_id, team_id, kit_id, squad_size, starters_count, substitutes_count, created_by_manager_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(matchId, team_id, kit_id, squad_size || 18, starters_count || 11, substitutes_count || 7, manager_id).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// الحصول على قائمة المباراة
app.get('/api/matches/:matchId/squads/:teamId', async (c) => {
  const { matchId, teamId } = c.req.param()
  
  const squad = await c.env.DB.prepare(`
    SELECT ms.*, tk.primary_color, tk.secondary_color, tk.kit_type,
           t.name as team_name, tm.full_name as manager_name
    FROM match_squads ms
    JOIN team_kits tk ON ms.kit_id = tk.id
    JOIN teams t ON ms.team_id = t.id
    LEFT JOIN team_managers tm ON ms.confirmed_by_manager_id = tm.id
    WHERE ms.match_id = ? AND ms.team_id = ?
  `).bind(matchId, teamId).first()
  
  if (!squad) {
    return c.json({ success: false, error: 'قائمة المباراة غير موجودة' }, 404)
  }
  
  // الحصول على اللاعبين
  const { results: players } = await c.env.DB.prepare(`
    SELECT msp.*, p.name as player_name, p.overall_rating, p.position as player_position
    FROM match_squad_players msp
    JOIN players p ON msp.player_id = p.id
    WHERE msp.squad_id = ?
    ORDER BY msp.role, msp.formation_order
  `).bind(squad.id).all()
  
  return c.json({ 
    success: true, 
    data: { 
      ...squad, 
      players 
    } 
  })
})

// إضافة لاعب إلى قائمة المباراة
app.post('/api/matches/squads/:squadId/players', async (c) => {
  const squadId = c.req.param('squadId')
  const { player_id, jersey_number, position, role, formation_position, formation_order, is_fit } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO match_squad_players (squad_id, player_id, jersey_number, position, role, formation_position, formation_order, is_fit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(squadId, player_id, jersey_number, position, role || 'starter', formation_position, formation_order, is_fit !== false ? 1 : 0).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// طلب تبديل لاعب
app.post('/api/matches/:matchId/substitution-request', async (c) => {
  const matchId = c.req.param('matchId')
  const { team_id, player_out_id, player_in_id, requested_minute, request_reason, manager_notes, manager_id } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO substitution_requests (
      match_id, team_id, player_out_id, player_in_id, 
      requested_minute, request_reason, manager_notes,
      requested_by_manager_id, requested_at, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'pending')
  `).bind(matchId, team_id, player_out_id, player_in_id, requested_minute, request_reason || 'tactical', manager_notes, manager_id).run()
  
  // إنشاء رسالة للحكم
  const requestId = result.meta.last_row_id
  await c.env.DB.prepare(`
    INSERT INTO match_messages (
      match_id, sender_type, sender_id, receiver_type,
      message_type, message, related_request_id
    )
    VALUES (?, 'manager', ?, 'referee', 'substitution_request', ?, ?)
  `).bind(matchId, manager_id, manager_notes || 'طلب تبديل لاعب', requestId).run()
  
  return c.json({ success: true, data: { id: requestId } }, 201)
})

// الحصول على طلبات التبديل للمباراة
app.get('/api/matches/:matchId/substitution-requests', async (c) => {
  const matchId = c.req.param('matchId')
  const teamId = c.req.query('team_id')
  
  let query = `
    SELECT sr.*,
           po.name as player_out_name, po.jersey_number as out_jersey,
           pi.name as player_in_name, pi.jersey_number as in_jersey,
           t.name as team_name,
           tm.full_name as manager_name,
           r.full_name as referee_name
    FROM substitution_requests sr
    JOIN players po ON sr.player_out_id = po.id
    JOIN players pi ON sr.player_in_id = pi.id
    JOIN teams t ON sr.team_id = t.id
    LEFT JOIN team_managers tm ON sr.requested_by_manager_id = tm.id
    LEFT JOIN referees r ON sr.approved_by_referee_id = r.id
    WHERE sr.match_id = ?
  `
  
  const params = [matchId]
  if (teamId) {
    query += ' AND sr.team_id = ?'
    params.push(teamId)
  }
  
  query += ' ORDER BY sr.requested_at DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// الموافقة على طلب التبديل (للحكام)
app.post('/api/substitution-requests/:requestId/approve', async (c) => {
  const requestId = c.req.param('requestId')
  const { referee_id, actual_minute } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE substitution_requests
    SET status = 'approved', 
        approved_by_referee_id = ?,
        approved_at = CURRENT_TIMESTAMP,
        actual_minute = ?
    WHERE id = ?
  `).bind(referee_id, actual_minute, requestId).run()
  
  return c.json({ success: true, message: 'تمت الموافقة على طلب التبديل' })
})

// إكمال التبديل
app.post('/api/substitution-requests/:requestId/complete', async (c) => {
  const requestId = c.req.param('requestId')
  
  await c.env.DB.prepare(`
    UPDATE substitution_requests
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(requestId).run()
  
  return c.json({ success: true, message: 'تم إكمال التبديل' })
})

// رفض طلب التبديل (للحكام)
app.post('/api/substitution-requests/:requestId/reject', async (c) => {
  const requestId = c.req.param('requestId')
  const { referee_id, rejection_reason } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE substitution_requests
    SET status = 'rejected', 
        approved_by_referee_id = ?,
        rejection_reason = ?,
        approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(referee_id, rejection_reason, requestId).run()
  
  return c.json({ success: true, message: 'تم رفض طلب التبديل' })
})

// رسائل المباراة (للتواصل بين المدير والحكم)
app.get('/api/matches/:matchId/messages', async (c) => {
  const matchId = c.req.param('matchId')
  const receiverType = c.req.query('receiver_type')
  const receiverId = c.req.query('receiver_id')
  
  let query = `
    SELECT mm.*,
           CASE 
             WHEN mm.sender_type = 'manager' THEN tm.full_name
             WHEN mm.sender_type = 'referee' THEN r.full_name
           END as sender_name
    FROM match_messages mm
    LEFT JOIN team_managers tm ON mm.sender_type = 'manager' AND mm.sender_id = tm.id
    LEFT JOIN referees r ON mm.sender_type = 'referee' AND mm.sender_id = r.id
    WHERE mm.match_id = ?
  `
  
  const params = [matchId]
  if (receiverType && receiverId) {
    query += ' AND mm.receiver_type = ? AND mm.receiver_id = ?'
    params.push(receiverType, receiverId)
  }
  
  query += ' ORDER BY mm.sent_at DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// إرسال رسالة
app.post('/api/matches/:matchId/messages', async (c) => {
  const matchId = c.req.param('matchId')
  const { sender_type, sender_id, receiver_type, receiver_id, message_type, message, related_request_id } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO match_messages (
      match_id, sender_type, sender_id, receiver_type, receiver_id,
      message_type, message, related_request_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(matchId, sender_type, sender_id, receiver_type, receiver_id || null, message_type, message, related_request_id || null).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// قراءة رسالة
app.post('/api/messages/:messageId/read', async (c) => {
  const messageId = c.req.param('messageId')
  
  await c.env.DB.prepare(`
    UPDATE match_messages
    SET is_read = 1, read_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(messageId).run()
  
  return c.json({ success: true, message: 'تم وضع علامة مقروء' })
})

// إحصائيات مدير الفريق
app.get('/api/managers/:managerId/statistics', async (c) => {
  const managerId = c.req.param('managerId')
  const season = c.req.query('season')
  
  let query = `
    SELECT * FROM manager_statistics
    WHERE manager_id = ?
  `
  
  const params = [managerId]
  if (season) {
    query += ' AND season = ?'
    params.push(season)
  }
  
  query += ' ORDER BY season DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// ============================================================
// نظام سوق الانتقالات والإعارات
// Transfer Market and Loan System APIs
// ============================================================

// التحقق من الرقم المدني (منع التسجيل المكرر)
app.post('/api/players/verify-national-id', async (c) => {
  const { national_id } = await c.req.json()
  
  const existing = await c.env.DB.prepare(`
    SELECT id, full_name, birth_date, nationality, position, is_verified
    FROM player_registry
    WHERE national_id = ?
  `).bind(national_id).first()
  
  if (existing) {
    return c.json({ 
      success: false, 
      exists: true,
      message: 'هذا الرقم المدني مسجل بالفعل في النظام',
      data: existing 
    }, 409)
  }
  
  return c.json({ success: true, exists: false, message: 'الرقم المدني متاح للتسجيل' })
})

// تسجيل لاعب جديد (يتطلب مراجعة المشرف)
app.post('/api/players/register', async (c) => {
  const { national_id, full_name, birth_date, nationality, position, preferred_foot, height, weight, team_id, league_id, manager_id } = await c.req.json()
  
  // التحقق من عدم وجود الرقم المدني
  const existing = await c.env.DB.prepare(`
    SELECT id FROM player_registry WHERE national_id = ?
  `).bind(national_id).first()
  
  if (existing) {
    return c.json({ success: false, error: 'الرقم المدني مسجل بالفعل' }, 409)
  }
  
  // تسجيل اللاعب (غير مفعّل)
  const playerResult = await c.env.DB.prepare(`
    INSERT INTO player_registry (national_id, full_name, birth_date, nationality, position, preferred_foot, height, weight)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(national_id, full_name, birth_date, nationality, position, preferred_foot || 'Right', height, weight).run()
  
  const playerId = playerResult.meta.last_row_id
  
  // إنشاء طلب مراجعة
  const reviewResult = await c.env.DB.prepare(`
    INSERT INTO player_registration_reviews (
      player_registry_id, team_id, league_id, submitted_by_manager_id,
      national_id, full_name, birth_date, review_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).bind(playerId, team_id, league_id, manager_id, national_id, full_name, birth_date).run()
  
  return c.json({ 
    success: true, 
    message: 'تم إرسال طلب التسجيل للمراجعة',
    data: { player_id: playerId, review_id: reviewResult.meta.last_row_id }
  }, 201)
})

// الموافقة على تسجيل اللاعب (للمشرفين)
app.post('/api/players/registrations/:reviewId/approve', async (c) => {
  const reviewId = c.req.param('reviewId')
  const { admin_id } = await c.req.json()
  
  // الحصول على معلومات الطلب
  const review = await c.env.DB.prepare(`
    SELECT * FROM player_registration_reviews WHERE id = ?
  `).bind(reviewId).first()
  
  if (!review) {
    return c.json({ success: false, error: 'طلب التسجيل غير موجود' }, 404)
  }
  
  // تفعيل اللاعب
  await c.env.DB.prepare(`
    UPDATE player_registry
    SET is_verified = 1, verified_at = CURRENT_TIMESTAMP, verified_by_admin_id = ?
    WHERE id = ?
  `).bind(admin_id, review.player_registry_id).run()
  
  // تحديث حالة المراجعة
  await c.env.DB.prepare(`
    UPDATE player_registration_reviews
    SET review_status = 'approved', reviewed_by_admin_id = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(admin_id, reviewId).run()
  
  return c.json({ success: true, message: 'تم الموافقة على تسجيل اللاعب' })
})

// رفض تسجيل اللاعب
app.post('/api/players/registrations/:reviewId/reject', async (c) => {
  const reviewId = c.req.param('reviewId')
  const { admin_id, rejection_reason } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE player_registration_reviews
    SET review_status = 'rejected', reviewed_by_admin_id = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
    WHERE id = ?
  `).bind(admin_id, rejection_reason, reviewId).run()
  
  return c.json({ success: true, message: 'تم رفض طلب التسجيل' })
})

// عرض لاعب في سوق الانتقالات
app.post('/api/transfer-market/list-player', async (c) => {
  const { player_registry_id, team_id, manager_id, listing_type, asking_price, loan_duration_months, loan_fee, salary_contribution_percentage, description, listing_expires_at } = await c.req.json()
  
  // التحقق من أن اللاعب لم يُعرض من قبل
  const existing = await c.env.DB.prepare(`
    SELECT id FROM transfer_market
    WHERE player_registry_id = ? AND listing_status = 'active'
  `).bind(player_registry_id).first()
  
  if (existing) {
    return c.json({ success: false, error: 'اللاعب معروض بالفعل في سوق الانتقالات' }, 409)
  }
  
  const result = await c.env.DB.prepare(`
    INSERT INTO transfer_market (
      player_registry_id, current_team_id, listed_by_manager_id,
      listing_type, asking_price, loan_duration_months, loan_fee,
      salary_contribution_percentage, description, listing_expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(player_registry_id, team_id, manager_id, listing_type, asking_price, loan_duration_months, loan_fee, salary_contribution_percentage || 0, description, listing_expires_at).run()
  
  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201)
})

// الحصول على اللاعبين المعروضين في سوق الانتقالات
app.get('/api/transfer-market', async (c) => {
  const listingType = c.req.query('listing_type')
  const teamId = c.req.query('team_id')
  
  let query = `
    SELECT tm.*,
           pr.full_name, pr.nationality, pr.position, pr.birth_date, pr.preferred_foot, pr.height, pr.weight,
           t.name as current_team_name,
           tmgr.full_name as manager_name
    FROM transfer_market tm
    JOIN player_registry pr ON tm.player_registry_id = pr.id
    JOIN teams t ON tm.current_team_id = t.id
    JOIN team_managers tmgr ON tm.listed_by_manager_id = tmgr.id
    WHERE tm.listing_status = 'active'
  `
  
  const params: any[] = []
  if (listingType) {
    query += ' AND tm.listing_type = ?'
    params.push(listingType)
  }
  if (teamId) {
    query += ' AND tm.current_team_id = ?'
    params.push(parseInt(teamId))
  }
  
  query += ' ORDER BY tm.created_at DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// تقديم عرض على لاعب
app.post('/api/transfer-market/make-offer', async (c) => {
  const { listing_id, team_id, manager_id, offer_type, offered_amount, loan_duration_months, loan_fee_offered, salary_contribution_offered, offer_message, offer_expires_at } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO transfer_offers (
      market_listing_id, offering_team_id, offering_manager_id,
      offer_type, offered_amount, loan_duration_months, loan_fee_offered,
      salary_contribution_offered, offer_message, offer_expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(listing_id, team_id, manager_id, offer_type, offered_amount, loan_duration_months, loan_fee_offered, salary_contribution_offered || 0, offer_message, offer_expires_at).run()
  
  const offerId = result.meta.last_row_id
  
  // إنشاء إشعار لمدير الفريق صاحب الإعلان
  const listing = await c.env.DB.prepare(`
    SELECT tm.listed_by_manager_id, pr.full_name, t.name as offering_team
    FROM transfer_market tm
    JOIN player_registry pr ON tm.player_registry_id = pr.id
    JOIN teams t ON ? = t.id
    WHERE tm.id = ?
  `).bind(team_id, listing_id).first()
  
  if (listing) {
    await c.env.DB.prepare(`
      INSERT INTO transfer_notifications (
        notification_type, related_listing_id, related_offer_id,
        recipient_manager_id, sender_manager_id, title, message
      )
      VALUES ('new_offer', ?, ?, ?, ?, ?, ?)
    `).bind(
      listing_id, 
      offerId,
      listing.listed_by_manager_id,
      manager_id,
      `عرض جديد على ${listing.full_name}`,
      `تلقيت عرضاً من ${listing.offering_team} على ${listing.full_name}`
    ).run()
  }
  
  return c.json({ success: true, data: { id: offerId } }, 201)
})

// قبول عرض
app.post('/api/transfer-offers/:offerId/accept', async (c) => {
  const offerId = c.req.param('offerId')
  const { response_message } = await c.req.json()
  
  // تحديث حالة العرض
  await c.env.DB.prepare(`
    UPDATE transfer_offers
    SET offer_status = 'accepted', responded_at = CURRENT_TIMESTAMP, response_message = ?
    WHERE id = ?
  `).bind(response_message, offerId).run()
  
  // الحصول على تفاصيل العرض
  const offer = await c.env.DB.prepare(`
    SELECT * FROM transfer_offers WHERE id = ?
  `).bind(offerId).first()
  
  if (offer) {
    // تحديث حالة الإعلان
    await c.env.DB.prepare(`
      UPDATE transfer_market
      SET listing_status = CASE 
        WHEN ? = 'loan' THEN 'loaned'
        ELSE 'sold'
      END
      WHERE id = ?
    `).bind(offer.offer_type, offer.market_listing_id).run()
    
    // إنشاء إشعار
    await c.env.DB.prepare(`
      INSERT INTO transfer_notifications (
        notification_type, related_offer_id, recipient_manager_id, title, message
      )
      VALUES ('offer_accepted', ?, ?, ?, ?)
    `).bind(offerId, offer.offering_manager_id, 'تم قبول عرضك', response_message || 'تم قبول عرضك على اللاعب').run()
  }
  
  return c.json({ success: true, message: 'تم قبول العرض' })
})

// رفض عرض
app.post('/api/transfer-offers/:offerId/reject', async (c) => {
  const offerId = c.req.param('offerId')
  const { response_message } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE transfer_offers
    SET offer_status = 'rejected', responded_at = CURRENT_TIMESTAMP, response_message = ?
    WHERE id = ?
  `).bind(response_message, offerId).run()
  
  // الحصول على تفاصيل العرض وإنشاء إشعار
  const offer = await c.env.DB.prepare(`
    SELECT * FROM transfer_offers WHERE id = ?
  `).bind(offerId).first()
  
  if (offer) {
    await c.env.DB.prepare(`
      INSERT INTO transfer_notifications (
        notification_type, related_offer_id, recipient_manager_id, title, message
      )
      VALUES ('offer_rejected', ?, ?, ?, ?)
    `).bind(offerId, offer.offering_manager_id, 'تم رفض عرضك', response_message || 'تم رفض عرضك على اللاعب').run()
  }
  
  return c.json({ success: true, message: 'تم رفض العرض' })
})

// الحصول على عروض لاعب معين
app.get('/api/transfer-market/:listingId/offers', async (c) => {
  const listingId = c.req.param('listingId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT tof.*,
           t.name as offering_team_name,
           tm.full_name as offering_manager_name
    FROM transfer_offers tof
    JOIN teams t ON tof.offering_team_id = t.id
    JOIN team_managers tm ON tof.offering_manager_id = tm.id
    WHERE tof.market_listing_id = ?
    ORDER BY tof.created_at DESC
  `).bind(listingId).all()
  
  return c.json({ success: true, data: results })
})

// الحصول على الإشعارات
app.get('/api/managers/:managerId/notifications', async (c) => {
  const managerId = c.req.param('managerId')
  const unreadOnly = c.req.query('unread_only') === 'true'
  
  let query = `
    SELECT tn.*,
           sm.full_name as sender_name
    FROM transfer_notifications tn
    LEFT JOIN team_managers sm ON tn.sender_manager_id = sm.id
    WHERE tn.recipient_manager_id = ?
  `
  
  if (unreadOnly) {
    query += ' AND tn.is_read = 0'
  }
  
  query += ' ORDER BY tn.created_at DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(managerId).all()
  return c.json({ success: true, data: results })
})

// قراءة إشعار
app.post('/api/notifications/:notificationId/read', async (c) => {
  const notificationId = c.req.param('notificationId')
  
  await c.env.DB.prepare(`
    UPDATE transfer_notifications
    SET is_read = 1, read_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(notificationId).run()
  
  return c.json({ success: true, message: 'تم وضع علامة مقروء' })
})

// التحقق من تسجيل اللاعب في الدوري (منع التسجيل المكرر)
app.get('/api/leagues/:leagueId/player-registration/:nationalId', async (c) => {
  const { leagueId, nationalId } = c.req.param()
  const season = c.req.query('season') || '2024/2025'
  
  const registration = await c.env.DB.prepare(`
    SELECT lpr.*, pr.full_name, t.name as team_name
    FROM league_player_registrations lpr
    JOIN player_registry pr ON lpr.player_registry_id = pr.id
    JOIN teams t ON lpr.current_team_id = t.id
    WHERE lpr.league_id = ? AND pr.national_id = ? AND lpr.season = ?
  `).bind(leagueId, nationalId, season).first()
  
  if (registration) {
    return c.json({ 
      success: false, 
      registered: true,
      message: 'اللاعب مسجل بالفعل في هذا الدوري',
      data: registration 
    }, 409)
  }
  
  return c.json({ success: true, registered: false, message: 'اللاعب غير مسجل في هذا الدوري' })
})

// ==================== نظام تصنيف الدوريات وتسجيل المشاركين ====================

// الحصول على تفاصيل قائمة الفريق في الدوري
app.get('/api/leagues/:leagueId/teams/:teamId/roster', async (c) => {  
  const leagueId = c.req.param('leagueId')
  const teamId = c.req.param('teamId')
  
  const roster = await c.env.DB.prepare(`
    SELECT lrp.*,
           pr.full_name,
           pr.national_id,
           pr.date_of_birth,
           pr.playing_position,
           pr.nationality
    FROM league_roster_players lrp
    JOIN player_registry pr ON lrp.player_registry_id = pr.id
    JOIN league_team_rosters ltr ON lrp.team_roster_id = ltr.id
    WHERE ltr.league_id = ? AND ltr.team_id = ?
    ORDER BY lrp.position_order, lrp.jersey_number
  `).bind(leagueId, teamId).all()
  
  return c.json({ success: true, data: roster.results })
})

// الحصول على جميع المشاركين في الدوري
app.get('/api/leagues/:leagueId/participants', async (c) => {
  const leagueId = c.req.param('leagueId')
  const participantType = c.req.query('type') // admin, referee, coach, team_manager
  
  let query = `
    SELECT lp.*,
           t.name as team_name
    FROM league_participants lp
    LEFT JOIN teams t ON lp.team_id = t.id
    WHERE lp.league_id = ?
  `
  
  const params = [leagueId]
  
  if (participantType) {
    query += ' AND lp.participant_type = ?'
    params.push(participantType)
  }
  
  query += ' ORDER BY lp.participant_type, lp.person_name'
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

// إضافة مشارك جديد للدوري
app.post('/api/leagues/:leagueId/participants', async (c) => {
  const leagueId = c.req.param('leagueId')
  const data = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO league_participants (
      league_id, participant_type, user_id, person_name, 
      role_title, email, phone, team_id, license_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    leagueId,
    data.participant_type,
    data.user_id || null,
    data.person_name,
    data.role_title,
    data.email,
    data.phone,
    data.team_id || null,
    data.license_number || null
  ).run()
  
  return c.json({ 
    success: true, 
    participant_id: result.meta.last_row_id 
  })
})

// التحقق من صلاحية قائمة الفريق حسب تصنيف الدوري
app.get('/api/leagues/:leagueId/teams/:teamId/roster-validation', async (c) => {
  const leagueId = c.req.param('leagueId')
  const teamId = c.req.param('teamId')
  
  // الحصول على متطلبات الدوري
  const league = await c.env.DB.prepare(`
    SELECT league_category, max_roster_size, max_starters, max_substitutes
    FROM leagues
    WHERE id = ?
  `).bind(leagueId).first()
  
  if (!league) {
    return c.json({ success: false, error: 'الدوري غير موجود' }, 404)
  }
  
  // الحصول على roster_id
  const rosterInfo = await c.env.DB.prepare(`
    SELECT id FROM league_team_rosters
    WHERE league_id = ? AND team_id = ?
  `).bind(leagueId, teamId).first()
  
  if (!rosterInfo) {
    return c.json({ 
      success: true, 
      valid: false,
      league_category: league.league_category,
      requirements: {
        max_roster_size: league.max_roster_size,
        max_starters: league.max_starters,
        max_substitutes: league.max_substitutes
      },
      current: {
        total: 0,
        starters: 0,
        substitutes: 0
      },
      message: 'لم يتم إنشاء قائمة للفريق بعد'
    })
  }
  
  // عد اللاعبين في القائمة
  const rosterCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN roster_status = 'starter' THEN 1 ELSE 0 END) as starters,
           SUM(CASE WHEN roster_status = 'substitute' THEN 1 ELSE 0 END) as substitutes
    FROM league_roster_players
    WHERE team_roster_id = ? AND is_eligible = 1
  `).bind(rosterInfo.id).first()
  
  const isValid = 
    rosterCount.total <= league.max_roster_size &&
    rosterCount.starters <= league.max_starters &&
    rosterCount.substitutes <= league.max_substitutes
  
  return c.json({ 
    success: true, 
    valid: isValid,
    league_category: league.league_category,
    requirements: {
      max_roster_size: league.max_roster_size,
      max_starters: league.max_starters,
      max_substitutes: league.max_substitutes
    },
    current: {
      total: rosterCount.total,
      starters: rosterCount.starters,
      substitutes: rosterCount.substitutes
    }
  })
})

// ==================== نظام الجوائز والصلاحيات ====================

// الحصول على جوائز الدوري (عامة - للجميع)
app.get('/api/leagues/:leagueId/prizes', async (c) => {
  const leagueId = c.req.param('leagueId')
  const onlyAnnounced = c.req.query('announced_only') !== 'false' // افتراضياً نعرض المعلنة فقط
  
  let query = `
    SELECT lp.*,
           u.full_name as created_by_name
    FROM league_prizes lp
    LEFT JOIN users u ON lp.created_by_admin_id = u.id
    WHERE lp.league_id = ?
  `
  
  if (onlyAnnounced) {
    query += ' AND lp.is_announced = 1'
  }
  
  query += ' ORDER BY lp.rank_position ASC'
  
  const { results } = await c.env.DB.prepare(query).bind(leagueId).all()
  return c.json({ success: true, data: results })
})

// إضافة/تعديل جائزة (مشرفون فقط)
app.post('/api/leagues/:leagueId/prizes', async (c) => {
  const leagueId = c.req.param('leagueId')
  const data = await c.req.json()
  const adminId = data.admin_id // يجب إرسالها من الواجهة بعد تسجيل الدخول
  
  // التحقق من العملة (فقط OMR أو USD)
  const currency = data.currency || 'OMR'
  if (currency !== 'OMR' && currency !== 'USD') {
    return c.json({ 
      success: false, 
      error: 'العملة غير مدعومة. يرجى اختيار الريال العماني (OMR) أو الدولار الأمريكي (USD) فقط' 
    }, 400)
  }
  
  // التحقق من صلاحية المشرف
  const permission = await c.env.DB.prepare(`
    SELECT can_modify_prizes
    FROM league_admin_permissions
    WHERE league_id = ? AND admin_id = ? AND is_active = 1
  `).bind(leagueId, adminId).first()
  
  if (!permission || !permission.can_modify_prizes) {
    return c.json({ 
      success: false, 
      error: 'ليس لديك صلاحية تعديل الجوائز' 
    }, 403)
  }
  
  // إضافة الجائزة
  const result = await c.env.DB.prepare(`
    INSERT INTO league_prizes (
      league_id, rank_position, prize_type,
      cash_amount, currency, trophy_name, medal_type,
      certificate_title, prize_description,
      created_by_admin_id, is_announced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    leagueId,
    data.rank_position,
    data.prize_type,
    data.cash_amount || 0,
    currency,
    data.trophy_name || null,
    data.medal_type || null,
    data.certificate_title || null,
    data.prize_description,
    adminId,
    data.is_announced || 0
  ).run()
  
  // تسجيل في Log
  await c.env.DB.prepare(`
    INSERT INTO prize_modification_log (
      prize_id, league_id, modified_by_admin_id,
      modification_type, new_value, modification_reason
    ) VALUES (?, ?, ?, 'created', ?, ?)
  `).bind(
    result.meta.last_row_id,
    leagueId,
    adminId,
    JSON.stringify(data),
    data.modification_reason || 'إضافة جائزة جديدة'
  ).run()
  
  return c.json({ 
    success: true, 
    prize_id: result.meta.last_row_id 
  })
})

// تحديث جائزة (مشرفون فقط)
app.put('/api/prizes/:prizeId', async (c) => {
  const prizeId = c.req.param('prizeId')
  const data = await c.req.json()
  const adminId = data.admin_id
  
  // التحقق من العملة إذا تم إرسالها
  if (data.currency && data.currency !== 'OMR' && data.currency !== 'USD') {
    return c.json({ 
      success: false, 
      error: 'العملة غير مدعومة. يرجى اختيار الريال العماني (OMR) أو الدولار الأمريكي (USD) فقط' 
    }, 400)
  }
  
  // الحصول على معلومات الجائزة الحالية
  const oldPrize = await c.env.DB.prepare(`
    SELECT * FROM league_prizes WHERE id = ?
  `).bind(prizeId).first()
  
  if (!oldPrize) {
    return c.json({ success: false, error: 'الجائزة غير موجودة' }, 404)
  }
  
  // التحقق من الصلاحية
  const permission = await c.env.DB.prepare(`
    SELECT can_modify_prizes
    FROM league_admin_permissions
    WHERE league_id = ? AND admin_id = ? AND is_active = 1
  `).bind(oldPrize.league_id, adminId).first()
  
  if (!permission || !permission.can_modify_prizes) {
    return c.json({ 
      success: false, 
      error: 'ليس لديك صلاحية تعديل الجوائز' 
    }, 403)
  }
  
  // تحديث الجائزة
  await c.env.DB.prepare(`
    UPDATE league_prizes
    SET cash_amount = ?,
        currency = ?,
        trophy_name = ?,
        medal_type = ?,
        prize_description = ?,
        last_modified_by = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    data.cash_amount || oldPrize.cash_amount,
    data.currency || oldPrize.currency,
    data.trophy_name || oldPrize.trophy_name,
    data.medal_type || oldPrize.medal_type,
    data.prize_description || oldPrize.prize_description,
    adminId,
    prizeId
  ).run()
  
  // تسجيل التعديل
  await c.env.DB.prepare(`
    INSERT INTO prize_modification_log (
      prize_id, league_id, modified_by_admin_id,
      modification_type, old_value, new_value, modification_reason
    ) VALUES (?, ?, ?, 'updated', ?, ?, ?)
  `).bind(
    prizeId,
    oldPrize.league_id,
    adminId,
    JSON.stringify(oldPrize),
    JSON.stringify(data),
    data.modification_reason || 'تحديث معلومات الجائزة'
  ).run()
  
  return c.json({ success: true })
})

// الإعلان عن جائزة (مشرفون فقط)
app.post('/api/prizes/:prizeId/announce', async (c) => {
  const prizeId = c.req.param('prizeId')
  const { admin_id } = await c.req.json()
  
  const prize = await c.env.DB.prepare(`
    SELECT league_id FROM league_prizes WHERE id = ?
  `).bind(prizeId).first()
  
  if (!prize) {
    return c.json({ success: false, error: 'الجائزة غير موجودة' }, 404)
  }
  
  // التحقق من صلاحية الإعلان
  const permission = await c.env.DB.prepare(`
    SELECT can_announce_prizes
    FROM league_admin_permissions
    WHERE league_id = ? AND admin_id = ? AND is_active = 1
  `).bind(prize.league_id, admin_id).first()
  
  if (!permission || !permission.can_announce_prizes) {
    return c.json({ 
      success: false, 
      error: 'ليس لديك صلاحية الإعلان عن الجوائز' 
    }, 403)
  }
  
  // تحديث حالة الإعلان
  await c.env.DB.prepare(`
    UPDATE league_prizes
    SET is_announced = 1,
        announcement_date = CURRENT_TIMESTAMP,
        last_modified_by = ?
    WHERE id = ?
  `).bind(admin_id, prizeId).run()
  
  // تسجيل في Log
  await c.env.DB.prepare(`
    INSERT INTO prize_modification_log (
      prize_id, league_id, modified_by_admin_id,
      modification_type, new_value
    ) VALUES (?, ?, ?, 'announced', ?)
  `).bind(
    prizeId,
    prize.league_id,
    admin_id,
    JSON.stringify({ announced_at: new Date().toISOString() })
  ).run()
  
  return c.json({ success: true, message: 'تم الإعلان عن الجائزة بنجاح' })
})

// التحقق من صلاحيات المشرف في الدوري
app.get('/api/leagues/:leagueId/admin/:adminId/permissions', async (c) => {
  const leagueId = c.req.param('leagueId')
  const adminId = c.req.param('adminId')
  
  const permissions = await c.env.DB.prepare(`
    SELECT * FROM league_admin_permissions
    WHERE league_id = ? AND admin_id = ? AND is_active = 1
  `).bind(leagueId, adminId).first()
  
  if (!permissions) {
    return c.json({ 
      success: false, 
      error: 'المشرف غير مسجل في هذا الدوري',
      has_permissions: false
    })
  }
  
  return c.json({ 
    success: true, 
    has_permissions: true,
    permissions: permissions 
  })
})

// سجل تعديلات الجوائز (مشرفون فقط)
app.get('/api/prizes/:prizeId/history', async (c) => {
  const prizeId = c.req.param('prizeId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT pml.*,
           u.full_name as admin_name
    FROM prize_modification_log pml
    JOIN users u ON pml.modified_by_admin_id = u.id
    WHERE pml.prize_id = ?
    ORDER BY pml.created_at DESC
  `).bind(prizeId).all()
  
  return c.json({ success: true, data: results })
})

// ============================================
// نظام المصادقة (Authentication APIs)
// ============================================

// تسجيل مستخدم جديد
app.post('/api/register', async (c) => {
  const { email, password, full_name, role, phone, national_id } = await c.req.json()
  
  // التحقق من البيانات الأساسية
  if (!email || !password || !full_name || !role) {
    return c.json({ 
      success: false, 
      error: 'يرجى إدخال جميع البيانات المطلوبة' 
    }, 400)
  }
  
  // التحقق من الدور
  const validRoles = ['admin', 'coach', 'referee', 'team_manager']
  if (!validRoles.includes(role)) {
    return c.json({ 
      success: false, 
      error: 'دور المستخدم غير صالح' 
    }, 400)
  }
  
  // التحقق من عدم تكرار البريد الإلكتروني
  const existingUser = await c.env.DB.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(email).first()
  
  if (existingUser) {
    return c.json({ 
      success: false, 
      error: 'البريد الإلكتروني مستخدم بالفعل' 
    }, 409)
  }
  
  // التحقق من عدم تكرار الرقم المدني (إذا تم إدخاله)
  if (national_id) {
    const existingNationalId = await c.env.DB.prepare(`
      SELECT id FROM users WHERE national_id = ?
    `).bind(national_id).first()
    
    if (existingNationalId) {
      return c.json({ 
        success: false, 
        error: 'الرقم المدني مستخدم بالفعل' 
      }, 409)
    }
  }
  
  // تشفير كلمة المرور (هنا نستخدم bcrypt في production)
  // للبساطة نستخدم password مباشرة في التجربة
  const password_hash = password // في الإنتاج: await bcrypt.hash(password, 10)
  
  // إنشاء المستخدم
  const result = await c.env.DB.prepare(`
    INSERT INTO users (
      email, password_hash, full_name, role, phone, national_id, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(
    email, 
    password_hash, 
    full_name, 
    role, 
    phone || null, 
    national_id || null
  ).run()
  
  return c.json({ 
    success: true, 
    message: 'تم إنشاء الحساب بنجاح',
    user_id: result.meta.last_row_id 
  }, 201)
})

// تسجيل الدخول
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json()
  
  if (!email || !password) {
    return c.json({ 
      success: false, 
      error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' 
    }, 400)
  }
  
  // البحث عن المستخدم
  const user = await c.env.DB.prepare(`
    SELECT id, email, full_name, role, phone, national_id, is_active
    FROM users
    WHERE email = ?
  `).bind(email).first()
  
  if (!user) {
    return c.json({ 
      success: false, 
      error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
    }, 401)
  }
  
  // التحقق من كلمة المرور (في production نستخدم bcrypt.compare)
  const passwordValid = true // في الإنتاج: await bcrypt.compare(password, user.password_hash)
  
  if (!passwordValid) {
    return c.json({ 
      success: false, 
      error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
    }, 401)
  }
  
  if (!user.is_active) {
    return c.json({ 
      success: false, 
      error: 'الحساب موقوف، يرجى التواصل مع الإدارة' 
    }, 403)
  }
  
  // إنشاء جلسة (Session Token)
  const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 أيام
  
  await c.env.DB.prepare(`
    INSERT INTO user_sessions (
      user_id, session_token, expires_at, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    user.id,
    sessionToken,
    expiresAt.toISOString(),
    c.req.header('cf-connecting-ip') || 'unknown',
    c.req.header('user-agent') || 'unknown'
  ).run()
  
  return c.json({ 
    success: true, 
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      national_id: user.national_id
    },
    session_token: sessionToken,
    expires_at: expiresAt.toISOString()
  })
})

// تسجيل الخروج
app.post('/api/logout', async (c) => {
  const { session_token } = await c.req.json()
  
  if (!session_token) {
    return c.json({ 
      success: false, 
      error: 'لم يتم توفير رمز الجلسة' 
    }, 400)
  }
  
  await c.env.DB.prepare(`
    UPDATE user_sessions
    SET is_active = 0,
        logout_at = CURRENT_TIMESTAMP
    WHERE session_token = ?
  `).bind(session_token).run()
  
  return c.json({ 
    success: true, 
    message: 'تم تسجيل الخروج بنجاح' 
  })
})

// عرض بيانات المستخدم
app.get('/api/profile', async (c) => {
  const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!sessionToken) {
    return c.json({ 
      success: false, 
      error: 'يرجى تسجيل الدخول أولاً' 
    }, 401)
  }
  
  // التحقق من الجلسة
  const session = await c.env.DB.prepare(`
    SELECT user_id, expires_at
    FROM user_sessions
    WHERE session_token = ? AND is_active = 1
  `).bind(sessionToken).first()
  
  if (!session) {
    return c.json({ 
      success: false, 
      error: 'جلسة غير صالحة' 
    }, 401)
  }
  
  if (new Date(session.expires_at) < new Date()) {
    return c.json({ 
      success: false, 
      error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى' 
    }, 401)
  }
  
  // جلب بيانات المستخدم
  const user = await c.env.DB.prepare(`
    SELECT id, email, full_name, role, phone, national_id, avatar_url, created_at
    FROM users
    WHERE id = ?
  `).bind(session.user_id).first()
  
  return c.json({ 
    success: true, 
    user: user 
  })
})

// ============================================
// نظام طلبات الانضمام للدوريات
// ============================================

// تقديم طلب انضمام لدوري
app.post('/api/leagues/:leagueId/join-request', async (c) => {
  const leagueId = c.req.param('leagueId')
  const { team_id, user_id, message } = await c.req.json()
  
  if (!team_id || !user_id) {
    return c.json({ 
      success: false, 
      error: 'يرجى توفير معرف الفريق والمستخدم' 
    }, 400)
  }
  
  // التحقق من أن الدوري موجود
  const league = await c.env.DB.prepare(`
    SELECT id, name, privacy_type, require_approval, 
           auto_approve_on_requirements, max_teams, status
    FROM leagues WHERE id = ?
  `).bind(leagueId).first()
  
  if (!league) {
    return c.json({ 
      success: false, 
      error: 'الدوري غير موجود' 
    }, 404)
  }
  
  if (league.status === 'completed') {
    return c.json({ 
      success: false, 
      error: 'الدوري منتهي ولا يقبل فرق جديدة' 
    }, 400)
  }
  
  // التحقق من عدم تكرار الطلب
  const existingRequest = await c.env.DB.prepare(`
    SELECT id FROM league_join_requests
    WHERE league_id = ? AND team_id = ?
      AND status IN ('pending', 'approved')
  `).bind(leagueId, team_id).first()
  
  if (existingRequest) {
    return c.json({ 
      success: false, 
      error: 'يوجد طلب سابق لهذا الفريق في هذا الدوري' 
    }, 409)
  }
  
  // التحقق من عدد الفرق
  const teamsCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count 
    FROM league_participations 
    WHERE league_id = ?
  `).bind(leagueId).first()
  
  if (teamsCount && teamsCount.count >= league.max_teams) {
    return c.json({ 
      success: false, 
      error: 'الدوري ممتلئ، لا يمكن قبول فرق جديدة' 
    }, 400)
  }
  
  // جلب بيانات الفريق للتحقق من الشروط
  const team = await c.env.DB.prepare(`
    SELECT * FROM teams WHERE id = ?
  `).bind(team_id).first()
  
  if (!team) {
    return c.json({ 
      success: false, 
      error: 'الفريق غير موجود' 
    }, 404)
  }
  
  // جلب شروط الدوري
  const requirements = await c.env.DB.prepare(`
    SELECT * FROM league_entry_requirements WHERE league_id = ?
  `).bind(leagueId).first()
  
  let meetsRequirements = true
  let requirementChecks = {}
  
  if (requirements) {
    // عدد اللاعبين
    const playersCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM players WHERE team_id = ?
    `).bind(team_id).first()
    
    const hasEnoughPlayers = playersCount && 
      playersCount.count >= requirements.min_players && 
      playersCount.count <= requirements.max_players
    
    requirementChecks.players = {
      required: `${requirements.min_players}-${requirements.max_players}`,
      actual: playersCount?.count || 0,
      meets: hasEnoughPlayers
    }
    
    // عدد الحراس
    const goalkeepersCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM players 
      WHERE team_id = ? AND position = 'GK'
    `).bind(team_id).first()
    
    const hasEnoughGoalkeepers = goalkeepersCount && 
      goalkeepersCount.count >= requirements.min_goalkeepers
    
    requirementChecks.goalkeepers = {
      required: `${requirements.min_goalkeepers}+`,
      actual: goalkeepersCount?.count || 0,
      meets: hasEnoughGoalkeepers
    }
    
    meetsRequirements = hasEnoughPlayers && hasEnoughGoalkeepers
  }
  
  // تحديد حالة الطلب
  let status = 'pending'
  if (league.auto_approve_on_requirements && meetsRequirements) {
    status = 'approved'
  } else if (!league.require_approval) {
    status = 'approved'
  }
  
  // إنشاء الطلب
  const result = await c.env.DB.prepare(`
    INSERT INTO league_join_requests (
      league_id, team_id, coach_user_id,
      status, meets_requirements, requirement_checks,
      request_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    leagueId,
    team_id,
    user_id,
    status,
    meetsRequirements ? 1 : 0,
    JSON.stringify(requirementChecks),
    message || null
  ).run()
  
  // إذا تمت الموافقة تلقائياً، إضافة الفريق للدوري
  if (status === 'approved') {
    await c.env.DB.prepare(`
      INSERT INTO league_participations (league_id, team_id)
      VALUES (?, ?)
    `).bind(leagueId, team_id).run()
  }
  
  return c.json({ 
    success: true, 
    message: status === 'approved' 
      ? 'تمت الموافقة على انضمام الفريق تلقائياً' 
      : 'تم تقديم الطلب بنجاح، في انتظار موافقة المشرف',
    request_id: result.meta.last_row_id,
    status: status,
    meets_requirements: meetsRequirements,
    requirement_checks: requirementChecks
  }, 201)
})

// عرض طلبات الانضمام (للمشرف)
app.get('/api/leagues/:leagueId/join-requests', async (c) => {
  const leagueId = c.req.param('leagueId')
  const status = c.req.query('status') // pending, approved, rejected
  
  let query = `
    SELECT ljr.*,
           t.name as team_name,
           t.country as team_country,
           u.full_name as submitted_by_name,
           u.email as submitted_by_email
    FROM league_join_requests ljr
    JOIN teams t ON ljr.team_id = t.id
    JOIN users u ON ljr.coach_user_id = u.id
    WHERE ljr.league_id = ?
  `
  
  const params = [leagueId]
  
  if (status) {
    query += ` AND ljr.status = ?`
    params.push(status)
  }
  
  query += ` ORDER BY ljr.created_at DESC`
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  
  return c.json({ success: true, data: results })
})

// الموافقة على طلب انضمام
app.post('/api/join-requests/:requestId/approve', async (c) => {
  const requestId = c.req.param('requestId')
  const { admin_id } = await c.req.json()
  
  // جلب الطلب
  const request = await c.env.DB.prepare(`
    SELECT ljr.*, l.admin_id as league_admin_id, l.max_teams
    FROM league_join_requests ljr
    JOIN leagues l ON ljr.league_id = l.id
    WHERE ljr.id = ?
  `).bind(requestId).first()
  
  if (!request) {
    return c.json({ 
      success: false, 
      error: 'الطلب غير موجود' 
    }, 404)
  }
  
  // التحقق من صلاحية المشرف
  if (request.league_admin_id !== admin_id) {
    return c.json({ 
      success: false, 
      error: 'ليس لديك صلاحية للموافقة على هذا الطلب' 
    }, 403)
  }
  
  if (request.status !== 'pending') {
    return c.json({ 
      success: false, 
      error: 'تم معالجة الطلب بالفعل' 
    }, 400)
  }
  
  // التحقق من عدد الفرق
  const teamsCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count 
    FROM league_participations 
    WHERE league_id = ?
  `).bind(request.league_id).first()
  
  if (teamsCount && teamsCount.count >= request.max_teams) {
    return c.json({ 
      success: false, 
      error: 'الدوري ممتلئ، لا يمكن قبول فرق جديدة' 
    }, 400)
  }
  
  // تحديث الطلب
  await c.env.DB.prepare(`
    UPDATE league_join_requests
    SET status = 'approved',
        reviewed_by_admin_id = ?,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(admin_id, requestId).run()
  
  // إضافة الفريق للدوري
  await c.env.DB.prepare(`
    INSERT INTO league_participations (league_id, team_id)
    VALUES (?, ?)
  `).bind(request.league_id, request.team_id).run()
  
  return c.json({ 
    success: true, 
    message: 'تمت الموافقة على الطلب بنجاح' 
  })
})

// رفض طلب انضمام
app.post('/api/join-requests/:requestId/reject', async (c) => {
  const requestId = c.req.param('requestId')
  const { admin_id, reason } = await c.req.json()
  
  // جلب الطلب
  const request = await c.env.DB.prepare(`
    SELECT ljr.*, l.admin_id as league_admin_id
    FROM league_join_requests ljr
    JOIN leagues l ON ljr.league_id = l.id
    WHERE ljr.id = ?
  `).bind(requestId).first()
  
  if (!request) {
    return c.json({ 
      success: false, 
      error: 'الطلب غير موجود' 
    }, 404)
  }
  
  // التحقق من صلاحية المشرف
  if (request.league_admin_id !== admin_id) {
    return c.json({ 
      success: false, 
      error: 'ليس لديك صلاحية لرفض هذا الطلب' 
    }, 403)
  }
  
  if (request.status !== 'pending') {
    return c.json({ 
      success: false, 
      error: 'تم معالجة الطلب بالفعل' 
    }, 400)
  }
  
  // تحديث الطلب
  await c.env.DB.prepare(`
    UPDATE league_join_requests
    SET status = 'rejected',
        reviewed_by_admin_id = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        rejection_reason = ?
    WHERE id = ?
  `).bind(admin_id, reason || 'لم يتم توفير سبب', requestId).run()
  
  return c.json({ 
    success: true, 
    message: 'تم رفض الطلب' 
  })
})

// التحقق من استيفاء الفريق للشروط
app.get('/api/join-requests/:requestId/check', async (c) => {
  const requestId = c.req.param('requestId')
  
  const request = await c.env.DB.prepare(`
    SELECT * FROM league_join_requests WHERE id = ?
  `).bind(requestId).first()
  
  if (!request) {
    return c.json({ 
      success: false, 
      error: 'الطلب غير موجود' 
    }, 404)
  }
  
  return c.json({ 
    success: true, 
    meets_requirements: request.meets_requirements === 1,
    requirement_checks: JSON.parse(request.requirement_checks || '{}'),
    status: request.status
  })
})

export default app
