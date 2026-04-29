// Replace these placeholders with your Firebase project's config.
// Console: https://console.firebase.google.com → Project settings → Your apps → Web app.
// Make sure Realtime Database (not Firestore) is enabled in test mode for the demo.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Single shared "session" key both the iPad and the truck read/write to.
// For multi-device or multi-event use, generate unique IDs per session.
export const SESSION_ID = "demo-session";
