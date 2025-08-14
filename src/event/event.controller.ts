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
} from '@nestjs/common';
import { EventService } from './event.service';
import { EventDto } from './dto/event.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/decorators/auth.guard';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create event' })
  create(@Body() EventDto: EventDto) {
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
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @ApiOperation({ summary: 'Edit event' })
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateEventDto: EventDto) {
    return this.eventService.update(id, updateEventDto);
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
    @Body() data: { worker: boolean },
  ) {
    return this.eventService.updateUserFromEvent(idUser, idEvent, data);
  }

  @ApiOperation({ summary: 'Delete event' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }
}
