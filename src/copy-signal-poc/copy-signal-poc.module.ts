import { Module } from '@nestjs/common';
import { MetaApiReadService } from './metaapi-read.service';
import { CopySignalPocService } from './copy-signal-poc.service';
import { CopySignalPocController } from './copy-signal-poc.controller';

@Module({
  controllers: [CopySignalPocController],
  providers: [MetaApiReadService, CopySignalPocService],
})
export class CopySignalPocModule {}
