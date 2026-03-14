import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import Generate from "./pages/Generate";
import QuizSearch from "./pages/QuizSearch";
import Manage from "./pages/Manage";
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


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
        {/* Public route for landing/login/register */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<HomePage />} />

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

            {/* Routes chỉ cho Giảng viên (2) và Admin (1) */}
            <Route element={<ProtectedRoute allowedRoles={[1, 2]} />}>
              <Route path="/generate" element={<Generate />} />
              <Route path="/manage" element={<Manage />} />
              <Route path="/question-manager" element={<QuestionManager />} />
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