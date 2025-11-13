import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import ThemeToggle from './components/ThemeToggle'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import UploadPage from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import SpeakerInfoConfirmPage from './pages/SpeakerInfoConfirmPage'
import TaggingAnalyzingPage from './pages/TaggingAnalyzingPage'
import TaggingPageNew from './pages/TaggingPageNew'
import ResultPageNew from './pages/ResultPageNew'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <ThemeToggle />
          <div className="min-h-screen">
            <Routes>
            {/* 공개 라우트 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

            {/* 보호된 라우트 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/processing/:fileId"
              element={
                <ProtectedRoute>
                  <ProcessingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/confirm/:fileId"
              element={
                <ProtectedRoute>
                  <SpeakerInfoConfirmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analyzing/:fileId"
              element={
                <ProtectedRoute>
                  <TaggingAnalyzingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tagging/:fileId"
              element={
                <ProtectedRoute>
                  <TaggingPageNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/result/:fileId"
              element={
                <ProtectedRoute>
                  <ResultPageNew />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
    </ThemeProvider>
  )
}

export default App
