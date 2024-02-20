import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { TeammDto } from './dto/team.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('team')
@Controller('events/:idEvent/teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post(':idTeam')
  async create(
    @Param('idEvent') idEvent: string,
    @Body() createTeammDto: TeammDto,
  ) {
    return await this.teamService.create(idEvent, createTeammDto);
  }

  @Get()
  findAll() {
    return this.teamService.findAll();
  }

  @Get(':idTeam')
  findOne(@Param('idTeam') idTeam: string) {
    return this.teamService.findOne(idTeam);
  }

  @Put(':idTeam')
  update(
    @Param('idEvent') idEvent: string,
    @Param('idTeam') idTeam: string,
    @Body() updateTeammDto: TeammDto,
  ) {
    return this.teamService.update(idEvent, idTeam, updateTeammDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }
}
