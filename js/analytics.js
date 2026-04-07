// =============================================
// SpendSmart Web - Analytics Module (v2)
// Daily | Weekly | Monthly | 6-Month views
// =============================================

let analyticsUser = null;
let analyticsUserDoc = null;
let analyticsMonth = new Date().getMonth();
let analyticsYear = new Date().getFullYear();
let pieChart = null;
let trendChart = null;
let currentRange = 'daily';
let allMonthTxns = [];    // all transactions for the selected month

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    analyticsUser = user;

    const snap = await db.collection('users').doc(user.uid).get();
    analyticsUserDoc = snap.exists ? snap.data() : {};
    if (analyticsUserDoc.currency) localStorage.setItem('ss_currency', analyticsUserDoc.currency);

    updateMonthDisplay();
    await loadAnalyticsData();
    setupMonthNav();
    setupRangeTabs();
  });
});

// ---- Month Navigation ----
function setupMonthNav() {
  document.getElementById('prevMonth')?.addEventListener('click', () => {
    analyticsMonth--;
    if (analyticsMonth < 0) { analyticsMonth = 11; analyticsYear--; }
    updateMonthDisplay();
    loadAnalyticsData();
  });
  document.getElementById('nextMonth')?.addEventListener('click', () => {
    analyticsMonth++;
    if (analyticsMonth > 11) { analyticsMonth = 0; analyticsYear++; }
    updateMonthDisplay();
    loadAnalyticsData();
  });
}

function updateMonthDisplay() {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const el = document.getElementById('analyticsMonth');
  if (el) el.textContent = `${monthNames[analyticsMonth]} ${analyticsYear}`;
}

// ---- Range Tab Switching ----
function setupRangeTabs() {
  document.querySelectorAll('.range-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.range-tab').forEach(t => {
        t.classList.remove('tab-active');
        t.classList.add('text-slate-500', 'dark:text-slate-400');
      });
      tab.classList.add('tab-active');
      tab.classList.remove('text-slate-500', 'dark:text-slate-400');
      currentRange = tab.dataset.range;
      renderTrendChart();
    });
  });
}

// ---- Load Data ----
async function loadAnalyticsData() {
  const startDate = new Date(analyticsYear, analyticsMonth, 1);
  const endDate = new Date(analyticsYear, analyticsMonth + 1, 0, 23, 59, 59);

  try {
    const snap = await db.collection('transactions')
      .where('userId', '==', analyticsUser.uid)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(endDate))
      .get();

    allMonthTxns = snap.docs.map(d => {
      const raw = d.data();
      return { id: d.id, ...raw, _date: raw.date?.toDate ? raw.date.toDate() : new Date(raw.date) };
    });

    const expenses = allMonthTxns.filter(t => t.type === 'expense');
    const incomes = allMonthTxns.filter(t => t.type === 'income');
    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

    // Previous month
    const prevStart = new Date(analyticsYear, analyticsMonth - 1, 1);
    const prevEnd = new Date(analyticsYear, analyticsMonth, 0, 23, 59, 59);
    const prevSnap = await db.collection('transactions')
      .where('userId', '==', analyticsUser.uid)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(prevStart))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(prevEnd))
      .get();
    const prevExpenses = prevSnap.docs.map(d => d.data()).filter(t => t.type === 'expense');
    const prevTotal = prevExpenses.reduce((s, t) => s + t.amount, 0);

    // ---- Update Summary Row ----
    document.getElementById('analyticsTotalSpent').textContent = formatAmount(totalSpent);
    document.getElementById('analyticsTotalIncome').textContent = formatAmount(totalIncome);

    const changeEl = document.getElementById('spendingChange');
    if (changeEl) {
      if (prevTotal > 0) {
        const pct = ((totalSpent - prevTotal) / prevTotal) * 100;
        changeEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
        changeEl.className = `text-lg font-bold ${pct > 0 ? 'text-red-500' : 'text-emerald-500'}`;
      } else {
        changeEl.textContent = '—';
        changeEl.className = 'text-lg font-bold text-slate-400';
      }
    }

    renderPieChart(expenses);
    renderTrendChart();
    renderInsights(expenses, prevExpenses);

  } catch (e) {
    console.error('Analytics error:', e);
  }
}

