# Activate real gold order-flow data

Provider: Databento, dataset `GLBX.MDP3`, schema `trades`.

The built-in HTTP adapter reads the latest available 15-minute historical window. These are real exchange trades, not a live stream. The UI shows the data timestamp and delay. A separate continuously running gateway is required for live streaming; the existing `GOLD_ORDERFLOW_URL` adapter can consume its normalized snapshots.

## Vercel environment variables

- `DATABENTO_API_KEY`: private Databento API key with access to GLBX.MDP3.
- `DATABENTO_GOLD_SYMBOL`: exact active GC or MGC contract from the provider's instrument list (such as GCZ6; choose the contract rather than copying this example blindly).
- Remove `GOLD_ORDERFLOW_URL` if using the built-in Databento adapter; an explicit gateway URL takes priority.

Configure variables for the Preview environment first, then redeploy the branch. Keep keys in Vercel environment variables, never in HTML, git, screenshots or chat.

Use the provider's account portal to verify your data entitlements and applicable usage/licensing charges before activating. No account, license, subscription or key is created by this integration.

## Validation

Open FW GOLD TERMINAL and click Update. Check the named contract, source, timestamp and delay. Delta is sum of trade sizes with aggressor B minus sum with aggressor A, following Databento's side convention. N is unclassified volume and contributes only to total volume. Bubbles represent interval volume above the selected threshold; they do not identify institutions.

Missing credentials, permissions, contract selection, trades or incomplete windows produce explicit errors, with empty charts. Each query is bounded to 15 minutes and fewer than 50,000 trades. A 60-second process cache reduces duplicate reads but does not guarantee a billing limit across serverless instances.

Documentation: https://databento.com/docs/api-reference-historical?historical=http
