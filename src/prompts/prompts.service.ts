import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../../config';
import {
  ChatPromptTemplate,
  FewShotPromptTemplate,
  PromptTemplate,
} from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class PromptsService {
  private llm = new ChatOllama({
    baseUrl: config.ollama.host,
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    think: false,
  });
  async translate(message: string, language: string) {
    const parser = new StringOutputParser();
    // fromMessages
    /**
     * {message} 的作用就是把用户输入的实际消息内容注入到 prompt 模板中，让 LLM 知道"要处理的内容是什么"。去掉它等于只给 LLM 下达了任务指令，但没有给素材——巧妇难为无米之炊。
     */
    const chain = ChatPromptTemplate.fromMessages([
      [
        'system',
        '你是一个翻译助手，帮助用户将消息翻译成指定的语言。请根据用户提供的消息和目标语言进行翻译。',
      ],
      [
        'human',
        '消息: {message}\n目标语言: {language}\n请将上述消息翻译成目标语言。',
      ],
    ])
      .pipe(this.llm)
      .pipe(parser);

    const response = await chain.invoke({ message, language });
    return {
      question: message,
      answer: response,
    };
  }

  async summarize(message: string, maxWords: number = 100) {
    const parser = new StringOutputParser();
    // fromTemplate
    const chain = ChatPromptTemplate.fromTemplate(
      '你是一个总结助手，帮助用户将消息总结成不超过{maxWords}个字的内容。请根据用户提供的消息进行总结，并确保总结内容不超过指定的字数限制。{message}',
    )
      .pipe(this.llm)
      .pipe(parser);

    const response = await chain.invoke({ message, maxWords });
    return {
      question: message,
      answer: response,
    };
  }

  async classify(message: string) {
    const parser = new StringOutputParser();
    const examples = [
      { input: '这个产品太棒了！', output: '正面' },
      { input: '完全不值这个价格', output: '负面' },
      { input: '还可以吧，普通', output: '中性' },
      { input: '强烈推荐！超出预期', output: '正面' },
      { input: '很失望，不会再买了', output: '负面' },
    ];
    const examplePrompt = PromptTemplate.fromTemplate(
      '输入: {input}\n输出: {output}',
    );
    const fewShotPrompt = new FewShotPromptTemplate({
      examples,
      examplePrompt,
      prefix:
        '你是一个文本分类助手，帮助用户将消息分类为正面、负面或中性。请根据用户提供的消息进行分类，并返回分类结果。',
      suffix: '输入: {message}\n。',
      inputVariables: ['message'],
    });
    const chain = fewShotPrompt.pipe(this.llm).pipe(parser);

    const response = await chain.invoke({ message });
    return {
      question: message,
      answer: response,
    };
  }
}
