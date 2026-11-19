import { Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Philosophers from './pages/Philosophers'
import DebateSetup from './pages/DebateSetup'
import DebateArena from './pages/DebateArena'
import History from './pages/History'
import Playground from './pages/Playground'
import PromptLibrary from './pages/PromptLibrary'
import Settings from './pages/Settings'

export default function App() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-5 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/debate" element={<DebateSetup />} />
          <Route path="/arena/:id" element={<DebateArena />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/philosophers" element={<Philosophers />} />
          <Route path="/history" element={<History />} />
          <Route path="/prompts" element={<PromptLibrary />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<p className="py-24 text-mute">Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
