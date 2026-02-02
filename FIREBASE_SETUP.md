# Firebase Setup Instructions

## Problem
You're getting a `PERMISSION_DENIED` error because Firebase requires authentication to access the database.

## Solution Implemented
✅ Added Firebase Auth SDK to both host.html and player.html  
✅ Added anonymous authentication code to firebase-config.js and host.html  
✅ Updated createRoom() and joinRoom() to authenticate before database access

## Required: Enable Anonymous Authentication in Firebase

**You must complete this step for the app to work:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **pandemic-1190d**
3. Click **Authentication** in the left sidebar
4. Click the **Sign-in method** tab
5. Find **Anonymous** in the list
6. Click on it and toggle **Enable**
7. Click **Save**

## Database Security Rules

Your Firebase Realtime Database rules should allow authenticated users. Update them:

1. In Firebase Console, click **Realtime Database** in the left sidebar
2. Click the **Rules** tab
3. Replace with these rules:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

4. Click **Publish**

## Testing After Setup

1. **Refresh your browser** (Ctrl+F5 or Cmd+Shift+R)
2. Open browser console (F12) to see authentication logs
3. You should see: `✅ Authenticated anonymously`
4. Then: `✅ Room created: [CODE]`

## Troubleshooting

If errors persist:

1. **Clear browser cache** and reload
2. Check browser console for specific error messages
3. Verify anonymous auth is **enabled** in Firebase Console
4. Verify database rules are **published**
5. Make sure you're online and can reach Firebase

## Files Changed

- [host.html](host.html) - Added Firebase Auth SDK and authentication
- [player.html](player.html) - Added Firebase Auth SDK
- [firebase-config.js](js/firebase-config.js) - Added ensureAuth() function
