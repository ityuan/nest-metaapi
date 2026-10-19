const test = require('node:test');
const assert = require('node:assert/strict');
const { linkExecutionEvents } = require('../dist/copy-signal-poc/deal-linker.js');

const deal = {
  id: '901', orderId: '701', positionId: '201',
  magic: '1001', symbol: 'XAUUSD', type: 'DEAL_TYPE_BUY',
  entryType: 'DEAL_ENTRY_IN', volume: '0.1',
  time: '2026-10-18T00:00:00.000Z',
};
const event = {
  eventId: 'evt-1', eaInstanceId: 'ea-1',
  brokerOrderId: '701', magic: '1001', symbol: 'XAUUSD',
};

test('Broker 订单号和 Magic 一致时确认来源关联', () => {
  const [linked] = linkExecutionEvents([event], [deal]);
  assert.equal(linked.status, 'CONFIRMED');
  assert.deepEqual(linked.dealIds, ['901']);
});

test('没有 Broker ID 时不能确认归属', () => {
  const [linked] = linkExecutionEvents([{ ...event, brokerOrderId: undefined }], [deal]);
  assert.equal(linked.status, 'CANDIDATE_ONLY');
});

test('两个事件指向同一成交时标记歧义', () => {
  const linked = linkExecutionEvents([event, { ...event, eventId: 'evt-2' }], [deal]);
  assert.ok(linked.every((item) => item.status === 'AMBIGUOUS'));
});

test('Magic 不一致时标记歧义', () => {
  const [linked] = linkExecutionEvents([{ ...event, magic: '1002' }], [deal]);
  assert.equal(linked.status, 'AMBIGUOUS');
});

test('成交尚未出现时标记未匹配', () => {
  const [linked] = linkExecutionEvents([event], []);
  assert.equal(linked.status, 'UNMATCHED');
});
