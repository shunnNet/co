
import React from 'react';

function Person({ person }) {
  return (
    <div>
      <h1>{person.name}</h1>
      <p>Age: {person.age}</p>
      <p>{person.intro}</p>
      <h3>Skills:</h3>
      <ul>
        {person.skills.map((skill, index) => (
          <li key={index}>{skill}</li>
        ))}
      </ul>
    </div>
  );
}

export default Person;
