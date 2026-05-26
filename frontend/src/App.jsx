import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Quiz from "./pages/Quiz"
import Report from "./pages/Report"
import "./index.css"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </BrowserRouter>
  )
}