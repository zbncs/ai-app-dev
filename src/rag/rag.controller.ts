import { Body, Controller, Post } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}
  @Post('load')
  loadDocuments(
    @Body()
    body: {
      documents: { id: string; content: string; source?: string }[];
    },
  ) {
    return this.ragService.loadDocuments(body.documents);
  }

  // POST /rag/search → 纯向量检索（不过大模型）
  @Post('search')
  search(@Body() body: { query: string; topK?: number }) {
    return this.ragService.search(body.query, body.topK);
  }

  // POST /rag/chat → 大模型检索（包含上下文）
  @Post('query')
  query(@Body() body: { question: string; topK?: number }) {
    return this.ragService.query(body.question, body.topK);
  }
}
