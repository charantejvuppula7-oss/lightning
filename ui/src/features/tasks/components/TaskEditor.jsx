import { useState, useEffect } from "react";
import { apiRequest, errorMessage } from '../../../services/api/apiClient.js';
import DatePicker from "../../../components/common/DatePicker.jsx";

const STYLES = `
  .edit-task-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    box-sizing: border-box;
  }

  .edit-task-modal {
    background: #FFFFFF;
    border-radius: 12px;
    width: 100%;
    max-width: 640px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1E293B;
    overflow: hidden;
  }

  /* Header */
  .edit-task-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 24px 14px 24px;
  }
  .edit-task-title {
    font-size: 18px;
    font-weight: 700;
    color: #0F172A;
    margin: 0 0 4px 0;
  }
  .edit-task-subtitle {
    font-size: 13px;
    color: #64748B;
    margin: 0;
  }
  .edit-task-close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #64748B;
    padding: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .edit-task-close-btn:hover {
    background-color: #F1F5F9;
    color: #0F172A;
  }

  /* Scrollable Body */
  .edit-task-body {
    padding: 0 24px 16px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Card Section */
  .edit-task-section {
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 16px;
    background: #FFFFFF;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .edit-task-section-header {
    margin-bottom: -2px;
  }
  .edit-task-section-title {
    font-size: 15px;
    font-weight: 700;
    color: #0F172A;
    margin: 0 0 2px 0;
  }
  .edit-task-section-subtitle {
    font-size: 12px;
    color: #64748B;
    margin: 0;
  }

  /* Form Elements */
  .edit-task-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .edit-task-grid-dates {
    display: grid;
    grid-template-columns: 1.2fr 1.2fr 1fr 0.8fr;
    gap: 12px;
  }

  .edit-task-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .edit-task-label {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .edit-task-label-icon {
    display: inline-flex;
    align-items: center;
    color: #475569;
  }
  .edit-task-required {
    color: #DC2626;
    margin-left: 2px;
  }
  .edit-task-optional {
    color: #64748B;
    font-weight: 400;
    font-size: 12px;
    margin-left: 4px;
  }

  .edit-task-input,
  .edit-task-select,
  .edit-task-textarea {
    width: 100%;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 9px 12px;
    font-size: 13px;
    color: #0F172A;
    background: #FFFFFF;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .edit-task-input:focus,
  .edit-task-select:focus,
  .edit-task-textarea:focus {
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
  .edit-task-input::placeholder,
  .edit-task-textarea::placeholder {
    color: #94A3B8;
  }
  .edit-task-textarea {
    resize: vertical;
    min-height: 48px;
  }

  /* Custom Select Wrapper */
  .edit-task-select-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .edit-task-select {
    appearance: none;
    padding-right: 32px;
    cursor: pointer;
  }
  .edit-task-select-arrow {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: #64748B;
    display: inline-flex;
  }

  /* Date Input Wrapper with Calendar Icon */
  .edit-task-date-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .edit-task-date-input {
    padding-right: 34px;
    cursor: pointer;
  }
  .edit-task-date-icon {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: #475569;
    display: inline-flex;
  }

  /* Footer */
  .edit-task-footer {
    display: flex;
    justify-content: flex-end;
    padding: 14px 24px 20px 24px;
    border-top: 1px solid #F1F5F9;
  }
  .edit-task-save-btn {
    background-color: #1558D6;
    color: #FFFFFF;
    border: none;
    border-radius: 6px;
    padding: 10px 32px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 0.18s ease, transform 0.1s ease;
  }
  .edit-task-save-btn:hover:not(:disabled) {
    background-color: #114bb8;
  }
  .edit-task-save-btn:active:not(:disabled) {
    transform: scale(0.985);
  }
  .edit-task-save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .edit-task-grid-2,
    .edit-task-grid-dates {
      grid-template-columns: 1fr;
    }
  }
`;

/**
 * EditTask Modal Component (PM/edit task POP UP)
 *
 * @param {Object} props
 * @param {boolean} [props.isOpen=true] - Whether the modal is visible
 * @param {function} props.onClose - Modal close handler
 * @param {function} props.onSave - Save handler receives task payload
 * @param {Object} [props.task] - Initial task data
 * @param {Array} [props.sprints] - Available sprints
 * @param {Array} [props.members] - Team members for assign / review
 * @param {Array} [props.milestones] - Milestones
 * @param {Array} [props.features] - Features
 */
