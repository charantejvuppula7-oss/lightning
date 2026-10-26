import { useMemo } from "react";
import ChartLegend from "./ChartLegend.jsx";

const CHART_COLORS = ["var(--color-indigo)", "#14B8A6", "#F87171"];

function LineChart({ datasets, labels, width = 540, height = 230 }) {
  const padL = 54, padR = 48, padT = 16, padB = 44;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const allValues = datasets.flatMap((dataset) => dataset.data);
  const maxVal = Math.max(...allValues, 1);
  const range = maxVal || 1;
  const toX = (index) => padL + (index / Math.max(labels.length - 1, 1)) * chartW;
  const toY = (value) => padT + chartH - (value / range) * chartH;
  const yTicks = [0, 20, 40, 60, 80, 100].filter((tick) => tick <= maxVal + 5);

  return (
    <div style={{ width: "100%", overflow: "hidden", display: "flex", justifyContent: "center" }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block", width: "100%", height: "auto", maxHeight: "220px", overflow: "hidden" }}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padL} y1={toY(tick)} x2={padL + chartW} y2={toY(tick)} stroke="var(--color-slate-200)" strokeWidth="1" />
            <text x={padL - 6} y={toY(tick) + 4} textAnchor="end" fontSize="10" fill="var(--color-slate-400)">{tick}%</text>
          </g>
        ))}
        {labels.map((label, index) => (
          <text key={`${label}-${index}`} x={toX(index)} y={height - 12} textAnchor="middle" fontSize="10" fill="var(--color-slate-400)" style={{ userSelect: "none" }}>
            {label}
          </text>
        ))}
        {datasets.map((dataset, datasetIndex) => {
          const points = dataset.data.map((value, index) => `${toX(index)},${toY(value)}`).join(" ");
          return (
            <g key={`${dataset.label}-${datasetIndex}`}>
              <polyline points={points} fill="none" stroke={dataset.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {dataset.data.map((value, index) => (
                <circle key={index} cx={toX(index)} cy={toY(value)} r="3.5" fill="var(--color-white)" stroke={dataset.color} strokeWidth="2" />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ProjectStatus({ projects = [] }) {
  const { labels, datasets } = useMemo(() => {
    const displayProjects = projects.slice(0, 3);
    const sprintNumbers = [...new Set(displayProjects.flatMap(project => project.sprints.map(sprint => sprint.number)))].sort((a,b) => a-b).slice(0,6);
    const numbers = sprintNumbers.length ? sprintNumbers : [1,2,3,4,5,6];
    return { labels: numbers.map(number => `Sprint ${number}`), datasets: displayProjects.map((project,index) => ({
      label: project.project_name, color: CHART_COLORS[index % CHART_COLORS.length],
      data: numbers.map(number => {
        const sprint = project.sprints.find(sprint => sprint.number === number);
        return sprint?.task_count ? Math.round(sprint.completed / sprint.task_count * 100) : 0;
      }),
    })) };
  }, [projects]);

  const legendItems = datasets.map(({ label, color }) => ({ label, color }));

  return (
    <section className="dash-card" aria-label="Project Status" style={{ padding: "20px 20px 18px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-slate-900)" }}>Project Status</span>
        <ChartLegend items={legendItems.length > 0 ? legendItems : [{ label: "No projects", color: "var(--color-slate-300)" }]} />
      </div>
      {datasets.length === 0 ? (
        <div style={{ height: "190px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-slate-400)", fontSize: "13px" }}>No sprint data yet</div>
      ) : (
        <LineChart datasets={datasets} labels={labels} width={540} height={230} />
      )}
    </section>
  );
}
