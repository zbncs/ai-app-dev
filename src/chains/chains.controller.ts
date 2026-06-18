import { Body, Controller, Post } from '@nestjs/common';
import { ChainsService } from './chains.service';

@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @Post('publish')
  publishChain(@Body() body: { article: string }) {
    return this.chainsService.publishChain(body.article);
  }
}
