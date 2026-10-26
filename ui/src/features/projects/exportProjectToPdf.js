

/**
 * Generates and directly downloads a PDF Project Report using an iframe-based
 * rendering approach with html2canvas + jsPDF.
 * This avoids the blank-PDF issue caused by html2canvas being unable to
 * render a full HTML document injected as innerHTML into a div.
 */
export async function exportProjectToPdf({
  project,
  toast,
  tasks = [],
  teamMembers = [],
  projectStatusLabel = "On Track",
}) {
  if (!project) {
    toast.error("No project available to export");
    return;
  }

  // Report data goes into an HTML document; keep user text as text.
  const escape = value => typeof value === 'string'
    ? value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
    : Array.isArray(value) ? value.map(escape)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,item]) => [key,escape(item)])) : value;
  project = escape(project);
  tasks = escape(tasks);
  teamMembers = escape(teamMembers);
  projectStatusLabel = escape(projectStatusLabel);
  // ─── Extract Project Fields ───────────────────────────────────────────────
  const projectName = project.Project_Name || project.name || "Untitled Project";
  const projectCode = project.Project_Code || project.project_code || "PRJ-001";
  const customer = project.Customer || project.customer || "General / Internal";
  const priority = project.Priority || project.priority || "Medium";
  const projectType = project.Project_Type || project.project_type || "—";
  const description = project.Description || project.description || "No project description provided.";
  const startDate = project.Start_Date || project.start_date || "Not set";
  const endDate = project.End_Date || project.end_date || "Not set";
  const totalTime = project.Total_Time_Taken || project.total_time_taken || "00:00:00";
  const totalSprints = project.Total_Sprints || "—";
  const completedSprints = project.Completed_Sprints || "0";
  const currentSprint = project.Current_Sprint || "—";
  const depts =
    Array.isArray(project.Departments) && project.Departments.length > 0
      ? project.Departments.join(", ")
      : "Standard Engineering";

  // ─── Task Stats ───────────────────────────────────────────────────────────
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => ["completed", "done"].includes((t.Status || t.status || "").toLowerCase())).length;
  const inProgressTasks = tasks.filter((t) => (t.Status || t.status || "").toLowerCase() === "in_progress").length;
  const pendingTasks = tasks.filter((t) => (t.Status || t.status || "").toLowerCase() === "pending").length;
  const blockedTasks = tasks.filter((t) => (t.Status || t.status || "").toLowerCase() === "blocked").length;
  const otherTasks = totalTasks - completedTasks - inProgressTasks - pendingTasks - blockedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ─── Status Badge Colors ──────────────────────────────────────────────────
  const STATUS_MAP = {
    "paused": { bg: "#FEF3C7", color: "#B45309", border: "#FDE68A" },
    "completed": { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
    "delayed": { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
    "critical": { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
    "on track": { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
    "active": { bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
    "ongoing": { bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
    "planning": { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" },
  };
  const sty = STATUS_MAP[projectStatusLabel.toLowerCase()] || STATUS_MAP["active"];

  // ─── Priority Badge Colors ────────────────────────────────────────────────
  const PRIO_MAP = {
    critical: { bg: "#FEE2E2", color: "#B91C1C" },
    high: { bg: "#FEE2E2", color: "#B91C1C" },
    medium: { bg: "#FEF3C7", color: "#B45309" },
    low: { bg: "#D1FAE5", color: "#065F46" },
  };
  const prio = PRIO_MAP[priority.toLowerCase()] || { bg: "#EFF6FF", color: "#1D4ED8" };

  const exportDate = new Date().toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  function taskBadge(status) {
    const s = (status || "").toLowerCase();
    let bg = "#EFF6FF", color = "#1D4ED8";
    if (s === "completed" || s === "done") { bg = "#D1FAE5"; color = "#065F46"; }
    else if (s === "pending") { bg = "#FEF3C7"; color = "#B45309"; }
    else if (s === "blocked") { bg = "#FEE2E2"; color = "#991B1B"; }
    const label = s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${bg};color:${color};font-size:10px;font-weight:700;">${label}</span>`;
  }

  function taskPrioBadge(pr) {
    const p = (pr || "medium").toLowerCase();
    const map = { critical: "#DC2626", high: "#DC2626", medium: "#D97706", low: "#059669" };
    const c = map[p] || "#475569";
    return `<span style="color:${c};font-weight:700;font-size:10px;text-transform:capitalize;">${p}</span>`;
  }

  const avatarColors = ["#0055FE", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2"];
  const teamRows = teamMembers.length === 0
    ? `<tr><td colspan="3" style="padding:16px;text-align:center;color:#94A3B8;font-style:italic;">No team members assigned yet.</td></tr>`
    : teamMembers.map((m, idx) => {
      const initials = (m.name || "U").trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      const av = avatarColors[idx % avatarColors.length];
      return `<tr style="border-bottom:1px solid #F1F5F9;${idx % 2 === 1 ? "background:#FAFAFA;" : ""}">
          <td style="padding:9px 12px;">
            <div style="display:flex;align-items:center;gap:9px;">
              <div style="width:30px;height:30px;border-radius:50%;background:${av};color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</div>
              <span style="font-size:12px;font-weight:600;color:#0F172A;">${m.name || "Member"}</span>
            </div>
          </td>
          <td style="padding:9px 12px;font-size:12px;color:#475569;">${m.role || "Contributor"}</td>
          <td style="padding:9px 12px;font-size:12px;color:#0F172A;font-weight:600;">${m.taskCount != null ? m.taskCount : "—"} tasks</td>
        </tr>`;
    }).join("");

  const milestonesSection = Array.isArray(project.Milestones) && project.Milestones.length > 0
    ? `<div class="section">
        <h2 class="section-title">Project Milestones</h2>
        <table class="data-table"><thead><tr><th style="width:5%;">#</th><th style="width:30%;">Milestone</th><th style="width:40%;">Description</th><th style="width:25%;">Target Date</th></tr></thead>
        <tbody>${project.Milestones.map((ms, idx) => `<tr style="${idx % 2 === 1 ? "background:#FAFAFA;" : ""}"><td style="padding:8px 12px;color:#94A3B8;font-weight:600;">${idx + 1}</td><td style="padding:8px 12px;font-weight:700;color:#0F172A;">${ms.name || ms.Title || ms.Milestone_Name || "Milestone " + (idx + 1)}</td><td style="padding:8px 12px;color:#64748B;">${ms.description || ms.Description || "—"}</td><td style="padding:8px 12px;color:#0F172A;font-weight:500;">${ms.date || ms.Date || ms.target_date || "—"}</td></tr>`).join("")}
        </tbody></table>
      </div>` : "";

  const sprintsSection = Array.isArray(project.Sprints) && project.Sprints.length > 0
    ? `<div class="section">
        <h2 class="section-title">Sprints Overview</h2>
        <table class="data-table"><thead><tr><th>Sprint</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
        <tbody>${project.Sprints.map((sp, idx) => {
      const ss = (sp.Status || sp.status || "ongoing").toLowerCase();
      let spBg = "#EFF6FF", spColor = "#1D4ED8";
      if (ss === "completed" || ss === "done") { spBg = "#D1FAE5"; spColor = "#065F46"; }
      else if (ss === "delayed") { spBg = "#FEE2E2"; spColor = "#991B1B"; }
      return `<tr style="${idx % 2 === 1 ? "background:#FAFAFA;" : ""}"><td style="padding:8px 12px;font-weight:700;color:#0F172A;">${sp.Sprint_Name || sp.name || "Sprint " + (idx + 1)}</td><td style="padding:8px 12px;color:#64748B;">${sp.Start_Date || sp.start_date || "—"}</td><td style="padding:8px 12px;color:#64748B;">${sp.End_Date || sp.end_date || "—"}</td><td style="padding:8px 12px;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${spBg};color:${spColor};font-size:10px;font-weight:700;">${ss.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span></td></tr>`;
    }).join("")}
        </tbody></table>
      </div>` : "";

  const tasksRows = tasks.length === 0
    ? `<tr><td colspan="5" style="padding:20px;text-align:center;color:#94A3B8;font-style:italic;">No tasks created for this project yet.</td></tr>`
    : tasks.map((task, idx) => {
      const tStatus = task.Status || task.status || "in_progress";
      const tPrio = task.Priority || task.priority || "medium";
      const assignee = task.Assigned_To_Name || task.assigned_to_name || task.assigned_to || "Unassigned";
      const dueDate = task.Due_Date ? String(task.Due_Date).substring(0, 10) : (task.due_date || "—");
      const taskName = task.Task_Name || task.title || task.name || `Task ${idx + 1}`;
      const descSnip = (task.Description || task.description || "").substring(0, 60);
      return `<tr style="${idx % 2 === 1 ? "background:#F8FAFC;" : ""}">
          <td style="padding:8px 10px;">
            <div style="font-size:12px;font-weight:600;color:#0F172A;">${taskName}</div>
            ${descSnip ? `<div style="font-size:10px;color:#94A3B8;margin-top:2px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${descSnip}</div>` : ""}
          </td>
          <td style="padding:8px 10px;font-size:12px;color:#334155;">${assignee}</td>
          <td style="padding:8px 10px;">${taskBadge(tStatus)}</td>
          <td style="padding:8px 10px;">${taskPrioBadge(tPrio)}</td>
          <td style="padding:8px 10px;font-size:11px;color:#64748B;">${dueDate}</td>
        </tr>`;
    }).join("");

  const progressBar = `<div style="width:100%;height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;margin-top:8px;"><div style="width:${completionRate}%;height:100%;background:linear-gradient(90deg,#0055FE,#3B82F6);border-radius:4px;"></div></div>`;

  function statCard(label, value, sub, accent) {
    return `<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;border-top:3px solid ${accent};">
      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:4px;">${label}</div>
      <div style="font-size:24px;font-weight:800;color:#0F172A;line-height:1.1;">${value}</div>
      <div style="font-size:11px;color:#64748B;margin-top:4px;">${sub}</div>
    </div>`;
  }

  // ─── Full Self-Contained HTML (no external fonts to avoid CORS issues) ────
  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${projectName} — Project Report</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#F8FAFC;color:#0F172A;font-size:13px;line-height:1.5;}
.page{max-width:820px;margin:0 auto;padding:28px 32px 36px;background:#ffffff;}
.header{background:#0F172A;border-radius:14px;padding:22px 26px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;border-bottom:4px solid #0055FE;}
.brand{display:flex;align-items:center;gap:6px;margin-bottom:7px;}
.brand-dot{width:8px;height:8px;border-radius:50%;background:#0055FE;flex-shrink:0;display:inline-block;}
.brand-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94A3B8;}
.title{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1.2;max-width:440px;}
.subtitle{margin-top:6px;font-size:12px;color:#94A3B8;}
.header-right{text-align:right;flex-shrink:0;}
.status-badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;border:1.5px solid ${sty.border};background:${sty.bg};color:${sty.color};margin-bottom:7px;}
.prio-badge{display:inline-block;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;background:${prio.bg};color:${prio.color};}
.hdate{font-size:10px;color:#64748B;margin-top:5px;}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;}
.section{margin-bottom:22px;}
.section-title{font-size:12px;font-weight:800;color:#0F172A;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:10px;padding-bottom:7px;border-bottom:2px solid #E2E8F0;display:flex;align-items:center;gap:8px;}
.section-title::before{content:"";display:inline-block;width:4px;height:16px;border-radius:2px;background:#0055FE;flex-shrink:0;}
.info-card{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;}
.desc{font-size:12px;color:#334155;line-height:1.7;white-space:pre-wrap;word-break:break-word;}
.info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding-top:14px;border-top:1px solid #E2E8F0;margin-top:12px;}
.info-label{font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:3px;}
.info-value{font-size:12px;font-weight:700;color:#0F172A;}
.data-table{width:100%;border-collapse:collapse;font-size:12px;text-align:left;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;}
.data-table thead tr{background:#0F172A;color:#fff;}
.data-table thead th{padding:9px 12px;font-weight:700;font-size:11px;letter-spacing:0.3px;}
.data-table tbody tr{border-bottom:1px solid #E2E8F0;}
.data-table tbody tr:last-child{border-bottom:none;}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94A3B8;}
.footer-logo{display:flex;align-items:center;gap:6px;font-weight:700;color:#475569;}
.fdot{width:6px;height:6px;border-radius:50%;background:#0055FE;display:inline-block;}
</style>
</head>
<body>
<div class="page">

<div class="header">
  <div>
    <div class="brand"><div class="brand-dot"></div><span class="brand-label">ProManager &bull; Project Report</span></div>
    <div class="title">${projectName}</div>
    <div class="subtitle">Code: <strong style="color:#60A5FA;">${projectCode}</strong> &bull; Customer: <span style="color:#F1F5F9;">${customer}</span> &bull; Type: <span style="color:#F1F5F9;">${projectType}</span></div>
  </div>
  <div class="header-right">
    <div class="status-badge">${projectStatusLabel}</div><br/>
    <div class="prio-badge">${priority.toUpperCase()}</div>
    <div class="hdate">Exported: ${exportDate}</div>
  </div>
</div>

<div class="stats-grid">
  ${statCard("Completion", completionRate + "%", progressBar, "#0055FE")}
  ${statCard("Total Tasks", totalTasks, completedTasks + " Done &bull; " + inProgressTasks + " In Progress", "#7C3AED")}
  ${statCard("Pending / Blocked", pendingTasks + " / " + blockedTasks, otherTasks > 0 ? otherTasks + " other" : "All accounted for", "#F59E0B")}
  ${statCard("Timeline", startDate, "&rarr; " + endDate, "#10B981")}
</div>

<div class="section">
  <h2 class="section-title">Project Overview</h2>
  <div class="info-card">
    <p class="desc">${description}</p>
    <div class="info-grid">
      <div><span class="info-label">Customer</span><span class="info-value">${customer}</span></div>
      <div><span class="info-label">Departments</span><span class="info-value">${depts}</span></div>
      <div><span class="info-label">Total Time Logged</span><span class="info-value">${totalTime}</span></div>
      <div><span class="info-label">Total Sprints</span><span class="info-value">${totalSprints}</span></div>
      <div><span class="info-label">Completed Sprints</span><span class="info-value">${completedSprints}</span></div>
      <div><span class="info-label">Current Sprint</span><span class="info-value">${currentSprint}</span></div>
    </div>
  </div>
</div>

<div class="section">
  <h2 class="section-title">Team Members (${teamMembers.length})</h2>
  <table class="data-table">
    <thead><tr><th style="width:40%;">Member</th><th style="width:35%;">Role</th><th style="width:25%;">Tasks Assigned</th></tr></thead>
    <tbody>${teamRows}</tbody>
  </table>
</div>

${milestonesSection}
${sprintsSection}

<div class="section">
  <h2 class="section-title">Tasks Breakdown (${totalTasks} total &bull; ${completedTasks} completed)</h2>
  <table class="data-table">
    <thead><tr><th style="width:34%;">Task Name</th><th style="width:20%;">Assignee</th><th style="width:17%;">Status</th><th style="width:13%;">Priority</th><th style="width:16%;">Due Date</th></tr></thead>
    <tbody>${tasksRows}</tbody>
  </table>
</div>

<div class="footer">
  <div class="footer-logo"><div class="fdot"></div> ProManager &bull; Confidential &bull; Project Summary Report</div>
  <div>Generated on ${exportDate}</div>
</div>

</div>
</body>
</html>`;

  // ─── Iframe-based PDF Generation ─────────────────────────────────────────
  const safeFileName = projectName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  toast.info("Generating PDF report, please wait...", { autoClose: false });

  let iframe = null;
  try {
    // 1. Dynamically load html2canvas and jsPDF from html2pdf.js bundle
    //    html2pdf.js bundles both internally - we access them via CDN as fallback
    const html2canvas = await loadHtml2Canvas();
    const jsPDF = await loadJsPDF();

    // 2. Create a hidden iframe and write full HTML into it
    iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "900px";
    iframe.style.height = "1px";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    iframe.style.zIndex = "-1";
    document.body.appendChild(iframe);

    // Write the full HTML document into the iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(fullHTML);
    iframe.contentDocument.close();

    // 3. Wait for iframe content to fully render
    await new Promise((resolve) => {
      if (iframe.contentDocument.readyState === "complete") {
        resolve();
      } else {
        iframe.contentWindow.addEventListener("load", resolve);
      }
    });
    // Extra settle time for layout
    await new Promise((r) => setTimeout(r, 600));

    const iframeBody = iframe.contentDocument.body;
    const pageEl = iframe.contentDocument.querySelector(".page") || iframeBody;

    // Set explicit height for full capture
    const scrollHeight = pageEl.scrollHeight || iframeBody.scrollHeight;
    iframe.style.height = scrollHeight + "px";
    await new Promise((r) => setTimeout(r, 200));

    // 4. Capture with html2canvas
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 820,
      windowWidth: 900,
    });

    // 5. Build PDF with jsPDF
    const A4_W = 210; // mm
    const A4_H = 297; // mm

    // Calculate total pages
    const canvasWidthMm = A4_W - 16; // margins: 8mm each side
    const canvasHeightMm = (canvas.height / canvas.width) * canvasWidthMm;
    const totalPages = Math.ceil(canvasHeightMm / (A4_H - 16));

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    let yOffset = 0;
    const pageContentH = A4_H - 16; // content height per page (8mm top + 8mm bottom margin)

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Crop canvas for this page
      const srcY = (yOffset / canvasHeightMm) * canvas.height;
      const srcH = (pageContentH / canvasHeightMm) * canvas.height;

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(srcH, canvas.height - srcY);
      const ctx = pageCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, srcY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);

      const pageImg = pageCanvas.toDataURL("image/jpeg", 0.97);
      const pageImgH = (pageCanvas.height / pageCanvas.width) * canvasWidthMm;

      pdf.addImage(pageImg, "JPEG", 8, 8, canvasWidthMm, pageImgH);
      yOffset += pageContentH;
    }

    pdf.save(`${safeFileName}_report.pdf`);

    toast.success(`PDF report for "${projectName}" downloaded!`);
  } catch (err) {
    console.error("PDF export error:", err);
    toast.error("Failed to generate PDF. Please try again.");
  } finally {
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

// ─── Dynamic Loaders ─────────────────────────────────────────────────────────

function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => resolve(window.html2canvas);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf && window.jspdf.jsPDF) return resolve(window.jspdf.jsPDF);
    if (window.jsPDF) return resolve(window.jsPDF);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => {
      const Lib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (Lib) resolve(Lib);
      else reject(new Error("jsPDF not found after load"));
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