// ---- Pie Chart (compact, side-legend) ----
function renderPieChart(expenses) {
  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);

  const isDark = document.documentElement.classList.contains('dark');
  const ctx = document.getElementById('pieChart')?.getContext('2d');
  if (!ctx) return;
  if (pieChart) pieChart.destroy();

  const legendEl = document.getElementById('pieLegend');
  const emptyEl = document.getElementById('pieEmpty');

  if (entries.length === 0) {
    ctx.canvas.parentElement.style.display = 'none';
    if (legendEl) legendEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  ctx.canvas.parentElement.style.display = 'block';
  if (emptyEl) emptyEl.classList.add('hidden');

  // Render custom side legend
  if (legendEl) {
    legendEl.innerHTML = entries.slice(0, 5).map(([id, amt]) => {
      const c = getCategoryById(id);
      const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(0) : 0;
      return `<div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${c.color}"></span>
        <span class="text-slate-600 dark:text-slate-300 truncate flex-1">${c.icon} ${c.label}</span>
        <span class="font-semibold text-slate-800 dark:text-white ml-1">${pct}%</span>
      </div>`;
    }).join('');
    if (entries.length > 5) {
      legendEl.innerHTML += `<div class="text-slate-400 dark:text-slate-500">+${entries.length - 5} more</div>`;
    }
  }

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: entries.map(([id]) => getCategoryById(id).label),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(([id]) => getCategoryById(id).color),
        borderWidth: 2,
        borderColor: isDark ? '#111827' : '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      cutout: '70%',
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => ` ${formatAmount(c.raw)} (${((c.raw/totalSpent)*100).toFixed(1)}%)` }
        }
      }
    }
  });
}

// ---- Trend Chart (Daily / Weekly / Monthly / 6-Month) ----
async function renderTrendChart() {
  const isDark = document.documentElement.classList.contains('dark');
  const ctx = document.getElementById('trendChart')?.getContext('2d');
  if (!ctx) return;
  if (trendChart) trendChart.destroy();

  let labels = [];
  let data = [];

  if (currentRange === 'daily') {
    // Daily: each day of the selected month
    const daysInMonth = new Date(analyticsYear, analyticsMonth + 1, 0).getDate();
    const dailyMap = {};
    for (let d = 1; d <= daysInMonth; d++) dailyMap[d] = 0;
    allMonthTxns.filter(t => t.type === 'expense').forEach(t => {
      const day = t._date.getDate();
      dailyMap[day] = (dailyMap[day] || 0) + t.amount;
    });
    labels = Object.keys(dailyMap);
    data = Object.values(dailyMap);

  } else if (currentRange === 'weekly') {
    // Weekly: group into 4-5 weeks
    const daysInMonth = new Date(analyticsYear, analyticsMonth + 1, 0).getDate();
    const weekCount = Math.ceil(daysInMonth / 7);
    for (let w = 0; w < weekCount; w++) { labels.push(`W${w+1}`); data.push(0); }
    allMonthTxns.filter(t => t.type === 'expense').forEach(t => {
      const day = t._date.getDate();
      const weekIdx = Math.min(Math.floor((day - 1) / 7), weekCount - 1);
      data[weekIdx] += t.amount;
    });

  } else if (currentRange === 'monthly') {
    // Monthly: last 12 months
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = 11; i >= 0; i--) {
      let m = analyticsMonth - i;
      let y = analyticsYear;
      while (m < 0) { m += 12; y--; }
      labels.push(monthNames[m]);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      try {
        const snap = await db.collection('transactions')
          .where('userId', '==', analyticsUser.uid)
          .where('type', '==', 'expense')
          .where('date', '>=', firebase.firestore.Timestamp.fromDate(start))
          .where('date', '<=', firebase.firestore.Timestamp.fromDate(end))
          .get();
        data.push(snap.docs.reduce((s, d) => s + d.data().amount, 0));
      } catch { data.push(0); }
    }

  } else if (currentRange === '6month') {
    // 6-Month overview
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = 5; i >= 0; i--) {
      let m = analyticsMonth - i;
      let y = analyticsYear;
      while (m < 0) { m += 12; y--; }
      labels.push(monthNames[m]);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      try {
        const snap = await db.collection('transactions')
          .where('userId', '==', analyticsUser.uid)
          .where('type', '==', 'expense')
          .where('date', '>=', firebase.firestore.Timestamp.fromDate(start))
          .where('date', '<=', firebase.firestore.Timestamp.fromDate(end))
          .get();
        data.push(snap.docs.reduce((s, d) => s + d.data().amount, 0));
      } catch { data.push(0); }
    }
  }

  // Decide chart type
  const isBar = currentRange === '6month' || currentRange === 'weekly';
  const highlightIdx = data.length - 1;

  trendChart = new Chart(ctx, {
    type: isBar ? 'bar' : 'line',
    data: {
      labels,
      datasets: [{
        label: 'Spending',
        data,
        ...(isBar ? {
          backgroundColor: data.map((_, i) => i === highlightIdx ? '#2563EB' : (isDark ? '#1E3A5F' : '#BFDBFE')),
          borderRadius: 6,
          borderSkipped: false
        } : {
          borderColor: '#2563EB',
          borderWidth: 2,
          pointRadius: currentRange === 'daily' ? 0 : 3,
          pointBackgroundColor: '#2563EB',
          tension: 0.3,
          fill: true,
          backgroundColor: isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.06)'
        })
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => ' ' + formatAmount(c.raw) }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? '#94A3B8' : '#64748B',
            font: { family: 'Inter', size: 10 },
            maxRotation: 0,
            maxTicksLimit: currentRange === 'daily' ? 8 : 12
          },
          border: { display: false }
        },
        y: {
          grid: { color: isDark ? '#1F2937' : '#F1F5F9' },
          ticks: {
            color: isDark ? '#94A3B8' : '#64748B',
            font: { family: 'Inter', size: 10 },
            callback: (v) => formatAmount(v),
            maxTicksLimit: 5
          },
          border: { display: false },
          beginAtZero: true
        }
      }
    }
  });
}

