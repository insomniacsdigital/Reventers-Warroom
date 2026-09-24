import { PageHeader, Card, CardHead } from "@/components/ui";
import { OutputTrendChart, CohortCompletionTrendChart, AttendanceTrendChart } from "@/components/TrendCharts";
import { getTrendsData } from "@/lib/queries";

export default async function TrendsPage() {
  const { rotationTrend, attendanceTrend, cohortCodes } = await getTrendsData();

  return (
    <div>
      <PageHeader title="Trends" subtitle="Month-over-month views built from the Brand × IP Matrix and attendance" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHead title="Output vs. target" subtitle="Matrix achieved ÷ matrix target across all brands and IPs, per month" />
          <div className="p-4">
            <OutputTrendChart data={rotationTrend} />
          </div>
        </Card>
        <Card>
          <CardHead title="Attendance — absence rate" subtitle="Average absence rate across the team, per month" />
          <div className="p-4">
            <AttendanceTrendChart data={attendanceTrend} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Cohort completion rate" subtitle="Each cohort's achieved ÷ target in the matrix, per month" />
        <div className="p-4">
          <CohortCompletionTrendChart data={rotationTrend} cohortCodes={cohortCodes} />
        </div>
      </Card>
    </div>
  );
}
