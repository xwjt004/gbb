export enum BackupType {
  MANUAL = 'manual',
  AUTO = 'auto',
  SCHEDULED = 'scheduled',
}

export enum BackupStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  IN_PROGRESS = 'inProgress',
}

export interface BackupRecord {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  backupType: BackupType;
  status: BackupStatus;
  createdAt: Date;
  description?: string;
  duration?: number; // 备份耗时(秒)
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
  updatedAt: Date;
}
