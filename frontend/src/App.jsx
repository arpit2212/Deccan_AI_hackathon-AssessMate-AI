import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">Project Assessment</h1>
        <p className="text-gray-600">React + Vite + Tailwind CSS + Go</p>
      </header>
      
      <main className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Frontend Ready!</h2>
        <p className="mb-6 text-gray-600">
          The frontend is initialized with Vite and Tailwind CSS.
        </p>
        
        <button
          onClick={() => setCount((count) => count + 1)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Count is {count}
        </button>
      </main>

      <footer className="mt-8 text-gray-500 text-sm">
        Edit <code>src/App.jsx</code> to start building.
      </footer>
    </div>
  )
}

export default App
