import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // 导出 PrismaService 以供其他模块使用
})
export class PrismaModule {}
