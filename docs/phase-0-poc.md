# Phase 0: MT5 Netting to CopyFactory External Signals

**Only demo accounts. External Signals compatibility has not yet been verified.**

1. Source account: MT5 Netting, with a custom MQL5 EA.
2. Followers: MT4 and MT5 Hedging.
3. Verify each EA intent against actual broker deals using MetaAPI.
4. Maintain per-EA virtual position ledgers; never infer an EA position solely from the account net position.
5. Validate external signal lifecycle (open, add, partial close, full close, reverse).
6. Validate magic-number isolation with multiple EAs on the same symbol.
7. Check duplicate delivery, timeout ambiguity, restart recovery, and subscriber reconciliation.
8. No live trading until all safety gates pass.

Standard CopyFactory Provider mode with an MT5 Netting source is **out of scope**.
