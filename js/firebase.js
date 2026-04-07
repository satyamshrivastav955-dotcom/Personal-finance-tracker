// =============================================
// SpendSmart Web — MOCK Firebase (localStorage)
// =============================================
// No real Firebase needed. Swap this file with
// the real firebase.js when you're ready.

// ---- Mock Firestore Timestamp ----
const firebase = {
  firestore: {
    Timestamp: {
      fromDate: (date) => ({ toDate: () => date, seconds: Math.floor(date.getTime() / 1000) }),
      now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) })
    },
    FieldValue: {
      serverTimestamp: () => ({ toDate: () => new Date() })
    }
  }
};

// ---- Mock Auth ----
const _authListeners = [];
let _currentUser = null;

function _notifyAuth(user) {
  _currentUser = user;
  _authListeners.forEach(fn => fn(user));
}

// Load session from localStorage on page load
(function _initSession() {
  const stored = localStorage.getItem('ss_mock_user');
  if (stored) {
    try { _currentUser = JSON.parse(stored); } catch(e) {}
  }
})();

const auth = {
  get currentUser() { return _currentUser; },

  onAuthStateChanged(callback) {
    _authListeners.push(callback);
    // Fire immediately with current state
    setTimeout(() => callback(_currentUser), 0);
    return () => {};   // unsubscribe noop
  },

  async signInWithEmailAndPassword(email, password) {
    const users = JSON.parse(localStorage.getItem('ss_mock_users') || '{}');
    const user = Object.values(users).find(u => u.email === email);
    if (!user) throw { code: 'auth/user-not-found' };
    if (user.password !== password) throw { code: 'auth/wrong-password' };
    const sessionUser = _makeSessionUser(user);
    localStorage.setItem('ss_mock_user', JSON.stringify(sessionUser));
    _notifyAuth(sessionUser);
    return { user: sessionUser };
  },

  async createUserWithEmailAndPassword(email, password) {
    const users = JSON.parse(localStorage.getItem('ss_mock_users') || '{}');
    const exists = Object.values(users).find(u => u.email === email);
    if (exists) throw { code: 'auth/email-already-in-use' };
    const uid = 'uid_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const newUser = { uid, email, password, displayName: '', createdAt: new Date().toISOString() };
    users[uid] = newUser;
    localStorage.setItem('ss_mock_users', JSON.stringify(users));
    const sessionUser = _makeSessionUser(newUser);
    localStorage.setItem('ss_mock_user', JSON.stringify(sessionUser));
    _notifyAuth(sessionUser);
    return { user: sessionUser };
  },

  async sendPasswordResetEmail(email) {
    // Mock — just pretend it worked
    return true;
  },

  signOut() {
    localStorage.removeItem('ss_mock_user');
    _notifyAuth(null);
    return Promise.resolve();
  }
};

function _makeSessionUser(raw) {
  return {
    uid: raw.uid,
    email: raw.email,
    displayName: raw.displayName || '',
    updateProfile(data) {
      if (data.displayName !== undefined) {
        this.displayName = data.displayName;
        // persist
        const u = JSON.parse(localStorage.getItem('ss_mock_user') || '{}');
        u.displayName = data.displayName;
        localStorage.setItem('ss_mock_user', JSON.stringify(u));
        const users = JSON.parse(localStorage.getItem('ss_mock_users') || '{}');
        if (users[raw.uid]) users[raw.uid].displayName = data.displayName;
        localStorage.setItem('ss_mock_users', JSON.stringify(users));
      }
      return Promise.resolve();
    }
  };
}

// ---- Mock Firestore ----
function _getCollection(name) {
  return JSON.parse(localStorage.getItem('ss_col_' + name) || '{}');
}
function _saveCollection(name, data) {
  localStorage.setItem('ss_col_' + name, JSON.stringify(data));
}
function _genId() {
  return 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
}

function _makeDocRef(colName, docId) {
  return {
    id: docId,
    async get() {
      const col = _getCollection(colName);
      const data = col[docId];
      return { exists: !!data, data: () => data ? { ...data } : null, id: docId };
    },
    async set(data, opts) {
      const col = _getCollection(colName);
      if (opts && opts.merge) {
        col[docId] = { ...(col[docId] || {}), ...data };
      } else {
        col[docId] = { ...data };
      }
      _saveCollection(colName, col);
    },
    async update(data) {
      const col = _getCollection(colName);
      col[docId] = { ...(col[docId] || {}), ...data };
      _saveCollection(colName, col);
    },
    async delete() {
      const col = _getCollection(colName);
      delete col[docId];
      _saveCollection(colName, col);
    }
  };
}

