import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrmService } from '../../modules/crm/crm.service';

@Injectable()
export class CrmScheduler {
  private readonly logger = new Logger(CrmScheduler.name);

  constructor(private readonly crmService: CrmService) {}

  /**
   * 每日凌晨 1:00 自动升级会员等级
   */
  @Cron('0 1 * * *', { name: 'crm-auto-upgrade', timeZone: 'Asia/Shanghai' })
  async handleAutoUpgrade() {
    this.logger.log('开始定时任务：自动升级会员等级');
    try {
      const result = await this.crmService.autoUpgradeAll();
      this.logger.log(`自动升级完成: ${JSON.stringify(result.data)}`);
    } catch (err) {
      this.logger.error('自动升级失败', err);
    }
  }

  /**
   * 每日凌晨 3:00 检测流失客户（90天未下单）
   */
  @Cron('0 3 * * *', { name: 'crm-detect-churn', timeZone: 'Asia/Shanghai' })
  async handleDetectChurn() {
    this.logger.log('开始定时任务：流失客户检测');
    try {
      const result = await this.crmService.detectChurnUsers();
      this.logger.log(`流失检测完成: ${JSON.stringify(result.data)}`);
    } catch (err) {
      this.logger.error('流失检测失败', err);
    }
  }

  /**
   * 每日早 8:00 发送生日提醒（未来 7 天内过生日的客户）
   */
  @Cron('0 8 * * *', { name: 'crm-birthday-reminder', timeZone: 'Asia/Shanghai' })
  async handleBirthdayReminders() {
    this.logger.log('开始定时任务：生日提醒');
    try {
      const result = await this.crmService.sendBirthdayReminders();
      this.logger.log(`生日提醒完成: ${JSON.stringify(result.data)}`);
    } catch (err) {
      this.logger.error('生日提醒失败', err);
    }
  }
}
