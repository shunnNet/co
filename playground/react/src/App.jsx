import './App.css'
// co
import Person from './components/person/Person.jsx'
// co-end
function App() {
  const person = {
    name: 'John Doe',
    age: 25,
    intro: 'Hello, I am John Doe',
    skills: [
      'React',
      'Vue',
      'Angular',
      'Svelte',
      'Node.js',
      'Deno',
      'TypeScript',
      'JavaScript',
      'HTML',
      'CSS',
    ],
  }

  return (
    <>
      <Person person={person} />
    </>
  )
}

export default App
