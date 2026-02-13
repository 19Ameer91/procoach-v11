// Pro Coach Frontend Application
let currentTeamId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadTeams();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('addTeamBtn').addEventListener('click', () => {
    document.getElementById('addTeamModal').classList.remove('hidden');
  });
  
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('addTeamModal').classList.add('hidden');
  });
  
  document.getElementById('addTeamForm').addEventListener('submit', handleAddTeam);
  
  document.getElementById('backToTeams').addEventListener('click', () => {
    document.getElementById('teamDashboard').classList.add('hidden');
    document.getElementById('teamsContainer').classList.remove('hidden');
    currentTeamId = null;
    loadTeams();
  });
}

// Load all teams
async function loadTeams() {
  try {
    document.getElementById('loading').classList.remove('hidden');
    const response = await axios.get('/api/teams');
    
    if (response.data.success) {
      displayTeams(response.data.data);
    }
  } catch (error) {
    console.error('Error loading teams:', error);
    alert('حدث خطأ في تحميل الفرق');
  } finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('teamsContainer').classList.remove('hidden');
  }
}

// Display teams
function displayTeams(teams) {
  const container = document.getElementById('teamsList');
  
  if (teams.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fas fa-users text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-500 text-lg">لا توجد فرق مسجلة</p>
        <p class="text-gray-400 mt-2">ابدأ بإضافة فريقك الأول</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = teams.map(team => `
    <div class="card bg-white rounded-lg shadow-md p-6 cursor-pointer" onclick="loadTeamDashboard(${team.id})">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
            ${team.name.charAt(0)}
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-800">${team.name}</h3>
            <p class="text-sm text-gray-500">${team.league}</p>
          </div>
        </div>
        <i class="fas fa-chevron-left text-purple-600"></i>
      </div>
      
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2 text-gray-600">
          <i class="fas fa-globe"></i>
          <span>${team.country}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600">
          <i class="fas fa-user-tie"></i>
          <span>المدرب: ${team.coach_name}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600">
          <i class="fas fa-tactics"></i>
          <span>التشكيل: ${team.formation}</span>
        </div>
      </div>
      
      <div class="mt-4 pt-4 border-t flex gap-2">
        <button class="flex-1 bg-purple-100 text-purple-600 py-2 rounded-lg text-sm font-bold hover:bg-purple-200">
          <i class="fas fa-chart-line ml-1"></i>
          الإحصائيات
        </button>
        <button class="flex-1 bg-green-100 text-green-600 py-2 rounded-lg text-sm font-bold hover:bg-green-200">
          <i class="fas fa-dumbbell ml-1"></i>
          التدريبات
        </button>
      </div>
    </div>
  `).join('');
}

// Handle add team form submission
async function handleAddTeam(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const teamData = Object.fromEntries(formData.entries());
  
  try {
    const response = await axios.post('/api/teams', teamData);
    
    if (response.data.success) {
      alert('تم إضافة الفريق بنجاح!');
      document.getElementById('addTeamModal').classList.add('hidden');
      e.target.reset();
      loadTeams();
    }
  } catch (error) {
    console.error('Error adding team:', error);
    alert('حدث خطأ في إضافة الفريق');
  }
}

// Load team dashboard
async function loadTeamDashboard(teamId) {
  currentTeamId = teamId;
  
  try {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('teamsContainer').classList.add('hidden');
    
    // Load team details, dashboard stats, players, and training plans
    const [teamRes, dashboardRes, playersRes, plansRes] = await Promise.all([
      axios.get(\`/api/teams/\${teamId}\`),
      axios.get(\`/api/teams/\${teamId}/dashboard\`),
      axios.get(\`/api/teams/\${teamId}/players\`),
      axios.get(\`/api/teams/\${teamId}/training-plans?status=active\`)
    ]);
    
    const team = teamRes.data.data;
    const stats = dashboardRes.data.data;
    const players = playersRes.data.data;
    const plans = plansRes.data.data;
    
    displayTeamDashboard(team, stats, players, plans);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    alert('حدث خطأ في تحميل بيانات الفريق');
  } finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('teamDashboard').classList.remove('hidden');
  }
}

// Display team dashboard
function displayTeamDashboard(team, stats, players, plans) {
  const container = document.getElementById('dashboardContent');
  
  container.innerHTML = `
    <!-- Team Header -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
          ${team.name.charAt(0)}
        </div>
        <div class="flex-1">
          <h2 class="text-3xl font-bold text-gray-800">${team.name}</h2>
          <p class="text-gray-600">${team.league} - ${team.country}</p>
          <p class="text-sm text-gray-500 mt-1">
            <i class="fas fa-user-tie ml-1"></i>
            المدرب: ${team.coach_name} | التشكيل: ${team.formation}
          </p>
        </div>
      </div>
    </div>
    
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">عدد اللاعبين</p>
            <p class="text-3xl font-bold text-purple-600">${stats.players_count}</p>
          </div>
          <i class="fas fa-users text-4xl text-purple-300"></i>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">الخطط النشطة</p>
            <p class="text-3xl font-bold text-green-600">${stats.active_plans}</p>
          </div>
          <i class="fas fa-clipboard-list text-4xl text-green-300"></i>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">متوسط اللياقة</p>
            <p class="text-3xl font-bold text-blue-600">${stats.avg_fitness}%</p>
          </div>
          <i class="fas fa-heartbeat text-4xl text-blue-300"></i>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">متوسط المعنويات</p>
            <p class="text-3xl font-bold text-yellow-600">${stats.avg_morale}%</p>
          </div>
          <i class="fas fa-smile text-4xl text-yellow-300"></i>
        </div>
      </div>
    </div>
    
    <!-- Training Plans & Players -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Training Plans -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-dumbbell ml-2"></i>
            الخطط التدريبية النشطة
          </h3>
          <button onclick="showAddPlanModal()" class="text-purple-600 hover:text-purple-800">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        
        ${plans.length === 0 ? `
          <div class="text-center py-8 text-gray-400">
            <i class="fas fa-clipboard-list text-4xl mb-2"></i>
            <p>لا توجد خطط تدريبية نشطة</p>
          </div>
        ` : `
          <div class="space-y-3">
            ${plans.map(plan => `
              <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onclick="showPlanDetails(${plan.id})">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-bold text-gray-800">${plan.name}</h4>
                  <span class="text-xs px-2 py-1 rounded-full ${
                    plan.intensity === 'High' ? 'bg-red-100 text-red-600' :
                    plan.intensity === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }">
                    ${plan.intensity === 'High' ? 'عالي' : plan.intensity === 'Medium' ? 'متوسط' : 'منخفض'}
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-2">${plan.description}</p>
                <div class="flex items-center gap-4 text-xs text-gray-500">
                  <span><i class="fas fa-calendar ml-1"></i>${plan.duration_weeks} أسابيع</span>
                  <span><i class="fas fa-bullseye ml-1"></i>${getFocusAreaText(plan.focus_area)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
      
      <!-- Players -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-users ml-2"></i>
            اللاعبون
          </h3>
          <button onclick="showAddPlayerModal()" class="text-purple-600 hover:text-purple-800">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        
        ${players.length === 0 ? `
          <div class="text-center py-8 text-gray-400">
            <i class="fas fa-users text-4xl mb-2"></i>
            <p>لا يوجد لاعبون مسجلون</p>
          </div>
        ` : `
          <div class="space-y-2 max-h-96 overflow-y-auto">
            ${players.map(player => `
              <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                    ${player.jersey_number || '?'}
                  </div>
                  <div>
                    <p class="font-bold text-gray-800">${player.name}</p>
                    <p class="text-xs text-gray-500">${getPositionText(player.position)}</p>
                  </div>
                </div>
                <div class="text-left">
                  <div class="text-sm font-bold text-purple-600">${player.overall_rating}</div>
                  <div class="flex gap-1 text-xs text-gray-500">
                    <span title="اللياقة"><i class="fas fa-heartbeat"></i> ${player.fitness_level}</span>
                    <span title="المعنويات"><i class="fas fa-smile"></i> ${player.morale}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// Helper functions
function getFocusAreaText(area) {
  const map = {
    'Physical': 'بدني',
    'Technical': 'فني',
    'Tactical': 'تكتيكي',
    'Mental': 'ذهني'
  };
  return map[area] || area;
}

function getPositionText(pos) {
  const map = {
    'GK': 'حارس مرمى',
    'DF': 'مدافع',
    'MF': 'وسط',
    'FW': 'مهاجم'
  };
  return map[pos] || pos;
}

function showAddPlanModal() {
  alert('سيتم إضافة نموذج إنشاء خطة تدريبية قريباً');
}

function showAddPlayerModal() {
  alert('سيتم إضافة نموذج إضافة لاعب قريباً');
}

function showPlanDetails(planId) {
  alert(\`سيتم عرض تفاصيل الخطة رقم \${planId} قريباً\`);
}
