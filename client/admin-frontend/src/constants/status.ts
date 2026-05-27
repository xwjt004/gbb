// 后端与前端 Status 映射集中管理
import { Status } from '@/types/common';

export const BackendStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type BackendStatusType = typeof BackendStatus[keyof typeof BackendStatus];

export const mapBackendStatusToFrontend = (s?: string): Status => {
  if (!s) return Status.ACTIVE;
  return s === BackendStatus.INACTIVE ? Status.INACTIVE : Status.ACTIVE;
};

export const mapFrontendStatusToBackend = (s: Status): BackendStatusType => {
  return s === Status.INACTIVE ? BackendStatus.INACTIVE : BackendStatus.ACTIVE;
};

export const BACKEND_STATUS_OPTIONS: { label: string; value: BackendStatusType }[] = [
  { label: '上架', value: BackendStatus.ACTIVE },
  { label: '下架', value: BackendStatus.INACTIVE },
];
