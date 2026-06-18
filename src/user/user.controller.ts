import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('add')
  CreateUser(@Body() user: CreateUserDto) {
    return this.userService.createUser(user);
  }

  @Get('list')
  findAll() {
    return this.userService.findAll();
  }

  @Get('/:id')
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Delete('/:id')
  deleteUserById(@Param('id') id: string) {
    return this.userService.deleteUserById(id);
  }

  @Get('getList')
  getList(@Param('page') page: number, @Param('size') size: number) {
    return this.userService.getList(page, size);
  }
}
