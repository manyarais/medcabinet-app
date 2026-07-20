"use client";

import { AddCalendarScheduleForm } from "@/components/AddCalendarScheduleForm";
import { PrescriptionCalendar } from "@/components/PrescriptionCalendar";
import { useState } from "react";

type Props = {
  initialDate: string;
};

/** Calendar grid + form to add OTC/reminder schedules. */
export function CalendarWorkspace({ initialDate }: Props) {
  const [reloadToken, setReloadToken] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <AddCalendarScheduleForm onSaved={() => setReloadToken((n) => n + 1)} />
      <PrescriptionCalendar initialDate={initialDate} reloadToken={reloadToken} />
    </div>
  );
}
