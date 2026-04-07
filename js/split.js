// =============================================
// SpendSmart Web - Split / Lending Module
// =============================================

let splitUser = null;
let splitUserDoc = null;
let splits = [];

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    splitUser = user;

    const snap = await db.collection('users').doc(user.uid).get();
    splitUserDoc = snap.exists ? snap.data() : {};
    if (splitUserDoc.currency) localStorage.setItem('ss_currency', splitUserDoc.currency);

    await loadSplits();
    setupSplitModal();
  });
});

async function loadSplits() {
  try {
    const snap = await db.collection('splits')
      .where('userId', '==', splitUser.uid)
      .orderBy('createdAt', 'desc')
      .get();
    splits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSplits();
  } catch (e) {
    console.error('Error loading splits:', e);
    splits = [];
    renderSplits();
  }
}

function renderSplits() {
  const owedToYou = splits.filter(s => s.type === 'owed_to_you');
  const youOwe = splits.filter(s => s.type === 'you_owe');

  const totalOwed = owedToYou.reduce((s, t) => s + (t.amount || 0), 0);
  const totalYouOwe = youOwe.reduce((s, t) => s + (t.amount || 0), 0);

  document.getElementById('totalOwedToYou').textContent = formatAmount(totalOwed);
  document.getElementById('totalYouOwe').textContent = formatAmount(totalYouOwe);

  renderSplitList('owedToYouList', owedToYou, 'owed_to_you');
  renderSplitList('youOweList', youOwe, 'you_owe');
}

function renderSplitList(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400 dark:text-slate-500 text-center py-4 italic">No records</p>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const initial = (item.friendName || '?')[0].toUpperCase();
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500'];
    const colorIndex = initial.charCodeAt(0) % colors.length;
    const isOwed = type === 'owed_to_you';
    const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();

    return `
      <div class="split-card bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        <div class="flex items-center justify-between p-4 cursor-pointer" onclick="toggleSplitDetail('${item.id}')">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              ${initial}
            </div>
            <div>
              <p class="font-semibold text-slate-800 dark:text-slate-100 text-sm">${item.friendName}</p>
              <p class="text-xs font-medium ${isOwed ? 'text-emerald-500' : 'text-red-400'}">
                ${isOwed ? `Owes you ${formatAmount(item.amount)}` : `You owe ${formatAmount(item.amount)}`}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-base font-bold ${isOwed ? 'text-emerald-500' : 'text-red-400'}">${formatAmount(item.amount)}</span>
            <svg class="w-4 h-4 text-slate-400 transition-transform duration-200 split-chevron" id="chevron-${item.id}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>
        <div class="split-detail hidden px-4 pb-4 border-t border-slate-100 dark:border-slate-700/50" id="detail-${item.id}">
          <div class="pt-3 space-y-2">
            ${item.note ? `<p class="text-sm text-slate-500 dark:text-slate-400">📝 ${item.note}</p>` : ''}
            <p class="text-xs text-slate-400 dark:text-slate-500">Added: ${formatDate(createdAt)}</p>
            <div class="flex gap-2 pt-1">
              <button onclick="markSettled('${item.id}')" class="flex-1 py-2 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                ✓ Mark Settled
              </button>
              <button onclick="deleteSplit('${item.id}')" class="py-2 px-3 text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                🗑
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleSplitDetail(id) {
  const detail = document.getElementById(`detail-${id}`);
  const chevron = document.getElementById(`chevron-${id}`);
  if (!detail) return;
  detail.classList.toggle('hidden');
  chevron?.classList.toggle('rotate-180');
}

async function markSettled(id) {
  if (!confirm('Mark this as settled and remove it?')) return;
  try {
    await db.collection('splits').doc(id).delete();
    splits = splits.filter(s => s.id !== id);
    renderSplits();
    showToast('Marked as settled!', 'success');
  } catch { showToast('Failed to update.', 'error'); }
}

async function deleteSplit(id) {
  if (!confirm('Delete this record?')) return;
  try {
    await db.collection('splits').doc(id).delete();
    splits = splits.filter(s => s.id !== id);
    renderSplits();
    showToast('Record deleted.', 'success');
  } catch { showToast('Failed to delete.', 'error'); }
}

function setupSplitModal() {
  const modal = document.getElementById('splitModal');
  const openBtn = document.getElementById('addSplitBtn');
  const closeBtn = document.getElementById('closeSplitModal');
  const form = document.getElementById('splitForm');

  openBtn?.addEventListener('click', () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => modal.querySelector('.modal-sheet').classList.add('translate-y-0'), 10);
  });

  const closeModal = () => {
    modal.querySelector('.modal-sheet').classList.remove('translate-y-0');
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); form?.reset(); }, 300);
  };

  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const friendName = document.getElementById('splitFriendName').value.trim();
    const amount = parseFloat(document.getElementById('splitAmount').value);
    const type = document.getElementById('splitType').value;
    const note = document.getElementById('splitNote').value.trim();

    if (!friendName || !amount) return;

    const saveBtn = document.getElementById('saveSplit');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    try {
      const docRef = await db.collection('splits').add({
        userId: splitUser.uid,
        friendName,
        amount,
        type,
        note,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      splits.unshift({ id: docRef.id, userId: splitUser.uid, friendName, amount, type, note });
      renderSplits();
      showToast('Record added!', 'success');
      closeModal();
    } catch { showToast('Failed to save.', 'error'); }
    finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Add Record'; } }
  });

  // Export PDF button
  document.getElementById('exportSplitPDF')?.addEventListener('click', exportSplitPDF);
}

function exportSplitPDF() {
  const owedToYou = splits.filter(s => s.type === 'owed_to_you');
  const youOwe = splits.filter(s => s.type === 'you_owe');
  const totalOwed = owedToYou.reduce((s, t) => s + t.amount, 0);
  const totalYouOwe = youOwe.reduce((s, t) => s + t.amount, 0);

  let content = `SpendSmart - Friends & Lending Report\n${'='.repeat(40)}\n\n`;
  content += `Total Owed to You: ${formatAmount(totalOwed)}\nYou Owe Others: ${formatAmount(totalYouOwe)}\n\n`;

  if (owedToYou.length) {
    content += `OWED TO YOU:\n${'-'.repeat(30)}\n`;
    owedToYou.forEach(s => { content += `${s.friendName}: ${formatAmount(s.amount)}${s.note ? ' - ' + s.note : ''}\n`; });
  }
  if (youOwe.length) {
    content += `\nYOU OWE:\n${'-'.repeat(30)}\n`;
    youOwe.forEach(s => { content += `${s.friendName}: ${formatAmount(s.amount)}${s.note ? ' - ' + s.note : ''}\n`; });
  }

  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'spendsmart-lending.txt';
  a.click();
  showToast('Report downloaded!', 'success');
}

function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
