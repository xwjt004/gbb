import { simple } from './api';

export interface PointsConfig {
  id: string;
  photoUploadCost: number;  // 上传照片消耗积分
  videoUploadCost: number;  // 上传视频消耗积分
  videoPlayCost: number;    // 播放视频消耗积分
  purchaseRate: number;     // 1元兑换积分数（如1000=1元1000积分）
}

export const pointsConfigService = {
  /** 获取积分配置 */
  get: async () => {
    const res: any = await simple.get('/wx-users/points-config');
    return (res?.data || res) as PointsConfig;
  },

  /** 更新积分配置 */
  update: async (data: Partial<PointsConfig>) => {
    await simple.patch('/wx-users/points-config', data);
  },
};
