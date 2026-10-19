import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';

export interface MetaApiAccountView {
  id: string;
  type: string | null;
  login: string | null;
  server: string | null;
  state: string | null;
  connectionStatus: string | null;
}

export interface BrokerDealView {
  id: string;
  orderId: string | null;
  positionId: string | null;
  magic: string | null;
  symbol: string;
  type: string;
  entryType: string | null;
  volume: string;
  time: string;
}

/** MetaAPI 只读适配器。此服务不会下单或部署账户。 */
@Injectable()
export class MetaApiReadService {
  private sdk: any;

  private getSdk(): any {
    const token = process.env.METAAPI_TOKEN;
    if (!token) {
      throw new ServiceUnavailableException('未配置 METAAPI_TOKEN');
    }
    if (!this.sdk) {
      // CommonJS 与当前 NestJS 工程保持一致；SDK 隔离在此适配器中。
      const imported: any = require('metaapi.cloud-sdk');
      const MetaApi = imported.default ?? imported.MetaApi ?? imported;
      this.sdk = new MetaApi(token);
    }
    return this.sdk;
  }

  async getAccount(accountId: string): Promise<MetaApiAccountView> {
    try {
      const account = await this.getSdk().metatraderAccountApi.getAccount(accountId);
      return {
        id: String(account.id),
        type: account.type ?? null,
        login: account.login == null ? null : String(account.login),
        server: account.server ?? null,
        state: account.state ?? null,
        connectionStatus: account.connectionStatus ?? null,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('MetaAPI 账户查询失败，请检查账户 ID、令牌权限与服务连接');
    }
  }

  async listDeals(accountId: string, from: Date, to: Date): Promise<BrokerDealView[]> {
    if (!(from < to) || to.getTime() - from.getTime() > 24 * 3600 * 1000) {
      throw new BadRequestException('单次查询区间必须大于 0 且不超过 24 小时');
    }
    let connection: any;
    try {
      const account = await this.getSdk().metatraderAccountApi.getAccount(accountId);
      connection = account.getRPCConnection();
      await connection.connect();
      await connection.waitSynchronized();
      const result = await connection.getDealsByTimeRange(from, to);
      if (result.synchronizing) {
        throw new ServiceUnavailableException('成交历史尚在同步，请稍后重试');
      }
      return (result.deals ?? []).map((deal: any) => ({
        id: String(deal.id),
        orderId: deal.orderId == null ? null : String(deal.orderId),
        positionId: deal.positionId == null ? null : String(deal.positionId),
        magic: deal.magic == null ? null : String(deal.magic),
        symbol: String(deal.symbol ?? ''),
        type: String(deal.type ?? ''),
        entryType: deal.entryType ?? null,
        volume: String(deal.volume),
        time: new Date(deal.time).toISOString(),
      }));
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('MetaAPI 成交查询失败，结果未确认');
    } finally {
      // PoC 采用短连接；后续由 Worker 维护长连接池。
      if (connection) {
        try { await connection.close(); } catch { /* 关闭失败不覆盖原错误 */ }
      }
    }
  }
}
