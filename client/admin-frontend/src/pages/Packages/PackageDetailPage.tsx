import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, message } from 'antd';
import PackageDetail from './PackageDetail';
import { Package } from '@/types/package';
import { packageService } from '@/services/packages';

const PackageDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState<Package | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    packageService.getPackageDetail(id)
      .then((mapped: Package) => {
        setPkg(mapped);
      })
      .catch((err) => {
        console.error('加载套餐详情失败:', err);
        message.error('加载套餐详情失败');
        setPkg(undefined);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin style={{ marginTop: 80 }} />;
  if (!pkg) return <div style={{ marginTop: 80, textAlign: 'center' }}>未找到该套餐 <Button onClick={() => navigate(-1)}>返回</Button></div>;

  // 编辑跳转
  const handleEdit = () => {
    navigate(`/packages/edit/${pkg.id}`);
  };

  // 补全数据映射，防止字段缺失
  const fullPkg = {
    ...pkg,
    services: pkg.services ?? [],
    tags: pkg.tags ?? [],
    images: pkg.images ?? [],
    category: pkg.category ?? '',
    status: (pkg.status ?? 'active') as any,
    isPopular: pkg.isPopular ?? false,
    orderCount: pkg.orderCount ?? 0,
    rating: pkg.rating ?? 0,
    maxBookings: pkg.maxBookings ?? 0,
    description: pkg.description ?? '',
  };

  return <PackageDetail visible={true} pkg={fullPkg} onClose={() => navigate(-1)} onEdit={handleEdit} />;
};

export default PackageDetailPage;
