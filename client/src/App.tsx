import "./App.css";
import { SignupForm } from "./components/auth/SignupForm";
import { SigninForm } from "./components/auth/SigninForm";
import { ResetPasswordForm } from "./components/auth/ResetPasswordForm";
import { ForgotPasswordForm } from "./components/auth/ForgotPasswordForm";
import { VerifyEmailForm } from "./components/auth/VerifyEmailForm";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { CreatePostPage } from "./pages/CreatePostPage";
import { LibraryPage } from "./pages/LibraryPage";
import { PostDetailsPage } from "./pages/PostDetailsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { HomePage } from "./pages/HomePage";
import { ErrorPage } from "./pages/ErrorPage";
import { useAppSelector } from "./store";
import { Navbar } from "./components/global/Navbar";
import { HomeFilterProvider } from "./context/HomeFilterContext";

function App() {
  const authRoutes = [
    {
      path: "/sign-in",
      element: <SigninForm />,
    },
    { path: "/sign-up", element: <SignupForm /> },
    { path: "/forgot-password", element: <ForgotPasswordForm /> },
    { path: "/forgot-pass", element: <ForgotPasswordForm /> },
    { path: "/reset-password/:token", element: <ResetPasswordForm /> },
    { path: "/reset-pass/:token", element: <ResetPasswordForm /> },
    { path: "/verify-email/:token", element: <VerifyEmailForm /> },
  ];

  // Optionally, you could implement a more robust auth check here (e.g., validate token with backend)
  // For now, we just check if a token exists to determine if user is "logged in"
  // const verified = useAppSelector((state) => state.auth.user?.isVerified);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return (
    <BrowserRouter>
      <HomeFilterProvider>
        <Navbar />
        <Routes>
          {authRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<AuthPage>{route.element}</AuthPage>}
            />
          ))}
          <Route path="/" element={<HomePage />} />
          <Route path="/posts/:id" element={<PostDetailsPage />} />

          {isAuthenticated && (
            <Route path="/profile" element={<ProfilePage />} />
          )}
          {/* {verified && isAuthenticated && (
          <>
            <Route path="/create-post" element={<CreatePostPage />} />
            <Route path="/posts/:id/edit" element={<CreatePostPage />} />
            <Route path="/library" element={<LibraryPage />} />{" "}
          </>
        )} */}
          {isAuthenticated && (
            <>
              <Route path="/create-post" element={<CreatePostPage />} />
              <Route path="/posts/:id/edit" element={<CreatePostPage />} />
              <Route path="/library" element={<LibraryPage />} />{" "}
            </>
          )}
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </HomeFilterProvider>
    </BrowserRouter>
  );
}

export default App;
