import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { BedroomsService } from './bedrooms.service';
import { BedroomDto } from './dto/bedroom.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/decorators/auth.guard';

@ApiTags('bedrooms')
@ApiBearerAuth()
@Controller('events/:idEvent/bedrooms')
export class BedroomsController {
  constructor(private readonly bedroomsService: BedroomsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async create(
    @Param('idEvent') idEvent: string,
    @Body() createBedroomDto: BedroomDto,
  ) {
    return await this.bedroomsService.create(idEvent, createBedroomDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('idEvent') idEvent: string) {
    return this.bedroomsService.findAll(idEvent);
  }

  @Get(':idBedrooms')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('idBedrooms') idBedrooms: string) {
    return this.bedroomsService.findOne(idBedrooms);
  }

  @Put(':idBedrooms')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  update(
    @Param('idEvent') idEvent: string,
    @Param('idBedrooms') idBedrooms: string,
    @Body() updateBedroomDto: BedroomDto,
  ) {
    return this.bedroomsService.update(idEvent, idBedrooms, updateBedroomDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.bedroomsService.delete(id);
  }
}
