# CopySignalPoCModule：账户读取与成交归属预览

## 范围

当前提供 **MetaAPI 只读账户查询** 与 **Broker 成交归属预览**，不发送 CopyFactory 信号、不下单、不更新净持仓账本。Netting 环境下，成交 Magic 只能作为 EA 来源候选证据，不能证明策略虚拟仓位已经正确分配。

## 环境变量

在 `.env` 中填写：

```dotenv
METAAPI_TOKEN=你的MetaAPI访问令牌
POC_ADMIN_KEY=至少32位随机字符串且不同于MetaAPI令牌
```

仅在本机和 Demo 环境测试。不要向前端暴露这两个密钥。

## API

### 查询账户

```bash
curl -H "x-poc-admin-key: $POC_ADMIN_KEY" \
  http://127.0.0.1:3000/api/v1/poc/accounts/你的MetaAPI账户ID
```

### 预览归属（只读）

```bash
curl -X POST \
  -H "x-poc-admin-key: $POC_ADMIN_KEY" \
  -H 'content-type: application/json' \
  http://127.0.0.1:3000/api/v1/poc/accounts/你的MetaAPI账户ID/attribution-preview \
  -d '{
    "from": "2026-10-18T00:00:00Z",
    "to": "2026-10-18T01:00:00Z",
    "rules": [
      {"eaInstanceId": "ea-gold-a", "magic": "1001", "symbols": ["XAUUSD"]},
      {"eaInstanceId": "ea-trend-a", "magic": "1002"}
    ]
  }'
```

返回 `MATCHED`、`AMBIGUOUS` 或 `UNATTRIBUTED`。**MATCHED 只表示 Magic + Symbol 唯一匹配，不是完整的 Netting 成交归属确认。**

## 后续实施条件

接下来需增加 EA Bridge 事件、Broker Deal 持久化、Broker Order ID/Deal ID 的精确关联、重复事件幂等存储与 Netting 虚拟仓位算法。只有确认这些行为后，才进入 CopyFactory External Signals Demo 验证。


### Broker 成交与 EA 事件精确关联

请求 `POST /api/v1/poc/accounts/:accountId/link-executions`，HTTP Header 同样使用 `x-poc-admin-key`。

```json
{
  "from": "2026-10-18T00:00:00Z",
  "to": "2026-10-18T01:00:00Z",
  "events": [
    {
      "eventId": "ea-1001-req-001",
      "eaInstanceId": "ea-gold-a",
      "brokerOrderId": "46201068",
      "magic": "1001",
      "symbol": "XAUUSD"
    }
  ]
}
```

关联结果为 `CONFIRMED`、`AMBIGUOUS`、`UNMATCHED` 或 `CANDIDATE_ONLY`。

- `CONFIRMED`：成交/订单 ID、品种、Magic 一致，且本批事件没有竞争关联。**仅表示来源关联，尚不代表虚拟仓位或真实跟单已完成。**
- `AMBIGUOUS`：存在竞争引用或 Magic 不一致，停止自动处理。
- `UNMATCHED`：Broker 还未返回所引用的成交，后续应重新对账。
- `CANDIDATE_ONLY`：没有 Broker ID，仅保留候选，不得推送 CopyFactory。

当前关联只在单次请求内检查竞争，不具备跨批次幂等持久化。后续必须用数据库对来源事件和 Broker Deal 建立唯一约束。
