import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import UserDashboard from './pages/UserDashboard'

const App = () => {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  return (
    <div>
      <Routes>
        <Route path='/auth' element={<Auth />} />
        <Route 
          path='/dashboard' 
          element={isAuthenticated() ? <UserDashboard /> : <Navigate to="/auth" />} 
        />
        <Route 
          path='/' 
          element={<Navigate to={isAuthenticated() ? "/dashboard" : "/auth"} />} 
        />
      </Routes>
    </div>
  )
}

export default App