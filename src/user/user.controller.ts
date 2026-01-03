import {
  Body,
  Controller,
  Get,
  Param,
  Query,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserDTO } from './dto/user.dto';
import * as admin from 'firebase-admin';
import { UserService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/decorators/auth.guard';
import { EventService } from 'src/event/event.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly eventService: EventService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create user' })
  async create(@Body() data: UserDTO) {
    return this.userService.create(data);
  }
  // riando somente no evento
  // @ApiOperation({ summary: 'Create relation user event' })
  // @Post(':idUser/event/:idEvent')
  // @UseGuards(JwtAuthGuard)
  // async createRelationEvent(
  //   @Param('idUser') idUser: string,
  //   @Param('idEvent') idEvent: string,
  //   @Body('registrationRoleId') registrationRoleId: string[],
  // ) {
  //   return this.eventService.registerUserInEvent(
  //     idUser,
  //     idEvent,
  //     registrationRoleId,
  //   );
  // }

  @ApiOperation({ summary: 'All users' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() filters: Partial<UserDTO>) {
    const users = await this.userService.findAll(filters);
    return users;
  }

  @ApiOperation({ summary: 'Get insights users' })
  @UseGuards(JwtAuthGuard)
  @Get('insights')
  async findInsightsEvents() {
    return this.userService.findInsightsEvents();
  }

  @ApiOperation({ summary: 'User by id' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @ApiOperation({ summary: 'Edit user' })
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UserDTO) {
    return this.userService.update(id, data);
  }

  @ApiOperation({ summary: 'Edit user' })
  @Post(':id/profile-photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Arquivo de foto de perfil do usuário',
    type: 'file',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  async setProfilePhoto(
    @Param('id') id: string,
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
