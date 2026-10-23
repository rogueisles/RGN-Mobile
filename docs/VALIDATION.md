# Validation scope — Rogue Wallet 3.0.0

Status: **signed release candidate for device testing**. This document distinguishes completed checks from outstanding qualification.

## Completed

- Local Android release APK and App Bundle compilation with JDK 17, Gradle 8.9, AGP 8.7.3, Android platform 35 and build-tools 35.0.0. No GitHub build is required to install the supplied APK.
- APK v2 signature verified with Android `apksigner`. New public certificate SHA-256: `377f0cc497bce40a68c2bf998add21dc9baaec3bf3df88c52f54329fee6f6626`.
- Verified application ID `com.rogueisles.wallet`, version 3.0.0, min API 24, target API 35, non-debuggable release, INTERNET as the only requested permission, and no ABI-specific native libraries.
- Every packaged APK and AAB asset hash matches the corresponding source file. The private release signing key is outside the repository/public package.
- Android lint: **0 errors, 1 warning**. The remaining warning notes the necessary JavaScript-enabled WebView. Its exposure is constrained by local packaged resources, CSP, blocked external content, restricted native RPC and external-browser navigation. It is not suppressed as if it were irrelevant.
- **14 automated tests passed**: decimal precision, recipient/slippage validation, ABI parsing, actual-RPC chain-ID verification, encrypted keystore recovery/tamper/wrong-password behavior, legacy PBKDF2 compatibility, bridge event correlation, safe metadata rendering, mandatory signing review, cancellation/background locking, insufficient-gas and wrong-chain blocking, uncertain broadcasts, pending confirmations and reverted execution.
- Read-only checks reached RGN chain 70088 and BSC chain 56. Existing staking, wrapped token, router, bridge and BSC token bytecode was present. Staking pool stats, minimums, cooldown and bridge capacity view calls returned valid results. Exact time/blocks/results are in the supplied `NETWORK-READ-CHECK.json`; they are snapshots, not ongoing monitoring or a relayer availability guarantee.
- Browser UI review of isolated keyless fixtures at 360px and 412px widths: dashboard, light/dark themes, fixed bottom navigation, swap controls, both bridge directions/capacity, live staking reads, receive QR and current endpoint links. No private user wallet was imported, no transaction was signed/broadcast, and these preview fixtures are absent from the APK/source release.

## Not completed / not claimed

- Installation and runtime testing on an actual Galaxy S8, Galaxy S23+ or an Android emulator.
- A funded send, staking write, approval/router swap, bridge settlement, or incoming unwrap through this new APK. Contract read calls and mocked signing/recovery tests do not substitute for these checks.
- Google Play submission/approval, independent security audit or iOS build.
- Compatibility with every Android vendor firmware or the original factory version of an old WebView.

Use `docs/DEVICE-CHECKLIST.md` to finish device and small-value testing. Preserve the old wallet app and offline key backup during migration. Publish initially as a **pre-release** until this qualification is recorded; increment versionCode for any later signed update.
