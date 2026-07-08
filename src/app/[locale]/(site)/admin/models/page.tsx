import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { llmModelAttempts } from "@/drizzle/schema";
import { sql } from "drizzle-orm";

const ADMIN_EMAIL = "satoricanton@gmail.com";
const WINDOW_DAYS = 30;

async function getModelStats() {
  return db
    .select({
      model: llmModelAttempts.model,
      total: sql<number>`count(*)::int`,
      successes: sql<number>`count(*) filter (where ${llmModelAttempts.success})::int`,
      avgLatencyMs: sql<number>`round(avg(${llmModelAttempts.latencyMs}) filter (where ${llmModelAttempts.success}))::int`,
      lastAttemptAt: sql<string>`max(${llmModelAttempts.createdAt})`,
      lastError: sql<string | null>`(array_agg(${llmModelAttempts.errorMessage} order by ${llmModelAttempts.createdAt} desc) filter (where ${llmModelAttempts.errorMessage} is not null))[1]`,
    })
    .from(llmModelAttempts)
    .where(sql`${llmModelAttempts.createdAt} > now() - (${WINDOW_DAYS} || ' days')::interval`)
    .groupBy(llmModelAttempts.model)
    .orderBy(sql`count(*) filter (where ${llmModelAttempts.success})::float / count(*)::float DESC`);
}

type ModelStat = Awaited<ReturnType<typeof getModelStats>>[number];

function successRate(stat: ModelStat): number {
  return stat.total > 0 ? (stat.successes / stat.total) * 100 : 0;
}

function StatusColor(rate: number): string {
  if (rate >= 80) return "text-emerald-400";
  if (rate >= 50) return "text-amber-400";
  return "text-red-400";
}

function BarColor(rate: number): string {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default async function AdminModelsPage() {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const stats = await getModelStats();

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-2">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-white">Model Reliability</h1>
          <p className="text-stone-400 text-sm mt-1">
            Success rate per OpenRouter model, last {WINDOW_DAYS} days
          </p>
        </div>

        {stats.length === 0 ? (
          <div className="text-stone-500 text-sm py-16 text-center">
            No model attempts logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-700 text-left">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Model
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Success Rate
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500 text-center">
                    Attempts
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500 text-center">
                    Avg Latency
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Last Attempt
                  </th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Last Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => {
                  const rate = successRate(stat);
                  return (
                    <tr key={stat.model} className="border-b border-stone-800">
                      <td className="py-3 pr-4">
                        <span className="text-white text-sm font-medium">{stat.model}</span>
                      </td>
                      <td className="py-3 pr-4 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-stone-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${BarColor(rate)}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums ${StatusColor(rate)}`}>
                            {rate.toFixed(0)}%
                          </span>
                        </div>
                        <span className="text-xs text-stone-500">
                          {stat.successes}/{stat.total} succeeded
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center text-sm text-stone-300 tabular-nums">
                        {stat.total}
                      </td>
                      <td className="py-3 pr-4 text-center text-sm text-stone-300 tabular-nums">
                        {stat.avgLatencyMs ? `${stat.avgLatencyMs}ms` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-xs text-stone-400">
                        {new Date(stat.lastAttemptAt).toLocaleString()}
                      </td>
                      <td className="py-3 text-xs text-stone-500 max-w-xs">
                        {stat.lastError ? (
                          <span className="line-clamp-2" title={stat.lastError}>
                            {stat.lastError}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
