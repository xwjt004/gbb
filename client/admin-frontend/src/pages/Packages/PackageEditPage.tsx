import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import PackageForm from './PackageForm';
import { packageService } from '@/services/packages';
import type { Package as PackageType } from '@/types/package';

const PackageEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<PackageType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await packageService.getPackageDetail(id);
        setPkg(data as PackageType);
      } catch (err: any) {
        message.error('加载套餐失败: ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>;

  return (
    <div style={{ padding: 24 }}>
      <PackageForm
        visible={false}
        package={pkg as PackageType}
        onCancel={() => navigate('/packages')}
        onSubmit={() => navigate('/packages')}
      />
    </div>
  );
};

export default PackageEditPage;
