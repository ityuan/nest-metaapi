# Phase 0：MT5 Netting → CopyFactory 外部信号可行性验证

## 一、验证目标

验证自主开发的 MQL5 EA 在 **MT5 Netting（净持仓）主账户**上产生的交易，经真实成交确认和 EA 级虚拟仓位转换后，能否通过 **CopyFactory External Signals（外部信号）**可靠复制到：

- MT4 Demo 跟单账户；
- MT5 Hedging Demo 跟单账户。

**本阶段只允许 Demo 测试。完整兼容性尚未得到验证。**

## 二、明确的架构边界

1. MT5 Netting 主账户只作为 EA 执行及 Broker 成交来源。
2. **不接入** MT5 Netting 主账户作为标准 CopyFactory Provider 的模式。
3. EA Bridge 负责 EA 身份、策略意图及运行状态。
4. MetaAPI 负责读取和核对真实订单、成交及账户持仓。
5. Netting 信号引擎维护每个 EA 独立的虚拟仓位，不能将账户净持仓直接归属于某个 EA。
6. CopyFactory External Signals 负责外部信号的提交及跟单；其具体交易语义必须通过测试确认。

## 三、验证步骤

1. 确认主账户为 MT5 Netting，检查跟单账户的平台、持仓模式和 CopyFactory 接入资格。
2. 定义 EA Bridge 的唯一实例 ID、事件 ID 和心跳协议。
3. 使用 MetaAPI 将 EA 交易意图与 Broker 真实成交关联。
4. 建立 EA 级虚拟仓位账本，验证一个主账户多个 EA 的隔离性。
5. 使用单一 Demo 策略验证外部信号的创建、更新及关闭。
6. 分别检查 MT4 与 MT5 Hedging 跟单端的开仓、加仓、部分减仓、全部平仓、反手。
7. 增加两个 EA 在同一品种执行相反方向交易的场景。
8. 验证事件去重、超时未知状态、Worker 重启恢复及远端对账。

## 四、必须通过的验收条件

- MT4 和 MT5 Hedging Demo 账户均可正确执行预期的跟单生命周期。
- Broker 成交、EA 虚拟仓位、外部信号与跟单结果分别记录且可核对。
- 重复消息或未知结果重试不会产生额外仓位。
- 同账户多 EA 使用相同品种时，信号归属明确，不发生静默混淆。
- 任何关键场景未通过，均不允许进入实盘验证，应重新评估信号设计或跟单执行方案。

## 五、后续开发安排

PoC 通过后，再冻结生产 Prisma Schema，依次完善 NestJS 账户模块、EA Bridge、Netting 信号引擎、CopyFactory 订阅管理、对账及 Web 后台。

> 本文档用于记录技术验证计划，不代表 CopyFactory 已承诺支持所有 Netting EA 交易语义。
