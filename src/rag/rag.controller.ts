import { Body, Controller, Post } from '@nestjs/common';
import { RagService } from './rag.service';
import { AddDocumentsDto, QueryDto, SearchDto } from './dto/rag.dto';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}
  @Post('add-documents')
  addDocuments(@Body() dto: AddDocumentsDto) {
    return this.ragService.addDocuments(dto);
  }
  @Post('search')
  search(@Body() dto: SearchDto) {
    return this.ragService.search(dto);
  }
  @Post('query')
  query(@Body() dto: QueryDto) {
    return this.ragService.query(dto);
  }
}
