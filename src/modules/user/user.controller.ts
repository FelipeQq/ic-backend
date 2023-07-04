import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserDTO } from './user.dto';
import * as admin from 'firebase-admin';
import { UserService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create user' })
  async create(@Body() data: UserDTO) {
    return this.userService.create(data);
  }

  @ApiOperation({ summary: 'All users' })
  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @ApiOperation({ summary: 'User by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @ApiOperation({ summary: 'Edit user' })
  @Put(':id')
  async update(@Param('id') id: number, @Body() data: UserDTO) {
    return this.userService.update(id, data);
  }

  @ApiOperation({ summary: 'Edit user' })
  @Post(':id/profile-photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Arquivo de foto de perfil do usuário',
    type: 'file',
  })
  @UseInterceptors(FileInterceptor('photo'))
  async setProfilePhoto(
    @Param('id') id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const bucket = admin.storage().bucket();
    const photoPath = file.originalname;

    const bucketName = admin.storage().bucket().name;

    const fileBucket = bucket.file(photoPath);
    await fileBucket.save(file.buffer, {
      contentType: file.mimetype,
    });

    const publicPath = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${photoPath}?alt=media`;

    await this.userService.setProfilePhoto(id, publicPath);
    return { message: 'Foto de perfil atualizada com sucesso' };
  }
}