// ---- Smart Insights ----
function renderInsights(expenses, prevExpenses) {
  const container = document.getElementById('insightsContainer');
  if (!container) return;

  const insights = [];
  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const prevCatMap = {};
  prevExpenses.forEach(t => { prevCatMap[t.category] = (prevCatMap[t.category] || 0) + t.amount; });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  if (sorted.length > 0) {
    const top = getCategoryById(sorted[0][0]);
    insights.push({ icon: '🏆', text: `Top category: <strong>${top.label}</strong> (${formatAmount(sorted[0][1])})` });

    if (prevCatMap[sorted[0][0]]) {
      const change = ((catMap[sorted[0][0]] - prevCatMap[sorted[0][0]]) / prevCatMap[sorted[0][0]]) * 100;
      if (Math.abs(change) > 10) {
        insights.push({
          icon: change > 0 ? '📈' : '📉',
          text: `${Math.abs(change).toFixed(0)}% ${change > 0 ? 'more' : 'less'} on <strong>${top.label}</strong> vs last month`
        });
      }
    }
  }

  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
  const budget = analyticsUserDoc?.monthlyBudget || 0;
  if (budget > 0) {
    const pct = (totalSpent / budget) * 100;
    if (pct >= 90) insights.push({ icon: '⚠️', text: `<strong>${pct.toFixed(0)}%</strong> of budget used!` });
    else if (pct < 50) insights.push({ icon: '✅', text: `Only <strong>${pct.toFixed(0)}%</strong> of budget used — great!` });
  }

  if (expenses.length > 0) {
    const daysInMonth = new Date(analyticsYear, analyticsMonth + 1, 0).getDate();
    const avgDaily = totalSpent / daysInMonth;
    insights.push({ icon: '📊', text: `Daily avg: <strong>${formatAmount(avgDaily)}</strong>` });
  }

  if (insights.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400 text-center py-3">Add transactions to see insights</p>`;
    return;
  }

  container.innerHTML = insights.map(ins => `
    <div class="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
      <span class="text-base flex-shrink-0">${ins.icon}</span>
      <p class="text-xs text-slate-700 dark:text-slate-300">${ins.text}</p>
    </div>`).join('');
}
