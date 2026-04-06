import { BrowserRouter, Routes, Route } from "react-router-dom";
import O1Form from "./pages/O1Form";
import SubmissionSuccess from "./pages/SubmissionSuccess";
import SavedCandidates from "./pages/SavedCandidates";
import CandidateAnalysis from "./pages/CandidateAnalysis";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<O1Form />} />
        <Route path="/submission-success" element={<SubmissionSuccess />} />
        <Route path="/saved-candidates" element={<SavedCandidates />} />
        <Route path="/candidate-analysis/:id" element={<CandidateAnalysis />} />
      </Routes>
    </BrowserRouter>
  );
}