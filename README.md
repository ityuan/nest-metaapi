# nest-metaapi

基于 NestJS 的 MT5 EA 策略管理与 CopyFactory 跟单平台。

> **当前状态：项目初始化阶段。** CopyFactory 外部信号的完整跟单链路尚未通过 Demo 验证，本项目目前不支持实盘自动跟单。

## 一、项目范围

- **EA 信号源**：自主开发的 MQL5 EA，仅运行在 MT5 Netting（净持仓）主账户。
- **账户部署方式**：支持一个主账户运行多个 EA，以及每个 EA 使用独立主账户。
- **跟单账户**：MT4、MT5 Hedging（对冲持仓）。
- **跟单通道**：优先验证 CopyFactory External Signals（外部信号）接口。
- **明确排除**：MT5 Netting 主账户作为标准 CopyFactory Provider 的直接接入方式。
- **安全要求**：先使用 Demo 账户验证开仓、减仓、平仓、反手与异常恢复，未经验证不得用于实盘。

## 二、开发技术栈

| 项目 | 技术 |
| --- | --- |
| 开发环境 | macOS、Node.js 24 |
| 后端 | NestJS、TypeScript |
| 数据库 | PostgreSQL 17、Prisma 7 |
| 缓存与任务队列 | Redis、BullMQ（待接入） |
| 账户数据 | MetaAPI SDK（待接入） |
| 跟单服务 | CopyFactory External Signals（待验证） |
| EA 通信 | MQL5 EA Bridge（待开发） |

**本地开发不使用 Docker Compose**，PostgreSQL 与 Redis 使用 macOS 本机服务。

## 三、本地启动

```bash
# 克隆仓库并进入目录
git clone https://github.com/ityuan/nest-metaapi.git
cd nest-metaapi

# 安装依赖
corepack enable
pnpm install

# 创建本地配置，并填入 PostgreSQL 连接信息
cp .env.example .env

# 验证 Prisma 模型并生成客户端
pnpm prisma:validate
pnpm prisma:generate

# 编译并启动 API
pnpm build
pnpm start:dev
```

健康检查地址：`GET http://localhost:3000/api/v1/health`。

配置好 PostgreSQL 后，按需执行数据库迁移：

```bash
pnpm prisma:migrate
```

**注意**：目前只提交了最小 NestJS API 骨架和初步 Prisma 模型。MetaAPI 连接、EA Bridge、CopyFactory 适配器、Worker 及跟单执行能力尚未实现。

## 四、当前目录说明

- `src/`：NestJS API 入口与健康检查。
- `prisma/`：账户、EA、策略、订阅及信号的初步数据模型。
- `docs/`：PoC 验证方案和验收标准。
- `mql5/`：后续存放 EA Bridge 源码。

## 五、安全与保密

- 禁止将 `.env`、API Token、数据库密码、真实交易账户敏感信息提交到 GitHub。
- EA 的交易意图必须与 Broker 实际成交分离，并建立可追踪的确认关系。
- 对来源不明确或执行结果未知的信号，先对账再重试，避免重复跟单。
- 当前仓库可能是公开仓库，请在接入真实凭证前检查 GitHub 的访问权限。

详细技术验证计划见 [Phase 0：Netting 外部信号跟单验证](docs/phase-0-poc.md)。
