import React from 'react';
import { Link } from 'react-router-dom';
import { interviewPrepCategories, systemDesignProjects } from '../data/content';

export default function Home() {
  return (
    <div className="home-page">
      <h1>Interview Preparation & System Design</h1>
      <p className="subtitle">
        Quick reference notes for interview preparation and system design topics.
        Built for 10+ years experienced Node.js developers.
      </p>

      <div className="home-section">
        <h2>Interview Preparation</h2>
        {interviewPrepCategories.map((cat) => (
          <Link
            key={cat.id}
            to={`/interview-prep/${cat.id}`}
            className="home-card"
          >
            <h3>{cat.name}</h3>
            <p>{cat.description}</p>
          </Link>
        ))}
      </div>

      <div className="home-section">
        <h2>System Design</h2>
        {systemDesignProjects.map((project) => (
          <Link
            key={project.id}
            to={`/system-design/${project.id}`}
            className="home-card"
          >
            <h3>{project.name}</h3>
            <p>{project.description}</p>
          </Link>
        ))}
        <Link
          to="/system-design/guidelines"
          className="home-card"
        >
          <h3>Design Guidelines</h3>
          <p>Comprehensive guide for requirement analysis before HLD and LLD.</p>
        </Link>
      </div>
    </div>
  );
}
