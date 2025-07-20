import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import WriteArticle from './pages/Write-Article'
import BlogTitles from './pages/BlogTitles'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/ai' element={<Layout />} />
        <Route index element={<Dashboard/>} />
        <Route path='write-article' element={<WriteArticle />} />
        <Route path='blog-titles' element={<BlogTitles />} />
      </Routes>
    </div>
  )
}

export default App