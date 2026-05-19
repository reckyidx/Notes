import React from 'react';
import { Link } from 'react-router-dom';
import { systemDesignProjects, designGuidelines } from '../data/content';

export default function SystemDesign() {
  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="sep">/</span>
        <span>System Design</span>
      </div>

      <div className="page-header">
        <h1>System Design Projects</h1>
        <p>Complete system design implementations with code and documentation</p>
      </div>

      {systemDesignProjects.map((project) => (
        <div key={project.id} className="project-card">
          <h3>
            <Link to={`/system-design/${project.id}`}>{project.name}</Link>
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '8px' }}>
            {project.description}
          </p>
          <dl className="project-meta">
            <dt>Type:</dt>
            <dd>{project.type}</dd>
            <dt>Tech Stack:</dt>
            <dd>{project.techStack}</dd>
            <dt>Key Patterns:</dt>
            <dd>{project.keyPatterns}</dd>
            <dt>Key Challenge:</dt>
            <dd>{project.keyChallenge}</dd>
          </dl>
          <div className="project-docs">
            <h4>Documentation</h4>
            <div className="doc-links">
              {project.files.map((file) => (
                <Link
                  key={file.name}
                  to={`/system-design/${project.id}/${file.name}`}
                  className="doc-link"
                >
                  {file.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Design Guidelines Section */}
      <div className="project-card">
        <h3>
          <Link to={`/system-design/${designGuidelines.id}`}>
            {designGuidelines.name}
          </Link>
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '8px' }}>
          {designGuidelines.description}
        </p>
        <div className="project-docs">
          <h4>Documentation</h4>
          <div className="doc-links">
            {designGuidelines.files.map((file) => (
              <Link
                key={file.name}
                to={`/system-design/${designGuidelines.id}/${file.name}`}
                className="doc-link"
              >
                {file.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
