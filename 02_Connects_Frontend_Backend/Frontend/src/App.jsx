import { useState, useEffect } from 'react'
import axios from 'axios'

import './App.css'

function App() {

  const [jokes, setJokes] = useState([])

  useEffect(() => {
    axios.get('/api/jokes')
      .then((response) => {
        setJokes(response.data)
      })
      .catch((error) => {
        console.error('Error fetching jokes:', error)
      })
  })

  return (
    <>
      <h1>Hello World!</h1>
      <p>JOKES: {jokes.length}</p>
      {
        jokes.map((joke, index) => (
          <div key={joke.id || index}>
            <h3>{joke.title}</h3>
            <p>{joke.joke}</p> {/* <-- changed from joke.content to joke.joke */}
          </div>
        ))
      }
    </>
  )
}

export default App
