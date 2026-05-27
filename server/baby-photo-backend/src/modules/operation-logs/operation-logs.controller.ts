import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OperationLogsService } from './operation-logs.service';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';

@ApiTags('操作日志')
@Controller('operation-logs')
export class OperationLogsController {
  constructor(private readonly service: OperationLogsService) {}

  @Get()
  @ApiOperation({ summary: '查询操作日志列表' })
  async findAll(@Query() query: QueryOperationLogDto) {
    return this.service.findAll({
      ...query,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    });
  }

  @Get('modules')
  @ApiOperation({ summary: '获取所有模块列表' })
  async getModules() {
    return this.service.getModules();
  }
}
