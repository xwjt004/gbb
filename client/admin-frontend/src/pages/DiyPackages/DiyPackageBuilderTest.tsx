import React from 'react';
import { Card } from 'antd';

const DiyPackageBuilderTest: React.FC = () => {
  console.log('DiyPackageBuilderTest 组件渲染成功');
  
  return (
    <div style={{ padding: '24px' }}>
      <Card title="DIY套系构建器测试">
        <h2>组件已成功加载！</h2>
        <p>这是一个测试组件，用于验证路由和组件渲染功能。</p>
      </Card>
    </div>
  );
};

export default DiyPackageBuilderTest;
