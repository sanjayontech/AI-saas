import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ChatbotProvider } from './contexts/ChatbotContext'
import Auth from './pages/Auth'
import ChatWidgetDemo from './pages/ChatWidgetDemo'
import DashboardLayout from './components/Layout/DashboardLayout'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import { Overview, Chatbots, Analytics, Profile, Settings } from './pages/Dashboard'
import { AdminLogin } from './pages/Admin/AdminLogin'
import { AdminDashboard } from './pages/Admin/AdminDashboard'
import { UserManagement } from './pages/Admin/UserManagement'
import { SystemHealth } from './pages/Admin/SystemHealth'

const App = () => {

  return (
    <AuthProvider>
      <ChatbotProvider>
        <div>
          <Routes>
          <Route path='/auth' element={<Auth />} />
          <Route path='/widget-demo' element={<ChatWidgetDemo />} />
          
          {/* Dashboard Routes */}
          <Route path='/dashboard' element={
            <ProtectedRoute>
              <DashboardLayout>
                <Overview />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path='/dashboard/chatbots' element={
            <ProtectedRoute>
              <DashboardLayout>
                <Chatbots />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path='/dashboard/analytics' element={
            <ProtectedRoute>
              <DashboardLayout>
                <Analytics />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path='/dashboard/profile' element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path='/dashboard/settings' element={
            <ProtectedRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path='/admin/login' element={<AdminLogin />} />
          <Route path='/admin/dashboard' element={<AdminDashboard />} />
          <Route path='/admin/users' element={<UserManagement />} />
          <Route path='/admin/health' element={<SystemHealth />} />
          
          <Route 
            path='/' 
            element={<Navigate to="/dashboard" />} 
          />
          </Routes>
        </div>
      </ChatbotProvider>
    </AuthProvider>
  )
}

export default App