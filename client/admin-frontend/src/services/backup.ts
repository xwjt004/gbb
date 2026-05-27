import { request } from './api';

export interface BackupRecord {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  backupType: 'manual' | 'auto' | 'scheduled';
  status: 'success' | 'failed' | 'inProgress';
  createdAt: Date | string;
  description?: string;
  duration?: number;
  tablesCount?: number;
  recordsCount?: number;
  error?: string;
}

export interface BackupConfig {
  id: number;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionDays: number;
  includeUploads: boolean;
  updatedAt: Date | string;
}

export interface CreateBackupDto {
  description?: string;
  includeUploads?: boolean;
}

export interface BackupConfigDto {
  autoBackup: boolean;
  backupFrequency?: 'daily' | 'weekly' | 'monthly';
  backupTime?: string;
  retentionDays: number;
  includeUploads: boolean;
}

export interface RestoreBackupDto {
  backupId: string;
}

// 创建备份
export const createBackup = (data: CreateBackupDto) => {
  return request.post<BackupRecord>('/system/backup', data);
};

// 获取备份列表
export const getBackups = () => {
  return request.get<BackupRecord[]>('/system/backup/list');
};

// 下载备份
export const downloadBackup = (id: string) => {
  window.open(`${import.meta.env.VITE_API_URL || '/api/v1'}/system/backup/${id}/download`, '_blank');
};

// 删除备份
export const deleteBackup = (id: string) => {
  return request.delete(`/system/backup/${id}`);
};

// 恢复数据库
export const restoreBackup = (data: RestoreBackupDto) => {
  return request.post('/system/backup/restore', data);
};

// 上传并恢复
export const uploadAndRestore = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return request.post('/system/backup/restore/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 获取备份配置
export const getBackupConfig = () => {
  return request.get<BackupConfig>('/system/backup/config');
};

// 更新备份配置
export const updateBackupConfig = (data: BackupConfigDto) => {
  return request.put<BackupConfig>('/system/backup/config', data);
};

// 清理过期备份
export const cleanupOldBackups = (retentionDays: number) => {
  return request.post('/system/backup/cleanup', { retentionDays });
};

// 获取定时任务状态
export const getScheduleStatus = () => {
  return request.get('/system/backup/schedule/status');
};
