// League Details Page
const leagueId = window.location.pathname.split('/').pop();
let leagueData = null;
let currentTab = 'overview';

document.addEventListener('DOMContentLoaded', () => {
  loadLeagueDetails();
  setupTabListeners();
});

function setupTabListeners() {
  document.querySelectorAll('.league-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentTab = e.target.dataset.tab;
      
      // Update active tab
      document.querySelectorAll('.league-tab').forEach(b => {
        b.classList.remove('active', 'border-purple-600');
        b.classList.add('border-transparent');
      });
      e.target.classList.add('active', 'border-purple-600');
      e.target.classList.remove('border-transparent');
      
      loadTabContent();
    });
  });
}

async function loadLeagueDetails() {
  try {
    const response = await axios.get(`/api/leagues/${leagueId}`);
    
    if (response.data.success) {
      leagueData = response.data.data;
      updateLeagueHeader();
      loadTabContent();
    }
  } catch (error) {
    console.error('Error loading league:', error);
    alert('حدث خطأ في تحميل بيانات الدوري');
  }
}

function updateLeagueHeader() {
  document.getElementById('leagueName').textContent = leagueData.name;
  document.getElementById('leagueSeason').textContent = `${leagueData.country} - ${leagueData.season}`;
}

async function loadTabContent() {
  const container = document.getElementById('tabContent');
  
  switch(currentTab) {
    case 'overview':
      container.innerHTML = renderOverview();
      break;
    case 'matches':
      await loadMatches();
      break;
    case 'bracket':
      await loadBracket();
      break;
    case 'table':
      await loadTable();
      break;
    case 'stats':
      await loadStats();
      break;
  }
}

