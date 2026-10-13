// This bridge reports only local installation/link state to Atlas's own dashboard.
// It is never used to authorize API requests or to expose a wallet address.
window.addEventListener("atlas-sentinel-status-request", (event) => {
  const { requestId, walletAddress } = event.detail ?? {};
  if (typeof requestId !== "string" || typeof walletAddress !== "string") return;
  chrome.storage.local.get(["linkedWallet", "enabled"]).then((stored) => {
    window.dispatchEvent(new CustomEvent("atlas-sentinel-status-response", {
      detail: {
        source: "portaldot-atlas-sentinel",
        requestId,
        linkedToWallet: Boolean(stored.linkedWallet && stored.linkedWallet === walletAddress),
        enabled: Boolean(stored.enabled),
        version: chrome.runtime.getManifest().version,
      },
    }));
  });
});
