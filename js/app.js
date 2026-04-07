// =============================================
// SpendSmart Web - Dashboard Module (app.js)
// =============================================

let currentUser = null;
let userDoc = null;
let transactions = [];
let budgets = {};
let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = user;
    await loadUserDoc();
    await loadDashboard();
    setupAddExpenseModal();
    setupNavigation();
  });
});

async function loadUserDoc() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).get();
    if (snap.exists) {
      userDoc = snap.data();
    } else {
      userDoc = { monthlyBudget: 0, monthlyIncome: 0, currency: '₹', name: currentUser.displayName || 'User' };
    }
    // Update currency in localStorage
    if (userDoc.currency) localStorage.setItem('ss_currency', userDoc.currency);
  } catch (e) {
    console.error('Error loading user doc:', e);
    userDoc = { monthlyBudget: 0, monthlyIncome: 0, currency: '₹' };
  }
}

async function loadDashboard() {
  updateGreeting();
  await loadTransactions();
  renderDashboard();
}

function updateGreeting() {
  const nameEl = document.getElementById('userName');
  const monthEl = document.getElementById('currentMonth');
  if (nameEl) nameEl.textContent = userDoc.name || currentUser.displayName || 'User';
  if (monthEl) {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    monthEl.textContent = `${monthNames[selectedMonth]} ${selectedYear}`;
  }
}

async function loadTransactions() {
  try {
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const snap = await db.collection('transactions')
      .where('userId', '==', currentUser.uid)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(endDate))
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    transactions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Error loading transactions:', e);
    transactions = [];
  }
}

function renderDashboard() {
  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');

  const totalSpent = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const totalIncome = incomes.reduce((s, t) => s + (t.amount || 0), 0);
  const budget = userDoc?.monthlyBudget || 0;
  const remaining = budget - totalSpent;
  const savings = totalIncome - totalSpent;
  const remainingDays = getRemainingDays();
  const dailyLimit = remainingDays > 0 ? remaining / remainingDays : 0;
  const budgetPercent = budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : 0;

  // Update summary cards
  setEl('totalSpent', formatAmount(totalSpent));
  setEl('budgetAmount', formatAmount(budget));
  setEl('remainingAmount', formatAmount(Math.max(0, remaining)));
  setEl('savingsAmount', formatAmount(savings));
  setEl('dailyLimit', formatAmount(Math.max(0, dailyLimit)));
  setEl('monthlyIncome', formatAmount(totalIncome > 0 ? totalIncome : (userDoc?.monthlyIncome || 0)));

  // Budget progress bar
  const bar = document.getElementById('budgetBar');
  if (bar) {
    bar.style.width = budgetPercent + '%';
    bar.className = 'h-full rounded-full transition-all duration-700 ' + (budgetPercent >= 80 ? 'bg-red-400' : budgetPercent >= 60 ? 'bg-yellow-400' : 'bg-blue-300');
  }

  // Budget alert
  const alertEl = document.getElementById('budgetAlert');
  if (alertEl) {
    if (budget > 0 && budgetPercent >= 80) {
      alertEl.classList.remove('hidden');
      alertEl.textContent = budgetPercent >= 100
        ? '⚠️ Budget exceeded! You\'ve spent more than your limit.'
        : `⚠️ Warning: You've used ${budgetPercent.toFixed(0)}% of your budget.`;
    } else {
      alertEl.classList.add('hidden');
    }
  }

  // Category spending
  renderCategorySpending(expenses);

  // Recent transactions
  renderRecentTransactions(transactions.slice(0, 5));
}

