import { OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbedService {
  private ollamaEmbeddings: OllamaEmbeddings;
  // 余弦相似度计算
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dot / (normA * normB);
  }
  constructor() {
    this.ollamaEmbeddings = new OllamaEmbeddings({
      model: 'mxbai-embed-large:latest',
      baseUrl: 'http://localhost:11434',
    });
  }
  // 创建单个向量
  async createSingle(text: string) {
    const vector = await this.ollamaEmbeddings.embedQuery(text);
    return {
      vector,
      text,
      vectorLength: vector.length,
    };
  }
  // 批量创建向量
  async createBatch(texts: string[]) {
    const vectors = await this.ollamaEmbeddings.embedDocuments(texts);
    return vectors.map((vector, index) => ({
      text: texts[index],
      vector,
      vectorLength: vector.length,
    }));
  }
  // 查询向量
  async createQuery(query: string, documents: string[]) {
    // 创建查询向量
    const queryVector = await this.ollamaEmbeddings.embedQuery(query);
    // 创建文档向量
    const documentVectors =
      await this.ollamaEmbeddings.embedDocuments(documents);
    // 计算查询向量与文档向量的余弦相似度
    const similarities = documentVectors.map((vector, index) => {
      const similarity = this.cosineSimilarity(queryVector, vector);
      return {
        index,
        similarity: parseFloat(similarity.toFixed(6)),
        document: documents[index],
      };
    });
    similarities.sort((a, b) => b.similarity - a.similarity);
    return {
      similarities,
      query,
    };
  }
}
