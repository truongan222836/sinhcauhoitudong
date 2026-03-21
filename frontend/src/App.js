import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import Generate from "./pages/Generate";
import QuizSearch from "./pages/QuizSearch";
import Manage from "./pages/Manage";
import ResetPassword from "./pages/ResetPassword";
import Exam from "./pages/Exam";
import History from "./pages/History";
import Profile from "./pages/Profile";
import QuestionManager from "./pages/QuestionManager";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Support from "./pages/Support";
import HelpCenter from "./pages/HelpCenter";
import TopicDetails from "./pages/TopicDetails";
import UserProfile from "./pages/UserProfile";
import AdminUsers from "./pages/AdminUsers";
import AdminStats from "./pages/AdminStats";
import AdminSupport from "./pages/AdminSupport";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import LeaderboardPage from "./pages/LeaderboardPage";
import QuizAnalytics from "./pages/QuizAnalytics";


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
        {/* Public route for landing/login/register */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<HomePage />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes that use the Layout (Navbar, Footer) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Routes cho tất cả các vai trò đã đăng nhập */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/support" element={<Support />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/topics/:id" element={<TopicDetails />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />

            {/* Routes chỉ cho Giảng viên (2) và Admin (1) */}
            <Route element={<ProtectedRoute allowedRoles={[1, 2]} />}>
              <Route path="/generate" element={<Generate />} />
              <Route path="/manage" element={<Manage />} />
              <Route path="/question-manager" element={<QuestionManager />} />
              <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
              <Route path="/quiz/:id/analytics" element={<QuizAnalytics />} />
            </Route>

            {/* Routes chỉ cho Admin (1) */}
            <Route element={<ProtectedRoute allowedRoles={[1]} />}>
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/statistics" element={<AdminStats />} />
              <Route path="/admin/support" element={<AdminSupport />} />
            </Route>

            {/* Routes chỉ cho Sinh viên (3) */}
            <Route element={<ProtectedRoute allowedRoles={[3]} />}>
              <Route path="/exam/:id" element={<Exam />} />
              <Route path="/quiz-search" element={<QuizSearch />} />
              <Route path="/history" element={<History />} />
            </Route>
          </Route>
        </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
