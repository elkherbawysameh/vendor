import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getNotificationEmail, openMailto } from "@/lib/notifications";
import { Mail } from "lucide-react";

export function SendNotificationButton({ requestId }: { requestId: number }) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleClick = async () => {
    setIsSending(true);
    try {
      const email = await getNotificationEmail(requestId);
      openMailto(email);
    } catch (error) {
      toast({
        title: "Couldn't prepare the notification email",
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
      {isSending ? "Preparing..." : "Send Email Notification"}
    </Button>
  );
}
