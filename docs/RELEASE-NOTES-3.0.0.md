# Rogue Wallet v3.0.0 — Your keys. Your horizon.

Rogue Wallet brings the existing OGG Mobile wallet into the Rogue Network ecosystem, with a complete mobile interface redesign and current RGN endpoints.

## What changed

- New Rogue Wallet name, Rogue logo, ivory/navy/teal/gold design, persistent bottom navigation and light/dark appearance.
- RGN RPC: https://rpc.rogueisles.com · Explorer: https://scan.rogueisles.com · Deepwater: https://swap.rogueisles.com
- Existing wallet, multiple-account, custom token, sending, staking, wrapping, swapping and BSC bridge workflows retained and rebuilt.
- RGN/wRGN display labels; existing BSC token clearly marked **RGN (Legacy OGG)**. Deployed contracts and balances are unchanged.
- Tribe Pool and governance removed. No Solana/SPL transfer option is enabled.
- Signing code bundled locally; async restricted native RPC; per-transaction review including chain, full recipient and maximum gas fee; lock on background and inactivity.
- Restart-persistent transaction records; uncertain broadcasts are tracked by signed hash and never automatically retried.
- Bridge settlement checks match the exact source hash, recipient and amount, with three destination confirmations. Delayed settlement remains pending. Incoming unwrap requires explicit review.
- Old fixed APR assumption removed. Staking stats/minimums/cooldown are read from the deployed contract.

## Important migration information

This app uses a **new application ID (`com.rogueisles.wallet`) and signing key**. It installs separately from OGG Mobile. Back up your existing key, import it privately, and verify the full public address before removing the old app. There is no automatic access to the old app’s stored wallets. No token migration or chain reset is required.

## Downloads

- `Rogue-Wallet-3.0.0-android.apk` — directly installable, signed Android APK.
- `Rogue-Wallet-3.0.0-android.aab` — signed Android App Bundle for a future store submission, not direct installation.
- `Rogue-Wallet-3.0.0-source.zip` — public source, build wrapper, tests, README and licenses; no signing secrets.
- `SHA256SUMS` — asset checksums.
- `SIGNING-CERTIFICATE.txt` — public signing certificate fingerprint for this app’s future updates.

Android 7.0+ with an updated Android System WebView/Chrome. Universal managed-code APK, with layouts reviewed at compact and larger phone widths. Physical Galaxy S8/S23+ behavior and funded transaction flows still require final device qualification. See `docs/VALIDATION.md` for the precise test scope; do not label unperformed live tests as passed.

**Publication status: release candidate pending physical-device and small-value live transaction qualification.** The installable build is prepared; public release publication is a separate step. Neither an independent security audit nor guaranteed bridge delivery is claimed.
