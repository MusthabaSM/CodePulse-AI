import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VcsModule } from '../vcs/vcs.module';

@Module({
  imports: [PrismaModule, VcsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
