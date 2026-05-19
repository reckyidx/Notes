import React from 'react';
import { Link } from 'react-router-dom';
import { interviewPrepCategories } from '../data/content';

export default function InterviewPrep() {
  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="sep">/</span>
        <span>Interview Prep</span>
      </div>

      <div className="page-header">
        <h1>Interview Preparation</h1>
        <p>For 10+ Years Experienced Node.js Developers</p>
      </div>

      <ul className="topic-list">
        {interviewPrepCategories.map((cat) => (
          <li key={cat.id}>
            <Link
              to={`/interview-prep/${cat.id}`}
              className="topic-item"
            >
              <h3>{cat.name}</h3>
              <p>{cat.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
