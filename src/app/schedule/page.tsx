import { Card, CardContent } from "@/components/ui/card";
import { CalendarSubscribeButtons } from "@/components/calendar-subscribe-buttons";

export default function SchedulePage() {
  const calendarId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID;

  const embedUrl = calendarId
    ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&mode=AGENDA&bgcolor=%23fff8ee`
    : null;

  const icalUrl = calendarId
    ? `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`
    : null;

  const googleSubscribeUrl = calendarId
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarId)}`
    : null;

  const outlookUrl = icalUrl
    ? `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icalUrl)}`
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">
          Upcoming events and challenge deadlines.
        </p>
      </div>

      {!calendarId ? (
        <p className="py-12 text-center text-muted-foreground">
          Calendar not configured. Set NEXT_PUBLIC_GOOGLE_CALENDAR_ID to enable.
        </p>
      ) : (
        <div className="space-y-6">
          <CalendarSubscribeButtons
            googleSubscribeUrl={googleSubscribeUrl!}
            icalUrl={icalUrl!}
            outlookUrl={outlookUrl!}
          />

          <Card>
            <CardContent className="p-0 overflow-hidden rounded-xl">
              <div className="aspect-[4/3] sm:aspect-[16/10]">
                <iframe
                  src={embedUrl!}
                  className="w-full h-full border-0"
                  title="Event Schedule"
                  loading="lazy"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
