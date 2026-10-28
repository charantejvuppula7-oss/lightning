import { useState, useEffect } from "react";
import { apiRequest, errorMessage } from '../../shared/api/apiClient.js';
import DatePicker from "../../shared/components/DatePicker.jsx";

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

          {(optionsError || saveError) && <p role="alert" className="p-[16px]! [color:#991b1b]!">{optionsError || saveError}</p>}
          {/* Form */}
          <form onSubmit={handleSubmit} className="[display:contents]!">
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
                      controlClassName="[height:42px]! [border-radius:6px]! [border:1px_solid_#CBD5E1]!"
                    />
                    {dueDateError && <span className="[color:#DC2626]! text-[12px]!">{dueDateError}</span>}
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
