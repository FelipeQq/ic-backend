import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { EventService } from './event.service';
import { EventDto } from './dto/event.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiOperation({ summary: 'Create event' })
  create(@Body() EventDto: EventDto) {
    return this.eventService.create(EventDto);
  }

  @Get()
  @ApiOperation({ summary: 'All events' })
  async findAll(@Query() filters: Partial<EventDto>) {
    const events = await this.eventService.findAll(filters);
    return events;
  }

  @ApiOperation({ summary: 'Event by id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @ApiOperation({ summary: 'Edit event' })
  @Put(':id')
  update(@Param('id') id: string, @Body() updateEventDto: EventDto) {
    return this.eventService.update(id, updateEventDto);
  }

  @ApiOperation({ summary: 'Delete event' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }
}
