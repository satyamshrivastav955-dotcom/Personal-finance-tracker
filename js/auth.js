// =============================================
// SpendSmart Web - Authentication Module
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  // Check if already logged in
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Already logged in, go to dashboard
      if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        window.location.href = 'dashboard.html';
      }
    }
  });

  setupAuthForms();
});

function setupAuthForms() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const showSignup = document.getElementById('showSignup');
  const showLogin = document.getElementById('showLogin');

  if (showSignup) {
    showSignup.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('loginSection').classList.add('hidden');
      document.getElementById('signupSection').classList.remove('hidden');
    });
  }

  if (showLogin) {
    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('signupSection').classList.add('hidden');
      document.getElementById('loginSection').classList.remove('hidden');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const btn = document.getElementById('loginBtn');
      const errEl = document.getElementById('loginError');

      btn.disabled = true;
      btn.textContent = 'Signing in...';
      errEl.textContent = '';

      try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'dashboard.html';
      } catch (err) {
        errEl.textContent = getAuthError(err.code);
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const btn = document.getElementById('signupBtn');
      const errEl = document.getElementById('signupError');

      if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creating account...';
      errEl.textContent = '';

      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });

        // Initialize user document in Firestore
        await db.collection('users').doc(cred.user.uid).set({
          name,
          email,
          currency: '₹',
          monthlyBudget: 0,
          monthlyIncome: 0,
          startDay: 1,
          theme: 'light',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        window.location.href = 'dashboard.html';
      } catch (err) {
        errEl.textContent = getAuthError(err.code);
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }
}

function getAuthError(code) {
  const errors = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email is already registered.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return errors[code] || 'Something went wrong. Please try again.';
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = 'index.html';
  });
}
