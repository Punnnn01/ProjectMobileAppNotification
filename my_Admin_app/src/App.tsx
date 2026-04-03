// src/App.tsx
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "preact/hooks";
import AddNews from "./AddNews";
import { auth } from "./firebase";
import GroupNotification from "./GroupNotification";
import Login, { type LoggedInUser } from "./Login";
import NewsList from "./NewsList";
import { Route, RouterProvider } from "./router";
import "./style.css";
import TeacherList from "./TeacherList";
import ChatbotKnowledge from "./ChatbotKnowledge";

// ── Nav item component ────────────────────────────────────────────
function NavItem({
  icon, label, path, currentPath, onClick,
}: {
  icon: string; label: string; path: string; currentPath: string; onClick: () => void;
}) {
  const isActive = currentPath === path || (path === "/" && currentPath === "");
  return (
    <button
      class={`nav-item${isActive ? " active" : ""}`}
      onClick={onClick}
    >
      <span class="nav-item-icon">{icon}</span>
      {label}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({
  currentUser,
  currentPath,
  navigate,
}: {
  currentUser: LoggedInUser;
  currentPath: string;
  navigate: (p: string) => void;
}) {
  const isAdmin = currentUser.role === "admin";
  const isTeacher = currentUser.role === "teacher";

  return (
    <aside class="sidebar">
      {isAdmin && (
        <NavItem icon="▪" label="รายชื่อบุคลากร" path="/" currentPath={currentPath} onClick={() => navigate("/")} />
      )}
      {isTeacher && (
        <NavItem icon="▪" label="ข่าวสารทั้งหมด" path="/" currentPath={currentPath} onClick={() => navigate("/")} />
      )}
      <NavItem icon="▪" label="เพิ่มข่าวสาร" path="/add-news" currentPath={currentPath} onClick={() => navigate("/add-news")} />
      {isTeacher && (
        <NavItem icon="▪" label="Group Notification" path="/group-notification" currentPath={currentPath} onClick={() => navigate("/group-notification")} />
      )}
      {isAdmin && (
        <>
          <NavItem icon="▪" label="ดูข่าวสารทั้งหมด" path="/news-list" currentPath={currentPath} onClick={() => navigate("/news-list")} />
          <NavItem icon="▪" label="ข้อมูล Chatbot" path="/chatbot-knowledge" currentPath={currentPath} onClick={() => navigate("/chatbot-knowledge")} />
        </>
      )}
    </aside>
  );
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentPath, setCurrentPath] = useState(
    location.hash.replace("#", "") || "/"
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => setAuthChecked(true));
    const onHashChange = () =>
      setCurrentPath(location.hash.replace("#", "") || "/");
    window.addEventListener("hashchange", onHashChange);
    return () => {
      unsubscribe();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  function navigate(path: string) {
    location.hash = "#" + path;
    setCurrentPath(path);
  }

  function handleLoginSuccess(user: LoggedInUser) {
    setCurrentUser(user);
    navigate("/");
  }

  async function handleLogout() {
    if (!confirm("ต้องการออกจากระบบหรือไม่?")) return;
    await auth.signOut();
    setCurrentUser(null);
    navigate("/");
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
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
      <div class="app-shell">

        {/* Topbar */}
        <header class="topbar">
          <span class="topbar-brand">KU Noti</span>
          <div class="topbar-user">
            <span class="topbar-name">{currentUser.displayName}</span>
            <span class={`role-badge role-badge--${currentUser.role}`}>
              {isAdmin ? "Admin" : "Teacher"}
            </span>
            <button class="btn-logout" onClick={handleLogout}>
              ออกจากระบบ
            </button>
          </div>
        </header>

        <div class="body-area">
          {/* Sidebar */}
          <Sidebar
            currentUser={currentUser}
            currentPath={currentPath}
            navigate={navigate}
          />

          {/* Main */}
          <main class="main-content">
            <Route path="/">
              {isAdmin ? (
                <TeacherList />
              ) : (
                <NewsList currentUser={currentUser} />
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
              <>
                <Route path="/chatbot-knowledge">
                  <ChatbotKnowledge />
                </Route>
              </>
            )}
          </main>
        </div>
      </div>
    </RouterProvider>
  );
}
