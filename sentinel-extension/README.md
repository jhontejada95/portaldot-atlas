# Atlas Sentinel browser extension

This is the participant-facing Atlas Sentinel extension. It is not a proxy,
VPN, bandwidth-sharing client, or browsing-data collector.

When a user explicitly enables it, the extension:

1. generates one device identity locally;
2. makes a short WebSocket RPC measurement against the official Portaldot
   endpoint while Chrome is running;
3. signs the exact observation with that device key; and
4. submits it to Atlas, which verifies the signature and network identity.

It uses Chrome alarms rather than pretending to run permanently in the
background. The popup lets the participant configure the backend and interval,
enable scheduled checks, trigger a real check now, and inspect the most recent
local acceptance receipt. The packaged default is the public Atlas API; a
participant can still choose a local backend for development. Load this folder
as an unpacked Manifest V3 extension when running a manual test.

The live backend rejects unknown sentinel identities, stale observations,
wrong-network data, and invalid device signatures before it adds anything to
the evidence feed.
