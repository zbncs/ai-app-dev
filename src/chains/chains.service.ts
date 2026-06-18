import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../../config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';

@Injectable()
export class ChainsService {
  private llm = new ChatOllama({
    baseUrl: config.ollama.host,
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    think: false,
  });
  async publishChain(article: string) {
    const analyzeChain = ChatPromptTemplate.fromMessages([
      ['system', '你是一个资深的编辑，只分析问题，不做其他处理。'],
      ['human', '分析文章问题: {article}'],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    const publishChain = ChatPromptTemplate.fromMessages([
      ['system', '你是一个润色师，根据分析结果润色文章，使其适合发布。'],
      [
        'human',
        '分析结果: {analyzeResult}\n请将上述分析结果润色成适合发布的格式。文章内容: {article}',
      ],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    const fullChain = RunnableSequence.from([
      { article: new RunnablePassthrough(), analyzeResult: analyzeChain },
      publishChain,
    ]);

    const res = await fullChain.invoke({ article });
    return { original: article, publish: res };
  }
}
