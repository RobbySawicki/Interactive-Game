// Firebase config for cross-device sync.
//
// Setup:
//   1. https://console.firebase.google.com → Add project (free).
//   2. Build → Realtime Database → Create database → Start in TEST MODE.
//   3. Project Settings → Your apps → </> Web → register → copy the snippet.
//   4. Replace the YOUR_* placeholders below with the real values.
//
// While placeholders remain, the framework falls back to BroadcastChannel
// (same-browser only) so the local preview still works.
window.FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
