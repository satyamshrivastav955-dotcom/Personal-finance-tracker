// =============================================
// SpendSmart Web - Analytics Module
// =============================================

let analyticsUser = null;
let analyticsUserDoc = null;
let analyticsMonth = new Date().getMonth();
let analyticsYear = new Date().getFullYear();
let pieChart = null;
let barChart = null;

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
  });
});

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
  const currentBtn = document.getElementById('currentMonthBtn');
  const now = new Date();
  if (currentBtn) {
    currentBtn.classList.toggle('opacity-0', analyticsMonth === now.getMonth() && analyticsYear === now.getFullYear());
  }
}

async function loadAnalyticsData() {
  const startDate = new Date(analyticsYear, analyticsMonth, 1);
  const endDate = new Date(analyticsYear, analyticsMonth + 1, 0, 23, 59, 59);

  try {
    const snap = await db.collection('transactions')
      .where('userId', '==', analyticsUser.uid)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(endDate))
      .get();

    const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const expenses = txns.filter(t => t.type === 'expense');
    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);

    // Previous month comparison
    const prevStart = new Date(analyticsYear, analyticsMonth - 1, 1);
    const prevEnd = new Date(analyticsYear, analyticsMonth, 0, 23, 59, 59);
    const prevSnap = await db.collection('transactions')
      .where('userId', '==', analyticsUser.uid)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(prevStart))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(prevEnd))
      .where('type', '==', 'expense')
      .get();
    const prevTotal = prevSnap.docs.reduce((s, d) => s + d.data().amount, 0);

    // Update header stats
    document.getElementById('analyticsTotalSpent').textContent = formatAmount(totalSpent);
    const changeEl = document.getElementById('spendingChange');
    if (changeEl && prevTotal > 0) {
      const change = ((totalSpent - prevTotal) / prevTotal) * 100;
      changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + '%';
      changeEl.className = `text-xs font-semibold px-2 py-1 rounded-full ${change > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`;
    } else if (changeEl) {
      changeEl.textContent = prevTotal === 0 ? 'No prev. data' : '-100.0%';
      changeEl.className = 'text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
    }

    renderPieChart(expenses);
    await renderBarChart();
    renderInsights(expenses, prevSnap.docs.map(d => d.data()));

  } catch (e) {
    console.error('Analytics error:', e);
  }
}

function renderPieChart(expenses) {
  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const isDark = document.documentElement.classList.contains('dark');
  const ctx = document.getElementById('pieChart')?.getContext('2d');
  if (!ctx) return;

  if (pieChart) pieChart.destroy();

  if (entries.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    document.getElementById('pieEmpty')?.classList.remove('hidden');
    return;
  }
  document.getElementById('pieEmpty')?.classList.add('hidden');

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: entries.map(([id]) => getCategoryById(id).label),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(([id]) => getCategoryById(id).color),
        borderWidth: 3,
        borderColor: isDark ? '#111827' : '#ffffff',
        hoverOffset: 8
      }]
    },
    options: {
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDark ? '#94A3B8' : '#475569',
            font: { size: 12, family: 'Inter' },
            padding: 16,
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 4
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatAmount(ctx.raw)} (${((ctx.raw / expenses.reduce((s,t)=>s+t.amount,0))*100).toFixed(1)}%)`
          }
        }
      }
    }
  });
}

async function renderBarChart() {
  const isDark = document.documentElement.classList.contains('dark');
  const ctx = document.getElementById('barChart')?.getContext('2d');
  if (!ctx) return;

  // Get 6-month data
  const months = [];
  const amounts = [];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  for (let i = 5; i >= 0; i--) {
    let m = analyticsMonth - i;
    let y = analyticsYear;
    if (m < 0) { m += 12; y--; }
    months.push(monthNames[m]);

    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59);
    try {
      const snap = await db.collection('transactions')
        .where('userId', '==', analyticsUser.uid)
        .where('type', '==', 'expense')
        .where('date', '>=', firebase.firestore.Timestamp.fromDate(start))
        .where('date', '<=', firebase.firestore.Timestamp.fromDate(end))
        .get();
      amounts.push(snap.docs.reduce((s, d) => s + d.data().amount, 0));
    } catch { amounts.push(0); }
  }

  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Spending',
        data: amounts,
        backgroundColor: months.map((_, i) => i === 5 ? '#2563EB' : (isDark ? '#1E3A5F' : '#BFDBFE')),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ' ' + formatAmount(ctx.raw) }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: isDark ? '#94A3B8' : '#64748B', font: { family: 'Inter', size: 12 } },
          border: { display: false }
        },
        y: {
          grid: { color: isDark ? '#1F2937' : '#F1F5F9' },
          ticks: {
            color: isDark ? '#94A3B8' : '#64748B',
            font: { family: 'Inter', size: 12 },
            callback: (v) => formatAmount(v)
          },
          border: { display: false }
        }
      }
    }
  });
}

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
    insights.push({ icon: '🏆', text: `Your highest spending category is <strong>${top.label}</strong> (${formatAmount(sorted[0][1])})` });

    if (prevCatMap[sorted[0][0]]) {
      const change = ((catMap[sorted[0][0]] - prevCatMap[sorted[0][0]]) / prevCatMap[sorted[0][0]]) * 100;
      if (Math.abs(change) > 10) {
        insights.push({
          icon: change > 0 ? '📈' : '📉',
          text: `You spent <strong>${Math.abs(change).toFixed(0)}% ${change > 0 ? 'more' : 'less'}</strong> on ${top.label} this month`
        });
      }
    }
  }

  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
  const budget = analyticsUserDoc?.monthlyBudget || 0;
  if (budget > 0) {
    const pct = (totalSpent / budget) * 100;
    if (pct >= 90) insights.push({ icon: '⚠️', text: `You've used <strong>${pct.toFixed(0)}%</strong> of your monthly budget!` });
    else if (pct < 50) insights.push({ icon: '✅', text: `Great! You've only used <strong>${pct.toFixed(0)}%</strong> of your budget.` });
  }

  if (expenses.length > 0) {
    const avgDaily = totalSpent / new Date(analyticsYear, analyticsMonth + 1, 0).getDate();
    insights.push({ icon: '📊', text: `Daily average spending: <strong>${formatAmount(avgDaily)}</strong>` });
  }

  if (insights.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400 text-center py-4">Add transactions to see insights</p>`;
    return;
  }

  container.innerHTML = insights.map(ins => `
    <div class="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
      <span class="text-lg flex-shrink-0">${ins.icon}</span>
      <p class="text-sm text-slate-700 dark:text-slate-300">${ins.text}</p>
    </div>`).join('');
}
