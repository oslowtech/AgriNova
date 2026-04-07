# Firebase Setup Guide for GeoInsight/GeoInsight

## 📋 Prerequisites
- Google Account
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)

---

## 🔥 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Name it `geoinsight` or `geoinsight`
4. Enable Google Analytics (optional)
5. Wait for project creation

---

## 📱 Step 2: Add Android App

1. In Firebase Console → **Project Overview** → **Add app** → Android icon
2. Enter package name: `com.geoinsight.geoinsight`
3. Enter app nickname: `GeoInsight`
4. Click **Register app**
5. Download `google-services.json`
6. Place it in: `frontend/google-services.json`

---

## 🔐 Step 3: Enable Authentication Methods

### Phone Authentication
1. Go to **Authentication** → **Sign-in method**
2. Click **Phone** → Enable
3. Add test phone numbers for development:
   - `+91 9876543210` → `123456`
   - `+91 1234567890` → `654321`

### Google Sign-In
1. In **Authentication** → **Sign-in method**
2. Click **Google** → Enable
3. Enter support email
4. Save

---

## 🗄️ Step 4: Setup Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for hackathon)
3. Select region closest to you
4. Click **Enable**

### Firestore Rules (for production)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Parcels - consultants can write, owners can read their assigned parcels
    match /parcels/{parcelId} {
      allow read: if request.auth != null && (
        resource.data.consultantId == request.auth.uid ||
        resource.data.ownerId == request.auth.uid
      );
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'land_consultant';
    }
  }
}
```

---

## 🔑 Step 5: Get Google OAuth Client IDs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. You'll see OAuth 2.0 Client IDs created by Firebase:
   - **Web client** → Copy for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - **Android client** → Copy for `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### Create Android OAuth Client (if not exists)
1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Choose **Android**
3. Package name: `com.geoinsight.geoinsight`
4. SHA-1: Get from `eas credentials` or:
   ```bash
   cd frontend
   npx expo credentials:manager
   ```

---

## ⚙️ Step 6: Update Environment Variables

Edit `frontend/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_BACKEND_IP:8000

# From Firebase Console → Project Settings → General → Your apps
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=geoinsight-xxxxx.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=geoinsight-xxxxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=geoinsight-xxxxx.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:android:abcdef

# From Google Cloud Console → Credentials
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
```

---

## 🏗️ Step 7: Build Development Client

Firebase requires a **development build** (not Expo Go):

```bash
cd frontend

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for Android
eas build --profile development --platform android

# OR build locally (requires Android Studio)
npx expo run:android
```

---

## 🚀 Step 8: Run the App

### Option A: Development Build (Recommended)
```bash
# After installing the dev build APK
cd frontend
npx expo start --dev-client
```

### Option B: Local Build
```bash
cd frontend
npx expo run:android
```

---

## 🧪 Testing Authentication

### Test Phone Auth
1. Use test phone number: `+91 9876543210`
2. Enter OTP: `123456`

### Test Google Sign-In
1. Click "Continue with Google"
2. Select your Google account
3. Complete onboarding if new user

---

## 📊 Firestore User Document Structure

```javascript
// Collection: users
// Document ID: Firebase Auth UID
{
  name: "John Doe",
  role: "land_consultant" | "landowner",
  phone: "+919876543210",
  email: "john@example.com",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## ❓ Troubleshooting

### "Google Sign-In failed"
- Verify SHA-1 fingerprint is added to Firebase
- Check OAuth client IDs are correct
- Ensure `google-services.json` is in place

### "OTP not received"
- Add phone to test numbers in Firebase Console
- Check phone number format (must include country code)

### "Firestore permission denied"
- Update Firestore rules to allow read/write
- Verify user is authenticated

### "App crashes on start"
- Run `npx expo prebuild --clean`
- Rebuild the development client

---

## 📁 Required Files Checklist

- [ ] `frontend/google-services.json` - Download from Firebase Console
- [ ] `frontend/.env` - Fill with your credentials
- [ ] Firebase project created
- [ ] Phone auth enabled
- [ ] Google Sign-In enabled
- [ ] Firestore database created
- [ ] Test phone numbers added
