import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarSubscribeButtonsProps {
  googleSubscribeUrl: string;
  icalUrl: string;
  outlookUrl: string;
}

export function CalendarSubscribeButtons({
  googleSubscribeUrl,
  icalUrl,
  outlookUrl,
}: CalendarSubscribeButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="default" size="sm" asChild>
        <a href={googleSubscribeUrl} target="_blank" rel="noopener noreferrer">
          <CalendarPlus className="size-4" />
          Add to Google Calendar
        </a>
      </Button>

      <Button variant="outline" size="sm" asChild>
        <a href={icalUrl}>
          <Download className="size-4" />
          Apple / iCal
        </a>
      </Button>

      <Button variant="outline" size="sm" asChild>
        <a href={outlookUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-4" />
          Outlook
        </a>
      </Button>
    </div>
  );
}
