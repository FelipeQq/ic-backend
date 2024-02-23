import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpCode,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { TeammDto } from './dto/team.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('team')
@Controller('events/:idEvent/teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @HttpCode(204)
  async create(
    @Param('idEvent') idEvent: string,
    @Body() createTeammDto: TeammDto,
  ) {
    return await this.teamService.create(idEvent, createTeammDto);
  }

  @Get()
  async findAll(@Param('idEvent') idEvent: string) {
    return this.teamService.findAll(idEvent);
  }

  @Get(':idTeam')
  findOne(@Param('idTeam') idTeam: string) {
    return this.teamService.findOne(idTeam);
  }

  @Put(':idTeam')
  @HttpCode(204)
  update(
    @Param('idEvent') idEvent: string,
    @Param('idTeam') idTeam: string,
    @Body() updateTeammDto: TeammDto,
  ) {
    return this.teamService.update(idEvent, idTeam, updateTeammDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.teamService.delete(id);
  }
}
