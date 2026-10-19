import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { CopySignalPocModule } from './copy-signal-poc/copy-signal-poc.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CopySignalPocModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
