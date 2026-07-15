import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendNotificationEmail } from "@/lib/notifications";
import { Mail } from "lucide-react";

export function SendNotificationButton({ requestId }: { requestId: number }) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleClick = async () => {
    setIsSending(true);
    try {
      const result = await sendNotificationEmail(requestId);
      toast({ title: "Email sent", description: `Notified: ${result.to}` });
    } catch (error) {
      toast({
        title: "Couldn't send the notification email",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={isSending}>
      <Mail className="w-4 h-4 mr-2" />
      {isSending ? "Sending..." : "Resend Notification Email"}
    </Button>
  );
}
