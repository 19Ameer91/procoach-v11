// Pro Coach Leagues Page
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadLeagues();
  setupEventListeners();
});

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentTab = e.target.dataset.tab;
      
      // Update active tab
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'border-purple-600');
        b.classList.add('border-transparent');
      });
      e.target.classList.add('active', 'border-purple-600');
      e.target.classList.remove('border-transparent');
      
      loadLeagues();
    });
  });
  
  document.getElementById('createLeagueBtn')?.addEventListener('click', () => {
    window.location.href = '/create-league';
  });
}

async function loadLeagues() {
  try {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('tabsContainer').classList.add('hidden');
    document.getElementById('leaguesContainer').classList.add('hidden');
    
    const statusParam = currentTab === 'all' ? '' : `?status=${currentTab}`;
    const response = await axios.get(`/api/leagues${statusParam}`);
    
    if (response.data.success) {
      displayLeagues(response.data.data);
    }
  } catch (error) {
    console.error('Error loading leagues:', error);
    alert('حدث خطأ في تحميل الدوريات');
  } finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('tabsContainer').classList.remove('hidden');
    document.getElementById('leaguesContainer').classList.remove('hidden');
  }
}

function displayLeagues(leagues) {
  const container = document.getElementById('leaguesList');
  
  if (leagues.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fas fa-trophy text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-500 text-lg">لا توجد دوريات</p>
        <p class="text-gray-400 mt-2">ابدأ بإنشاء دوري جديد</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = leagues.map(league => `
    <div class="card bg-white rounded-lg shadow-md p-6 cursor-pointer" onclick="window.location.href='/leagues/${league.id}'">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-800 mb-1">${league.name}</h3>
          <p class="text-sm text-gray-600">${league.description || ''}</p>
        </div>
        <div class="mr-3">
          ${getStatusBadge(league.status)}
        </div>
      </div>
      
      <div class="space-y-2 text-sm mb-4">
        <div class="flex items-center gap-2 text-gray-600">
          <i class="fas fa-globe w-4"></i>
          <span>${league.country} - ${league.season}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600">
          <i class="fas fa-user-shield w-4"></i>
          <span>المشرف: ${league.admin_name}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600">
          <i class="fas fa-trophy w-4"></i>
          <span>${getLeagueTypeText(league.league_type)}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600">
          <i class="fas fa-users w-4"></i>
          <span>${league.teams_count} / ${league.max_teams} فريق</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between pt-4 border-t">
        <div class="flex gap-2">
          <span class="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
            <i class="fas fa-calendar ml-1"></i>
            ${formatDate(league.start_date)}
          </span>
        </div>
        <div class="text-purple-600 font-bold text-sm">
          عرض التفاصيل
          <i class="fas fa-chevron-left mr-1"></i>
        </div>
      </div>
      
      ${league.prize_first ? `
        <div class="mt-3 pt-3 border-t">
          <div class="text-xs text-gray-500">
            <i class="fas fa-award text-yellow-500 ml-1"></i>
            الجائزة: ${league.prize_first}
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function getStatusBadge(status) {
  const badges = {
    'registration': '<span class="px-3 py-1 bg-green-100 text-green-600 text-xs font-bold rounded-full">التسجيل مفتوح</span>',
    'ongoing': '<span class="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">جارية</span>',
    'completed': '<span class="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">مكتملة</span>'
  };
  return badges[status] || '';
}

function getLeagueTypeText(type) {
  const types = {
    'knockout': 'خروج المغلوب',
    'league': 'دوري النقاط',
    'group_then_knockout': 'مجموعات ثم خروج المغلوب'
  };
  return types[type] || type;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}
