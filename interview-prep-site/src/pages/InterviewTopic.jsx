import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { interviewPrepCategories } from '../data/content';

export default function InterviewTopic() {
  const { category } = useParams();
  const cat = interviewPrepCategories.find((c) => c.id === category);

  if (!cat) {
    return (
      <div className="error-state">
        <h2>Category Not Found</h2>
        <p>The category "{category}" does not exist.</p>
        <Link to="/interview-prep" className="back-link">
          &larr; Back to Interview Prep
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="sep">/</span>
        <Link to="/interview-prep">Interview Prep</Link>
        <span className="sep">/</span>
        <span>{cat.name}</span>
      </div>

      <div className="page-header">
        <h1>{cat.name}</h1>
        <p>{cat.description}</p>
      </div>

      <ul className="topic-list">
        {cat.files.map((file) => (
          <li key={file.name}>
            <Link
              to={`/interview-prep/${category}/${file.name}`}
              className="topic-item"
            >
              <h3>{file.title}</h3>
              <p>{file.keyAreas}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
