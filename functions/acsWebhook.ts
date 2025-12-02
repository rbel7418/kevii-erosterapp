import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

// Optional: set ACS_WEBHOOK_SECRET in env and forward it in ACS to harden this endpoint.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const secret = Deno.env.get("ACS_WEBHOOK_SECRET");
    if (secret) {
      const header = req.headers.get("x-webhook-secret") || req.headers.get("x-acs-secret");
      if (header !== secret) {
        return new Response("Forbidden", { status: 403 });
      }
    }
    const payload = await req.json().catch(() => ({}));
    const events = Array.isArray(payload) ? payload : [payload];

    for (const e of events) {
      const deliveryStatus = String(e?.deliveryStatus || "").toLowerCase();
      const status =
        deliveryStatus.includes("deliver") ? "delivered" :
        deliveryStatus.includes("sent") ? "sent" :
        deliveryStatus.includes("read") ? "read" :
        (deliveryStatus.includes("fail") || deliveryStatus.includes("undeliver")) ? "failed" :
        "unknown";

      await base44.asServiceRole.entities.DeliveryEvent.create({
        provider: "acs",
        provider_message_id: e?.messageId || "",
        to_number: e?.to || "",
        status,
        raw: e || {},
        received_at: e?.receivedTimestamp || new Date().toISOString()
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(error.message || String(error), { status: 500 });
  }
});