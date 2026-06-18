import { Body, Controller, Post, Res } from '@nestjs/common';
import { ModelsService } from './models.service';
import type { Response } from 'express';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}
  @Post('chat')
  baseChat(@Body() content: { message: string }) {
    // Implement your chat logic here
    return this.modelsService.baseChat(content.message);
  }

  @Post('system-prompt')
  systemPrompt(@Body() content: { systemMessage: string; message: string }) {
    // Implement your system prompt logic here
    return this.modelsService.systemPrompt(
      content.systemMessage,
      content.message,
    );
  }

  @Post('stream-chat')
  streamChat(@Body() content: { message: string }, @Res() response: Response) {
    return this.modelsService.streamChat(content.message, response);
  }
}
