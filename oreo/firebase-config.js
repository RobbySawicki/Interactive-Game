// Firebase config for cross-device sync.
//
// To activate cross-device play (iPad + truck on different machines):
//   1. Go to https://console.firebase.google.com → Add project (free).
//   2. Inside the project: Build → Realtime Database → Create database
//      → Start in TEST MODE (open rules — fine for a demo event).
//   3. Project Settings (gear icon) → General → "Your apps" →
//      click the </> Web icon → register app → copy the config object.
//   4. Paste the values below, replacing the YOUR_xxx placeholders.
//   5. Push the change. Done.
//
// While placeholders are in place, the game falls back to same-browser
// sync (BroadcastChannel + localStorage) so the local preview still works.
window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAYWQ0noryS6o3QK13StwMFvKdvKrOm4Ws",
  authDomain:        "interactive-game-d2e2d.firebaseapp.com",
  databaseURL:       "https://interactive-game-d2e2d-default-rtdb.firebaseio.com",
  projectId:         "interactive-game-d2e2d",
  storageBucket:     "interactive-game-d2e2d.firebasestorage.app",
  messagingSenderId: "977788577447",
  appId:             "1:977788577447:web:3f4729f287a5a519dedd82",
};

// Session ID — isolates this campaign's data from any other campaigns
// you might host on the same Firebase project. Change per-campaign.
window.SYNC_SESSION_ID = "oreo";
