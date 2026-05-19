import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { systemDesignProjects, designGuidelines } from '../data/content';

export default function SystemDesignProject() {
  const { project } = useParams();

  // Check if it's a design guideline
  if (project === 'guidelines') {
    return (
      <div>
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span className="sep">/</span>
          <Link to="/system-design">System Design</Link>
          <span className="sep">/</span>
          <span>{designGuidelines.name}</span>
        </div>

        <div className="page-header">
          <h1>{designGuidelines.name}</h1>
          <p>{designGuidelines.description}</p>
        </div>

        <ul className="topic-list">
          {designGuidelines.files.map((file) => (
            <li key={file.name}>
              <Link
                to={`/system-design/guidelines/${file.name}`}
                className="topic-item"
              >
                <h3>{file.title}</h3>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const proj = systemDesignProjects.find((p) => p.id === project);

  if (!proj) {
    return (
      <div className="error-state">
        <h2>Project Not Found</h2>
        <p>The project "{project}" does not exist.</p>
        <Link to="/system-design" className="back-link">
          &larr; Back to System Design
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="sep">/</span>
        <Link to="/system-design">System Design</Link>
        <span className="sep">/</span>
        <span>{proj.name}</span>
      </div>

      <div className="page-header">
        <h1>{proj.name}</h1>
        <p>{proj.description}</p>
      </div>

      <dl className="project-meta" style={{ marginBottom: '24px' }}>
        <dt>Type:</dt>
        <dd>{proj.type}</dd>
        <dt>Tech Stack:</dt>
        <dd>{proj.techStack}</dd>
        <dt>Key Patterns:</dt>
        <dd>{proj.keyPatterns}</dd>
        <dt>Key Challenge:</dt>
        <dd>{proj.keyChallenge}</dd>
        <dt>Database:</dt>
        <dd>{proj.database}</dd>
        <dt>Cache:</dt>
        <dd>{proj.cache}</dd>
      </dl>

      <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Documentation</h3>
      <ul className="topic-list">
        {proj.files.map((file) => (
          <li key={file.name}>
            <Link
              to={`/system-design/${project}/${file.name}`}
              className="topic-item"
            >
              <h3>{file.title}</h3>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
