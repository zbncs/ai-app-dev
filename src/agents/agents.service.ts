import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../../config';
import { StructuredTool, tool } from '@langchain/core/tools';
import z from 'zod';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';

@Injectable()
export class AgentsService {
  private llm = new ChatOllama({
    baseUrl: config.ollama.host,
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    think: false,
  });
  // 定义一个工具函数，模拟查询产品库存和价格信息
  private checkProduct = tool(
    ({ productName }: { productName: string }) => {
      const products: Record<
        string,
        {
          stock: number;
          price: number;
          category: 'electronics' | 'clothing' | 'home' | 'books';
        }
      > = {
        'iPhone 14': { stock: 10, price: 999, category: 'electronics' },
        'MacBook Pro': { stock: 5, price: 1999, category: 'electronics' },
        'AirPods Pro': { stock: 20, price: 249, category: 'electronics' },
        'Samsung Galaxy S22': {
          stock: 15,
          price: 899,
          category: 'electronics',
        },
        'Sony WH-1000XM4': { stock: 8, price: 349, category: 'electronics' },
        "Levi's Jeans": { stock: 20, price: 59, category: 'clothing' },
        'Instant Pot': { stock: 15, price: 89, category: 'home' },
        'The Great Gatsby': { stock: 5, price: 10, category: 'books' },
      };
      const product = products[productName];
      if (!product) {
        return `没有找到${productName}的相关产品信息`;
      }
      if (!product.stock) {
        return `商品${productName}缺货`;
      }
      return `商品：${productName}，库存：${product.stock}，价格：${product.price}，分类：${product.category}`;
    },
    {
      name: 'check_product',
      description:
        '根据产品名称查询库存和价格信息。输入产品名称，字段名只能是 productName，输出库存数量、价格和类别。',
      schema: z.object({
        productName: z
          .string()
          .describe(
            '根据商品名称查询商品信息。参数 productName 是商品名称，例如 iPhone 14。',
          ),
      }),
    },
  );
  // 定义一个工具函数，模拟创建订单
  private createOrderTool = tool(
    ({
      productName,
      quantity,
      customerName,
    }: {
      productName: string;
      quantity: number;
      customerName: string;
    }) => {
      const orderId = `order_${Date.now().toString().slice(-6)}`;
      // 模拟订单创建逻辑
      return `成功创建订单：商品：${productName}，数量：${quantity}，客户：${customerName}，订单ID：${orderId}`;
    },
    {
      name: 'create_order_tool',
      description:
        '创建订单的工具，输入参数是商品名称、商品数量和客户姓名，输出是一个字符串，包含订单的创建结果',
      schema: z.object({
        productName: z.string().describe('商品的名称'),
        quantity: z.number().describe('商品的数量'),
        customerName: z.string().describe('客户姓名'),
      }),
    },
  );
  // 定义一个工具函数，模拟查询订单状态
  private checkOrderTool = tool(
    (orderId: string) => {
      const status = [
        '待支付',
        '已支付',
        '待发货',
        '已发货',
        '已完成',
        '已取消',
      ];
      return `订单${orderId}的状态是：${status[Math.floor(Math.random() * status.length)]}`;
    },
    {
      name: 'check_order_tool',
      description: '根据订单ID查询订单状态。输入订单ID，输出订单的状态',
      schema: z.object({
        orderId: z.string().describe('订单的ID'),
      }),
    },
  );

  // 申请退款
  private refundOrderTool = tool(
    ({ orderId, reason }: { orderId: string; reason: string }) => {
      const refundId = `refund_${Date.now().toString().slice(-6)}`;
      return `成功申请退款：订单${orderId}，原因：${reason}，退款ID：${refundId}`;
    },
    {
      name: 'refund_order_tool',
      description: '根据订单ID申请退款。输入订单ID和退款原因，输出退款申请结果',
      schema: z.object({
        orderId: z.string().describe('订单的ID'),
        reason: z.string().describe('退款原因'),
      }),
    },
  );

  async runAgent(message: string) {
    const tools = [
      this.checkProduct,
      this.createOrderTool,
      this.checkOrderTool,
      this.refundOrderTool,
    ];
    const toolMaps: Record<string, StructuredTool> = {
      check_product: this.checkProduct,
      create_order_tool: this.createOrderTool,
      check_order_tool: this.checkOrderTool,
      refund_order_tool: this.refundOrderTool,
    };

    // �LLM, �LLM, 并创建一个智能体, 智能体可以使用工具来完成任务
    // 智能体可以使用工具来完成任务, 也可以不使用工具来完成任务, 但是不能同时使用多个工具, 每个智能体只能使用一个工具
    const agent = this.llm.bindTools(tools);

    const messages: any[] = [
      // 设定系统角色，告诉模型它是一个智能客服助手，能够处理查询商品信息、创建订单、查询订单状态和申请退款等任务
      new SystemMessage(`你是一个[极速购]电商平台的AI智能客服助手，帮助用户查询商品信息，创建订单，查询订单状态和申请
        你可以使用以下的工具帮助客户：
        - check_product：查询商品库存和价格的工具，输入参数是商品名字，字段名只能是 productName，输出是一个字符串，包含商品的库存和价格信息
        - create_order：创建订单的工具，输入参数是商品名字和数量，客户的名字，输出是一个字符串，包含订单创建的结果
        - check_order：查询订单状态的工具，输入参数是订单ID，输出是一个字符串，包含订单的当前状态
        - refund_tool：申请退款的工具，输入参数是订单ID和退款原因，输出是一个字符串，包含退款申请的结果
        工作原则：
        1. 先用工具获取真实信息，再给用户回复，产品名称字段名只能是 productName，不允许使用其他字段名。
        2. 下单前必须先查询库存，确认有货后才能下单
        3. 下单的时候要知道用户的姓名， 如果用户没有提供姓名，要先询问用户的姓名
        4. 回答简洁友好，使用中文
      `),
      new HumanMessage(message),
    ];

    const steps: string[] = [];
    let roundCount = 0;
    while (roundCount < 6) {
      roundCount++;
      const response = await agent.invoke(messages);
      messages.push(response);
      // 模型没有调用工具，直接回答用户
      if (!response.tool_calls || response.tool_calls.length === 0) {
        steps.push(`模型回答：${response.content as string}`);
        break;
      }

      // 处理工具调用
      for (const tool_call of response.tool_calls) {
        steps.push(
          `工具调用：${tool_call.name}，参数：${JSON.stringify(tool_call.args)}`,
        );
        const toolFn = toolMaps[tool_call.name];
        if (toolFn) {
          console.log('tool_call.args:-----', tool_call.args);
          const result = (await toolFn.invoke(tool_call.args)) as string;
          steps.push(`工具调用结果：${result}`);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id!,
            }),
          );
        } else {
          steps.push(`工具调用失败：${tool_call.name}`);
          messages.push(
            new ToolMessage({
              content: `工具调用失败：${tool_call.name}`,
              tool_call_id: tool_call.id!,
            }),
          );
        }
      }
    }

    const finalResponse = messages[messages.length - 1] as AIMessage;
    return {
      message,
      steps,
      totalRound: roundCount,
      answer: finalResponse.content as string,
    };
  }
}
