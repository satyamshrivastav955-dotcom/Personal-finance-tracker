// =============================================
// SpendSmart Web - Budget Module
// =============================================

let budgetUser = null;
let budgetUserDoc = null;
let budgetData = {};

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    budgetUser = user;

    const snap = await db.collection('users').doc(user.uid).get();
    budgetUserDoc = snap.exists ? snap.data() : {};
    if (budgetUserDoc.currency) localStorage.setItem('ss_currency', budgetUserDoc.currency);

    await loadBudgetData();
    await loadBudgetPage();
    setupBudgetModal();
  });
});

async function loadBudgetData() {
  try {
    const snap = await db.collection('budgets').doc(budgetUser.uid).get();
    budgetData = snap.exists ? (snap.data().categories || {}) : {};
  } catch (e) {
    console.error(e);
    budgetData = {};
  }
}

async function loadBudgetPage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let txns = [];
  try {
    const snap = await db.collection('transactions')
      .where('userId', '==', budgetUser.uid)
      .where('type', '==', 'expense')
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(start))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(end))
      .get();
    txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.error(e); }

  const catSpend = {};
  txns.forEach(t => { catSpend[t.category] = (catSpend[t.category] || 0) + t.amount; });

  const totalSpent = Object.values(catSpend).reduce((s, v) => s + v, 0);
  const totalBudget = budgetUserDoc?.monthlyBudget || 0;
  const pct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  // Overall budget card
  document.getElementById('overallSpent').textContent = formatAmount(totalSpent);
  document.getElementById('overallBudgetOf').textContent = `of ${formatAmount(totalBudget)}`;
  document.getElementById('overallPct').textContent = `${pct.toFixed(0)}% used`;
  const overallBar = document.getElementById('overallBar');
  if (overallBar) {
    overallBar.style.width = pct + '%';
    overallBar.className = `h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-red-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-blue-400'}`;
  }

  // Monthly budget input
  const budgetInput = document.getElementById('monthlyBudgetInput');
  if (budgetInput) budgetInput.value = totalBudget || '';

  renderCategoryBudgets(catSpend);
}

function renderCategoryBudgets(catSpend) {
  const container = document.getElementById('categoryBudgetList');
  if (!container) return;

  const expenseCategories = CATEGORIES.filter(c => c.id !== 'income');

  container.innerHTML = expenseCategories.map(cat => {
    const spent = catSpend[cat.id] || 0;
    const limit = budgetData[cat.id] || 0;
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const isOver = limit > 0 && spent > limit;

    return `
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50" id="catCard-${cat.id}">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style="background:${cat.color}20">
              ${cat.icon}
            </div>
            <div>
              <p class="font-semibold text-slate-800 dark:text-slate-100 text-sm">${cat.label}</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">
                Spent: <span class="font-medium ${isOver ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}">${formatAmount(spent)}</span>
              </p>
            </div>
          </div>
          <button onclick="editCategoryBudget('${cat.id}', '${cat.label}', ${limit})" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Edit budget">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
        </div>
        ${limit > 0 ? `
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>${pct.toFixed(0)}% used</span>
              <span>Limit: ${formatAmount(limit)}</span>
            </div>
            <div class="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700 ${isOver ? 'bg-red-400' : pct >= 80 ? 'bg-yellow-400' : ''}" style="width:${pct}%; background:${isOver ? '' : pct < 80 ? cat.color : ''}"></div>
            </div>
            ${isOver ? `<p class="text-xs text-red-500 font-medium">Over budget by ${formatAmount(spent - limit)}</p>` : `<p class="text-xs text-slate-400">Remaining: ${formatAmount(limit - spent)}</p>`}
          </div>` :
          `<p class="text-xs text-slate-400 dark:text-slate-500 italic">No limit set — tap ✏️ to set one</p>`
        }
      </div>`;
  }).join('');
}

function setupBudgetModal() {
  const modal = document.getElementById('budgetEditModal');
  const closeBtn = document.getElementById('closeBudgetModal');
  const form = document.getElementById('budgetEditForm');

  closeBtn?.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    form?.reset();
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const catId = document.getElementById('editCatId').value;
    const limit = parseFloat(document.getElementById('editCatLimit').value) || 0;

    budgetData[catId] = limit;
    try {
      await db.collection('budgets').doc(budgetUser.uid).set({ categories: budgetData }, { merge: true });
      showToast('Budget updated!', 'success');
    } catch { showToast('Failed to save.', 'error'); }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    await loadBudgetPage();
  });

  // Monthly budget save
  document.getElementById('saveMonthlyBudget')?.addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('monthlyBudgetInput').value) || 0;
    try {
      await db.collection('users').doc(budgetUser.uid).update({ monthlyBudget: val });
      budgetUserDoc.monthlyBudget = val;
      showToast('Monthly budget saved!', 'success');
      await loadBudgetPage();
    } catch { showToast('Failed to save.', 'error'); }
  });
}

function editCategoryBudget(catId, catLabel, currentLimit) {
  const modal = document.getElementById('budgetEditModal');
  if (!modal) return;
  document.getElementById('editCatId').value = catId;
  document.getElementById('editCatLabel').textContent = catLabel;
  document.getElementById('editCatLimit').value = currentLimit || '';
  document.getElementById('editCatLimit').placeholder = `Enter limit in ${getCurrency()}`;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.getElementById('editCatLimit').focus();
}

function showToast(message, type = 'success') {
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-yellow-500' };
  const toast = document.createElement('div');
  toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition-all duration-300 opacity-0 translate-y-2 ${colors[type] || colors.success}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-2'), 50);
  setTimeout(() => { toast.classList.add('opacity-0', 'translate-y-2'); setTimeout(() => toast.remove(), 300); }, 3000);
}