const EMPTY_TASK = {}
const EMPTY_PROJECTS = []

export default function EditTask({
  isOpen = true,
  isCreate = false,
  onClose,
  onSave,
  task = EMPTY_TASK,
  projectId = "",
  projects = EMPTY_PROJECTS,
  sprints: suppliedSprints,
  members: suppliedMembers,
  milestones: suppliedMilestones,
  features: suppliedFeatures,
}) {
  const [optionsError, setOptionsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [projectData, setProjectData] = useState(null);
  const sprints = suppliedSprints || projectData?.sprints || [];
  const members = suppliedMembers || projectData?.members || [];
  const milestones = suppliedMilestones || projectData?.milestones || [];
  const features = suppliedFeatures || projectData?.features || [];
  const [formData, setFormData] = useState(() => {
    const taskMeta = (() => { try { return JSON.parse(task?.Remarks || "{}"); } catch { return {}; } })();
    return {
      taskName: task?.Task_Name || task?.taskName || task?.name || "",
      sprint: task?.Sprint_Id || task?.sprint || task?.sprint_id || "",
      description: task?.Description || task?.description || "",
      dueDate: task?.Due_Date || task?.dueDate || "",
      priority: task?.Priority || task?.priority || taskMeta.priority || "medium",
      points: task?.Points ?? task?.points ?? taskMeta.points ?? taskMeta.story_points ?? "",
      milestone: task?.Milestone_Id || task?.milestone_id || taskMeta.milestone_id || "",
      feature: task?.Feature_Id || task?.feature || task?.feature_id || "",
      reviewer: task?.Review_By || task?.review_by || task?.Reviewer || "",
      assignedTo: task?.Assigned_To || task?.assigned_to || "",
    };
  });
  const [dueDateError, setDueDateError] = useState('');
  const taskProjectId = task?.Project_Id || task?.project_id || task?.project || projectId || projects[0]?.Id || projects[0]?.id;
  useEffect(() => {
    if (!isOpen || !taskProjectId) return;
    let cancelled = false;
    apiRequest(`/tasks/options/?project=${taskProjectId}`)
      .then(data => { if (!cancelled) setProjectData(data); })
      .catch(error => { if (!cancelled) setOptionsError(errorMessage(error)); });
    return () => { cancelled = true; };
  }, [isOpen, taskProjectId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dueDate) {
      setDueDateError("Due date is required");
      return;
    }
    setDueDateError("");
    setSaving(true); setSaveError('');
    try { await onSave(formData); }
    catch (error) { setSaveError(errorMessage(error)); }
    finally { setSaving(false); }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="edit-task-overlay" onClick={onClose}>
        <div className="edit-task-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="edit-task-header">
            <div>
              <h2 className="edit-task-title">{isCreate ? "Assign Task" : "Edit Task"}</h2>
              <p className="edit-task-subtitle">
                {isCreate ? "Add a task and set the basic information." : "Edit the task and set the basic information."}
              </p>
            </div>
            <button
              type="button"
              className="edit-task-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              {/* Close ✕ Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {(optionsError || saveError) && <p role="alert" style={{padding:16,color:"#991b1b"}}>{optionsError || saveError}</p>}
          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="edit-task-body">
              {/* Card 1: Basic Information */}
              <div className="edit-task-section">
                <div className="edit-task-grid-2">
                  {/* Task Name */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      Task name <span className="edit-task-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="taskName"
                      className="edit-task-input"
                      placeholder="Text Input"
                      value={formData.taskName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Sprint */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      Sprint <span className="edit-task-required">*</span>
                    </label>
                    <div className="edit-task-select-wrap">
                      <select
                        name="sprint"
                        className="edit-task-select"
                        value={formData.sprint}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select sprint</option>
                        {sprints.map((s) => (
                          <option key={s.Id || s.id} value={s.Id || s.id}>
                            {s.Sprint_Name || s.Sprint_No || s.name}
                          </option>
                        ))}
                      </select>
                      <span className="edit-task-select-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="edit-task-field">
                  <label className="edit-task-label">
                    Description <span className="edit-task-optional">(optional)</span>
                  </label>
                  <textarea
                    name="description"
                    className="edit-task-textarea"
                    placeholder="Text area"
                    rows="2"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                {/* Date / Priority / Points Grid */}
                <div className="edit-task-grid-dates">
                  {/* Due Date */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      Due date <span className="edit-task-required">*</span>
                    </label>
                    <DatePicker
                      value={formData.dueDate}
                      portal
                      onChange={(dueDate) => {
                        setFormData((prev) => ({ ...prev, dueDate }));
                        setDueDateError("");
                      }}
                      allowPastDates={true}
                      placeholder="Select due date"
                      style={{ height: "42px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
                    />
                    {dueDateError && <span style={{ color: "#DC2626", fontSize: "12px" }}>{dueDateError}</span>}
                  </div>

                  {/* Priority */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      Priority <span className="edit-task-required">*</span>
                    </label>
                    <div className="edit-task-select-wrap">
                      <select
                        name="priority"
                        className="edit-task-select"
                        value={formData.priority}
                        onChange={handleChange}
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <span className="edit-task-select-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      Points <span className="edit-task-required">*</span>
                    </label>
                    <input
                      type="number"
                      name="points"
                      className="edit-task-input"
                      value={formData.points}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Additional Details */}
              <div className="edit-task-section">
                <div className="edit-task-section-header">
                  <h3 className="edit-task-section-title">Additional details</h3>
                  <p className="edit-task-section-subtitle">
                    Add dependencies, milestones and features related to this task.
                  </p>
                </div>

                <div className="edit-task-grid-2">
                  {/* Add to Milestones */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      <span className="edit-task-label-icon">
                        {/* Flag Icon */}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                          <line x1="4" y1="22" x2="4" y2="15" />
                        </svg>
                      </span>
                      Add to milestones
                    </label>
                    <div className="edit-task-select-wrap">
                      <select
                        name="milestone"
                        className="edit-task-select"
                        value={formData.milestone}
                        onChange={handleChange}
                      >
                        <option value="">Select Milestones</option>
                        {milestones.map((ms) => (
                          <option key={ms.Id || ms.id} value={ms.Id || ms.id}>
                            {ms.Milestone_Name || ms.name}
                          </option>
                        ))}
                      </select>
                      <span className="edit-task-select-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </span>
                    </div>
                  </div>

                  {/* Add to Features */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      <span className="edit-task-label-icon">
                        {/* 4-squares / Features Icon */}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                      </span>
                      Add to features
                    </label>
                    <div className="edit-task-select-wrap">
                      <select
                        name="feature"
                        className="edit-task-select"
                        value={formData.feature}
                        onChange={handleChange}
                      >
                        <option value="">Select feature</option>
                        {features.filter(feature => !formData.milestone || String(feature.Milestone_id) === String(formData.milestone)).map((f) => (
                          <option key={f.Id || f.id} value={f.Id || f.id}>
                            {f.feature_name || f.name}
                          </option>
                        ))}
                      </select>
                      <span className="edit-task-select-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Assign & Review */}
              <div className="edit-task-section">
                <div className="edit-task-section-header">
                  <h3 className="edit-task-section-title">Assign & review</h3>
                  <p className="edit-task-section-subtitle">
                    add dependencies, milestones and features related to this task.
                  </p>
                </div>

                <div className="edit-task-grid-2">
                  {/* Reviewer */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      Reviewer <span className="edit-task-optional">(optional)</span>
                    </label>
                    <div className="edit-task-select-wrap">
                      <select
                        name="reviewer"
                        className="edit-task-select"
                        value={formData.reviewer}
                        onChange={handleChange}
                      >
                        <option value="">No reviewer</option>
                        {members.map((m) => (
                          <option key={m.id || m.Id} value={m.id || m.Id}>
                            {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.user_name || m.user_name}
                          </option>
                        ))}
                      </select>
                      <span className="edit-task-select-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </span>
                    </div>
                  </div>

                  {/* Assigned to */}
                  <div className="edit-task-field">
                    <label className="edit-task-label">
                      Assigned to <span className="edit-task-required">*</span>
                    </label>
                    <div className="edit-task-select-wrap">
                      <select
                        name="assignedTo"
                        className="edit-task-select"
                        value={formData.assignedTo}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select member</option>
                        {members.map((m) => (
                          <option key={m.id || m.Id} value={m.id || m.Id}>
                            {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.user_name || m.user_name}
                          </option>
                        ))}
                      </select>
                      <span className="edit-task-select-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Save Button */}
            <div className="edit-task-footer">
              <button type="submit" className="edit-task-save-btn" disabled={saving || !projectData}>
                {saving ? 'Saving…' : isCreate ? "Assign Task" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export { EditTask };
