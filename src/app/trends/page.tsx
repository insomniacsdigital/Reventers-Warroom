import { PageHeader, Card, CardHead } from "@/components/ui";
import { OutputTrendChart, CohortCompletionTrendChart, AttendanceTrendChart } from "@/components/TrendCharts";
import { getTrendsData } from "@/lib/queries";

export default async function TrendsPage() {
  const { rotationTrend, attendanceTrend, cohortCodes } = await getTrendsData();

  return (
    <div>
      <PageHeader title="Trends" subtitle="Historical, month-over-month views — a new rotation cycle each month is what makes this possible" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHead title="Output vs. target" subtitle="Sum of achieved ÷ sum of target across all IPs and weeks, per month" />
          <div className="p-4">
            <OutputTrendChart data={rotationTrend} />
          </div>
        </Card>
        <Card>
          <CardHead title="Attendance — absence rate" subtitle="Absent markings ÷ total markings across the whole roster, per month" />
          <div className="p-4">
            <AttendanceTrendChart data={attendanceTrend} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Cohort completion rate" subtitle="Per-cohort Done+Partial completion of its assigned IP-weeks, per month" />
        <div className="p-4">
          <CohortCompletionTrendChart data={rotationTrend} cohortCodes={cohortCodes} />
        </div>
      </Card>
    </div>
  );
}