function renderOverview() {
  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- League Info -->
      <div class="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold mb-4">
          <i class="fas fa-info-circle text-purple-600 ml-2"></i>
          معلومات الدوري
        </h2>
        
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <i class="fas fa-align-right text-gray-400 mt-1"></i>
            <div>
              <p class="text-sm text-gray-500">الوصف</p>
              <p class="text-gray-800">${leagueData.description || 'لا يوجد وصف'}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="flex items-center gap-3">
              <i class="fas fa-trophy text-gray-400"></i>
              <div>
                <p class="text-sm text-gray-500">نوع البطولة</p>
                <p class="font-bold">${getLeagueTypeText(leagueData.league_type)}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <i class="fas fa-users text-gray-400"></i>
              <div>
                <p class="text-sm text-gray-500">الفرق المشاركة</p>
                <p class="font-bold">${leagueData.teams?.length || 0} / ${leagueData.max_teams}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <i class="fas fa-calendar text-gray-400"></i>
              <div>
                <p class="text-sm text-gray-500">تاريخ البداية</p>
                <p class="font-bold">${formatDate(leagueData.start_date)}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <i class="fas fa-calendar-check text-gray-400"></i>
              <div>
                <p class="text-sm text-gray-500">تاريخ النهاية</p>
                <p class="font-bold">${formatDate(leagueData.end_date)}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <i class="fas fa-clock text-gray-400"></i>
              <div>
                <p class="text-sm text-gray-500">مدة المباراة</p>
                <p class="font-bold">${leagueData.match_duration} دقيقة</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <i class="fas fa-user-shield text-gray-400"></i>
              <div>
                <p class="text-sm text-gray-500">المشرف</p>
                <p class="font-bold">${leagueData.admin_name}</p>
              </div>
            </div>
          </div>
          
          ${leagueData.prize_first ? `
            <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mt-4">
              <h3 class="font-bold text-yellow-800 mb-2">
                <i class="fas fa-award ml-2"></i>
                الجوائز
              </h3>
              <ul class="space-y-1 text-sm">
                <li><i class="fas fa-medal text-yellow-500 ml-2"></i>المركز الأول: ${leagueData.prize_first}</li>
                ${leagueData.prize_second ? `<li><i class="fas fa-medal text-gray-400 ml-2"></i>المركز الثاني: ${leagueData.prize_second}</li>` : ''}
                ${leagueData.prize_third ? `<li><i class="fas fa-medal text-orange-600 ml-2"></i>المركز الثالث: ${leagueData.prize_third}</li>` : ''}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Teams List -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-bold mb-4">
          <i class="fas fa-users text-purple-600 ml-2"></i>
          الفرق المشاركة (${leagueData.teams?.length || 0})
        </h2>
        
        ${leagueData.teams && leagueData.teams.length > 0 ? `
          <div class="space-y-2">
            ${leagueData.teams.map((team, index) => `
              <div class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                  ${index + 1}
                </div>
                <div class="flex-1">
                  <p class="font-bold text-gray-800">${team.team_name}</p>
                  <p class="text-xs text-gray-500">${team.coach_name}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="text-center py-8 text-gray-400">
            <i class="fas fa-users text-4xl mb-2"></i>
            <p>لا توجد فرق مسجلة بعد</p>
          </div>
        `}
      </div>
    </div>
  `;
}

async function loadMatches() {
  try {
    const response = await axios.get(`/api/leagues/${leagueId}/matches`);
    const container = document.getElementById('tabContent');
    
    if (response.data.success) {
      const matches = response.data.data;
      
      if (matches.length === 0) {
        container.innerHTML = `
          <div class="bg-white rounded-lg shadow-md p-12 text-center">
            <i class="fas fa-calendar-alt text-6xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 text-lg">لا توجد مباريات محددة بعد</p>
          </div>
        `;
        return;
      }
      
      // Group by round
      const byRound = {};
      matches.forEach(match => {
        if (!byRound[match.match_round]) {
          byRound[match.match_round] = [];
        }
        byRound[match.match_round].push(match);
      });
      
      container.innerHTML = `
        <div class="space-y-6">
          ${Object.keys(byRound).map(round => `
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-xl font-bold mb-4 text-purple-600">
                <i class="fas fa-calendar-day ml-2"></i>
                ${getRoundText(round)}
              </h3>
              <div class="space-y-3">
                ${byRound[round].map(match => renderMatchCard(match)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading matches:', error);
  }
}

function renderMatchCard(match) {
  const statusClass = {
    'scheduled': 'bg-blue-100 text-blue-600',
    'live': 'bg-red-100 text-red-600',
    'finished': 'bg-green-100 text-green-600'
  }[match.status] || 'bg-gray-100 text-gray-600';
  
  return `
    <div class="border rounded-lg p-4 hover:shadow-md transition">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs ${statusClass} px-2 py-1 rounded font-bold">
          ${getStatusText(match.status)}
        </span>
        <span class="text-xs text-gray-500">
          <i class="fas fa-clock ml-1"></i>
          ${formatDateTime(match.match_date)}
        </span>
      </div>
      
      <div class="flex items-center justify-between">
        <div class="flex-1 text-center">
          <p class="font-bold text-gray-800">${match.home_team_name}</p>
        </div>
        <div class="px-6 text-center">
          ${match.status === 'finished' ? `
            <span class="text-2xl font-bold text-gray-800">
              ${match.home_score} - ${match.away_score}
            </span>
          ` : `
            <span class="text-gray-400">VS</span>
          `}
        </div>
        <div class="flex-1 text-center">
          <p class="font-bold text-gray-800">${match.away_team_name}</p>
        </div>
      </div>
      
      ${match.venue ? `
        <div class="mt-2 text-xs text-gray-500 text-center">
          <i class="fas fa-map-marker-alt ml-1"></i>
          ${match.venue}
        </div>
      ` : ''}
    </div>
  `;
}

async function loadBracket() {
  try {
    const response = await axios.get(`/api/leagues/${leagueId}/bracket`);
    const container = document.getElementById('tabContent');
    
    if (response.data.success) {
      const bracket = response.data.data;
      
      container.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-bold mb-6">
            <i class="fas fa-sitemap text-purple-600 ml-2"></i>
            خارطة البطولة
          </h2>
          <div class="overflow-x-auto">
            ${renderBracket(bracket)}
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading bracket:', error);
  }
}

function renderBracket(bracket) {
  // Group by round
  const byRound = {};
  bracket.forEach(item => {
    if (!byRound[item.round_name]) {
      byRound[item.round_name] = [];
    }
    byRound[item.round_name].push(item);
  });
  
  return `
    <div class="flex gap-8 justify-center">
      ${Object.keys(byRound).sort((a, b) => {
        const rounds = bracket.find(x => x.round_name === a);
        const roundb = bracket.find(x => x.round_name === b);
        return rounds.round_order - roundb.round_order;
      }).map(round => `
        <div class="flex flex-col gap-4">
          <h3 class="text-center font-bold text-purple-600 mb-2">${getRoundText(round)}</h3>
          ${byRound[round].map(match => `
            <div class="border-2 rounded-lg p-3 min-w-[200px] ${match.winner_name ? 'bg-green-50 border-green-300' : 'bg-white'}">
              ${match.home_team_name && match.away_team_name ? `
                <div class="space-y-2">
                  <div class="flex items-center justify-between ${match.winner_name === match.home_team_name ? 'font-bold text-green-600' : ''}">
                    <span>${match.home_team_name}</span>
                    <span>${match.home_score !== null ? match.home_score : '-'}</span>
                  </div>
                  <div class="border-t"></div>
                  <div class="flex items-center justify-between ${match.winner_name === match.away_team_name ? 'font-bold text-green-600' : ''}">
                    <span>${match.away_team_name}</span>
                    <span>${match.away_score !== null ? match.away_score : '-'}</span>
                  </div>
                </div>
              ` : `
                <div class="text-center text-gray-400 py-4">
                  <i class="fas fa-question-circle text-2xl"></i>
                  <p class="text-xs mt-2">TBD</p>
                </div>
              `}
            </div>
          `).join('')}
        </div>
      `).join('<div class="flex items-center"><i class="fas fa-arrow-left text-2xl text-gray-300"></i></div>')}
    </div>
  `;
}

async function loadTable() {
  try {
    const response = await axios.get(`/api/leagues/${leagueId}/table`);
    const container = document.getElementById('tabContent');
    
    if (response.data.success) {
      const table = response.data.data;
      
      container.innerHTML = `
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
          <table class="w-full">
            <thead class="bg-purple-600 text-white">
              <tr>
                <th class="px-4 py-3 text-right">#</th>
                <th class="px-4 py-3 text-right">الفريق</th>
                <th class="px-4 py-3 text-center">لعب</th>
                <th class="px-4 py-3 text-center">فوز</th>
                <th class="px-4 py-3 text-center">تعادل</th>
                <th class="px-4 py-3 text-center">خسارة</th>
                <th class="px-4 py-3 text-center">له</th>
                <th class="px-4 py-3 text-center">عليه</th>
                <th class="px-4 py-3 text-center">الفارق</th>
                <th class="px-4 py-3 text-center font-bold">النقاط</th>
              </tr>
            </thead>
            <tbody>
              ${table.map((team, index) => `
                <tr class="border-b hover:bg-gray-50">
                  <td class="px-4 py-3 font-bold">${index + 1}</td>
                  <td class="px-4 py-3">
                    <div>
                      <p class="font-bold">${team.team_name}</p>
                      <p class="text-xs text-gray-500">${team.coach_name}</p>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">${team.matches_played}</td>
                  <td class="px-4 py-3 text-center text-green-600">${team.wins}</td>
                  <td class="px-4 py-3 text-center text-gray-600">${team.draws}</td>
                  <td class="px-4 py-3 text-center text-red-600">${team.losses}</td>
                  <td class="px-4 py-3 text-center">${team.goals_for}</td>
                  <td class="px-4 py-3 text-center">${team.goals_against}</td>
                  <td class="px-4 py-3 text-center ${team.goal_difference > 0 ? 'text-green-600' : team.goal_difference < 0 ? 'text-red-600' : ''}">
                    ${team.goal_difference > 0 ? '+' : ''}${team.goal_difference}
                  </td>
                  <td class="px-4 py-3 text-center font-bold text-purple-600">${team.points}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading table:', error);
  }
}

async function loadStats() {
  try {
    const [scorersRes, assistsRes] = await Promise.all([
      axios.get(`/api/leagues/${leagueId}/top-scorers?limit=10`),
      axios.get(`/api/leagues/${leagueId}/top-assists?limit=10`)
    ]);
    
    const container = document.getElementById('tabContent');
    
    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Scorers -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-bold mb-4">
            <i class="fas fa-futbol text-purple-600 ml-2"></i>
            الهدافون
          </h2>
          ${renderPlayerStats(scorersRes.data.data, 'goals')}
        </div>
        
        <!-- Top Assists -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-bold mb-4">
            <i class="fas fa-hands-helping text-purple-600 ml-2"></i>
            صناع الأهداف
          </h2>
          ${renderPlayerStats(assistsRes.data.data, 'assists')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function renderPlayerStats(players, stat) {
  if (players.length === 0) {
    return `
      <div class="text-center py-8 text-gray-400">
        <i class="fas fa-chart-bar text-4xl mb-2"></i>
        <p>لا توجد إحصائيات بعد</p>
      </div>
    `;
  }
  
  return `
    <div class="space-y-2">
      ${players.map((player, index) => `
        <div class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
          <div class="w-8 h-8 ${index < 3 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : 'bg-gray-100 text-gray-600'} rounded-full flex items-center justify-center font-bold text-sm">
            ${index + 1}
          </div>
          <div class="flex-1">
            <p class="font-bold text-gray-800">${player.player_name}</p>
            <p class="text-xs text-gray-500">${player.team_name} - ${getPositionText(player.position)}</p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-purple-600">${player[stat]}</p>
            <p class="text-xs text-gray-500">${stat === 'goals' ? 'هدف' : 'تمريرة'}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Helper functions
function getLeagueTypeText(type) {
  const types = {
    'knockout': 'خروج المغلوب',
    'league': 'دوري النقاط',
    'group_then_knockout': 'مجموعات ثم خروج المغلوب'
  };
  return types[type] || type;
}

function getRoundText(round) {
  const rounds = {
    'Final': 'النهائي',
    'Semi-finals': 'نصف النهائي',
    'Quarter-finals': 'ربع النهائي',
    'Round of 16': 'دور الـ16',
    'Round of 32': 'دور الـ32'
  };
  return rounds[round] || round;
}

function getStatusText(status) {
  const statuses = {
    'scheduled': 'مجدولة',
    'live': 'مباشر',
    'finished': 'انتهت',
    'postponed': 'مؤجلة',
    'cancelled': 'ملغاة'
  };
  return statuses[status] || status;
}

function getPositionText(pos) {
  const positions = {
    'GK': 'حارس',
    'DF': 'مدافع',
    'MF': 'وسط',
    'FW': 'مهاجم'
  };
  return positions[pos] || pos;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-EG', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
