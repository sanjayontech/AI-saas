import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Auth from './pages/Auth'
import ChatWidgetDemo from './pages/ChatWidgetDemo'
import DashboardLayout from './components/Layout/DashboardLayout'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import { Overview, Chatbots, Analytics, Profile, Settings } from './pages/Dashboard/'

const App = () => {

  return (
    <AuthProvider>
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
          
          <Route 
            path='/' 
            element={<Navigate to="/dashboard" />} 
          />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App