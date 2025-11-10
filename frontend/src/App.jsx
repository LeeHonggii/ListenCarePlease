import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import TaggingPage from './pages/TaggingPage'
import ResultPage from './pages/ResultPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/processing/:fileId" element={<ProcessingPage />} />
          <Route path="/tagging/:fileId" element={<TaggingPage />} />
          <Route path="/result/:fileId" element={<ResultPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
