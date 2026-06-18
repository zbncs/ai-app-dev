import { Body, Controller, Post } from '@nestjs/common';
import { PromptsService } from './prompts.service';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post('translate')
  translate(@Body() body: { message: string; language: string }) {
    return this.promptsService.translate(body.message, body.language);
  }

  @Post('summarize')
  summarize(@Body() body: { message: string; maxWords?: number }) {
    return this.promptsService.summarize(body.message, body.maxWords);
  }

  @Post('classify')
  classify(@Body() body: { message: string }) {
    return this.promptsService.classify(body.message);
  }
}
