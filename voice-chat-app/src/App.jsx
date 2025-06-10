import { BrowserRouter, Route, Routes } from "react-router-dom";
import TopicSelection from "./pages/TopicSelectionPage/TopicSelection";


export default function App() {
  return (
        <BrowserRouter>
          <Routes>
              <Route path="/" element={<TopicSelection/>} />
          </Routes>
        </BrowserRouter>
  )
}
