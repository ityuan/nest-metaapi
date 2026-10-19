import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { CopySignalPocService, EaRule } from './copy-signal-poc.service';

/** PoC 接口只允许服务端管理密钥调用；未来改用 AuthModule 的租户 RBAC。 */
@Controller('poc')
export class CopySignalPocController {
  constructor(private readonly service: CopySignalPocService) {}

  private authorize(key?: string): void {
    const secret = process.env.POC_ADMIN_KEY;
    if (!secret || secret.length < 32 || !key) throw new UnauthorizedException('未配置或缺少有效的 PoC 管理密钥');
    const expected = Buffer.from(secret);
    const provided = Buffer.from(key);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('PoC 管理密钥无效');
    }
  }

  @Get('accounts/:accountId')
  getAccount(@Param('accountId') id: string, @Headers('x-poc-admin-key') key?: string) {
    this.authorize(key);
    return this.service.getAccount(id);
  }

  @Post('accounts/:accountId/attribution-preview')
  preview(
    @Param('accountId') accountId: string,
    @Headers('x-poc-admin-key') key: string,
    @Body() body: { from?: string; to?: string; rules?: EaRule[] },
  ) {
    this.authorize(key);
    if (
      !body || typeof body.from !== 'string' ||
      typeof body.to !== 'string' || !Array.isArray(body.rules) ||
      body.rules.length > 100 ||
      !body.rules.every((r) =>
        r && typeof r.eaInstanceId === 'string' && typeof r.magic === 'string' &&
        (r.symbols === undefined || (Array.isArray(r.symbols) &&
          r.symbols.length <= 100 && r.symbols.every((s) => typeof s === 'string'))))
    ) {
      throw new BadRequestException('请求体应包含 from、to 和合法的 EA 归属规则数组');
    }
    return this.service.previewAttribution(accountId, body.from, body.to, body.rules);
  }
}