function renderCategorySpending(expenses) {
  const container = document.getElementById('categorySpending');
  if (!container) return;

  const catMap = {};
  expenses.forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  if (sorted.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No spending this month</p>`;
    return;
  }

  const maxVal = sorted[0][1];
  container.innerHTML = sorted.map(([catId, amount]) => {
    const cat = getCategoryById(catId);
    const pct = maxVal > 0 ? (amount / maxVal) * 100 : 0;
    return `
      <div class="flex items-center gap-3 py-2">
        <span class="text-xl w-8">${cat.icon}</span>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center mb-1">
            <span class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">${cat.label}</span>
            <span class="text-sm font-semibold text-slate-800 dark:text-slate-100 ml-2">${formatAmount(amount)}</span>
          </div>
          <div class="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700" style="width:${pct}%; background:${cat.color}"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderRecentTransactions(txList) {
  const container = document.getElementById('recentTransactions');
  if (!container) return;

  if (txList.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No transactions yet. Add one!</p>`;
    return;
  }

  container.innerHTML = txList.map(tx => {
    const cat = getCategoryById(tx.category);
    const date = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
    const isIncome = tx.type === 'income';
    return `
      <div class="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 -mx-2 transition-colors cursor-pointer" onclick="showTransactionDetail('${tx.id}')">
        <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl" style="background:${cat.color}20">
          ${cat.icon}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">${tx.note || cat.label}</p>
          <p class="text-xs text-slate-400 dark:text-slate-500">${formatDate(date)} · ${cat.label}</p>
        </div>
        <span class="text-sm font-semibold flex-shrink-0 ${isIncome ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100'}">
          ${isIncome ? '+' : '-'}${formatAmount(tx.amount)}
        </span>
      </div>`;
  }).join('');
}

function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---- Add Expense Modal ----
function setupAddExpenseModal() {
  const modal = document.getElementById('addModal');
  const openBtn = document.getElementById('addBtn');
  const closeBtn = document.getElementById('closeModal');
  const form = document.getElementById('addTransactionForm');
  const typeToggle = document.querySelectorAll('.type-toggle');

  if (!modal) return;

  openBtn?.addEventListener('click', () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    populateCategorySelect();
    setTimeout(() => modal.querySelector('.modal-sheet').classList.add('translate-y-0'), 10);
  });

  const closeModal = () => {
    modal.querySelector('.modal-sheet').classList.remove('translate-y-0');
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
    form?.reset();
  };

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  typeToggle.forEach(btn => {
    btn.addEventListener('click', () => {
      typeToggle.forEach(b => b.classList.remove('active-type'));
      btn.classList.add('active-type');
      populateCategorySelect(btn.dataset.type);
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveTransaction();
    closeModal();
  });
}

function populateCategorySelect(type = 'expense') {
  const sel = document.getElementById('txCategory');
  if (!sel) return;
  const filtered = type === 'income'
    ? CATEGORIES.filter(c => c.id === 'income' || c.id === 'savings')
    : CATEGORIES.filter(c => c.id !== 'income');
  sel.innerHTML = filtered.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
}

async function saveTransaction() {
  const type = document.querySelector('.type-toggle.active-type')?.dataset.type || 'expense';
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const dateVal = document.getElementById('txDate').value;
  const note = document.getElementById('txNote').value.trim();

  if (!amount || isNaN(amount) || amount <= 0) return;

  const saveBtn = document.getElementById('saveTransaction');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

  try {
    await db.collection('transactions').add({
      userId: currentUser.uid,
      type,
      amount,
      category,
      date: firebase.firestore.Timestamp.fromDate(new Date(dateVal)),
      note,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await loadTransactions();
    renderDashboard();
    showToast('Transaction added!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to save. Try again.', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Add Transaction'; }
  }
}

async function showTransactionDetail(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;
  const cat = getCategoryById(tx.category);
  const date = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);

  if (confirm(`Delete "${tx.note || cat.label}" (${formatAmount(tx.amount)})?`)) {
    try {
      await db.collection('transactions').doc(id).delete();
      transactions = transactions.filter(t => t.id !== id);
      renderDashboard();
      showToast('Transaction deleted.', 'success');
    } catch (e) {
      showToast('Failed to delete.', 'error');
    }
  }
}

// ---- Navigation ----
function setupNavigation() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && path.includes(href.replace('.html', ''))) {
      item.classList.add('nav-active');
    }
  });
}

// ---- Toast Notification ----
function showToast(message, type = 'success') {
  const id = 'toast-' + Date.now();
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-yellow-500' };
  const toast = document.createElement('div');
  toast.id = id;
  toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition-all duration-300 opacity-0 translate-y-2 ${colors[type] || colors.success}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.remove('opacity-0', 'translate-y-2'); }, 50);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- Logout Button ----
document.getElementById('logoutBtn')?.addEventListener('click', logout);
