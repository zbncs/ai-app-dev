import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
  async createUser(user: CreateUserDto) {
    const userInfo = await this.prisma.user.create({ data: user });
    return {
      status: 'success',
      message: 'User created successfully',
      data: userInfo,
    };
  }
  async findAll() {
    const users = await this.prisma.user.findMany();
    return {
      status: 'success',
      message: 'Users retrieved successfully',
      data: users,
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        posts: {
          // 关联查询用户的帖子
          select: {
            id: true,
            title: true,
            content: true,
            published: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }
    return {
      status: 'success',
      message: 'User retrieved successfully',
      data: user,
    };
  }

  async deleteUserById(id: string) {
    const user = await this.prisma.user.delete({
      where: { id: parseInt(id) },
    });
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }
    return {
      status: 'success',
      message: 'User deleted successfully',
      data: user,
    };
  }

  async getList(page: number, size: number) {
    const skip = (page - 1) * size;
    const users = await this.prisma.user.findMany({
      skip,
      take: size,
    });
    const total = await this.prisma.user.count();
    return {
      status: 'success',
      message: 'Users retrieved successfully',
      data: {
        list: users,
        total,
        page,
        size,
      },
    };
  }
}
