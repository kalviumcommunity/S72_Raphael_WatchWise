import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from "./pages/landing";
import { SearchProvider } from './context/SearchContext'

function App(){
  return(
  <SearchProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    </Router>
  </SearchProvider>
  )
}

export default App