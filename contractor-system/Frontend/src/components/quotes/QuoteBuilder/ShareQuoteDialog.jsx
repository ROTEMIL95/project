import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Mail, Copy, Check, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ShareQuoteDialog = ({ open, onOpenChange, quoteId, quoteData }) => {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate quote URL - adjust based on your actual routing
  const quoteUrl = quoteId
    ? `${window.location.origin}/sent-quotes/${quoteId}`
    : window.location.origin;

  // Generate share message content
  const getShareMessage = () => {
    const projectName = quoteData?.projectName || 'פרויקט';
    const clientName = quoteData?.clientName || '';
    const finalAmount = quoteData?.finalAmount
      ? `₪${Number(quoteData.finalAmount).toLocaleString('he-IL')}`
      : '';

    let message = `הצעת מחיר - ${projectName}`;
    if (clientName) message += `\nלקוח: ${clientName}`;
    if (finalAmount) message += `\nסכום: ${finalAmount}`;
    message += `\n\nלצפייה בהצעה המלאה:\n${quoteUrl}`;

    return message;
  };

  // Handle WhatsApp sharing
  const handleWhatsAppShare = () => {
    const message = getShareMessage();
    const encodedMessage = encodeURIComponent(message);

    // Try mobile app first, fallback to web
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile
      ? `whatsapp://send?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    toast({
      title: "נפתח WhatsApp",
      description: "ההודעה מוכנה לשליחה",
    });
  };

  // Handle Email sharing
  const handleEmailShare = () => {
    const projectName = quoteData?.projectName || 'פרויקט';
    const message = getShareMessage();

    const subject = encodeURIComponent(`הצעת מחיר - ${projectName}`);
    const body = encodeURIComponent(message);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;

    toast({
      title: "נפתח לקוח המייל",
      description: "ההודעה מוכנה לשליחה",
    });
  };

  // Handle Copy Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(quoteUrl);
      setCopiedLink(true);

      toast({
        title: "הקישור הועתק",
        description: "הקישור להצעת המחיר הועתק ללוח",
      });

      setTimeout(() => setCopiedLink(false), 3000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא הצלחנו להעתיק את הקישור",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            שיתוף הצעת מחיר
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            בחר את הדרך המועדפת עליך לשתף את הצעת המחיר
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:gap-3 py-3 sm:py-4">
          {/* WhatsApp Button */}
          <Button
            onClick={handleWhatsAppShare}
            variant="outline"
            className="w-full justify-start gap-2 sm:gap-3 h-12 sm:h-14 text-sm sm:text-base hover:bg-green-50 hover:border-green-500"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm sm:text-base">שתף ב-WhatsApp</span>
              <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">שלח הודעה עם פרטי ההצעה</span>
            </div>
          </Button>

          {/* Email Button */}
          <Button
            onClick={handleEmailShare}
            variant="outline"
            className="w-full justify-start gap-2 sm:gap-3 h-12 sm:h-14 text-sm sm:text-base hover:bg-blue-50 hover:border-blue-500"
          >
            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm sm:text-base">שלח במייל</span>
              <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">פתח לקוח מייל עם פרטי ההצעה</span>
            </div>
          </Button>

          {/* Copy Link Button */}
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full justify-start gap-2 sm:gap-3 h-12 sm:h-14 text-sm sm:text-base hover:bg-gray-50 hover:border-gray-500"
          >
            {copiedLink ? (
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            )}
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm sm:text-base">
                {copiedLink ? 'הקישור הועתק!' : 'העתק קישור'}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">העתק קישור להצעת המחיר</span>
            </div>
          </Button>
        </div>

        <DialogFooter className="pt-2 sm:pt-3">
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full text-sm sm:text-base"
          >
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareQuoteDialog;
