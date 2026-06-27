import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AddDocumentsDto, QueryDto, SearchDto } from './dto/rag.dto';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Pool } from 'pg';
import { DistanceStrategy, PGVectorStore } from '@langchain/pgvector';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

@Injectable()
export class RagService implements OnModuleInit {
  // 定义日志记录器，用于记录服务运行时的事件
  private logger = new Logger(RagService.name);
  // 定义向量模型，用于将文本转换为向量表示
  private embeddings: OllamaEmbeddings;
  // 定义语言模型，用于生成文本响应
  private llm: ChatOllama;
  // 定义数据库连接池，用于执行数据库操作
  private pool: Pool;
  // 定义配置函数，用于获取数据库配置
  private getConfig = (collectionName: string) => {
    return {
      pool: this.pool,
      tableName: 'langchain_pg_embedding',
      collectionName,
      collectionTableName: 'langchain_pg_collection',
      culumns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        metadataColumnName: 'cmetadata',
        contentColumnName: 'document',
      },
      distanceMetric: 'cosine' as DistanceStrategy,
    };
  };

  onModuleInit() {
    // 初始化向量模型，用于将文本转换为向量表示
    this.embeddings = new OllamaEmbeddings({
      model: 'mxbai-embed-large',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
    // 初始化语言模型，用于生成文本响应
    this.llm = new ChatOllama({
      model: 'qwen3.5:0.8b',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
    // 初始化数据库连接池，用于执行数据库操作
    this.pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432', 10),
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      database: process.env.PG_DATABASE || 'ragdb',
    });
    this.logger.log('初始化完成');
  }
  addDocuments(dto: AddDocumentsDto) {
    const chunkSize = dto.chunkSize || 500;
    const chunkOverlap = dto.chunkOverlap || 50;
    // 文件拆分
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', ' 。', '！', '？', ' '],
    });
    dto.documents.forEach((doc) => {
      const documents = textSplitter.createDocuments(
        [doc.content],
        [{ id: doc.id, metadata: doc.metadata }],
      );
    });

    // 向量化
    // 存储到数据库
  }
  search(dto: SearchDto) {
    return 'This is a rag service';
  }
  query(dto: QueryDto) {
    return 'This is a rag service';
  }
}
