import { BadRequestException, Injectable } from '@nestjs/common';
import { BrokerDealView, MetaApiReadService } from './metaapi-read.service';
import { EaExecutionEvent, linkExecutionEvents } from './deal-linker';

export type AttributionStatus = 'MATCHED' | 'AMBIGUOUS' | 'UNATTRIBUTED';

export interface AttributionResult {
  deal: BrokerDealView;
  status: AttributionStatus;
  eaInstanceId: string | null;
  reason: string;
}

export interface EaRule {
  eaInstanceId: string;
  magic: string;
  symbols?: string[];
}

/**
 * PoC 关联原则：
 * 1. accountId 由调用方指定，不能跨账户匹配；
 * 2. 只有唯一 Magic + 可选品种规则命中时才建立候选归属；
 * 3. Netting 成交可能由其他 EA 平仓或反手触发，不凭 Magic 直接确认策略仓位；
 * 4. 暂不计算虚拟持仓，也不发送 CopyFactory 外部信号。
 */
export function attributeDeals(deals: BrokerDealView[], rules: EaRule[]): AttributionResult[] {
  return deals.map((deal) => {
    const candidates = rules.filter((rule) =>
      rule.magic === deal.magic &&
      (!rule.symbols?.length || rule.symbols.includes(deal.symbol)),
    );
    if (candidates.length === 0) {
      return { deal, status: 'UNATTRIBUTED', eaInstanceId: null, reason: '没有匹配的 EA Magic/品种规则' };
    }
    if (candidates.length > 1) {
      return { deal, status: 'AMBIGUOUS', eaInstanceId: null, reason: '存在多个可匹配 EA，不自动归属' };
    }
    // MATCHED 仅表示来源候选匹配，不表示该 EA 虚拟仓位已确认。
    return { deal, status: 'MATCHED', eaInstanceId: candidates[0].eaInstanceId, reason: '来源 Magic/品种唯一匹配，尚未验证虚拟仓位' };
  });
}

@Injectable()
export class CopySignalPocService {
  constructor(private readonly metaapi: MetaApiReadService) {}

  async linkExecutions(accountId: string, from: string, to: string, events: EaExecutionEvent[]) {
    const start = new Date(from);
    const end = new Date(to);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw new BadRequestException('时间区间必须使用 ISO 8601 格式');
    }
    const deals = await this.metaapi.listDeals(accountId, start, end);
    return {
      accountId, totalDeals: deals.length,
      results: linkExecutionEvents(events, deals),
      warning: '精确关联仅为历史成交核验，未写入仓位账本，也未向 CopyFactory 发单',
    };
  }

  async getAccount(accountId: string) {
    return this.metaapi.getAccount(accountId);
  }

  async previewAttribution(
    accountId: string,
    from: string,
    to: string,
    rules: EaRule[],
  ) {
    const start = new Date(from);
    const end = new Date(to);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw new BadRequestException('from 和 to 必须是合法 ISO 8601 时间');
    }
    const deals = await this.metaapi.listDeals(accountId, start, end);
    return {
      accountId,
      from: start.toISOString(),
      to: end.toISOString(),
      total: deals.length,
      results: attributeDeals(deals, rules),
      warning: '仅供 Demo 归属预览，不会下单、写入虚拟仓位或发送 CopyFactory 信号',
    };
  }
}
