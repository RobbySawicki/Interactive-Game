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
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

// Session ID — isolates this campaign's data from any other campaigns
// you might host on the same Firebase project. Change per-campaign.
window.SYNC_SESSION_ID = "oreo";
