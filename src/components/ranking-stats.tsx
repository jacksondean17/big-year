"use client";

import { getDisplayName } from "@/lib/types";
import { Avatar } from "./ui/avatar";
import { Trophy, Users, Target, TrendingUp } from "lucide-react";

interface JudgeData {
  user_id: string;
  count: number;
  profile: {
    display_name: string;
    guild_nickname?: string | null;
    avatar_url: string | null;
  };
}

interface ChallengeStatData {
  challenge_id: number;
  comparison_count: number;
  wins: number;
  losses: number;
}

interface StatsData {
  totalComparisons: number;
  uniqueJudges: number;
  topJudges: JudgeData[];
  challengeCoverage: {
    total: number;
    wellCovered: number;
    moderatelyCovered: number;
    poorlyCovered: number;
  };
  eloDistribution: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    range: number;
  };
  leastCompared: ChallengeStatData[];
}

interface Props {
  stats: StatsData;
}

export function RankingStats({ stats }: Props) {
  const coveragePercent = stats.challengeCoverage.total > 0
    ? (stats.challengeCoverage.wellCovered / stats.challengeCoverage.total) * 100
    : 0;

  const avgComparisonsPerJudge = stats.uniqueJudges > 0
    ? Math.round(stats.totalComparisons / stats.uniqueJudges)
    : 0;

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-6 h-6" />}
          label="Total Comparisons"
          value={stats.totalComparisons.toLocaleString()}
          color="text-primary"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Active Judges"
          value={stats.uniqueJudges.toString()}
          color="text-secondary"
        />
        <StatCard
          icon={<Trophy className="w-6 h-6" />}
          label="Avg per Judge"
          value={avgComparisonsPerJudge.toString()}
          color="text-primary"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Well Covered"
          value={`${coveragePercent.toFixed(0)}%`}
          color="text-green-600 dark:text-green-400"
        />
      </div>

      {/* Top Judges */}
      <div className="border rounded-lg p-6" data-slot="card">
        <h2 className="text-2xl font-bold mb-4">Top Contributors</h2>
        <div className="space-y-3">
          {stats.topJudges.map((judge, index) => (
            <div
              key={judge.user_id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="text-2xl font-bold text-muted-foreground w-8">
                {index + 1}
              </div>
              <Avatar
                src={judge.profile.avatar_url}
                alt={getDisplayName(judge.profile)}
                className="w-10 h-10"
              />
              <div className="flex-1">
                <div className="font-semibold">{getDisplayName(judge.profile)}</div>
                <div className="text-sm text-muted-foreground">
                  {judge.count} comparisons
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Elo Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coverage Distribution */}
        <div className="border rounded-lg p-6" data-slot="card">
          <h2 className="text-2xl font-bold mb-4">Challenge Coverage</h2>
          <div className="space-y-3">
            <CoverageBar
              label="Well covered (≥15 comps)"
              count={stats.challengeCoverage.wellCovered}
              total={stats.challengeCoverage.total}
              color="bg-green-500"
            />
            <CoverageBar
              label="Moderate (5-14 comps)"
              count={stats.challengeCoverage.moderatelyCovered}
              total={stats.challengeCoverage.total}
              color="bg-yellow-500"
            />
            <CoverageBar
              label="Low coverage (<5 comps)"
              count={stats.challengeCoverage.poorlyCovered}
              total={stats.challengeCoverage.total}
              color="bg-red-500"
            />
          </div>
        </div>

        {/* Elo Distribution */}
        <div className="border rounded-lg p-6" data-slot="card">
          <h2 className="text-2xl font-bold mb-4">Elo Distribution</h2>
          <div className="space-y-3">
            <StatRow label="Mean" value={stats.eloDistribution.mean.toString()} />
            <StatRow label="Std Dev" value={stats.eloDistribution.stdDev.toString()} />
            <StatRow label="Min" value={stats.eloDistribution.min.toString()} />
            <StatRow label="Max" value={stats.eloDistribution.max.toString()} />
            <StatRow label="Range" value={stats.eloDistribution.range.toString()} />
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {stats.eloDistribution.stdDev < 50 && "⚠️ Low variance - needs more comparisons"}
              {stats.eloDistribution.stdDev >= 50 && stats.eloDistribution.stdDev < 100 && "📊 Ratings are stabilizing"}
              {stats.eloDistribution.stdDev >= 100 && "✅ Good variance - rankings are differentiated"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="border rounded-lg p-6" data-slot="card">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function CoverageBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span>{label}</span>
        <span className="font-semibold">
          {count} / {total} ({percent.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
