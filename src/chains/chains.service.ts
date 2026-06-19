import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../../config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';

type ClassifyResult = 'TECH' | 'REFUND' | 'COMPLAINT' | 'OTHER';

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
    // 将分析链和发布链组合成一个完整的链
    const fullChain = RunnableSequence.from([
      { article: new RunnablePassthrough(), analyzeResult: analyzeChain },
      publishChain,
    ]);
    const res = await fullChain.invoke({ article });

    // 也可以使用async/await的方式调用完整链
    // const analyzeResult = await analyzeChain.invoke({ article });
    // const res = await publishChain.invoke({ article, analyzeResult });
    // console.log(8999, res);

    return { original: article, publish: res };
  }

  async smartRouter(question: string) {
    // 第一步：分类问题
    const classifyPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `分析用户问题，只输出分类标签（不要其他内容）：
        - 技术问题 → 输出: TECH
        - 退款问题 → 输出: REFUND
        - 投诉建议 → 输出: COMPLAINT
        - 其他 → 输出: OTHER`,
      ],
      ['human', '{question}'],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    // 第二步：根据分类选择不同 Prompt
    const prompts = {
      TECH: '你是技术支持专家，专业解答技术问题，给出具体操作步骤。',
      REFUND: '你是退款专员，引导用户完成退款流程，态度友好。',
      COMPLAINT: '你是客户关系专员，认真对待投诉，给出解决方案。',
      OTHER: '你是通用客服，友好回答各类问题。',
    };
    const classifyResult = (await classifyPrompt.invoke({
      question,
    })) as ClassifyResult;
    const selectedPrompt = prompts[classifyResult] || prompts['OTHER'];
    // 第三步：使用选定的 Prompt 生成回答
    const answerPrompt = ChatPromptTemplate.fromMessages([
      ['system', selectedPrompt],
      ['human', '{question}'],
    ])
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    const answer = await answerPrompt.invoke({ question });
    return { category: classifyResult, answer };
  }
}
