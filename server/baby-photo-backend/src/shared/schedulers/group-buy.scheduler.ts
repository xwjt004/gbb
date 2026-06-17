import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GroupBuyService } from '../../modules/group-buy/group-buy.service';

@Injectable()
export class GroupBuyScheduler {
  private readonly logger = new Logger(GroupBuyScheduler.name);

  constructor(private readonly groupBuyService: GroupBuyService) {}

  /** 每小时检查一次过期团购 */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredGroupBuys() {
    this.logger.log('开始检查过期团购...');
    await this.groupBuyService.expireStaleActivities();
  }
}
