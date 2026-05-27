import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AutomationRulesService } from './automation-rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { QueryRuleDto } from './dto/query-rule.dto';

@Controller('automation-rules')
export class AutomationRulesController {
  constructor(private readonly service: AutomationRulesService) {}

  @Post()
  create(@Body() dto: CreateRuleDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryRuleDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/toggle')
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggle(id);
  }

  @Post('evaluate')
  evaluate(@Body() body: { trigger: string; context: Record<string, any> }) {
    return this.service.evaluate(body.trigger, body.context);
  }
}
