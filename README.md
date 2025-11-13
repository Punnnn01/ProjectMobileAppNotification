# Project Mobile App Notification

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/Punnnn01/ProjectMobileAppNotification.git
cd ProjectMobileAppNotification
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install
```

**หมายเหตุ:** ไฟล์ `.env` ถูก commit ไว้แล้วเพื่อความสะดวก (repo เป็น Private)  
สามารถใช้งานได้ทันทีโดยไม่ต้อง setup เพิ่มเติม

### 3. Run Backend
```bash
npm run dev
# Backend จะรันที่ http://localhost:8080
```

### 4. Setup Admin App

```bash
cd ../my_Admin_app

# Install dependencies
npm install

# Run dev server
npm run dev
# Admin App จะรันที่ http://localhost:5173
```

### 5. Setup Mobile App

```bash
cd ../MobileApp

# Install dependencies
npm install

# Run Expo
npx expo start
```

## 📁 โครงสร้างโปรเจค

```
ProjectMobileAppNotification/
├── backend/              # Express.js API + Firebase Admin
├── my_Admin_app/        # Admin Web App (Vite + Preact)
├── MobileApp/           # React Native Mobile App (Expo)
├── firebaseConfig.js    # Firebase Client Config
└── README.md
```

## 🔐 Security Notes

- ⚠️ ไฟล์ `.env` **ถูก commit** เพื่อความสะดวก (**repo ต้องเป็น Private เท่านั้น!**)
- ไฟล์ `serviceAccountKey.json` **ไม่ถูก commit** (ใช้ Base64 ใน .env แทน)
- **อย่าเปลี่ยน repo เป็น Public** เพราะจะทำให้ Firebase credentials หลุด
- ใช้ Firebase Rules เพื่อป้องกันการเข้าถึงข้อมูล

## ⚙️ Environment Variables

### Backend (.env)
```
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 encoded credentials>
PORT=8080
```

## 🐛 Troubleshooting

### Admin App ไม่แสดงข้อมูล
- เช็คว่า Backend รันอยู่ที่ `http://localhost:8080`
- เปิด Browser Console (F12) ดู error
- เช็ค CORS settings

### Firebase Authentication Error
- เช็คว่า `.env` ถูกต้อง
- ลอง generate Firebase key ใหม่

## 📞 Contact

มีปัญหาติดต่อ: [GitHub Issues](https://github.com/Punnnn01/ProjectMobileAppNotification/issues)
