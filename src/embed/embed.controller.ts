import { Body, Controller, Post } from '@nestjs/common';
import { EmbedService } from './embed.service';
import { EmbedBatchDto, EmbedQueryDto, EmbedSingleDto } from './dto/embed.dto';

@Controller('embed')
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}
  @Post('single')
  createSingle(@Body() dto: EmbedSingleDto) {
    return this.embedService.createSingle(dto.text);
  }
  @Post('batch')
  createBatch(@Body() dto: EmbedBatchDto) {
    return this.embedService.createBatch(dto.texts);
  }
  @Post('query')
  createQuery(@Body() dto: EmbedQueryDto) {
    return this.embedService.createQuery(dto.query, dto.documents);
  }
}