function _makeQuery(colName, filters, sorts, limitN) {
  return {
    where(field, op, value) {
      return _makeQuery(colName, [...filters, { field, op, value }], sorts, limitN);
    },
    orderBy(field, dir = 'asc') {
      return _makeQuery(colName, filters, [...sorts, { field, dir }], limitN);
    },
    limit(n) {
      return _makeQuery(colName, filters, sorts, n);
    },
    async get() {
      let col = _getCollection(colName);
      let docs = Object.entries(col).map(([id, data]) => ({ id, data: () => ({ ...data }) }));

      // Apply filters
      for (const f of filters) {
        docs = docs.filter(doc => {
          const val = doc.data()[f.field];
          if (f.op === '==') return val === f.value;
          if (f.op === '>=') return _compareVal(val, f.value) >= 0;
          if (f.op === '<=') return _compareVal(val, f.value) <= 0;
          if (f.op === '>') return _compareVal(val, f.value) > 0;
          if (f.op === '<') return _compareVal(val, f.value) < 0;
          return true;
        });
      }

      // Apply sorts
      for (const s of sorts) {
        docs.sort((a, b) => {
          const av = a.data()[s.field], bv = b.data()[s.field];
          const cmp = _compareVal(av, bv);
          return s.dir === 'desc' ? -cmp : cmp;
        });
      }

      if (limitN) docs = docs.slice(0, limitN);

      return { docs: docs.map(d => ({ id: d.id, data: d.data, ...d.data() })) };
    }
  };
}

function _compareVal(a, b) {
  // Handle Firestore Timestamp objects
  const av = a && a.seconds != null ? a.seconds : (a instanceof Date ? a.getTime()/1000 : a);
  const bv = b && b.seconds != null ? b.seconds : (b instanceof Date ? b.getTime()/1000 : b);
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

function _makeColRef(colName) {
  return {
    doc(id) {
      return _makeDocRef(colName, id || _genId());
    },
    where(field, op, value) {
      return _makeQuery(colName, [{ field, op, value }], [], null);
    },
    orderBy(field, dir) {
      return _makeQuery(colName, [], [{ field, dir: dir || 'asc' }], null);
    },
    async add(data) {
      const id = _genId();
      const col = _getCollection(colName);
      col[id] = { ...data };
      _saveCollection(colName, col);
      return { id };
    }
  };
}

// Batch support
function _makeBatch() {
  const ops = [];
  return {
    set(ref, data) { ops.push({ type: 'set', ref, data }); },
    update(ref, data) { ops.push({ type: 'update', ref, data }); },
    delete(ref) { ops.push({ type: 'delete', ref }); },
    async commit() {
      for (const op of ops) {
        if (op.type === 'set') await op.ref.set(op.data);
        else if (op.type === 'update') await op.ref.update(op.data);
        else if (op.type === 'delete') await op.ref.delete();
      }
    }
  };
}

const db = {
  collection: (name) => _makeColRef(name),
  batch: () => _makeBatch()
};

// ---- Currency Utility ----
function getCurrency() {
  return localStorage.getItem('ss_currency') || '₹';
}

function formatAmount(amount, showSign = false) {
  const currency = getCurrency();
  const num = parseFloat(amount) || 0;
  const formatted = currency + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (showSign && num > 0) return '+' + formatted;
  return formatted;
}

// ---- Theme Utility ----
function applyTheme() {
  const theme = localStorage.getItem('ss_theme') || 'light';
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// ---- Date Utilities ----
function getCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function getMonthStart(year, month) {
  return new Date(year, month, 1);
}

function getMonthEnd(year, month) {
  return new Date(year, month + 1, 0, 23, 59, 59);
}

function getRemainingDays() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diff = endOfMonth - now;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ---- Category Config ----
const CATEGORIES = [
  { id: 'food',        label: 'Food & Dining',    icon: '🍽️',  color: '#EF4444' },
  { id: 'transport',   label: 'Transport',         icon: '🚗',  color: '#3B82F6' },
  { id: 'shopping',    label: 'Shopping',          icon: '🛍️',  color: '#8B5CF6' },
  { id: 'health',      label: 'Health',            icon: '❤️',  color: '#10B981' },
  { id: 'bills',       label: 'Bills & Utilities', icon: '🧾',  color: '#F59E0B' },
  { id: 'entertainment', label: 'Entertainment',   icon: '🎬',  color: '#EC4899' },
  { id: 'education',   label: 'Education',         icon: '📚',  color: '#06B6D4' },
  { id: 'savings',     label: 'Savings',           icon: '💰',  color: '#22C55E' },
  { id: 'income',      label: 'Income',            icon: '💵',  color: '#22C55E' },
  { id: 'other',       label: 'Other',             icon: '📦',  color: '#94A3B8' },
];

function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
