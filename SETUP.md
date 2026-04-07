# 🔥 SpendSmart Web — Firebase Setup Guide

## Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name it `SpendSmart` (or anything you like)
4. Disable Google Analytics (optional) → Click **"Create project"**

---

## Step 2: Enable Authentication

1. In your Firebase project, go to **Build → Authentication**
2. Click **"Get started"**
3. Under **Sign-in method**, enable **Email/Password**
4. Click **Save**

---

## Step 3: Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **Start in production mode** (we'll set rules next)
4. Select your region (e.g., `asia-south1` for India)
5. Click **Done**

---

## Step 4: Set Firestore Security Rules

1. In Firestore, go to the **Rules** tab
2. Replace the content with the contents of `firestore.rules` file
3. Click **"Publish"**

---

## Step 5: Create Required Firestore Indexes

Go to **Firestore → Indexes** and create these **Composite Indexes**:

### Index 1 (Transactions by date):
- Collection: `transactions`
- Fields: `userId` (Ascending), `date` (Descending)
- Query scope: Collection

### Index 2 (Transactions by type + date):
- Collection: `transactions`  
- Fields: `userId` (Ascending), `type` (Ascending), `date` (Ascending)
- Query scope: Collection

### Index 3 (Splits):
- Collection: `splits`
- Fields: `userId` (Ascending), `createdAt` (Descending)
- Query scope: Collection

> **TIP:** When you first run the app, Firebase will show error links in your browser console. Click those links — they'll auto-create the required indexes!

---

## Step 6: Get Your Firebase Config

1. Go to **Project Settings** (gear icon ⚙️ next to "Project Overview")
2. Scroll to **"Your apps"** → Click **Web** icon `</>`
3. Register your app (name: `SpendSmart Web`)
4. Copy the `firebaseConfig` object

---

## Step 7: Paste Config into firebase.js

Open `js/firebase.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← Your actual API key
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123..."
};
```

---

## Step 8: Run the App

Since this is a pure HTML/JS app, you can:

### Option A: Use VS Code Live Server (Recommended)
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → **"Open with Live Server"**

### Option B: Use Python HTTP Server
```bash
cd /path/to/PFT
python -m http.server 5500
```
Then open `http://localhost:5500`

### Option C: Use Node.js HTTP Server
```bash
npx -y http-server . -p 5500
```

> ⚠️ **IMPORTANT:** Firebase Auth requires a proper HTTP server. Do NOT open `index.html` directly as a `file://` URL — it won't work!

---

## ✅ Final Checklist

- [ ] Firebase project created
- [ ] Email/Password Auth enabled
- [ ] Firestore database created (production mode)
- [ ] Security rules published
- [ ] Composite indexes created
- [ ] `firebaseConfig` pasted into `js/firebase.js`
- [ ] App running on localhost (not file://)

---

## 📁 Project Structure

```
PFT/
├── index.html          ← Login / Signup
├── dashboard.html      ← Home Dashboard
├── analytics.html      ← Charts & Insights
├── budget.html         ← Budget Management
├── split.html          ← Friends & Lending
├── profile.html        ← Settings & Profile
├── firestore.rules     ← Firestore Security Rules
├── SETUP.md            ← This file!
└── js/
    ├── firebase.js     ← 🔧 EDIT THIS with your config!
    ├── auth.js         ← Authentication logic
    ├── app.js          ← Dashboard logic
    ├── analytics.js    ← Charts & insights logic
    ├── budget.js       ← Budget management logic
    └── split.js        ← Friends & lending logic
```

---

## 🚀 Features

| Feature | Status |
|---------|--------|
| Email/Password Auth | ✅ |
| Session Persistence | ✅ |
| Add Expense / Income | ✅ |
| Dashboard Overview | ✅ |
| Budget Progress | ✅ |
| Category Budgets | ✅ |
| Budget Alerts (80%) | ✅ |
| Daily Spending Limit | ✅ |
| Pie Chart (Category) | ✅ |
| Bar Chart (6-Month) | ✅ |
| Smart Insights | ✅ |
| Friends & Lending | ✅ |
| Export CSV | ✅ |
| Import CSV | ✅ |
| Dark / Light Mode | ✅ |
| Currency Selector | ✅ |
| Offline Support | ✅ |
| Mobile-Responsive | ✅ |
| Export PDF | 🔜 Soon |
| Bank Import | 🔜 Soon |
