// src/App.tsx
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "preact/hooks";
import AddNews from "./AddNews";
import ChatbotKnowledge from "./ChatbotKnowledge";
import { auth } from "./firebase";
import GroupNotification from "./GroupNotification";
import Login, { type LoggedInUser } from "./Login";
import NewsList from "./NewsList";
import { Link, Route, RouterProvider } from "./router";
import "./style.css";
import TeacherList from "./TeacherList";

export default function App() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  function handleLoginSuccess(user: LoggedInUser) {
    setCurrentUser(user);
    location.hash = "#/";
  }

  async function handleLogout() {
    if (!confirm("ต้องการออกจากระบบหรือไม่?")) return;
    await auth.signOut();
    setCurrentUser(null);
    location.hash = "#/";
  }

  // ถามสิทธิ์แสดง Notification (จะใช้บน Android/Chrome ด้วย)
  useEffect(() => {
    if (!currentUser) return;

    if (!('Notification' in window)) return;

    const asked = localStorage.getItem('notiPermissionAsked');
    if (asked === '1') return;

    if (Notification.permission === 'default') {
      Notification.requestPermission().finally(() => {
        localStorage.setItem('notiPermissionAsked', '1');
      });
    } else {
      // บันทึกว่าถามแล้ว (อนุญาตหรือปฏิเสธ)
      localStorage.setItem('notiPermissionAsked', '1');
    }
  }, [currentUser]);

  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        กำลังโหลด...
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === "admin";
  const isTeacher = currentUser.role === "teacher";

  return (
    <RouterProvider>
      <div>
        {/* Topbar */}
        <header
          className="topbar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <button
            className="btn-logout"
            onClick={() => {
              location.hash = "#/";
            }}
          >
            หน้าหลัก
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{ color: "white", fontSize: "14px", fontWeight: "500" }}
            >
              {currentUser.displayName}
            </span>
            <span className={`role-badge role-badge--${currentUser.role}`}>
              {isAdmin ? "Admin" : "Teacher"}
            </span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            ออกจากระบบ
          </button>
        </header>

        {/* เมนูตาม role */}
        <section className="actions">
          <Link to="/add-news">
            <button className="action-btn">เพิ่มข่าวสาร</button>
          </Link>
          <Link to="/news-list">
            <button className="action-btn">ดูข่าวทั้งหมด</button>
          </Link>

          {isTeacher && (
            <Link to="/group-notification">
              <button className="action-btn">Group Notification</button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/chatbot-knowledge">
              <button className="action-btn">🤖 ข้อมูล Chatbot</button>
            </Link>
          )}
        </section>

        {/* Routes */}
        <Route path="/">
          {isAdmin ? (
            // หน้าหลัก Admin = รายชื่อบุคลากร (อาจารย์/นิสิต)
            <TeacherList />
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "60px 24px",
                color: "#374151",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>👋</div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                ยินดีต้อนรับ, {currentUser.displayName}
              </h2>
              <p style={{ color: "#6b7280", fontSize: "15px" }}>
                เลือกเมนูด้านบนเพื่อเริ่มใช้งาน
              </p>
            </div>
          )}
        </Route>

        <Route path="/add-news">
          <AddNews currentUser={currentUser} />
        </Route>

        <Route path="/news-list">
          <NewsList currentUser={currentUser} />
        </Route>

        {isTeacher && (
          <Route path="/group-notification">
            <GroupNotification currentUser={currentUser} />
          </Route>
        )}
        {isAdmin && (
          <Route path="/chatbot-knowledge">
            <ChatbotKnowledge />
          </Route>
        )}
      </div>
    </RouterProvider>
  );
}
