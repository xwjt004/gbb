import React, { useState, useRef } from 'react';
import { Select, Spin } from 'antd';
import supplierService from '@/services/supplierService';

interface SupplierSelectProps {
  value?: string;
  onChange?: (value: string, option: any) => void;
  allowClear?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const MIN_LEN = 2;

const SupplierSelect: React.FC<SupplierSelectProps> = ({ value, onChange, allowClear, placeholder, style, disabled }) => {
  const [options, setOptions] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleSearch = (keyword: string) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    if (!keyword || keyword.trim().length < MIN_LEN) {
      setOptions([]);
      return;
    }
    timerRef.current = window.setTimeout(async () => {
      try {
        setFetching(true);
        const list = await supplierService.searchByName(keyword.trim());
        setOptions(list.map(s => ({
          label: `${s.name} (${s.contactPerson || ''} ${s.contactPhone || ''})`,
          value: s.id,
          supplier: s,
        })));
      } catch {
        setOptions([]);
      } finally {
        setFetching(false);
      }
    }, 300);
  };

  return (
    <Select
      showSearch
      value={value}
      disabled={disabled}
      placeholder={placeholder || '搜索供应商名称'}
      filterOption={false}
      allowClear={allowClear}
      style={style}
      onSearch={handleSearch}
      onChange={(val, option) => onChange?.(val, option)}
      notFoundContent={fetching ? <Spin size="small" /> : '无数据'}
      options={options}
    />
  );
};

export default SupplierSelect;
