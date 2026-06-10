import React from 'react';

interface PageContainerProps {
  title?: string;
  children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ title, children }) => (
  <div style={{ padding: 24 }}>
    {title && <h2 style={{ marginBottom: 16 }}>{title}</h2>}
    {children}
  </div>
);

export default PageContainer;
