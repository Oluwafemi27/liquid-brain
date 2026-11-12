import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

/** Where an app's sign-in page sends the popup when it finishes. Tells the ADUF window and closes itself;
 *  if it wasn't opened as a popup it sends the person on to the Connectors page. */
export const Route = createFileRoute("/connector-done")({
  head: () => ({
    meta: [{ title: "Connected · ADUF AI" }, { name: "robots", content: "noindex" }],
  }),
  component: ConnectorDone,
});

function ConnectorDone() {
  const [popup, setPopup] = useState(true);
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("connected") ?? "";
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: "aduf-connector", id: slug }, window.location.origin);
      const t = setTimeout(() => window.close(), 700);
      return () => clearTimeout(t);
    }
    setPopup(false);
    window.location.replace(`/connectors?connected=${encodeURIComponent(slug)}`);
    return undefined;
  }, []);
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6 text-center text-foreground">
      <div className="space-y-2">
        <CheckCircle2 className="mx-auto h-9 w-9 text-cyan" />
        <p className="text-base font-medium">Connected</p>
        <p className="text-sm text-muted-foreground">
          {popup ? "You can close this window and go back to ADUF." : "Taking you back to ADUF…"}
        </p>
      </div>
    </main>
  );
}
