# Final Android qualification

Use a dedicated, low-balance test wallet. Never paste its private key into a bug report. Keep the old mobile app and verified offline backup during migration.

Record phone model, Android version, Android System WebView version, APK SHA-256 and signing fingerprint. Test a compact Galaxy S8-class device and a large Galaxy S23+-class device. Run on both an older supported OS and a current one if available.

1. Install signed APK; verify app name/logo, keyboard resize, navigation bars, scrolling, all buttons and both themes. Rotate the phone; ensure it locks instead of exposing a key. Confirm system back, relaunch and theme persistence.
2. Create a disposable wallet; back it up and compare the complete address after import. Confirm wrong-password handling, wallet switching, key export expiry, app background lock and 5-minute idle lock. Confirm a wallet is not silently unlocked on return.
3. Compare native/token balances on both networks with the explorers. Test receive QR with another wallet. Add a known custom token and verify its metadata/decimals; remove it without affecting chain balances.
4. Receive a small RGN amount. Send a tiny amount back after checking the review screen. Compare recipient, amount, gas, chain ID, nonce, transaction hash and explorer receipt. Repeat a small BSC token send with sufficient BNB. Cancel a review and verify nothing is broadcast.
5. Interrupt networking immediately after submitting a small transaction. Relaunch and verify its exact persisted hash is reconciled. Do not repeat the send blindly. Verify pending, confirmed and reverted records.
6. With an account that already meets contract minimums, inspect staking position and rewards. Test claim, stake, unstake/cooldown and withdrawal when eligible. Contract minimums can be substantial; do not fund a large position just for an app test. Full withdrawal qualification can require the contract’s complete cooldown period.
7. Wrap/unwrap a tiny RGN amount. Test a small router swap with a liquid pair, exact approval, minimum output, slippage and high-price-impact warning. Cancel an approval/swap independently. Verify the wallet does not submit a later step after background locking.
8. Test each bridge direction with a tiny amount and available capacity. Record source and destination hashes. Verify recipient, amount and source hash correlation. Interrupt/relaunch while pending; confirm delivery is not fabricated. Verify explicit incoming unwrap and that a timeout never advises rebroadcast as if funds had returned.
9. Verify an external explorer/Deepwater link opens in the browser and return requires unlocking. Verify screenshots are blocked on Android. Confirm the private signing key and wallet data are absent from public source archives.

Attach only public transaction hashes and sanitized observations to validation results. Funded transactions and account import on your real device are performed by the wallet owner; no seed/key/password should be sent to the development chat.
