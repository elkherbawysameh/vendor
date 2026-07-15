import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, HelpCircle, MessageSquare, AlertTriangle } from "lucide-react";
import { getMagicAction, confirmMagicAction, MagicActionPreview } from "@/lib/notifications";

const ACTION_META: Record<MagicActionPreview["action"], { label: string; icon: typeof CheckCircle2; noteLabel: string; noteRequired: boolean }> = {
  approve: { label: "Approve Request", icon: CheckCircle2, noteLabel: "Note (optional)", noteRequired: false },
  reject: { label: "Reject Request", icon: XCircle, noteLabel: "Reason (optional)", noteRequired: false },
  clarify: { label: "Request Clarification", icon: HelpCircle, noteLabel: "What needs clarification? (optional)", noteRequired: false },
  respond: { label: "Respond to Clarification", icon: MessageSquare, noteLabel: "Your answer", noteRequired: true },
};

export default function MagicActionPage() {
  const params = useParams();
  const token = params.token || "";

  const [preview, setPreview] = useState<MagicActionPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    getMagicAction(token)
      .then(setPreview)
      .catch(() => setLoadError("This link is invalid, expired, or has already been used."));
  }, [token]);

  const handleConfirm = async () => {
    if (!preview) return;
    const meta = ACTION_META[preview.action];
    if (meta.noteRequired && !note.trim()) return;

    setConfirming(true);
    setConfirmError(null);
    try {
      await confirmMagicAction(token, note.trim() || undefined);
      setDone(true);
    } catch (error) {
      setConfirmError("This action couldn't be completed -- the request may have already moved on.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vendor Purchase Tracker</CardTitle>
          <CardDescription>Confirm an action from your email notification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError && (
            <div className="flex items-start gap-3 text-sm text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{loadError}</p>
            </div>
          )}

          {!loadError && !preview && <p className="text-sm text-muted-foreground">Loading...</p>}

          {preview && !done && (
            <>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{preview.type === "refund" ? "Refund Request" : "Purchase Request"}</p>
                <p className="font-semibold">{preview.requestNumber}</p>
                <p className="text-sm">{preview.itemDescription}</p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="font-medium flex items-center gap-2">
                  {(() => {
                    const Icon = ACTION_META[preview.action].icon;
                    return <Icon className="w-4 h-4" />;
                  })()}
                  {ACTION_META[preview.action].label}
                </p>

                <div className="space-y-1.5">
                  <Label>{ACTION_META[preview.action].noteLabel}</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="h-24" />
                </div>

                {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}

                <Button
                  className="w-full"
                  onClick={handleConfirm}
                  disabled={confirming || (ACTION_META[preview.action].noteRequired && !note.trim())}
                >
                  {confirming ? "Submitting..." : "Confirm"}
                </Button>
              </div>
            </>
          )}

          {done && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
              <p className="font-medium">Done -- your response was recorded.</p>
            </div>
          )}

          <div className="border-t pt-4 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Or log into the system directly
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
