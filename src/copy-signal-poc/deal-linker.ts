import { BrokerDealView } from './metaapi-read.service';

export interface EaExecutionEvent {
  eventId: string;
  eaInstanceId: string;
  brokerOrderId?: string;
  brokerDealId?: string;
  magic: string;
  symbol: string;
}

export type LinkState = 'CONFIRMED' | 'AMBIGUOUS' | 'UNMATCHED' | 'CANDIDATE_ONLY';

export interface ExecutionLink {
  eventId: string;
  eaInstanceId: string;
  dealIds: string[];
  status: LinkState;
  reason: string;
}

/**
 * Broker 订单/成交 ID 精确关联；Magic 只能定位候选，不能证明净持仓的 EA 归属。
 * 同一订单允许产生多个部分成交；对同一成交存在竞争事件时拒绝自动确认。
 */
export function linkExecutionEvents(
  events: EaExecutionEvent[],
  deals: BrokerDealView[],
): ExecutionLink[] {
  const claims = new Map<string, number>();
  const preliminary = events.map((event) => {
    const hasReference = Boolean(event.brokerDealId || event.brokerOrderId);
    const matches = hasReference
      ? deals.filter((deal) =>
        (event.brokerDealId ? deal.id === event.brokerDealId : deal.orderId === event.brokerOrderId)
        && deal.symbol === event.symbol)
      : [];
    for (const deal of matches) claims.set(deal.id, (claims.get(deal.id) ?? 0) + 1);
    return { event, matches, hasReference };
  });
  return preliminary.map(({ event, matches, hasReference }) => {
    if (!hasReference) return {
      eventId: event.eventId,
      eaInstanceId: event.eaInstanceId,
      dealIds: [],
      status: 'CANDIDATE_ONLY' as const,
      reason: '缺少 Broker Order/Deal ID，不能确认关联',
    };
    if (!matches.length) return {
      eventId: event.eventId,
      eaInstanceId: event.eaInstanceId,
      dealIds: [],
      status: 'UNMATCHED' as const,
      reason: '指定订单或成交尚未出现，请稍后对账',
    };
    if (matches.some((deal) => (claims.get(deal.id) ?? 0) > 1)) return {
      eventId: event.eventId,
      eaInstanceId: event.eaInstanceId,
      dealIds: matches.map((deal) => deal.id),
      status: 'AMBIGUOUS' as const,
      reason: '多个 EA 事件竞争同一 Broker 成交',
    };
    if (matches.some((deal) => deal.magic !== event.magic)) return {
      eventId: event.eventId,
      eaInstanceId: event.eaInstanceId,
      dealIds: matches.map((deal) => deal.id),
      status: 'AMBIGUOUS' as const,
      reason: 'Broker 成交 Magic 与 EA 事件不一致，等待人工核验',
    };
    return {
      eventId: event.eventId,
      eaInstanceId: event.eaInstanceId,
      dealIds: matches.map((deal) => deal.id),
      status: 'CONFIRMED' as const,
      reason: 'Broker 成交 ID/订单 ID、品种与 Magic 均吻合；不代表已完成 Netting 虚拟仓位分配',
    };
  });
}
