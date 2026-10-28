import { useMemo } from "react";
import ChartLegend from "./ChartLegend.jsx";

const CHART_COLORS = ["var(--color-indigo)", "#14B8A6", "#F87171"];
function StackedBarChart({ datasets, labels, width = 540, height = 230 }) {
  const padL = 40, padR = 24, padT = 16, padB = 44;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const columnTotals = labels.map((_, columnIndex) => datasets.reduce((sum, dataset) => sum + (dataset.data[columnIndex] || 0), 0));
  const maxVal = Math.max(...columnTotals, 1);
  const barW = Math.min(36, (chartW / Math.max(labels.length, 1)) * 0.55);
  const gap = chartW / Math.max(labels.length, 1);
  const yTicks = [0, 10, 20, 30, 40, 50].filter((tick) => tick <= maxVal + 5);
  const toY = (value) => padT + chartH - (value / maxVal) * chartH;
  const toH = (value) => (value / maxVal) * chartH;
  return (
    <div className="w-full! overflow-hidden! flex! justify-center!">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block! w-full! h-auto! max-h-[220px]! overflow-hidden!">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padL} y1={toY(tick)} x2={padL + chartW} y2={toY(tick)} stroke="var(--color-slate-200)" strokeWidth="1" />
            <text x={padL - 4} y={toY(tick) + 4} textAnchor="end" fontSize="10" fill="var(--color-slate-400)">{tick}</text>
          </g>
        ))}
        {labels.map((label, columnIndex) => {
          const centerX = padL + gap * columnIndex + gap / 2;
          let accumulated = 0;
          return (
            <g key={`${label}-${columnIndex}`}>
              {[...datasets].reverse().map((dataset, reverseIndex) => {
                const datasetIndex = datasets.length - 1 - reverseIndex;
                const value = dataset.data[columnIndex] || 0;
                const barHeight = toH(value);
                const barY = toY(accumulated + value);
                accumulated += value;
                return <rect key={`${dataset.label}-${datasetIndex}`} x={centerX - barW / 2} y={barY} width={barW} height={barHeight} fill={dataset.color} rx="2" />;
              })}
              <text x={centerX} y={height - 12} textAnchor="middle" fontSize="10" fill="var(--color-slate-400)" className="select-none!">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
export default function TeamWorkload({ projects = [] }) {
  const { labels, datasets } = useMemo(() => {
    const displayProjects = projects.slice(0, 3);
    const people = [...new Map(displayProjects.flatMap(project => project.members.filter(person => person.task_count > 0)).map(person => [person.id,person])).values()].slice(0,6);
    return { labels: people.map(person => person.name.split(' ')[0]), datasets: displayProjects.map((project,index) => ({
      label: project.project_name, color: CHART_COLORS[index % CHART_COLORS.length],
      data: people.map(person => project.members.find(member => member.id === person.id)?.task_count || 0),
    })) };
  }, [projects]);
  const legendItems = datasets.map(({ label, color }) => ({ label, color }));
  return (
    <section className={"dash-card" + " " + "p-[20px_20px_18px]! overflow-hidden! flex! flex-col!"} aria-label="Team Workload" >
      <div className="flex! items-center! justify-between! mb-[14px]! flex-wrap! gap-[8px]!">
        <span className="text-[14px]! font-semibold! [color:var(--color-slate-900)]!">Team Workload</span>
        <ChartLegend items={legendItems.length > 0 ? legendItems : [{ label: "No projects", color: "var(--color-slate-300)" }]} />
      </div>
      {datasets.length === 0 || labels.length === 0 ? (
        <div className="h-[190px]! flex! items-center! justify-center! [color:var(--color-slate-400)]! text-[13px]!">No task data yet</div>
      ) : (
        <StackedBarChart datasets={datasets} labels={labels} width={540} height={230} />
      )}
    </section>
  );
}
