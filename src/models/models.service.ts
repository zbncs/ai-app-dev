import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../../config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { Response } from 'express';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class ModelsService {
  private llm = new ChatOllama({
    baseUrl: config.ollama.host,
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    think: false,
  });
  // 一次性回答，没有流式回答
  async baseChat(message: string) {
    const response = await this.llm.invoke([new HumanMessage(message)]);
    return {
      question: message,
      answer: response.content,
      usage: response.usage_metadata,
    };
  }
  // 系统提示词
  async systemPrompt(systemMessage: string, message: string) {
    const response = await this.llm.invoke([
      new SystemMessage(systemMessage),
      new HumanMessage(message),
    ]);
    return {
      question: message,
      answer: response.content,
      usage: response.usage_metadata,
    };
  }

  // 流式回答
  async streamChat(message: string, res: Response) {
    // 设置响应头，告诉前端这是一个流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    // 关闭缓存
    res.setHeader('Cache-Control', 'no-cache');
    // 允许跨域（根据需要调整）
    res.setHeader('Access-Control-Allow-Origin', '*');
    // 连接保持活跃
    res.setHeader('Connection', 'keep-alive');

    // const stream = await this.llm.stream([new HumanMessage(message)]);
    // for await (const response of stream) {
    //   res.write(`data: ${JSON.stringify(response)}\n\n`);
    // }

    // 创建一个字符串输出解析器，用于将模型的输出解析为字符串
    const parser = new StringOutputParser();

    // 使用链式调用来处理系统提示词和人类消息，并进行流式输出
    const chain = ChatPromptTemplate.fromMessages([
      ['system', 'You are a helpful assistant.'],
      ['human', '{message}'],
    ])
      .pipe(this.llm)
      .pipe(parser);

    const stream = await chain.stream({ message });
    for await (const response of stream) {
      res.write(`data: ${JSON.stringify(response)}\n\n`);
    }

    // 流式结束后发送一个特殊的消息，前端可以根据这个消息知道流式已经结束
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
