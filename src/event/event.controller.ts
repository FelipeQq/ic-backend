import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { EventService } from './event.service';
import { EventDto, roleEventDto } from './dto/event.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/decorators/auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logoFile', maxCount: 1 },
      { name: 'coverFile', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create event' })
  create(
    @UploadedFiles()
    files: {
      logoFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    },
    @Body() EventDto: EventDto,
  ) {
    const logoFile = files.logoFile?.[0];
    const coverFile = files.coverFile?.[0];
    EventDto.logoFile = logoFile;
    EventDto.coverFile = coverFile;
    return this.eventService.create(EventDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'All events' })
  async findAll(@Query() filters: Partial<EventDto>) {
    const events = await this.eventService.findAll(filters);
    return events;
  }
  @ApiOperation({ summary: 'Get insights events' })
  @Get('insights')
  @UseGuards(JwtAuthGuard)
  findInsightsEvents() {
    return this.eventService.findInsightsEvents();
  }

  @ApiOperation({ summary: 'Event by id' })
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @ApiOperation({ summary: 'Edit event' })
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logoFile', maxCount: 1 },
      { name: 'coverFile', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  update(
    @UploadedFiles()
    files: {
      logoFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    },
    @Param('id') id: string,
    @Body() updateEventDto: EventDto,
  ) {
    const logoFile = files.logoFile?.[0];
    const coverFile = files.coverFile?.[0];
    updateEventDto.logoFile = logoFile;
    updateEventDto.coverFile = coverFile;
    return this.eventService.update(id, updateEventDto);
  }

  @ApiOperation({ summary: 'Get users by event' })
  @UseGuards(JwtAuthGuard)
  @Get(':idEvent/users')
  async findUsers(@Param('idEvent') idEvent: string) {
    return this.eventService.findUsers(idEvent);
  }

  @ApiOperation({ summary: 'Remove user to event' })
  @UseGuards(JwtAuthGuard)
  @Delete(':idEvent/users/:idUser')
  removeUserFromEvent(
    @Param('idEvent') idEvent: string,
    @Param('idUser') idUser: string,
  ) {
    return this.eventService.removeUserFromEvent(idUser, idEvent);
  }

  @ApiOperation({ summary: 'Edit user in event' })
  @UseGuards(JwtAuthGuard)
  @Put(':idEvent/users/:idUser')
  updateUserFromEvent(
    @Param('idEvent') idEvent: string,
    @Param('idUser') idUser: string,
    @Body() body: roleEventDto,
  ) {
    return this.eventService.updateUserFromEvent(
      idUser,
      idEvent,
      body.roleRegistrationId,
    );
  }

  @ApiOperation({ summary: 'Delete event' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }

  @ApiOperation({ summary: 'Find users in waitlist' })
  @UseGuards(JwtAuthGuard)
  @Get(':idEvent/waitlist/users')
  findUsersInWaitlist(@Param('idEvent') idEvent: string) {
    return this.eventService.findUsersInWaitlist(idEvent);
  }

  @ApiOperation({ summary: 'Remove user from waitlist' })
  @UseGuards(JwtAuthGuard)
  @Delete(':idEvent/waitlist/users/:idUser/rule/:roleRegistrationId')
  removeUserFromWaitlist(
    @Param('idEvent') idEvent: string,
    @Param('idUser') idUser: string,
    @Param('roleRegistrationId') roleRegistrationId: string,
  ) {
    return this.eventService.removeUserFromWaitlist(
      idUser,
      idEvent,
      roleRegistrationId,
    );
  }

  @ApiOperation({ summary: 'Move user from waitlist to event' })
  @UseGuards(JwtAuthGuard)
  @Put(':eventId/waitlist/move')
  moveUserFromWaitlistToEvent(
    @Param('eventId') eventId: string,
    @Body()
    body: {
      userFromWaitlistId: string;
      userToRemoveId: string;
      roleRegistrationId: string;
    },
  ) {
    return this.eventService.movedUserFromWaitlistToEvent(
      body.userFromWaitlistId,
      body.userToRemoveId,
      eventId,
      body.roleRegistrationId,
    );
  }

  @ApiOperation({ summary: 'Register user in event' })
  @Post(':idEvent/users/:idUser')
  @UseGuards(JwtAuthGuard)
  async createRelationEvent(
    @Param('idUser') idUser: string,
    @Param('idEvent') idEvent: string,
    @Body() body: roleEventDto,
  ) {
    return this.eventService.registerUserInEvent(
      idUser,
      idEvent,
      body.roleRegistrationId,
    );
  }
}
