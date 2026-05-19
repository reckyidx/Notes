import React from 'react';
import { Link, useParams } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import {
  interviewPrepCategories,
  systemDesignProjects,
  designGuidelines,
  getMarkdownContent,
} from '../data/content';

export default function MarkdownViewer() {
  const { category, file, project } = useParams();

  // Determine the breadcrumb and content path
  let breadcrumbParts = [];
  let contentPath = '';
  let content = null;

  if (category) {
    // Interview prep path
    const cat = interviewPrepCategories.find((c) => c.id === category);
    const fileObj = cat?.files.find((f) => f.name === file);

    breadcrumbParts = [
      { label: 'Home', path: '/' },
      { label: 'Interview Prep', path: '/interview-prep' },
      { label: cat?.name || category, path: `/interview-prep/${category}` },
      { label: fileObj?.title || file },
    ];

    contentPath = `interview-prep/${category}/${file}`;
    content = getMarkdownContent(contentPath);
  } else if (project) {
    // System design path
    if (project === 'guidelines') {
      const fileObj = designGuidelines.files.find((f) => f.name === file);
      breadcrumbParts = [
        { label: 'Home', path: '/' },
        { label: 'System Design', path: '/system-design' },
        { label: 'Design Guidelines', path: '/system-design/guidelines' },
        { label: fileObj?.title || file },
      ];
      contentPath = `system-design/guidelines/${file}`;
      content = getMarkdownContent(contentPath);
    } else {
      const proj = systemDesignProjects.find((p) => p.id === project);
      const fileObj = proj?.files.find((f) => f.name === file);

      breadcrumbParts = [
        { label: 'Home', path: '/' },
        { label: 'System Design', path: '/system-design' },
        { label: proj?.name || project, path: `/system-design/${project}` },
        { label: fileObj?.title || file },
      ];

      contentPath = `system-design/${project}/${file}`;
      content = getMarkdownContent(contentPath);
    }
  }

  const hasError = !content;

  return (
    <div>
      <div className="breadcrumb">
        {breadcrumbParts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="sep">/</span>}
            {index < breadcrumbParts.length - 1 ? (
              <Link to={part.path}>{part.label}</Link>
            ) : (
              <span>{part.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {hasError && (
        <div className="error-state">
          <h2>Content Not Found</h2>
          <p>The file "{contentPath}" could not be loaded.</p>
          <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#777' }}>
            This may happen if the markdown file does not exist or was not included at build time.
          </p>
        </div>
      )}

      {!hasError && <MarkdownRenderer content={content} />}
    </div>
  );
}
