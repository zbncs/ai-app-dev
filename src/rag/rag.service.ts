import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../../config';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { Document } from '@langchain/core/documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class RagService {
  // 初始化大模型
  private llm = new ChatOllama({
    baseUrl: config.ollama.host,
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    think: false,
  });
  // OllamaEmbeddings：把文本转成向量（用于相似度检索）
  private embeddings = new OllamaEmbeddings({
    model: config.ollama.embedModel,
    baseUrl: config.ollama.host,
  });
  // 内存向量库：用于存储和检索向量表示
  private vectorStore: MemoryVectorStore | null = null;
  private docCount = 0;

  // 加载文档到内存向量库并返回向量库
  async loadDocuments(
    documents: { id: string; content: string; source?: string }[],
  ) {
    // 文件拆分器：把文本拆分成多个段落
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
      separators: ['\n\n', '\n', '。', '！', '？', ' ', ''],
    });
    // 文档
    const allDoc: Document<Record<string, any>>[] = [];
    for (const doc of documents) {
      // 拆分文档内容
      const chunks = await splitter.createDocuments(
        [doc.content],
        [
          {
            id: doc.id,
            source: doc.source,
          },
        ],
      );
      // 合并拆分后的段落
      allDoc.push(...chunks);
    }
    // 从所有文档创建向量库
    this.vectorStore = await MemoryVectorStore.fromDocuments(
      allDoc,
      this.embeddings,
    );
    // 记录文档数量
    this.docCount = documents.length;

    return {
      success: true,
      totalChunks: allDoc.length,
      originalDocs: documents.length,
      message: '文档加载成功',
    };
  }

  async search(query: string, topK = 3) {
    if (!this.vectorStore) {
      return { error: '请先调用 /rag/load 加载文档' };
    }

    // similaritySearchWithScore 返回 [Document, score] 数组
    // score 是余弦相似度，越高越相关
    const results = await this.vectorStore.similaritySearchWithScore(
      query,
      topK,
    );

    return {
      query,
      results: results.map(([doc, score]) => ({
        content: doc.pageContent,
        source: doc.metadata.source as string,
        score: parseFloat(score.toFixed(4)),
      })),
    };
  }

  // 大模型检索（包含上下文）
  async query(question: string, topK = 3) {
    if (!this.vectorStore) {
      return { error: '请先调用 /rag/load 加载文档' };
    }
    // similaritySearchWithScore 返回 [Document, score] 数组
    // score 是余弦相似度，越高越相关
    const ret = await this.vectorStore.similaritySearchWithScore(
      question,
      topK,
    );
    if (ret.length === 0) {
      return { error: '未找到相关文档' };
    }
    // 构建上下文
    const context = ret
      .map(
        ([doc, score]) => `
    文档ID：${doc.metadata.id}
    文档来源：${doc.metadata.source}
    相似度：${parseFloat(score.toFixed(4))}`,
      )
      .join('\n\n');

    // 构建提示模板
    const prompt1 = `
    你是一个专业的问答助手，你的任务是根据上下文回答用户的问题。
    上下文：${context}
    请根据上下文回答问题，保持回答的准确性和相关性。
    `;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', prompt1],
      ['human', '{question}'],
    ]);

    // 调用大模型
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const response = await chain.invoke({ question, context });

    return {
      question,
      response: response,
      source: ret.map(([doc, score]) => ({
        id: doc.metadata.id as string,
        source: doc.metadata.source as string,
        score: parseFloat(score.toFixed(4)),
      })),
    };
  }
}
