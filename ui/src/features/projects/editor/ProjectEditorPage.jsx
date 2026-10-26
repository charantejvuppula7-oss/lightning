import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../services/api/apiClient.js'
import { roleSlug } from '../../../utils/roles.js'
import { useProjectSelection } from '../../../app/hooks/index.js'
import { createProject, projectFiles, projectOptions, projectSetup, updateProject } from './projectApi.js'

/* styling */
const tailwindStyling = {
  "material-symbols-outlined": [
    "[font-family:'Material_Symbols_Outlined']",
    "[font-weight:normal]",
    "[font-style:normal]",
    "[font-size:20px]",
    "[line-height:1]",
    "[letter-spacing:normal]",
    "[text-transform:none]",
    "[white-space:nowrap]",
    "[word-wrap:normal]",
    "[direction:ltr]",
    "[font-feature-settings:'liga']",
    "[-webkit-font-smoothing:antialiased]",
    "[&.sidebar-icon]:[font-size:20px]"
  ],
  "avatar": [
    "[width:32px]",
    "[height:32px]",
    "[flex:0_0_32px]",
    "[border-radius:50%]",
    "[display:grid]",
    "[place-items:center]",
    "[background:#f97316]",
    "[color:white]",
    "[font-size:12px]",
    "[font-weight:700]"
  ],
  "calendar-grid": [
    "[display:grid]",
    "[grid-template-columns:repeat(7,minmax(0,1fr))]",
    "[border-top:1px_solid_#d7d8df]",
    "[border-left:1px_solid_#d7d8df]"
  ],
  "project-editor": [
    "[width:100%]",
    "[max-width:1344px]",
    "[margin:0_auto]",
    "[padding:32px]",
    "[color:#172033]",
    "[background:#fff]",
    "max-[700px]:[padding:20px_16px_35px]"
  ],
  "project-breadcrumb": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:8px]",
    "[color:#788292]",
    "[font-size:13px]",
    "[margin-bottom:8px]",
    "[&_a]:[color:inherit]",
    "[&_a]:[text-decoration:none]",
    "[&_span]:[color:#aab3c1]"
  ],
  "project-editor-header": [
    "[&_h1]:[margin:0]",
    "[&_h1]:[font-size:28px]",
    "[&_h1]:[line-height:1.2]",
    "[&_h1]:[font-weight:800]",
    "[&_p]:[margin:6px_0_26px]",
    "[&_p]:[font-size:14px]",
    "[&_p]:[color:#728095]",
    "[&_strong]:[color:#172033]"
  ],
  "project-stepper": [
    "[display:flex]",
    "[align-items:flex-start]",
    "[justify-content:space-between]",
    "[gap:0]",
    "[margin:0_8px_36px]",
    "[padding:0]",
    "[background:#fff]",
    "[overflow-x:auto]",
    "[&_button]:[flex:1_0_110px]",
    "[&_button]:[display:flex]",
    "[&_button]:[flex-direction:column]",
    "[&_button]:[align-items:center]",
    "[&_button]:[gap:8px]",
    "[&_button]:[position:relative]",
    "[&_button]:[border:0]",
    "[&_button]:[background:none]",
    "[&_button]:[color:#9ba7b5]",
    "[&_button]:[font:inherit]",
    "[&_button]:[cursor:pointer]",
    "[&_button:not(:last-child)::after]:[content:'']",
    "[&_button:not(:last-child)::after]:[position:absolute]",
    "[&_button:not(:last-child)::after]:[top:17px]",
    "[&_button:not(:last-child)::after]:[left:calc(50%_+_24px)]",
    "[&_button:not(:last-child)::after]:[width:calc(100%_-_35px)]",
    "[&_button:not(:last-child)::after]:[height:3px]",
    "[&_button:not(:last-child)::after]:[background:#e5eaf2]",
    "[&_button.done:not(:last-child)::after]:[background:#3b82f6]",
    "[&_button_span]:[width:36px]",
    "[&_button_span]:[height:36px]",
    "[&_button_span]:[z-index:1]",
    "[&_button_span]:[display:grid]",
    "[&_button_span]:[place-items:center]",
    "[&_button_span]:[border:2px_solid_#e4e9f0]",
    "[&_button_span]:[background:#fff]",
    "[&_button_span]:[border-radius:50%]",
    "[&_button_span]:[font-size:14px]",
    "[&_button_span]:[font-weight:700]",
    "[&_button.active_span]:[border-color:#3b82f6]",
    "[&_button.active_span]:[background:#3b82f6]",
    "[&_button.active_span]:[color:#fff]",
    "[&_button.done_span]:[border-color:#3b82f6]",
    "[&_button.done_span]:[background:#3b82f6]",
    "[&_button.done_span]:[color:#fff]",
    "[&_button.active_span]:[box-shadow:0_0_0_4px_#3b82f62c]",
    "[&_small]:[max-width:122px]",
    "[&_small]:[font-size:11px]",
    "[&_small]:[line-height:1.3]",
    "[&_small]:[white-space:nowrap]",
    "[&_button.active_small]:[color:#283344]",
    "[&_button.active_small]:[font-weight:700]",
    "max-[700px]:[&_button]:[flex-basis:95px]"
  ],
  "project-intro-grid": [
    "[display:grid]",
    "[grid-template-columns:320px_minmax(0,1fr)]",
    "[gap:24px]",
    "[align-items:stretch]",
    "max-[1100px]:[grid-template-columns:1fr]"
  ],
  "project-guide": [
    "[background:#fff]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:16px]",
    "[box-shadow:0_2px_8px_#00000005]",
    "[display:flex]",
    "[flex-direction:column]",
    "[padding:25px]",
    "[&_img]:[display:block]",
    "[&_img]:[width:100%]",
    "[&_img]:[max-width:280px]",
    "[&_img]:[height:200px]",
    "[&_img]:[object-fit:contain]",
    "[&_img]:[margin:0_auto_15px]",
    "[&_h2]:[font-size:16px]",
    "[&_h2]:[margin:0_0_8px]",
    "[&_p]:[color:#758093]",
    "[&_p]:[font-size:13px]",
    "[&_p]:[line-height:1.6]",
    "[&_p]:[margin:0_0_18px]",
    "[&_ul]:[padding-left:20px]",
    "[&_ul]:[margin:0_0_25px]",
    "[&_ul]:[color:#647187]",
    "[&_ul]:[font-size:13px]",
    "[&_ul]:[line-height:2]",
    "max-[1100px]:[display:none]"
  ],
  "project-card": [
    "[background:#fff]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:16px]",
    "[box-shadow:0_2px_8px_#00000005]",
    "[padding:28px]",
    "[min-width:0]",
    "[&_>_.project-grid]:[margin-bottom:20px]",
    "[&_>_.project-field]:[margin-bottom:20px]",
    "max-[700px]:[padding:18px]"
  ],
  "project-help": [
    "[margin-top:auto]",
    "[border-radius:10px]",
    "[background:#eef5ff]",
    "[padding:14px_16px]",
    "[color:#1e40af]",
    "[&_strong]:[font-size:13px]",
    "[&_p]:[margin:5px_0_0]",
    "[&_p]:[color:#64799b]"
  ],
  "project-card-heading": [
    "[margin-bottom:22px]",
    "[padding-bottom:17px]",
    "[border-bottom:1px_solid_#e8ecf2]",
    "[&_h2]:[margin:0]",
    "[&_h2]:[font-size:18px]",
    "[&_h2]:[font-weight:700]",
    "[&_p]:[color:#7a8596]",
    "[&_p]:[font-size:13px]",
    "[&_p]:[margin:5px_0_0]"
  ],
  "project-grid": [
    "[display:grid]",
    "[gap:18px]",
    "[min-width:0]",
    "[&.two]:[grid-template-columns:repeat(2,minmax(0,1fr))]",
    "[&.three]:[grid-template-columns:repeat(3,minmax(0,1fr))]",
    "[&.four]:[grid-template-columns:repeat(4,minmax(0,1fr))]",
    "[&.task-step]:[grid-template-columns:minmax(0,_1.5fr)_minmax(280px,_.8fr)]",
    "max-[1100px]:[&.task-step]:[grid-template-columns:1fr]",
    "max-[1100px]:[&.four]:[grid-template-columns:repeat(2,minmax(0,1fr))]",
    "max-[700px]:[&.two]:[grid-template-columns:1fr]",
    "max-[700px]:[&.three]:[grid-template-columns:1fr]",
    "max-[700px]:[&.four]:[grid-template-columns:1fr]"
  ],
  "project-field": [
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:7px]",
    "[min-width:0]",
    "[color:#344054]",
    "[font-weight:650]",
    "[font-size:13px]",
    "[&_input]:[width:100%]",
    "[&_input]:[box-sizing:border-box]",
    "[&_input]:[min-height:42px]",
    "[&_input]:[padding:10px_12px]",
    "[&_input]:[border:1px_solid_#d3dce8]",
    "[&_input]:[border-radius:8px]",
    "[&_input]:[background:#fff]",
    "[&_input]:[color:#263448]",
    "[&_input]:[font:inherit]",
    "[&_input]:[font-size:14px]",
    "[&_input]:[font-weight:400]",
    "[&_input]:[outline:none]",
    "[&_textarea]:[width:100%]",
    "[&_textarea]:[box-sizing:border-box]",
    "[&_textarea]:[min-height:42px]",
    "[&_textarea]:[padding:10px_12px]",
    "[&_textarea]:[border:1px_solid_#d3dce8]",
    "[&_textarea]:[border-radius:8px]",
    "[&_textarea]:[background:#fff]",
    "[&_textarea]:[color:#263448]",
    "[&_textarea]:[font:inherit]",
    "[&_textarea]:[font-size:14px]",
    "[&_textarea]:[font-weight:400]",
    "[&_textarea]:[outline:none]",
    "[&_select]:[width:100%]",
    "[&_select]:[box-sizing:border-box]",
    "[&_select]:[min-height:42px]",
    "[&_select]:[padding:10px_12px]",
    "[&_select]:[border:1px_solid_#d3dce8]",
    "[&_select]:[border-radius:8px]",
    "[&_select]:[background:#fff]",
    "[&_select]:[color:#263448]",
    "[&_select]:[font:inherit]",
    "[&_select]:[font-size:14px]",
    "[&_select]:[font-weight:400]",
    "[&_select]:[outline:none]",
    "[&_input[type=file]]:[height:auto]",
    "[&_textarea]:[resize:vertical]",
    "[&_textarea]:[line-height:1.5]",
    "[&_input:focus]:[border-color:#3b82f6]",
    "[&_input:focus]:[box-shadow:0_0_0_3px_#3b82f622]",
    "[&_textarea:focus]:[border-color:#3b82f6]",
    "[&_textarea:focus]:[box-shadow:0_0_0_3px_#3b82f622]",
    "[&_select:focus]:[border-color:#3b82f6]",
    "[&_select:focus]:[box-shadow:0_0_0_3px_#3b82f622]",
    "[&_input::placeholder]:[color:#aab4c2]",
    "[&_textarea::placeholder]:[color:#aab4c2]"
  ],
  "project-hint": [
    "[font-size:12px]",
    "[line-height:1.4]",
    "[color:#8b96a6]",
    "[font-weight:400]"
  ],
  "project-error": [
    "[color:#d12e38]",
    "[font-size:12px]",
    "[font-weight:500]",
    "[margin:3px_0_0]"
  ],
  "project-alert": [
    "[padding:12px_16px]",
    "[margin-bottom:18px]",
    "[border:1px_solid_#c8daf9]",
    "[border-radius:8px]",
    "[background:#eef5ff]",
    "[color:#264c91]",
    "[font-size:13px]",
    "[overflow-wrap:anywhere]"
  ],
  "project-inline": [
    "[display:flex]",
    "[gap:8px]",
    "[&_button]:[border:0]",
    "[&_button]:[background:none]",
    "[&_button]:[color:#bc3f4b]",
    "[&_button]:[cursor:pointer]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:12px]",
    "[&_button]:[font-weight:600]"
  ],
  "project-file": [
    "[&_button]:[border:0]",
    "[&_button]:[background:none]",
    "[&_button]:[color:#bc3f4b]",
    "[&_button]:[cursor:pointer]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:12px]",
    "[&_button]:[font-weight:600]",
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[gap:10px]",
    "[padding:10px_12px]",
    "[margin-top:8px]",
    "[border:1px_solid_#e4e9f1]",
    "[border-radius:8px]",
    "[color:#516076]",
    "[font-size:13px]",
    "[&_.file-type]:[display:inline-block]",
    "[&_.file-type]:[flex:0_0_auto]",
    "[&_.file-type]:[padding:4px_6px]",
    "[&_.file-type]:[border-radius:5px]",
    "[&_.file-type]:[background:#e03d4c]",
    "[&_.file-type]:[color:#fff]",
    "[&_.file-type]:[font-size:10px]",
    "[&_.file-type]:[font-weight:800]",
    "[&_.file-name]:[display:flex]",
    "[&_.file-name]:[flex:1]",
    "[&_.file-name]:[min-width:0]",
    "[&_.file-name]:[flex-direction:column]",
    "[&_.file-name]:[gap:2px]",
    "[&_.file-name_strong]:[overflow:hidden]",
    "[&_.file-name_strong]:[color:#172033]",
    "[&_.file-name_strong]:[font-size:13px]",
    "[&_.file-name_strong]:[text-overflow:ellipsis]",
    "[&_.file-name_strong]:[white-space:nowrap]",
    "[&_.file-name_small]:[color:#8390a1]",
    "[&_.file-name_small]:[font-size:11px]",
    "[&_button]:[padding:3px]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#8390a1]",
    "[&_button:hover]:[color:#2563eb]",
    "[&_button_.material-symbols-outlined]:[font-size:18px]"
  ],
  "project-row-heading": [
    "[&_button]:[border:0]",
    "[&_button]:[background:none]",
    "[&_button]:[color:#bc3f4b]",
    "[&_button]:[cursor:pointer]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:12px]",
    "[&_button]:[font-weight:600]",
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[gap:10px]",
    "[margin-bottom:15px]",
    "[&_h3]:[font-size:15px]",
    "[&_h3]:[margin:0]"
  ],
  "project-resource-layout": [
    "[display:grid]",
    "[grid-template-columns:repeat(2,minmax(0,1fr))]",
    "[gap:24px]",
    "[align-items:start]",
    "max-[1100px]:[grid-template-columns:1fr]",
    "[grid-template-columns:minmax(0,1.05fr)_minmax(0,1.35fr)]",
    "[align-items:stretch]"
  ],
  "project-info-strip": [
    "[display:flex]",
    "[gap:10px]",
    "[padding:12px_14px]",
    "[margin-bottom:18px]",
    "[border:1px_solid_#dbeafe]",
    "[border-radius:9px]",
    "[background:#eff6ff]",
    "[color:#1e40af]",
    "[&_span]:[font-size:18px]",
    "[&_p]:[margin:0]",
    "[&_p]:[font-size:12.5px]",
    "[&_p]:[line-height:1.5]"
  ],
  "project-drop-zone": [
    "[min-height:190px]",
    "[margin-bottom:20px]",
    "[border:2.5px_dashed_#e2e8f0]",
    "[border-radius:12px]",
    "[display:flex]",
    "[flex-direction:column]",
    "[align-items:center]",
    "[justify-content:center]",
    "[gap:8px]",
    "[color:#64748b]",
    "[cursor:pointer]",
    "[&:hover]:[border-color:#93c5fd]",
    "[&:hover]:[background:#eff6ff]",
    "[&_input]:[position:absolute]",
    "[&_input]:[width:1px]",
    "[&_input]:[height:1px]",
    "[&_input]:[opacity:0]",
    "[&_>_span]:[font-size:42px]",
    "[&_>_span]:[color:#94a3b8]",
    "[&_strong]:[color:#2563eb]",
    "[&_strong]:[font-size:13px]",
    "[&_small]:[font-size:12px]",
    "[&.compact]:[min-height:145px]",
    "[&.compact]:[margin-top:20px]"
  ],
  "project-text-button": [
    "[border:0]",
    "[background:none]",
    "[color:#2169d4]",
    "[font:inherit]",
    "[font-size:13px]",
    "[font-weight:700]",
    "[cursor:pointer]",
    "[padding:5px_0]"
  ],
  "project-chips": [
    "[display:flex]",
    "[flex-wrap:wrap]",
    "[gap:8px]",
    "[&_button]:[border:1px_solid_#d3dce8]",
    "[&_button]:[border-radius:22px]",
    "[&_button]:[background:#fff]",
    "[&_button]:[color:#536174]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:13px]",
    "[&_button]:[padding:8px_14px]",
    "[&_button]:[cursor:pointer]",
    "[&_button.selected]:[color:#fff]",
    "[&_button.selected]:[background:#3b82f6]",
    "[&_button.selected]:[border-color:#3b82f6]"
  ],
  "project-team-layout": [
    "[display:grid]",
    "[gap:24px]",
    "[gap:28px]"
  ],
  "department-grid": [
    "[display:grid]",
    "[grid-template-columns:repeat(3,minmax(0,1fr))]",
    "[gap:14px]",
    "max-[1100px]:[grid-template-columns:repeat(2,minmax(0,1fr))]",
    "max-[700px]:[grid-template-columns:1fr]",
    "[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]",
    "[gap:16px]"
  ],
  "department-card": [
    "[min-height:98px]",
    "[display:grid]",
    "[grid-template-columns:40px_1fr_20px]",
    "[gap:12px]",
    "[align-items:center]",
    "[padding:14px]",
    "[border:1.5px_solid_#e2e8f0]",
    "[border-radius:12px]",
    "[background:#fff]",
    "[color:#475569]",
    "[text-align:left]",
    "[cursor:pointer]",
    "[&:hover]:[border-color:#3b82f6]",
    "[&:hover]:[background:#eff6ff]",
    "[&:hover]:[box-shadow:0_0_0_3px_#3b82f617]",
    "[&.selected]:[border-color:#3b82f6]",
    "[&.selected]:[background:#eff6ff]",
    "[&.selected]:[box-shadow:0_0_0_3px_#3b82f617]",
    "[&_strong]:[display:block]",
    "[&_strong]:[margin-bottom:4px]",
    "[&_strong]:[color:#1f2937]",
    "[&_strong]:[font-size:13px]",
    "[&_small]:[display:block]",
    "[&_small]:[color:#7b8798]",
    "[&_small]:[font-size:11px]",
    "[&_small]:[line-height:1.35]",
    "[min-height:90px]",
    "[grid-template-columns:40px_minmax(0,1fr)_16px]",
    "[align-items:start]",
    "[padding:16px]",
    "[&:hover]:[border-color:#22c55e]",
    "[&:hover]:[background:#fff]",
    "[&:hover]:[box-shadow:0_4px_12px_#22c55e0d]",
    "[&.selected]:[border-color:#22c55e]",
    "[&.selected]:[background:#fff]",
    "[&.selected]:[box-shadow:0_4px_12px_#22c55e0d]",
    "[&_strong]:[margin:1px_0_4px]",
    "[&_strong]:[font-size:14px]",
    "[&_small]:[line-height:1.4]",
    "[&.selected_.department-check]:[display:grid]",
    "[&.selected_.department-check]:[place-items:center]",
    "[&.selected_.department-check]:[border-color:#22c55e]",
    "[&.selected_.department-check]:[background:#22c55e]",
    "[&.selected_.department-check]:[color:#fff]"
  ],
  "department-icon": [
    "[width:40px]",
    "[height:40px]",
    "[display:grid]",
    "[place-items:center]",
    "[border-radius:50%]",
    "[background:#fff]",
    "[color:#3b82f6]",
    "[border-radius:8px]",
    "[font-size:20px]"
  ],
  "department-check": [
    "[color:#3b82f6]",
    "[font-size:19px]",
    "[width:16px]",
    "[height:16px]",
    "[margin-top:2px]",
    "[border:1px_solid_#cbd5e1]",
    "[border-radius:4px]",
    "[font-size:13px]"
  ],
  "project-team-table": [
    "[overflow-x:auto]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:10px]",
    "[overflow:visible]",
    "max-[1100px]:[overflow-x:auto]"
  ],
  "project-team-table-head": [
    "[min-width:780px]",
    "[display:grid]",
    "[grid-template-columns:1fr_1fr_1.2fr_1.2fr]",
    "[align-items:center]",
    "[background:#f8fafc]",
    "[color:#64748b]",
    "[font-size:12px]",
    "[font-weight:700]",
    "[&_span]:[padding:13px_16px]",
    "[grid-template-columns:1.1fr_1.5fr_1.1fr_.9fr]",
    "[background:#eff6ff]",
    "[color:#475569]"
  ],
  "project-team-table-row": [
    "[min-width:780px]",
    "[display:grid]",
    "[grid-template-columns:1fr_1fr_1.2fr_1.2fr]",
    "[align-items:center]",
    "[&_>_span]:[padding:13px_16px]",
    "[min-height:66px]",
    "[border-top:1px_solid_#e2e8f0]",
    "[color:#64748b]",
    "[font-size:12px]",
    "[&_select]:[width:100%]",
    "[&_select]:[height:36px]",
    "[&_select]:[border:1px_solid_#cbd5e1]",
    "[&_select]:[border-radius:8px]",
    "[&_select]:[background:#fff]",
    "[&_select]:[color:#475569]",
    "[grid-template-columns:1.1fr_1.5fr_1.1fr_.9fr]",
    "[min-height:70px]",
    "[color:#475569]"
  ],
  "team-department": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:8px]",
    "[color:#1f2937]",
    "[&_>_span]:[width:28px]",
    "[&_>_span]:[height:28px]",
    "[&_>_span]:[display:grid]",
    "[&_>_span]:[place-items:center]",
    "[&_>_span]:[border-radius:50%]",
    "[&_>_span]:[background:#eff6ff]",
    "[&_>_span]:[color:#2563eb]",
    "[&_>_span]:[font-size:16px]"
  ],
  "team-avatars": [
    "[display:flex]",
    "[gap:6px]",
    "[&_button]:[width:30px]",
    "[&_button]:[height:30px]",
    "[&_button]:[border:2px_solid_#fff]",
    "[&_button]:[border-radius:50%]",
    "[&_button]:[background:#3b82f6]",
    "[&_button]:[color:#fff]",
    "[&_button]:[font-size:10px]",
    "[&_button]:[font-weight:700]",
    "[&_button]:[cursor:pointer]",
    "[&_em]:[color:#94a3b8]",
    "[align-items:center]",
    "[overflow-x:auto]",
    "[&_.team-member-avatar:nth-child(3n+1)]:[background:#f97316]",
    "[&_.team-member-avatar:nth-child(3n+2)]:[background:#ec4899]",
    "[&_.team-member-avatar:nth-child(3n)]:[background:#10b981]"
  ],
  "project-feature": [
    "[margin:0_0_14px_14px]",
    "[padding:16px]",
    "[background:#fff]",
    "[border:1px_solid_#e2e9f2]",
    "[border-radius:10px]",
    "[&_.project-grid]:[margin-bottom:14px]"
  ],
  "project-check": [
    "[align-self:center]",
    "[display:flex]",
    "[gap:8px]",
    "[font-size:13px]",
    "[color:#4c5c71]",
    "[&_input]:[accent-color:#3b82f6]"
  ],
  "project-small-heading": [
    "[display:block]",
    "[margin-bottom:8px]",
    "[color:#344054]",
    "[font-size:13px]"
  ],
  "sprint-step": [
    "[width:100%]"
  ],
  "sprint-summary-bar": [
    "[display:grid]",
    "[grid-template-columns:repeat(4,1fr)]",
    "[margin-bottom:24px]",
    "[overflow:hidden]",
    "[border-radius:12px]",
    "[background:#eef2ff]",
    "[&_>_div]:[min-height:99px]",
    "[&_>_div]:[display:flex]",
    "[&_>_div]:[flex-direction:column]",
    "[&_>_div]:[justify-content:center]",
    "[&_>_div]:[padding:18px_24px]",
    "[&_>_div]:[border-right:1px_solid_#e0e7ff]",
    "[&_>_div:last-child]:[border-right:0]",
    "[&_span]:[margin-bottom:6px]",
    "[&_span]:[color:#4f46e5]",
    "[&_span]:[font-size:13px]",
    "[&_span]:[font-weight:600]",
    "[&_strong]:[color:#1f2937]",
    "[&_strong]:[font-size:18px]",
    "[&_small]:[margin-top:4px]",
    "[&_small]:[color:#64748b]",
    "[&_small]:[font-size:11px]",
    "max-[1100px]:[grid-template-columns:repeat(2,1fr)]",
    "max-[1100px]:[&_>_div:nth-child(2)]:[border-right:0]",
    "max-[700px]:[grid-template-columns:1fr]",
    "max-[700px]:[&_>_div]:[border-right:0]",
    "max-[700px]:[&_>_div]:[border-bottom:1px_solid_#e0e7ff]"
  ],
  "sprint-config-card": [
    "[margin-bottom:24px]",
    "[padding:24px]",
    "[border:1px_solid_#e5e7eb]",
    "[border-radius:12px]",
    "[background:#fff]",
    "[&_>_h2]:[margin:0_0_18px]",
    "[&_>_h2]:[font-size:15px]",
    "[&_>_p]:[margin:-14px_0_18px]",
    "[&_>_p]:[color:#64748b]",
    "[&_>_p]:[font-size:13px]"
  ],
  "points-control": [
    "[display:flex]",
    "[height:42px]",
    "[&_button]:[width:38px]",
    "[&_button]:[display:grid]",
    "[&_button]:[place-items:center]",
    "[&_button]:[border:1px_solid_#d1d5db]",
    "[&_button]:[background:#f9fafb]",
    "[&_strong]:[width:38px]",
    "[&_strong]:[display:grid]",
    "[&_strong]:[place-items:center]",
    "[&_strong]:[border:1px_solid_#d1d5db]",
    "[&_strong]:[background:#f9fafb]",
    "[&_strong]:[flex:1]",
    "[&_strong]:[border-left:0]",
    "[&_strong]:[border-right:0]",
    "[&_strong]:[background:#fff]",
    "[&_button]:[cursor:pointer]",
    "[&_button]:[font-size:16px]",
    "[&_button:first-child]:[border-radius:8px_0_0_8px]",
    "[&_button:last-child]:[border-radius:0_8px_8px_0]"
  ],
  "weekend-buttons": [
    "[display:flex]",
    "[flex-wrap:wrap]",
    "[gap:8px]",
    "[margin-bottom:20px]",
    "[&_button]:[padding:7px_16px]",
    "[&_button]:[border:1px_solid_#d1d5db]",
    "[&_button]:[border-radius:8px]",
    "[&_button]:[background:#fff]",
    "[&_button]:[color:#374151]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:13px]",
    "[&_button]:[cursor:pointer]",
    "[&_button.active]:[border-color:#2563eb]",
    "[&_button.active]:[background:#2563eb]",
    "[&_button.active]:[color:#fff]"
  ],
  "holiday-picker": [
    "[display:grid]",
    "[grid-template-columns:minmax(280px,.8fr)_minmax(260px,1fr)]",
    "[gap:20px]",
    "[&_>_div]:[min-height:170px]",
    "[&_>_div]:[padding:20px]",
    "[&_>_div]:[border:1px_solid_#e5e7eb]",
    "[&_>_div]:[border-radius:10px]",
    "[&_h3]:[margin:0_0_4px]",
    "[&_h3]:[font-size:13px]",
    "[&_p]:[color:#6b7280]",
    "[&_p]:[font-size:12px]",
    "max-[1100px]:[grid-template-columns:1fr]"
  ],
  "holiday-list": [
    "[&_button]:[width:100%]",
    "[&_button]:[display:flex]",
    "[&_button]:[justify-content:space-between]",
    "[&_button]:[padding:8px_10px]",
    "[&_button]:[margin-top:8px]",
    "[&_button]:[border:1px_solid_#e5e7eb]",
    "[&_button]:[border-radius:7px]",
    "[&_button]:[background:#f8fafc]",
    "[&_button]:[color:#475569]",
    "[&_button]:[cursor:pointer]"
  ],
  "project-section-heading": [
    "[margin-bottom:20px]",
    "[padding:0_0_4px]",
    "[border:0]"
  ],
  "milestone-step": [
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:20px]"
  ],
  "task-creation-step": [
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:20px]"
  ],
  "milestone-add-card": [
    "[max-width:none]"
  ],
  "project-form-actions": [
    "[display:flex]",
    "[justify-content:flex-end]",
    "[gap:12px]",
    "[margin-top:10px]",
    "[&.left]:[justify-content:flex-start]",
    "[&_.project-primary]:[gap:6px]",
    "[&_.material-symbols-outlined]:[font-size:18px]"
  ],
  "milestone-list": [
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:16px]",
    "[gap:22px]"
  ],
  "milestone-summary-card": [
    "[padding:0]",
    "[overflow:hidden]"
  ],
  "milestone-summary": [
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[gap:16px]",
    "[padding:18px_24px]",
    "[&_h3]:[margin:0_0_5px]",
    "[&_h3]:[font-size:16px]",
    "[&_p]:[display:flex]",
    "[&_p]:[align-items:center]",
    "[&_p]:[gap:5px]",
    "[&_p]:[margin:0]",
    "[&_p]:[color:#7a8596]",
    "[&_p]:[font-size:12px]",
    "[&_p_.material-symbols-outlined]:[font-size:16px]"
  ],
  "milestone-actions": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:8px]",
    "[&_button]:[width:32px]",
    "[&_button]:[height:32px]",
    "[&_button]:[display:grid]",
    "[&_button]:[place-items:center]",
    "[&_button]:[border:0]",
    "[&_button]:[border-radius:6px]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#94a3b8]",
    "[&_button]:[cursor:pointer]",
    "[&_button:hover]:[background:#eff6ff]",
    "[&_button:hover]:[color:#2563eb]",
    "[&_.material-symbols-outlined]:[font-size:20px]"
  ],
  "task-added-list": [
    "[&_.project-row-heading_>_div]:[display:flex]",
    "[&_.project-row-heading_>_div]:[align-items:center]",
    "[&_.project-row-heading_>_div]:[gap:8px]",
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:10px]",
    "[&_article]:[padding:14px]",
    "[&_article]:[border:1px_solid_#e2e8f0]",
    "[&_article]:[border-radius:9px]",
    "[&_article]:[background:#fafafa]",
    "[&_.project-row-heading]:[margin-bottom:10px]",
    "[&_.project-row-heading_h3]:[overflow:hidden]",
    "[&_.project-row-heading_h3]:[text-overflow:ellipsis]",
    "[&_.project-row-heading_h3]:[white-space:nowrap]",
    "[&_dl]:[display:grid]",
    "[&_dl]:[grid-template-columns:78px_minmax(0,1fr)]",
    "[&_dl]:[gap:6px_8px]",
    "[&_dl]:[margin:0_0_8px]",
    "[&_dl]:[font-size:12px]",
    "[&_dt]:[color:#8490a1]",
    "[&_dd]:[min-width:0]",
    "[&_dd]:[margin:0]",
    "[&_dd]:[color:#475569]",
    "[&_dd]:[overflow-wrap:anywhere]",
    "[gap:8px]",
    "[&_article]:[padding:10px]",
    "[&_article]:[border-radius:7px]",
    "[&_.project-row-heading]:[align-items:flex-start]",
    "[&_.project-row-heading_button]:[border:0]",
    "[&_.project-row-heading_button]:[background:transparent]",
    "[&_.project-row-heading_button]:[color:#2563eb]",
    "[&_.project-row-heading_button]:[font:inherit]",
    "[&_.project-row-heading_button]:[font-size:11px]",
    "[&_.project-row-heading_button]:[cursor:pointer]",
    "[&_.project-row-heading_button:last-child]:[color:#dc2626]",
    "[&_.project-row-heading_>_div]:[gap:4px]",
    "[&_dl]:[grid-template-columns:64px_minmax(0,1fr)]",
    "[&_dl]:[font-size:10px]"
  ],
  "milestone-features": [
    "[padding:20px_24px_24px]",
    "[border-top:1px_solid_#e8ecf2]",
    "[background:#fbfcff]"
  ],
  "project-empty-state": [
    "[display:flex]",
    "[flex-direction:column]",
    "[align-items:center]",
    "[gap:8px]",
    "[padding:32px_20px]",
    "[border:2px_dashed_#e2e8f0]",
    "[border-radius:12px]",
    "[background:#fafbff]",
    "[text-align:center]",
    "[&_>_.material-symbols-outlined]:[width:48px]",
    "[&_>_.material-symbols-outlined]:[height:48px]",
    "[&_>_.material-symbols-outlined]:[display:grid]",
    "[&_>_.material-symbols-outlined]:[place-items:center]",
    "[&_>_.material-symbols-outlined]:[border-radius:50%]",
    "[&_>_.material-symbols-outlined]:[background:#eff6ff]",
    "[&_>_.material-symbols-outlined]:[color:#2563eb]",
    "[&_strong]:[font-size:14px]",
    "[&_p]:[margin:0]",
    "[&_p]:[color:#7a8596]",
    "[&_p]:[font-size:12px]"
  ],
  "task-side-column": [
    "[min-width:0]"
  ],
  "task-added-card": [
    "[padding:20px]",
    "[padding:16px]",
    "[border-radius:12px]"
  ],
  "task-added-heading": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:8px]",
    "[margin-bottom:18px]",
    "[&_h2]:[margin:0]",
    "[&_h2]:[font-size:16px]",
    "[&_>_span]:[min-width:24px]",
    "[&_>_span]:[padding:3px_7px]",
    "[&_>_span]:[border-radius:14px]",
    "[&_>_span]:[background:#3b82f6]",
    "[&_>_span]:[color:white]",
    "[&_>_span]:[text-align:center]",
    "[&_>_span]:[font-size:12px]",
    "[&_>_span]:[font-weight:700]",
    "[margin-bottom:12px]"
  ],
  "project-editor-actions": [
    "[display:flex]",
    "[justify-content:space-between]",
    "[gap:16px]",
    "[margin-top:24px]",
    "[&_>_div]:[display:flex]",
    "[&_>_div]:[gap:10px]",
    "max-[700px]:[flex-wrap:wrap]",
    "[&_.project-primary]:[gap:6px]",
    "[&_.project-primary_.material-symbols-outlined]:[font-size:18px]",
    "max-[700px]:[&_>_div]:[flex-wrap:wrap]"
  ],
  "project-primary": [
    "[display:inline-flex]",
    "[align-items:center]",
    "[justify-content:center]",
    "[min-height:42px]",
    "[box-sizing:border-box]",
    "[border-radius:9px]",
    "[padding:10px_20px]",
    "[font:inherit]",
    "[font-size:14px]",
    "[font-weight:650]",
    "[text-decoration:none]",
    "[cursor:pointer]",
    "[border:1px_solid_#3b82f6]",
    "[color:#fff]",
    "[background:#3b82f6]",
    "[&:hover]:[background:#246bd9]",
    "[&:disabled]:[opacity:.55]",
    "[&:disabled]:[cursor:wait]"
  ],
  "project-secondary": [
    "[display:inline-flex]",
    "[align-items:center]",
    "[justify-content:center]",
    "[min-height:42px]",
    "[box-sizing:border-box]",
    "[border-radius:9px]",
    "[padding:10px_20px]",
    "[font:inherit]",
    "[font-size:14px]",
    "[font-weight:650]",
    "[text-decoration:none]",
    "[cursor:pointer]",
    "[border:1px_solid_#d3dce8]",
    "[color:#56647a]",
    "[background:white]",
    "[&:hover]:[background:#f6f9fd]"
  ],
  "holiday-select-heading": [
    "[margin:2px_0_4px]",
    "[font-size:13px]"
  ],
  "holiday-caption": [
    "[margin:0_0_12px]!"
  ],
  "holiday-calendar": [
    "[min-width:0]"
  ],
  "holiday-calendar-heading": [
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[margin-bottom:12px]",
    "[&_button]:[width:30px]",
    "[&_button]:[height:30px]",
    "[&_button]:[border:0]",
    "[&_button]:[border-radius:6px]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#2563eb]",
    "[&_button]:[font-size:20px]",
    "[&_button]:[cursor:pointer]",
    "[&_button:hover]:[background:#eff6ff]",
    "[&_strong]:[color:#1f2937]",
    "[&_strong]:[font-size:13px]"
  ],
  "holiday-calendar-grid": [
    "[display:grid]",
    "[grid-template-columns:repeat(7,minmax(28px,1fr))]",
    "[gap:4px]",
    "[&_>_*]:[display:grid]",
    "[&_>_*]:[min-height:30px]",
    "[&_>_*]:[place-items:center]",
    "[&_.weekday]:[color:#94a3b8]",
    "[&_.weekday]:[font-size:11px]",
    "[&_button]:[border:0]",
    "[&_button]:[border-radius:7px]",
    "[&_button]:[background:#fff]",
    "[&_button]:[color:#475569]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:11px]",
    "[&_button]:[cursor:pointer]",
    "[&_button:hover:not(:disabled)]:[background:#eff6ff]",
    "[&_button:hover:not(:disabled)]:[color:#2563eb]",
    "[&_button.outside]:[color:#cbd5e1]",
    "[&_button.selected]:[background:#2563eb]",
    "[&_button.selected]:[color:#fff]",
    "[&_button:disabled]:[cursor:default]",
    "[&_button:disabled]:[opacity:.35]",
    "max-[700px]:[gap:2px]"
  ],
  "sprint-roadmap-card": [
    "[padding:22px_24px]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:12px]",
    "[background:#fff]",
    "[&_h2]:[margin:0_0_16px]",
    "[&_h2]:[font-size:15px]",
    "max-[700px]:[padding:16px]"
  ],
  "sprint-roadmap-table-wrap": [
    "[overflow-x:auto]",
    "[border:1px_solid_#dbe5f2]",
    "[border-radius:8px]"
  ],
  "sprint-roadmap-table": [
    "[width:100%]",
    "[min-width:650px]",
    "[border-collapse:collapse]",
    "[font-size:12px]",
    "[text-align:left]",
    "[&_th]:[padding:11px_14px]",
    "[&_th]:[background:#eff4ff]",
    "[&_th]:[color:#475569]",
    "[&_th]:[font-weight:700]",
    "[&_td]:[padding:11px_14px]",
    "[&_td]:[border-top:1px_solid_#e8eef6]",
    "[&_td]:[color:#475569]",
    "[&_td:nth-child(4)]:[color:#16a34a]",
    "[&_td:nth-child(4)]:[font-weight:650]"
  ],
  "sprint-row-edit": [
    "[margin-top:5px]",
    "[&_summary]:[width:fit-content]",
    "[&_summary]:[color:#2563eb]",
    "[&_summary]:[font-size:11px]",
    "[&_summary]:[cursor:pointer]",
    "[&_>_.project-grid]:[margin:12px_0]",
    "[&_>_.project-field]:[margin:12px_0]",
    "[&_.project-field_input]:[min-height:36px]",
    "[&_.project-field_input]:[font-size:12px]"
  ],
  "task-form-stack": [
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:14px]",
    "[min-width:0]"
  ],
  "task-form-card": [
    "[padding:20px]",
    "[border-radius:12px]",
    "[&_.project-card-heading]:[margin-bottom:15px]",
    "[&_.project-card-heading]:[padding-bottom:0]",
    "[&_.project-card-heading]:[border:0]",
    "[&_.project-card-heading_h2]:[font-size:15px]",
    "[&_.project-card-heading_p]:[font-size:11px]",
    "[&_>_.project-grid]:[margin-bottom:14px]",
    "[&_>_.project-grid]:[gap:12px]",
    "[&_.project-grid]:[margin-bottom:14px]",
    "[&_.project-grid]:[gap:12px]",
    "[&_.project-field]:[font-size:11px]",
    "[&_.project-field_input]:[min-height:36px]",
    "[&_.project-field_input]:[padding:8px_10px]",
    "[&_.project-field_input]:[font-size:12px]",
    "[&_.project-field_textarea]:[min-height:36px]",
    "[&_.project-field_textarea]:[padding:8px_10px]",
    "[&_.project-field_textarea]:[font-size:12px]",
    "[&_.project-field_select]:[min-height:36px]",
    "[&_.project-field_select]:[padding:8px_10px]",
    "[&_.project-field_select]:[font-size:12px]",
    "max-[700px]:[padding:16px]"
  ],
  "dependency-add-trigger": [
    "[width:100%]",
    "[min-height:36px]",
    "[border:1px_dashed_#cbd5e1]",
    "[border-radius:7px]",
    "[background:#f8fafc]",
    "[color:#2563eb]",
    "[font:inherit]",
    "[font-size:11px]",
    "[text-align:left]",
    "[cursor:pointer]"
  ],
  "task-dependency-editor": [
    "[display:grid]",
    "[gap:10px]",
    "[margin-top:10px]",
    "[padding:12px]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:8px]",
    "[&_.project-row-heading]:[margin:0]",
    "[&_.project-row-heading]:[font-size:11px]",
    "[&_.project-row-heading_button]:[border:0]",
    "[&_.project-row-heading_button]:[background:transparent]",
    "[&_.project-row-heading_button]:[color:#dc2626]",
    "[&_.project-row-heading_button]:[font:inherit]",
    "[&_.project-row-heading_button]:[cursor:pointer]",
    "[&_.project-field_input]:[min-height:34px]",
    "[&_.project-field_select]:[min-height:34px]"
  ],
  "task-step": [
    "[align-items:start]"
  ],
  "project-step-shell": [
    "[padding:36px]",
    "[border:1px_solid_#dce5f2]",
    "[border-radius:16px]",
    "[background:#fff]",
    "[box-shadow:0_8px_30px_#0f172a08]",
    "[&_.project-editor-actions]:[margin-top:42px]",
    "max-[700px]:[padding:18px]"
  ],
  "project-upload-card": [
    "[padding:24px]",
    "[border-radius:16px]",
    "[&_>_h2]:[margin:0_0_12px]",
    "[&_>_h2]:[color:#172033]",
    "[&_>_h2]:[font-size:16px]",
    "[&_>_h2]:[font-weight:700]",
    "[&_>_h2_span]:[color:#7a8596]",
    "[&_>_h2_span]:[font-weight:400]",
    "[&_.project-info-strip]:[min-height:46px]",
    "[&_.project-info-strip]:[align-items:flex-start]",
    "[&_.project-info-strip]:[margin-bottom:20px]",
    "[&_.project-info-strip]:[padding:12px_16px]",
    "[&_.project-drop-zone]:[min-height:185px]",
    "[&_.project-drop-zone]:[box-sizing:border-box]",
    "[&_.project-drop-zone]:[padding:28px_16px]",
    "[&_.project-drop-zone]:[border-width:2.5px]",
    "[&_.project-drop-zone]:[margin-bottom:20px]",
    "[&_.project-drop-zone_>_span]:[margin-bottom:2px]",
    "[&_.project-drop-zone_>_span]:[color:#9aa5b5]",
    "[&_.project-drop-zone_>_span]:[font-size:48px]",
    "[&_.project-drop-zone_>_span]:[line-height:1]",
    "[&_.project-drop-zone_strong]:[display:inline-flex]",
    "[&_.project-drop-zone_strong]:[align-items:center]",
    "[&_.project-drop-zone_strong]:[min-height:36px]",
    "[&_.project-drop-zone_strong]:[padding:8px_20px]",
    "[&_.project-drop-zone_strong]:[box-sizing:border-box]",
    "[&_.project-drop-zone_strong]:[border-radius:6px]",
    "[&_.project-drop-zone_strong]:[background:#1157ce]",
    "[&_.project-drop-zone_strong]:[color:#fff]",
    "[&_.project-drop-zone_strong]:[font-size:13px]",
    "[&:nth-child(2)_.project-drop-zone_strong]:[border:1px_solid_#cbd5e1]",
    "[&:nth-child(2)_.project-drop-zone_strong]:[background:#fff]",
    "[&:nth-child(2)_.project-drop-zone_strong]:[color:#172033]",
    "[&_.project-drop-zone_small]:[color:#66758d]",
    "[&_.project-drop-zone_small]:[font-size:12px]",
    "[&_.project-drop-zone_small]:[text-align:center]",
    "[&_.project-file]:[gap:12px]",
    "[&_.project-file]:[margin:0_0_18px]",
    "[&_.project-file]:[padding:12px_16px]"
  ],
  "project-upload-details": [
    "[padding-top:20px]",
    "[border-top:1px_solid_#edf1f6]",
    "[&_h3]:[margin:0_0_16px]",
    "[&_h3]:[font-size:14px]",
    "[&_h3]:[font-weight:700]",
    "[&_.project-grid]:[margin-bottom:0]",
    "[&_.project-field]:[font-size:12px]"
  ],
  "project-files-table": [
    "[&_.file-type]:[display:inline-block]",
    "[&_.file-type]:[flex:0_0_auto]",
    "[&_.file-type]:[padding:4px_6px]",
    "[&_.file-type]:[border-radius:5px]",
    "[&_.file-type]:[background:#e03d4c]",
    "[&_.file-type]:[color:#fff]",
    "[&_.file-type]:[font-size:10px]",
    "[&_.file-type]:[font-weight:800]",
    "[&_button]:[padding:3px]",
    "[&_button]:[border:0]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#8390a1]",
    "[&_button]:[cursor:pointer]",
    "[&_button:hover]:[color:#2563eb]",
    "[&_button_.material-symbols-outlined]:[font-size:18px]",
    "[max-width:100%]",
    "[overflow-x:auto]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:10px]",
    "[&_table]:[width:100%]",
    "[&_table]:[min-width:560px]",
    "[&_table]:[border-collapse:collapse]",
    "[&_table]:[font-size:12px]",
    "[&_table]:[text-align:left]",
    "[&_th]:[padding:10px_8px]",
    "[&_th]:[border-bottom:1px_solid_#edf1f6]",
    "[&_th]:[white-space:nowrap]",
    "[&_td]:[padding:10px_8px]",
    "[&_td]:[border-bottom:1px_solid_#edf1f6]",
    "[&_td]:[white-space:nowrap]",
    "[&_th]:[background:#f8fafc]",
    "[&_th]:[color:#64748b]",
    "[&_th]:[font-weight:700]",
    "[&_td:first-child]:[max-width:180px]",
    "[&_td:first-child]:[overflow:hidden]",
    "[&_td:first-child]:[text-overflow:ellipsis]",
    "[&_td:first-child_.file-type]:[margin-right:6px]"
  ],
  "project-no-files": [
    "[padding:24px]",
    "[border:1px_dashed_#cbd5e1]",
    "[border-radius:10px]",
    "[color:#94a3b8]",
    "[font-size:13px]",
    "[text-align:center]"
  ],
  "project-resource-links": [
    "[margin-top:20px]",
    "[color:#344054]",
    "[font-size:13px]",
    "[&_summary]:[cursor:pointer]",
    "[&_summary]:[font-weight:650]",
    "[&_.project-inline]:[margin-top:10px]",
    "[&_input]:[min-width:0]",
    "[&_input]:[flex:1]",
    "[&_input]:[padding:9px_12px]",
    "[&_input]:[border:1px_solid_#d3dce8]",
    "[&_input]:[border-radius:8px]",
    "[&_input]:[font:inherit]"
  ],
  "department-section": [
    "[&_>_h2]:[margin:0_0_20px]",
    "[&_>_h2]:[color:#172033]",
    "[&_>_h2]:[font-size:18px]",
    "[&_>_h2]:[font-weight:800]",
    "[&_.project-info-strip]:[align-items:center]",
    "[&_.project-info-strip]:[margin-bottom:24px]"
  ],
  "department-copy": [
    "[min-width:0]"
  ],
  "assign-team-card": [
    "[&_.project-card-heading]:[padding:0]",
    "[&_.project-card-heading]:[border:0]"
  ],
  "team-select-cell": [
    "[position:relative]"
  ],
  "team-select-trigger": [
    "[width:180px]",
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[padding:8px_12px]",
    "[border:1px_solid_#cbd5e1]",
    "[border-radius:8px]",
    "[background:#fff]",
    "[color:#475569]",
    "[font:inherit]",
    "[font-size:13px]",
    "[cursor:pointer]",
    "[&_.material-symbols-outlined]:[color:#94a3b8]",
    "[&_.material-symbols-outlined]:[font-size:18px]"
  ],
  "team-select-menu": [
    "[position:absolute]",
    "[z-index:10]",
    "[top:calc(100%_-_8px)]",
    "[left:16px]",
    "[width:280px]",
    "[max-height:220px]",
    "[overflow-y:auto]",
    "[padding:4px_0]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:8px]",
    "[background:#fff]",
    "[box-shadow:0_10px_24px_#0f172a1a]",
    "[&_button]:[width:100%]",
    "[&_button]:[display:flex]",
    "[&_button]:[align-items:center]",
    "[&_button]:[gap:10px]",
    "[&_button]:[padding:8px_12px]",
    "[&_button]:[border:0]",
    "[&_button]:[background:#fff]",
    "[&_button]:[text-align:left]",
    "[&_button]:[cursor:pointer]",
    "[&_button:hover]:[background:#eff6ff]",
    "[&_button.active]:[background:#eff6ff]",
    "[&_button_>_span:nth-child(2)]:[display:flex]",
    "[&_button_>_span:nth-child(2)]:[flex:1]",
    "[&_button_>_span:nth-child(2)]:[flex-direction:column]",
    "[&_button_>_span:nth-child(2)]:[min-width:0]",
    "[&_button_strong]:[overflow:hidden]",
    "[&_button_strong]:[color:#1f2937]",
    "[&_button_strong]:[font-size:13px]",
    "[&_button_strong]:[text-overflow:ellipsis]",
    "[&_button_strong]:[white-space:nowrap]",
    "[&_button_small]:[color:#94a3b8]",
    "[&_button_small]:[font-size:11px]",
    "[&_button_>_.material-symbols-outlined]:[color:#2563eb]",
    "[&_button_>_.material-symbols-outlined]:[font-size:16px]",
    "[&_p]:[margin:0]",
    "[&_p]:[padding:12px]",
    "[&_p]:[color:#94a3b8]",
    "[&_p]:[font-size:12px]"
  ],
  "team-member-avatar": [
    "[width:28px]",
    "[height:28px]",
    "[display:grid]",
    "[flex:0_0_28px]",
    "[place-items:center]",
    "[border-radius:50%]",
    "[background:#3b82f6]",
    "[color:#fff]",
    "[font-size:10px]",
    "[font-weight:700]"
  ],
  "priority": [
    "[display:inline-flex]",
    "[min-width:73px]",
    "[height:36px]",
    "[align-items:center]",
    "[justify-content:center]",
    "[border-radius:9px]",
    "[font-size:11px]",
    "[&.low]:[background:#c9d77f]",
    "[&.high]:[background:#ef777b]",
    "[&.medium]:[background:#bdc8f7]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



const steps = ['Project information', 'PDR & resources', 'Departments & Team',
  'Milestone and features', 'Configure Sprint', 'Create Tasks']
const DRAFT_KEY = 'pm_create_project_draft'
const key = () => crypto.randomUUID()
const empty = () => ({
  projectCode: '', projectName: '', description: '', customer: '', projectManager: '',
  priority: 'medium', projectType: 'web', startDate: '', endDate: '',
  links: [], files: [], pdrVersion: 'V1.0', pdrChangelog: '', departments: [], members: [],
  milestones: [], sprints: [], tasks: [], dependencies: [], pointsPerDay: 2,
  sprintDuration: 14, weekendDays: [0, 6], holidays: [],
})
const milestoneItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', features: [] })
const featureItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', status: 'pending', priority: 'medium' })
const taskItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', priority: 'medium',
  assignee: '', reviewer: '', sprintKey: '', milestoneKey: '', featureKey: '' })
const dependencyItem = (taskKey = '') => ({ key: key(), taskKey, dependsOnKey: '', description: '', dependencyType: 'optional', assignee: '', dueDate: '' })
const dateOnly = value => value?.slice(0, 10) || ''
const userName = user => `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.user_name
const departmentMeta = {
  Hardware: ['HW', 'memory', 'Hardware design, circuit design, PCB, prototyping', '#16a34a', '#f0fdf4'],
  Firmware: ['FW', 'developer_board', 'Embedded firmware, BSP, drivers, bootloaders', '#eab308', '#fef9c3'],
  Software: ['SW', 'code', 'Application software, cloud, mobile, website', '#3b82f6', '#eff6ff'],
  Mechanical: ['ME', 'settings', 'Mechanical design, enclosure, CAD', '#f97316', '#fff7ed'],
  Testing: ['TE', 'science', 'Test planning, validation and verification', '#a855f7', '#faf5ff'],
  Production: ['PR', 'factory', 'Manufacturing and production support', '#ef4444', '#fef2f2'],
  'Quality Assurance': ['QA', 'verified_user', 'Quality planning, audits and compliance', '#0d9488', '#f0fdfa'],
  QA: ['QA', 'verified_user', 'Quality planning, audits and compliance', '#0d9488', '#f0fdfa'],
  Documentation: ['Doc', 'description', 'Technical writing, user docs, manuals', '#64748b', '#f1f5f9'],
  Management: ['MG', 'groups', 'Project planning, coordination, resource management', '#7c3aed', '#f5f3ff'],
}
const departmentOrder = ['Hardware', 'Firmware', 'Software', 'Mechanical', 'Testing', 'Production', 'Quality Assurance', 'QA', 'Documentation', 'Management']
const fileLimit = 100 * 1024 * 1024
const pdrExtensions = new Set(['pdf', 'doc', 'docx'])
const resourceExtensions = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar'])
const extension = name => name.split('.').pop()?.toLowerCase() || ''
const fileSize = size => size == null ? '—' : size < 1024 * 1024
  ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`
const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric',
}) : 'N/A'
const sprintWorkingDays = sprint => {
  if (!sprint.startDate || !sprint.endDate) return 0
  let days = 0
  for (let time = Date.parse(`${sprint.startDate}T00:00:00Z`); time <= Date.parse(`${sprint.endDate}T00:00:00Z`); time += 86400000) {
    const date = new Date(time)
    const value = date.toISOString().slice(0, 10)
    if ((!sprint.excludeWeekends || ![0, 6].includes(date.getUTCDay())) && !sprint.offDays.includes(value)) days += 1
  }
  return days
}
const readableError = error => {
  if (!(error instanceof ApiError) || !error.data) return error.message || 'Unable to save this project.'
  const detail = error.data.detail || error.data
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}

function fromApi(project, files) {
  const milestones = (project.milestones || []).map(milestone => ({
    id: milestone.id, key: String(milestone.id), name: milestone.name || '',
    description: milestone.description || '', startDate: dateOnly(milestone.start_date),
    dueDate: dateOnly(milestone.due_date),
    features: (milestone.features || []).map(feature => ({
      id: feature.id, key: String(feature.id), name: feature.feature_name || '',
      description: feature.description || '', startDate: dateOnly(feature.feature_start_date),
      dueDate: dateOnly(feature.feature_due_date), status: feature.feature_status || 'pending',
      priority: feature.feature_priority || 'medium',
    })),
  }))
  const sprints = (project.sprints || []).map(sprint => ({
    id: sprint.id, key: String(sprint.id), number: sprint.Sprint_No || '', name: sprint.Sprint_Name || '',
    startDate: dateOnly(sprint.Sprint_start_date), endDate: dateOnly(sprint.Sprint_end_date),
    excludeWeekends: sprint.exclude_weekends ?? true, members: sprint.team_members || [],
    offDays: (sprint.off_days || []).map(dateOnly),
  }))
  const tasks = (project.tasks || []).map(task => {
    let priority = 'medium'
    try { priority = JSON.parse(task.Remarks || '{}').priority || 'medium' } catch { /* existing free text */ }
    return {
      id: task.id, key: String(task.id), name: task.Task_Name || '', description: task.description || '',
      startDate: dateOnly(task.planned_start_date), dueDate: dateOnly(task.Due_Date), priority,
      remarksRaw: task.Remarks || '', originalPriority: priority,
      assignee: task.assigned_to || '', reviewer: task.review_by || '',
      sprintKey: sprints.find(sprint => String(sprint.id) === String(task.sprint))?.key || '',
      milestoneKey: milestones.find(milestone => milestone.features.some(feature => String(feature.id) === String(task.feature)))?.key || '',
      featureKey: milestones.flatMap(milestone => milestone.features).find(feature => String(feature.id) === String(task.feature))?.key || '',
    }
  })
  return {
    projectCode: project.project_code || '', projectName: project.project_name || '',
    description: project.description || '', customer: project.customer_name || '',
    projectManager: project.project_managers?.[0] || '', priority: project.priority_name || 'medium',
    projectType: project.project_type_name || 'web', startDate: dateOnly(project.start_date),
    endDate: dateOnly(project.end_date), links: project.resource_links || [],
    files: files.map(file => ({ ...file, key: file.id })),
    pdrVersion: files.find(file => file.is_pdr)?.pdr_version || 'V1.0',
    pdrChangelog: files.find(file => file.is_pdr)?.pdr_changelog || '',
    departments: project.departments || [], members: project.team_members || [],
    milestones, sprints, tasks,
    dependencies: (project.dependencies || []).map(dependency => ({
      id: dependency.id, key: String(dependency.id),
      taskKey: tasks.find(task => task.id === dependency.task)?.key || '',
      dependsOnKey: tasks.find(task => task.id === dependency.depends_on)?.key || '',
      taskId: dependency.task, dependsOnId: dependency.depends_on,
      description: dependency.description || '', dependencyType: dependency.dependency_type || 'optional',
      assignee: dependency.assigned_to || '',
      dueDate: dateOnly(dependency.due_date),
    })),
    pointsPerDay: project.points_per_working_day || 2,
    sprintDuration: sprints.length ? Math.max(1, Math.round((Date.parse(sprints[0].endDate) - Date.parse(sprints[0].startDate)) / 86400000) + 1) : 14,
    weekendDays: sprints[0]?.excludeWeekends === false ? [] : [0, 6],
    holidays: [...new Set(sprints.flatMap(sprint => sprint.offDays))],
  }
}

function validate(form, projectOnly = false) {
  const errors = {}
  if (!form.projectCode.trim()) errors.projectCode = 'Project code is required.'
  else if (form.projectCode.trim().length < 2) errors.projectCode = 'Project code must be at least 2 characters.'
  if (!form.projectName.trim()) errors.projectName = 'Project name is required.'
  else if (form.projectName.trim().length < 3) errors.projectName = 'Project name must be at least 3 characters.'
  if (!form.description.trim()) errors.description = 'Description is required.'
  else if (form.description.trim().length < 10) errors.description = 'Description must be at least 10 characters.'
  if (!form.customer.trim()) errors.customer = 'Customer is required.'
  else if (form.customer.trim().length < 2) errors.customer = 'Customer must be at least 2 characters.'
  if (!form.projectManager) errors.projectManager = 'Select a project manager.'
  if (!form.priority) errors.priority = 'Select a priority.'
  if (!form.projectType) errors.projectType = 'Select a project type.'
  if (!form.startDate) errors.startDate = 'Start date is required.'
  if (!form.endDate) errors.endDate = 'End date is required.'
  if (form.startDate && form.endDate && form.endDate <= form.startDate) errors.endDate = 'End date must be after start date.'
  if (form.links.some(link => link && !/^https?:\/\//i.test(link))) errors.links = 'Links must start with http:// or https://.'
  if (!form.files.some(item => item.is_pdr)) errors.pdrFile = 'Upload a PDR to continue.'
  if (!form.pdrVersion.trim()) errors.pdrVersion = 'PDR version is required.'
  if (form.files.some(item => item.is_pdr && item.file?.size > fileLimit)) errors.pdrFile = 'PDR file exceeds the 100 MB limit.'
  if (form.files.some(item => !item.is_pdr && item.file?.size > fileLimit)) errors.resourceFiles = 'Resource files must be 100 MB or smaller.'
  if (!form.departments.length) errors.departments = 'Select at least one department.'
  if (projectOnly) return errors
  if (!form.milestones.length) errors.milestones = 'Add at least one milestone.'
  form.milestones.forEach((milestone, index) => {
    if (!milestone.name.trim()) errors.milestones = `Milestone ${index + 1} needs a name.`
    if (!milestone.dueDate) errors.milestones = `Milestone ${index + 1} needs a due date.`
    if (milestone.startDate && milestone.dueDate && milestone.dueDate < milestone.startDate) errors.milestones = `Milestone ${index + 1} dates are invalid.`
    if (!milestone.features.length) errors.milestones = `Milestone ${index + 1} needs at least one feature.`
    milestone.features.forEach((feature, featureIndex) => {
      if (!feature.name.trim()) errors.milestones = `Feature ${featureIndex + 1} in milestone ${index + 1} needs a name.`
      if (feature.startDate && feature.dueDate && feature.dueDate < feature.startDate) errors.milestones = `Feature ${featureIndex + 1} dates are invalid.`
    })
  })
  form.sprints.forEach((sprint, index) => {
    if (!sprint.name.trim() || !sprint.startDate || !sprint.endDate || sprint.endDate < sprint.startDate)
      errors.sprints = `Sprint ${index + 1} needs a name and valid dates.`
    if (sprint.offDays.some(day => day < sprint.startDate || day > sprint.endDate))
      errors.sprints = `Sprint ${index + 1} has an off day outside its dates.`
  })
  if (!form.tasks.length) errors.tasks = 'Add at least one task.'
  form.tasks.forEach((task, index) => {
    if (!task.name.trim() || !task.assignee) errors.tasks = `Task ${index + 1} needs a name and assignee.`
    if (task.startDate && task.dueDate && task.dueDate < task.startDate) errors.tasks = `Task ${index + 1} dates are invalid.`
  })
  form.dependencies.forEach((dependency, index) => {
    if (!dependency.taskKey || !dependency.description.trim()) errors.tasks = `Dependency ${index + 1} needs a task and description.`
    if (dependency.taskKey === dependency.dependsOnKey) errors.tasks = `Dependency ${index + 1} cannot point to its own task.`
  })
  return errors
}

function Field({ label, children, error, hint }) {
  return <label className={styling("project-field")}><span>{label}</span>{children}
    {error && <small role="alert" className={styling("project-error")}>{error}</small>}
    {!error && hint && <small className={styling("project-hint")}>{hint}</small>}
  </label>
}

function SelectUser({ value, onChange, users, placeholder = 'Select team member', optional = false }) {
  return <select value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{optional ? 'None' : placeholder}</option>
    {users.map(user => <option key={user.id} value={user.id}>{userName(user)}</option>)}
  </select>
}

export default function ProjectEditorPage({ user }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { loadProjects } = useProjectSelection()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(empty)
  const [initial, setInitial] = useState(null)
  const [originalFiles, setOriginalFiles] = useState([])
  const [options, setOptions] = useState({ users: [], departments: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [holidayMonth, setHolidayMonth] = useState(() => new Date())
  const [sprintOffDates, setSprintOffDates] = useState({})
  const [openTeamDepartment, setOpenTeamDepartment] = useState(null)
  const [milestoneDraft, setMilestoneDraft] = useState(milestoneItem)
  const [editingMilestoneKey, setEditingMilestoneKey] = useState(null)
  const [expandedMilestones, setExpandedMilestones] = useState({})
  const [taskDraft, setTaskDraft] = useState(taskItem)
  const [editingTaskKey, setEditingTaskKey] = useState(null)
  const canCreateChildren = roleSlug(user?.role) === 'admin' || ['Milestones', 'Features', 'Tasks'].every(
    module => user?.permissions?.[module]?.Create === true,
  )
  const projectOnlyCreation = !projectId && !canCreateChildren
  const visibleSteps = projectOnlyCreation ? steps.slice(0, 3) : steps
  const lastStep = visibleSteps.length - 1
  const draftKey = `${DRAFT_KEY}:${user?.id || 'anonymous'}`
  const selectedUsers = useMemo(() => options.users.filter(user => form.members.some(id => String(id) === String(user.id)) || String(user.id) === String(form.projectManager)), [options.users, form.members, form.projectManager])
  const departments = useMemo(() => [...options.departments].sort((a, b) => {
    const aIndex = departmentOrder.indexOf(a.name)
    const bIndex = departmentOrder.indexOf(b.name)
    return (aIndex < 0 ? departmentOrder.length : aIndex) - (bIndex < 0 ? departmentOrder.length : bIndex) || a.name.localeCompare(b.name)
  }), [options.departments])

  useEffect(() => {
    let active = true
    Promise.all([projectOptions(projectId), ...(projectId ? [projectSetup(projectId), projectFiles(projectId)] : [])])
      .then(([choices, project, files]) => {
        if (!active) return
        setOptions(choices)
        if (project) {
          const loaded = fromApi(project, files)
          setForm(loaded)
          setInitial(loaded)
          setOriginalFiles(files)
        } else {
          try {
            const draft = JSON.parse(localStorage.getItem(draftKey))
            if (draft) setForm(current => ({ ...current, ...draft, files: [] }))
          } catch { localStorage.removeItem(draftKey) }
        }
      })
      .catch(error => { if (active) setMessage(readableError(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [draftKey, projectId])

  const field = (name, value) => setForm(current => ({ ...current, [name]: value }))
  const patchItem = (collection, itemKey, change) => setForm(current => ({
    ...current, [collection]: current[collection].map(item => item.key === itemKey ? { ...item, ...change } : item),
  }))
  const removeTask = taskKey => setForm(current => ({
    ...current, tasks: current.tasks.filter(task => task.key !== taskKey),
    dependencies: current.dependencies.filter(dep => dep.taskKey !== taskKey && dep.dependsOnKey !== taskKey),
  }))
  const patchMilestone = (milestoneKey, change) => patchItem('milestones', milestoneKey, change)
  const patchFeature = (milestoneKey, featureKey, change) => setForm(current => ({
    ...current, milestones: current.milestones.map(milestone => milestone.key === milestoneKey ? {
      ...milestone, features: milestone.features.map(feature => feature.key === featureKey ? { ...feature, ...change } : feature),
    } : milestone),
  }))
  const removeMilestone = milestoneKey => setForm(current => {
    const keys = new Set(current.milestones.find(item => item.key === milestoneKey)?.features.map(feature => feature.key))
    return { ...current, milestones: current.milestones.filter(item => item.key !== milestoneKey),
      tasks: current.tasks.map(task => keys.has(task.featureKey) ? { ...task, featureKey: '' } : task) }
  })
  const removeFeature = (milestoneKey, featureKey) => setForm(current => ({
    ...current, milestones: current.milestones.map(milestone => milestone.key === milestoneKey ? {
      ...milestone, features: milestone.features.filter(feature => feature.key !== featureKey),
    } : milestone),
    tasks: current.tasks.map(task => task.featureKey === featureKey ? { ...task, featureKey: '' } : task),
  }))
  const resetMilestoneDraft = () => { setMilestoneDraft(milestoneItem()); setEditingMilestoneKey(null) }
  const saveMilestoneDraft = () => {
    if (!milestoneDraft.name.trim() || !milestoneDraft.startDate || !milestoneDraft.dueDate) {
      setErrors(current => ({ ...current, milestones: 'Milestone name, start date and end date are required.' }))
      return
    }
    if (milestoneDraft.dueDate < milestoneDraft.startDate) {
      setErrors(current => ({ ...current, milestones: 'Milestone end date must be after its start date.' }))
      return
    }
    const savedKey = editingMilestoneKey || key()
    setForm(current => ({ ...current, milestones: editingMilestoneKey
      ? current.milestones.map(item => item.key === editingMilestoneKey ? { ...item, ...milestoneDraft, key: item.key } : item)
      : [...current.milestones, { ...milestoneDraft, key: savedKey, features: [] }] }))
    setExpandedMilestones(current => ({ ...current, [savedKey]: true }))
    setErrors(current => ({ ...current, milestones: '' }))
    resetMilestoneDraft()
  }
  const editMilestone = milestone => {
    setMilestoneDraft({ ...milestone })
    setEditingMilestoneKey(milestone.key)
    document.getElementById('milestone-add-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const resetTaskDraft = () => { setTaskDraft(taskItem()); setEditingTaskKey(null) }
  const saveTaskDraft = () => {
    if (!taskDraft.name.trim() || !taskDraft.sprintKey || !taskDraft.startDate || !taskDraft.dueDate || !taskDraft.milestoneKey || !taskDraft.featureKey || !taskDraft.assignee) {
      setErrors(current => ({ ...current, tasks: 'Task name, sprint, dates, milestone, feature, and assignee are required.' }))
      return
    }
    if (taskDraft.startDate && taskDraft.dueDate && taskDraft.dueDate < taskDraft.startDate) {
      setErrors(current => ({ ...current, tasks: 'Task due date must be after its start date.' }))
      return
    }
    if (taskDraft.reviewer && String(taskDraft.reviewer) === String(taskDraft.assignee)) {
      setErrors(current => ({ ...current, tasks: 'The reviewer and assignee must be different team members.' }))
      return
    }
    setForm(current => ({ ...current, tasks: editingTaskKey
      ? current.tasks.map(item => item.key === editingTaskKey ? { ...item, ...taskDraft, key: item.key } : item)
      : [...current.tasks, { ...taskDraft }] }))
    setErrors(current => ({ ...current, tasks: '' }))
    resetTaskDraft()
  }
  const editTask = task => { setTaskDraft({ ...task }); setEditingTaskKey(task.key) }
  const toggle = (name, id) => field(name, form[name].includes(id) ? form[name].filter(item => item !== id) : [...form[name], id])
  const toggleDepartment = id => setForm(current => {
    if (!current.departments.includes(id)) return { ...current, departments: [...current.departments, id] }
    const departmentUserIds = new Set(options.users.filter(item => item.department_link_id === id).map(item => item.id))
    return { ...current, departments: current.departments.filter(item => item !== id),
      members: current.members.filter(userId => !departmentUserIds.has(userId)) }
  })
  const addFiles = (files, isPdr) => {
    const selected = Array.from(files)
    const allowed = isPdr ? pdrExtensions : resourceExtensions
    const invalid = selected.find(file => !allowed.has(extension(file.name)) || file.size > fileLimit)
    if (invalid) {
      setErrors(current => ({ ...current, [isPdr ? 'pdrFile' : 'resourceFiles']:
        `${invalid.name}: choose a supported file of 100 MB or less.` }))
      return
    }
    const items = (isPdr ? selected.slice(0, 1) : selected).map(file => ({
      key: key(), file, name: file.name, size: file.size, is_pdr: isPdr,
    }))
    setForm(current => ({ ...current, files: isPdr
      ? [...current.files.filter(item => !item.is_pdr), ...items]
      : [...current.files, ...items] }))
    setErrors(current => ({ ...current, [isPdr ? 'pdrFile' : 'resourceFiles']: '' }))
  }
  const downloadFile = item => {
    if (item.url) { window.open(item.url, '_blank', 'noopener,noreferrer'); return }
    if (!item.file) return
    const url = URL.createObjectURL(item.file)
    const link = document.createElement('a')
    link.href = url
    link.download = item.name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const generateSprints = () => {
    if (!form.startDate || !form.endDate || form.endDate < form.startDate || Number(form.sprintDuration) < 1) {
      setMessage('Set a valid project date range and sprint duration first.')
      return
    }
    const first = Date.parse(`${form.startDate}T00:00:00Z`)
    const last = Date.parse(`${form.endDate}T00:00:00Z`)
    const duration = Number(form.sprintDuration)
    const count = Math.ceil((last - first + 86400000) / (duration * 86400000))
    if (count > 500) { setMessage('Use a longer sprint duration to keep the roadmap under 500 sprints.'); return }
    const date = time => new Date(time).toISOString().slice(0, 10)
    const sprints = Array.from({ length: count }, (_, index) => {
      const start = first + index * duration * 86400000
      const end = Math.min(last, start + (duration - 1) * 86400000)
      const standardWeekend = form.weekendDays.length === 2 && form.weekendDays.includes(0) && form.weekendDays.includes(6)
      const offDays = new Set(form.holidays.filter(day => day >= date(start) && day <= date(end)))
      if (!standardWeekend) for (let day = start; day <= end; day += 86400000) {
        if (form.weekendDays.includes(new Date(day).getUTCDay())) offDays.add(date(day))
      }
      return { key: key(), number: `SP-${String(index + 1).padStart(3, '0')}`,
        name: `Sprint ${index + 1}`, startDate: date(start),
        endDate: date(end), excludeWeekends: standardWeekend, offDays: [...offDays].sort(), members: form.members }
    })
    const oldKeys = new Set(form.sprints.map(sprint => sprint.key))
    setForm(current => ({ ...current, sprints, tasks: current.tasks.map(task => oldKeys.has(task.sprintKey) ? { ...task, sprintKey: '' } : task) }))
    setMessage('Sprints generated. Review their dates and assignments before saving.')
  }

  const stepFields = [['projectCode', 'projectName', 'description', 'customer', 'projectManager', 'priority', 'projectType', 'startDate', 'endDate'],
    ['links', 'pdrFile', 'pdrVersion', 'resourceFiles'], ['departments'], ['milestones'], ['sprints'], ['tasks']]
  const validateStep = index => {
    const all = validate(form, projectOnlyCreation)
    const found = Object.fromEntries(Object.entries(all).filter(([name]) => stepFields[index]?.includes(name)))
    setErrors(found)
    if (Object.keys(found).length) { setMessage(Object.values(found)[0]); return false }
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([name]) => !stepFields[index]?.includes(name))))
    return true
  }
  const goNext = () => {
    if (validateStep(step)) { setStep(value => Math.min(lastStep, value + 1)); setMessage('') }
  }
  const goToStep = target => {
    if (target <= step) { setStep(target); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    for (let index = step; index < target; index += 1) {
      if (!validateStep(index)) { setStep(index); return }
    }
    setStep(target)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const save = async () => {
    const found = validate(form, projectOnlyCreation)
    setErrors(found)
    if (Object.keys(found).length) {
      const stepOrder = ['projectCode', 'projectName', 'description', 'customer', 'projectManager',
        'priority', 'projectType', 'startDate', 'endDate', 'links', 'pdrFile', 'pdrVersion', 'resourceFiles', 'departments', 'milestones', 'sprints', 'tasks']
      const first = stepOrder.find(name => found[name])
      setStep(['links', 'pdrFile', 'pdrVersion', 'resourceFiles'].includes(first) ? 1 : first === 'departments' ? 2 : first === 'milestones' ? 3 : first === 'sprints' ? 4 : first === 'tasks' ? 5 : 0)
      setMessage(found[first])
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await (projectId ? updateProject(projectId, form, initial, originalFiles) : createProject(form, projectOnlyCreation))
      if (!projectId) localStorage.removeItem(draftKey)
      await loadProjects()
      navigate(roleSlug(user?.role) === 'admin' ? '/admin/all-projects' : '/pm/projects', { state: { saved: projectId ? 'Project updated.' : 'Project created.' } })
    } catch (error) {
      setMessage(readableError(error))
    } finally { setSaving(false) }
  }

  const saveDraft = () => {
    const serializable = { ...form, files: [] }
    localStorage.setItem(draftKey, JSON.stringify(serializable))
    setMessage('Draft saved in this browser. You can continue later.')
  }

  const holidayMonthStart = new Date(holidayMonth.getFullYear(), holidayMonth.getMonth(), 1)
  const holidayCalendarStart = new Date(holidayMonthStart)
  holidayCalendarStart.setDate(1 - ((holidayMonthStart.getDay() + 6) % 7))
  const holidayCalendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(holidayCalendarStart)
    date.setDate(date.getDate() + index)
    return date
  })
  const calendarDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  if (loading) return <div className={styling("project-editor")}><p>Loading project setup…</p></div>
  return <div className={styling("project-editor")}>
    <div className={styling("project-breadcrumb")}><Link to="/projects">Project</Link> <span>›</span> {visibleSteps[step]}</div>
    <header className={styling("project-editor-header")}><h1>{visibleSteps[step]}</h1><p>Step <strong>{step + 1}</strong> of {visibleSteps.length} · {projectId ? 'Edit project' : 'Create new project'}</p></header>
    <nav className={styling("project-stepper")} aria-label="Project setup steps">{visibleSteps.map((label, index) =>
      <button key={label} type="button" className={styling(index === step ? 'active' : index < step ? 'done' : '')}
        onClick={() => goToStep(index)} aria-current={index === step ? 'step' : undefined}>
        <span>{index < step ? '✓' : index + 1}</span><small>{label}</small>
      </button>)}</nav>
    {message && <div className={styling("project-alert")} role="alert">{message}</div>}
    <div className={styling(step === 1 ? 'project-step-shell' : 'project-step-body')}>

    {step === 0 && <div className={styling("project-intro-grid")}>
      <aside className={styling("project-guide")}><img src="/assets/downloading-data.png" alt="Project setup" />
        <h2>Let's set up your project</h2><p>Build the foundation for successful execution. You can review each section before saving.</p>
        <ul><li>Plan the timeline</li><li>Assign the team</li><li>Define milestones, sprints and tasks</li></ul>
        <div className={styling("project-help")}><strong>Need Help?</strong><p>Complete the required fields, then continue to the next step.</p></div>
      </aside>
      <section className={styling("project-card")}><div className={styling("project-card-heading")}><h2>Project Information</h2><p>Provide basic information about your project.</p></div>
        <div className={styling("project-grid two")}>
          <Field label="Project code *" error={errors.projectCode} hint="Unique identifier for this project."><input maxLength={10} placeholder="e.g. AP028" value={form.projectCode} onChange={event => field('projectCode', event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} /></Field>
          <Field label="Project Name *" error={errors.projectName}><input maxLength={200} placeholder="e.g. Industrial Data Logger" value={form.projectName} onChange={event => field('projectName', event.target.value)} /></Field>
        </div>
        <Field label="Project Description *" error={errors.description}><textarea rows={4} placeholder="Project Description..." value={form.description} onChange={event => field('description', event.target.value)} /></Field>
        <div className={styling("project-grid three")}>
          <Field label="Customer / Client *" error={errors.customer}><input maxLength={200} placeholder="e.g. Acme Automation" list="project-customers" value={form.customer} onChange={event => field('customer', event.target.value)} /><datalist id="project-customers">{options.customers?.map(item => <option key={item.id} value={item.name} />)}</datalist></Field>
          <Field label="Project Manager *" error={errors.projectManager}><SelectUser value={form.projectManager} onChange={value => field('projectManager', value)} users={options.users} placeholder="Select Project Manager" /></Field>
          <Field label="Priority *" error={errors.priority}><select value={form.priority} onChange={event => field('priority', event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        </div>
        <div className={styling("project-grid three")}>
          <Field label="Start date *" error={errors.startDate}><input type="date" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field>
          <Field label="End date *" error={errors.endDate}><input type="date" min={form.startDate} value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field>
          <Field label="Project Type *" error={errors.projectType}><select value={form.projectType} onChange={event => field('projectType', event.target.value)}><option value="web">Web</option><option value="mobile">Mobile</option><option value="desktop">Desktop</option><option value="other">Other</option></select></Field>
        </div>
      </section>
    </div>}

    {step === 1 && <div className={styling("project-resource-layout")}>
      <section className={styling("project-card project-upload-card")}><h2>Upload PDR (Mandatory)</h2>
        <div className={styling("project-info-strip")}><span className={styling("material-symbols-outlined")}>info</span><p>The PDR is mandatory and enables the team to understand the scope, objectives, deliverables and constraints of the project.</p></div>
        <label className={styling("project-drop-zone")} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files, true) }}>
          <input type="file" accept=".pdf,.doc,.docx" onChange={event => { addFiles(event.target.files, true); event.target.value = '' }} />
          <span className={styling("material-symbols-outlined")}>cloud_upload</span><strong>Browse Files</strong><small>Accepted formats: PDF, DOCX, Max file size: 100 MB</small>
        </label>
        {errors.pdrFile && <p className={styling("project-error")}>{errors.pdrFile}</p>}
        {form.files.filter(item => item.is_pdr).map(item => <div className={styling("project-file")} key={item.key}><span className={styling("file-type")}>{extension(item.name).toUpperCase()}</span><span className={styling("file-name")}><strong>{item.name}</strong><small>{fileSize(item.size ?? item.file?.size)}</small></span><button type="button" title="Download PDR" onClick={() => downloadFile(item)}><span className={styling("material-symbols-outlined")}>download</span></button><button type="button" title="Remove PDR" onClick={() => field('files', form.files.filter(file => file.key !== item.key))}><span className={styling("material-symbols-outlined")}>delete</span></button></div>)}
        <div className={styling("project-upload-details")}><h3>PDR Details</h3><div className={styling("project-grid two")}><Field label="PDR Version *" error={errors.pdrVersion}><input value={form.pdrVersion} onChange={event => field('pdrVersion', event.target.value)} /></Field><Field label="Change Log (optional)"><input placeholder={form.projectCode || 'AP000'} value={form.pdrChangelog} onChange={event => field('pdrChangelog', event.target.value)} /></Field></div></div>
      </section>
      <section className={styling("project-card project-upload-card")}><h2>Upload Resources <span>(Optional)</span></h2>
        <div className={styling("project-info-strip")}><span className={styling("material-symbols-outlined")}>info</span><p>Add related documents, templates, datasets or any other resources.</p></div>
        <label className={styling("project-drop-zone")} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files, false) }}>
          <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.rar" onChange={event => { addFiles(event.target.files, false); event.target.value = '' }} />
          <span className={styling("material-symbols-outlined")}>cloud_upload</span><strong>Browse Files</strong><small>Accepted formats: PDF, DOCX, ZIP, PPTX, XLSX, Max file size: 100 MB</small>
        </label>
        {errors.resourceFiles && <p className={styling("project-error")}>{errors.resourceFiles}</p>}
        <div className={styling("project-upload-details")}><h3>Upload Resources</h3>
          {form.files.some(item => !item.is_pdr) ? <div className={styling("project-files-table")}><table><thead><tr><th>File Name</th><th>Type</th><th>Size</th><th>Uploaded By</th><th>Date</th><th>Action</th></tr></thead><tbody>{form.files.filter(item => !item.is_pdr).map(item => <tr key={item.key}><td><span className={styling("file-type")}>{extension(item.name).toUpperCase()}</span>{item.name}</td><td>{extension(item.name).toUpperCase()}</td><td>{fileSize(item.size ?? item.file?.size)}</td><td>{item.uploaded_by_name || (item.file ? userName(user) : '—')}</td><td>{item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString('en-GB') : item.file ? new Date().toLocaleDateString('en-GB') : '—'}</td><td><button type="button" title="Download" onClick={() => downloadFile(item)}><span className={styling("material-symbols-outlined")}>download</span></button><button type="button" title="Remove" onClick={() => field('files', form.files.filter(file => file.key !== item.key))}><span className={styling("material-symbols-outlined")}>delete</span></button></td></tr>)}</tbody></table></div>
            : <div className={styling("project-no-files")}>No resource files uploaded yet</div>}
        </div>
        <details className={styling("project-resource-links")}><summary>Resource links {form.links.filter(Boolean).length ? `(${form.links.filter(Boolean).length})` : ''}</summary>
          {form.links.map((link, index) => <div className={styling("project-inline")} key={index}><input type="url" placeholder="https://example.com" value={link} onChange={event => field('links', form.links.map((item, i) => i === index ? event.target.value : item))} /><button type="button" onClick={() => field('links', form.links.filter((_, i) => i !== index))}>Remove</button></div>)}
          <button className={styling("project-text-button")} type="button" onClick={() => field('links', [...form.links, ''])}>+ Add resource link</button>
        </details>
        {errors.links && <p className={styling("project-error")}>{errors.links}</p>}
      </section>
    </div>}

    {step === 2 && <div className={styling("project-team-layout")}>
      <section className={styling("project-card department-section")}><h2>Select Departments</h2>
        <div className={styling("project-info-strip")}><span className={styling("material-symbols-outlined")}>info</span><p>Select all departments that will be contributing to this project.</p></div>
        <div className={styling("department-grid")}>{departments.map(department => {
          const [code, icon, description, color, background] = departmentMeta[department.name] || ['', 'apartment', 'Project department', '#2563eb', '#eff6ff']
          const selected = form.departments.includes(department.id)
          return <button key={department.id} type="button" aria-pressed={selected} className={styling(selected ? 'department-card selected' : 'department-card')} onClick={() => toggleDepartment(department.id)}>
            <span className={styling("department-icon material-symbols-outlined")} style={{ color, background }}>{icon}</span><span className={styling("department-copy")}><strong>{department.name}{code ? ` (${code})` : ''}</strong><small>{description}</small></span><span className={styling("department-check material-symbols-outlined")}>{selected ? 'check' : ''}</span>
          </button>
        })}</div>
        {errors.departments && <p className={styling("project-error")}>{errors.departments}</p>}
      </section>
      <section className={styling("project-card assign-team-card")}><div className={styling("project-card-heading")}><h2>Assign Teams</h2><p>Select the team members from each department who will work on this project</p></div>
        {!form.departments.length ? <div className={styling("project-empty-state")}><span className={styling("material-symbols-outlined")}>group</span><strong>No departments selected</strong><p>Select departments above to start building your team.</p></div> :
          <div className={styling("project-team-table")}><div className={styling("project-team-table-head")}><span>Department</span><span>Team Lead</span><span>Assigned Team</span><span>Team Members</span></div>
          {departments.filter(department => form.departments.includes(department.id)).map(department => {
            const [code, icon, , color, background] = departmentMeta[department.name] || ['', 'apartment', '', '#2563eb', '#eff6ff']
            const people = options.users.filter(item => item.department_link_id === department.id)
            const manager = options.users.find(item => item.id === form.projectManager)
            const isManagement = department.name.toLowerCase() === 'management'
            const candidates = isManagement && manager && !people.some(item => item.id === manager.id) ? [manager, ...people] : people
            const selected = candidates.filter(item => form.members.includes(item.id) || (isManagement && item.id === form.projectManager))
            const lead = isManagement && manager ? manager : selected.find(item => /lead/i.test(item.designation || '')) || selected[0]
            return <div className={styling("project-team-table-row")} key={department.id}>
              <span className={styling("team-department")}><span className={styling("material-symbols-outlined")} style={{ color, background }}>{icon}</span><strong>{department.name}{code ? ` (${code})` : ''}</strong></span>
              <span>{lead ? userName(lead) : 'Not Assigned'}{isManagement && lead?.user_name ? ` (@${lead.user_name})` : ''}</span>
              <span className={styling("team-select-cell")}><button type="button" className={styling("team-select-trigger")} aria-expanded={openTeamDepartment === department.id} onClick={() => setOpenTeamDepartment(current => current === department.id ? null : department.id)}>Select Team Member <span className={styling("material-symbols-outlined")}>expand_more</span></button>
                {openTeamDepartment === department.id && <div className={styling("team-select-menu")}>{candidates.length ? candidates.map(item => {
                  const active = selected.some(person => person.id === item.id)
                  return <button key={item.id} type="button" className={styling(active ? 'active' : '')} onClick={() => { if (item.id !== form.projectManager) toggle('members', item.id) }}><span className={styling("team-member-avatar")}>{(item.first_name?.[0] || item.user_name?.[0] || '?').toUpperCase()}{(item.last_name?.[0] || '').toUpperCase()}</span><span><strong>{userName(item)}</strong><small>{item.designation || item.role_link__name || 'Member'}</small></span>{active && <span className={styling("material-symbols-outlined")}>check</span>}</button>
                }) : <p>No users registered</p>}</div>}</span>
              <span className={styling("team-avatars")}>{selected.length ? selected.map(item => <span key={item.id} className={styling("team-member-avatar")} title={userName(item)}>{(item.first_name?.[0] || item.user_name?.[0] || '?').toUpperCase()}{(item.last_name?.[0] || '').toUpperCase()}</span>) : <em>No members assigned</em>}</span>
            </div>
          })}</div>}
      </section>
    </div>}

    {step === 3 && <div className={styling("milestone-step")}>
      <div className={styling("project-card-heading project-section-heading")}><h2>Milestone and features</h2><p>Define critical dates, phases, and features for your project timeline. Adding at least one milestone and one feature is compulsory.</p></div>
      {errors.milestones && <p className={styling("project-error")}>{errors.milestones}</p>}
      <section className={styling("project-card milestone-add-card")} id="milestone-add-form">
        <div className={styling("project-card-heading")}><h2>Add Milestone and feature</h2><p>Define a new milestone and feature.</p></div>
        <Field label="Milestone *"><input maxLength={100} placeholder="e.g. AP028" value={milestoneDraft.name} onChange={event => setMilestoneDraft(current => ({ ...current, name: event.target.value }))} /></Field>
        <Field label="Description (optional)"><textarea rows={3} maxLength={500} placeholder="Describe this milestone" value={milestoneDraft.description} onChange={event => setMilestoneDraft(current => ({ ...current, description: event.target.value }))} /></Field>
        <div className={styling("project-grid two")}><Field label="Start date *"><input type="date" min={form.startDate} max={milestoneDraft.dueDate || form.endDate} value={milestoneDraft.startDate} onChange={event => setMilestoneDraft(current => ({ ...current, startDate: event.target.value }))} /></Field><Field label="End date *"><input type="date" min={milestoneDraft.startDate || form.startDate} max={form.endDate} value={milestoneDraft.dueDate} onChange={event => setMilestoneDraft(current => ({ ...current, dueDate: event.target.value }))} /></Field></div>
        <div className={styling("project-form-actions")}><button type="button" className={styling("project-secondary")} onClick={resetMilestoneDraft}>Cancel</button><button type="button" className={styling("project-primary")} onClick={saveMilestoneDraft}>{editingMilestoneKey ? 'Update Milestone' : '+ Add Milestone'}</button></div>
      </section>
      <div className={styling("milestone-list")}>{form.milestones.map((milestone) => {
        const expanded = expandedMilestones[milestone.key] !== false
        return <article className={styling("project-card milestone-summary-card")} key={milestone.key}>
          <div className={styling("milestone-summary")}><div><h3>{milestone.name || 'Unnamed milestone'}</h3><p><span className={styling("material-symbols-outlined")}>calendar_month</span>{formatDate(milestone.startDate)} – {formatDate(milestone.dueDate)}</p></div><div className={styling("milestone-actions")}><button type="button" title="Edit milestone" onClick={() => editMilestone(milestone)}><span className={styling("material-symbols-outlined")}>edit</span></button><button type="button" title="Delete milestone" onClick={() => removeMilestone(milestone.key)}><span className={styling("material-symbols-outlined")}>delete</span></button><button type="button" title="Expand milestone" onClick={() => setExpandedMilestones(current => ({ ...current, [milestone.key]: !expanded }))}><span className={styling("material-symbols-outlined")}>{expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span></button></div></div>
          {expanded && <div className={styling("milestone-features")}><div className={styling("project-row-heading")}><h3>Features ({milestone.features.length})</h3><button type="button" onClick={() => patchMilestone(milestone.key, { features: [...milestone.features, featureItem()] })}>+ Add feature</button></div>
            {!milestone.features.length && <div className={styling("project-empty-state")}><span className={styling("material-symbols-outlined")}>view_kanban</span><strong>No features added</strong><p>Add at least one feature to this milestone.</p></div>}
            {milestone.features.map((feature, featureIndex) => <div className={styling("project-feature")} key={feature.key}>
              <div className={styling("project-row-heading")}><strong>Feature {featureIndex + 1}</strong><button type="button" onClick={() => removeFeature(milestone.key, feature.key)}>Remove</button></div>
              <div className={styling("project-grid two")}><Field label="Feature name *"><input value={feature.name} onChange={event => patchFeature(milestone.key, feature.key, { name: event.target.value })} /></Field><Field label="Description"><input value={feature.description} onChange={event => patchFeature(milestone.key, feature.key, { description: event.target.value })} /></Field></div>
              <div className={styling("project-grid two")}><Field label="Start date"><input type="date" min={milestone.startDate} max={feature.dueDate || milestone.dueDate} value={feature.startDate} onChange={event => patchFeature(milestone.key, feature.key, { startDate: event.target.value })} /></Field><Field label="Due date"><input type="date" min={feature.startDate || milestone.startDate} max={milestone.dueDate} value={feature.dueDate} onChange={event => patchFeature(milestone.key, feature.key, { dueDate: event.target.value })} /></Field></div>
              <div className={styling("project-grid two")}><Field label="Priority"><select value={feature.priority} onChange={event => patchFeature(milestone.key, feature.key, { priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field><Field label="Status"><select value={feature.status} onChange={event => patchFeature(milestone.key, feature.key, { status: event.target.value })}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="done">Done</option></select></Field></div>
            </div>)}
          </div>}
        </article>
      })}</div>
    </div>}

    {step === 4 && <div className={styling("sprint-step")}>
      <div className={styling("sprint-summary-bar")}><div><span>Sprint Cycle</span><strong>{form.sprints.length || '—'}</strong><small>+ {form.sprintDuration} days buffer</small></div><div><span>Completion dates</span><strong>{formatDate(form.endDate)}</strong></div><div><span>Committed Points</span><strong>{form.sprints.reduce((total, sprint) => total + sprintWorkingDays(sprint) * Number(form.pointsPerDay || 0), 0)} pts</strong></div><div><span>Buffer days</span><strong>0</strong></div></div>
      <section className={styling("sprint-config-card")}><h2>Project timeline</h2>
        <div className={styling("project-grid four")}><Field label="Sprint start *"><input type="date" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field><Field label="Sprint end *"><input type="date" value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field><Field label="Duration *"><input type="number" min="1" value={form.sprintDuration} onChange={event => field('sprintDuration', event.target.value)} /></Field><Field label="Points per day *"><div className={styling("points-control")}><button type="button" onClick={() => field('pointsPerDay', Math.max(1, Number(form.pointsPerDay) - 1))}>−</button><strong>{form.pointsPerDay}</strong><button type="button" onClick={() => field('pointsPerDay', Number(form.pointsPerDay) + 1)}>+</button></div></Field></div>
      </section>
      <section className={styling("sprint-config-card")}><h2>Holidays</h2><p>select your weekends days</p>
        <div className={styling("weekend-buttons")}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, visibleIndex) => { const index = (visibleIndex + 1) % 7; return <button key={day} type="button" className={styling(form.weekendDays.includes(index) ? 'active' : '')} onClick={() => field('weekendDays', form.weekendDays.includes(index) ? form.weekendDays.filter(item => item !== index) : [...form.weekendDays, index])}>{day}</button> })}</div>
        <h3 className={styling("holiday-select-heading")}>Select Holidays to Exclude</h3><p className={styling("holiday-caption")}>Weekends are off automatically — tap any date to mark a holiday.</p>
        <div className={styling("holiday-picker")}><div className={styling("holiday-calendar")}><div className={styling("holiday-calendar-heading")}><button type="button" aria-label="Previous month" onClick={() => setHolidayMonth(new Date(holidayMonth.getFullYear(), holidayMonth.getMonth() - 1, 1))}>‹</button><strong>{holidayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => setHolidayMonth(new Date(holidayMonth.getFullYear(), holidayMonth.getMonth() + 1, 1))}>›</button></div><div className={styling("holiday-calendar-grid")}>{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => <span className={styling("weekday")} key={day}>{day}</span>)}{holidayCalendarDays.map(date => { const value = calendarDateKey(date); const selected = form.holidays.includes(value); const outOfRange = (form.startDate && value < form.startDate) || (form.endDate && value > form.endDate); return <button key={value} type="button" disabled={outOfRange} className={styling(`${date.getMonth() === holidayMonth.getMonth() ? '' : 'outside'} ${selected ? 'selected' : ''}`)} onClick={() => field('holidays', selected ? form.holidays.filter(item => item !== value) : [...form.holidays, value].sort())}>{date.getDate()}</button> })}</div></div><div className={styling("holiday-list")}><h3>Marked Holidays</h3>{form.holidays.length ? form.holidays.map(day => <button key={day} type="button" onClick={() => field('holidays', form.holidays.filter(item => item !== day))}><span>{formatDate(day)}</span><span>×</span></button>) : <p>No holidays marked yet.<br />Tap any weekday on the calendar to mark a holiday.</p>}</div></div>
      </section>
      <button className={styling("project-primary")} type="button" onClick={generateSprints}>Generate sprints</button>
      <section className={styling("sprint-roadmap-card")}><h2>Active Roadmap: {form.projectName || 'Project'}</h2>{form.sprints.length ? <div className={styling("sprint-roadmap-table-wrap")}><table className={styling("sprint-roadmap-table")}><thead><tr><th>Sprint No.</th><th>Date</th><th>Working Days</th><th>Sprint Points</th><th>Actions</th></tr></thead><tbody>{form.sprints.map((sprint, index) => <tr key={sprint.key}><td><strong>{sprint.name || `Sprint ${index + 1}`}</strong><details className={styling("sprint-row-edit")}><summary>Edit details</summary><div className={styling("project-grid two")}><Field label="Sprint code"><input value={sprint.number} onChange={event => patchItem('sprints', sprint.key, { number: event.target.value })} /></Field><Field label="Sprint name"><input value={sprint.name} onChange={event => patchItem('sprints', sprint.key, { name: event.target.value })} /></Field><Field label="Start date"><input type="date" value={sprint.startDate} onChange={event => patchItem('sprints', sprint.key, { startDate: event.target.value })} /></Field><Field label="End date"><input type="date" value={sprint.endDate} onChange={event => patchItem('sprints', sprint.key, { endDate: event.target.value })} /></Field><label className={styling("project-check")}><input type="checkbox" checked={sprint.excludeWeekends} onChange={event => patchItem('sprints', sprint.key, { excludeWeekends: event.target.checked })} /> Exclude weekends</label></div><Field label="Sprint members"><div className={styling("project-chips")}>{selectedUsers.map(person => <button key={person.id} type="button" className={styling(sprint.members.includes(person.id) ? 'selected' : '')} onClick={() => patchItem('sprints', sprint.key, { members: sprint.members.includes(person.id) ? sprint.members.filter(id => id !== person.id) : [...sprint.members, person.id] })}>{userName(person)}</button>)}</div></Field><Field label="Additional off day"><input type="date" value={sprintOffDates[sprint.key] || ''} onChange={event => setSprintOffDates(current => ({ ...current, [sprint.key]: event.target.value }))} /></Field><button className={styling("project-text-button")} type="button" onClick={() => { const day = sprintOffDates[sprint.key]; if (day && !sprint.offDays.includes(day)) patchItem('sprints', sprint.key, { offDays: [...sprint.offDays, day].sort() }); setSprintOffDates(current => ({ ...current, [sprint.key]: '' })) }}>+ Add off day</button><div className={styling("project-chips")}>{sprint.offDays.map(day => <button key={day} type="button" onClick={() => patchItem('sprints', sprint.key, { offDays: sprint.offDays.filter(item => item !== day) })}>{day} ×</button>)}</div></details></td><td>{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</td><td>{sprintWorkingDays(sprint)} days</td><td>{sprintWorkingDays(sprint) * Number(form.pointsPerDay || 0)} points</td><td><button type="button" className={styling("project-text-button")} onClick={() => { field('sprints', form.sprints.filter(item => item.key !== sprint.key)); setForm(current => ({ ...current, tasks: current.tasks.map(task => task.sprintKey === sprint.key ? { ...task, sprintKey: '' } : task) })) }}>Remove</button></td></tr>)}</tbody></table></div> : <p className={styling("project-hint")}>Generate sprints to see the project roadmap.</p>}</section>
      <button className={styling("project-secondary")} type="button" onClick={() => field('sprints', [...form.sprints, { key: key(), number: `SP-${String(form.sprints.length + 1).padStart(3, '0')}`, name: `Sprint ${form.sprints.length + 1}`, startDate: form.startDate, endDate: form.endDate, excludeWeekends: true, offDays: [], members: form.members }])}>+ Add sprint</button>
      {errors.sprints && <p className={styling("project-error")}>{errors.sprints}</p>}
    </div>}

    {step === 5 && <div className={styling("task-creation-step")}>
      {errors.tasks && <p className={styling("project-error")}>{errors.tasks}</p>}
      <div className={styling("project-grid task-step")}><div className={styling("task-form-stack")}>
        <section className={styling("project-card task-form-card")}><div className={styling("project-card-heading")}><h2>Task Details</h2><p>Define the task and set the basic information.</p></div>
          <div className={styling("project-grid two")}><Field label="Task name *"><input maxLength={100} value={taskDraft.name} placeholder="Task name" onChange={event => setTaskDraft(current => ({ ...current, name: event.target.value }))} /></Field><Field label="Sprint *"><select value={taskDraft.sprintKey} onChange={event => setTaskDraft(current => ({ ...current, sprintKey: event.target.value }))}><option value="">Select sprint</option>{form.sprints.map(sprint => <option key={sprint.key} value={sprint.key}>{sprint.name}</option>)}</select></Field></div>
          <Field label="Description (optional)"><textarea rows={3} value={taskDraft.description} placeholder="Describe the task" onChange={event => setTaskDraft(current => ({ ...current, description: event.target.value }))} /></Field>
          <div className={styling("project-grid three")}><Field label="Start date *"><input type="date" min={form.startDate} max={taskDraft.dueDate || form.endDate} value={taskDraft.startDate} onChange={event => setTaskDraft(current => ({ ...current, startDate: event.target.value }))} /></Field><Field label="Due date *"><input type="date" min={taskDraft.startDate || form.startDate} max={form.endDate} value={taskDraft.dueDate} onChange={event => setTaskDraft(current => ({ ...current, dueDate: event.target.value }))} /></Field><Field label="Priority *"><select value={taskDraft.priority} onChange={event => setTaskDraft(current => ({ ...current, priority: event.target.value }))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field></div>
        </section>
        <section className={styling("project-card task-form-card")}><div className={styling("project-card-heading")}><h2>Additional details</h2><p>Add dependencies, milestones and features related to this task.</p></div>
          <div className={styling("project-grid two")}><div><strong className={styling("project-small-heading")}>Add dependency</strong><button type="button" className={styling("dependency-add-trigger")} onClick={() => field('dependencies', [...form.dependencies, dependencyItem(taskDraft.key)])}>＋ Click to add dependency</button>{form.dependencies.filter(item => item.taskKey === taskDraft.key).map((dependency, index) => <div className={styling("task-dependency-editor")} key={dependency.key}><div className={styling("project-row-heading")}><strong>Dependency {index + 1}</strong><button type="button" onClick={() => field('dependencies', form.dependencies.filter(item => item.key !== dependency.key))}>Remove</button></div><Field label="Depends on"><select value={dependency.dependsOnKey} onChange={event => patchItem('dependencies', dependency.key, { dependsOnKey: event.target.value })}><option value="">Select task</option>{form.tasks.filter(task => task.key !== taskDraft.key).map(task => <option key={task.key} value={task.key}>{task.name || 'Unnamed task'}</option>)}</select></Field><Field label="Dependency type *"><select value={dependency.dependencyType} onChange={event => patchItem('dependencies', dependency.key, { dependencyType: event.target.value })}><option value="">Select type</option><option value="mandatory">Mandatory dependency</option><option value="optional">Optional dependency</option></select></Field><Field label="Description *"><input value={dependency.description} onChange={event => patchItem('dependencies', dependency.key, { description: event.target.value })} placeholder="Describe the blocker" /></Field></div>)}</div>
            <Field label="Add milestones *"><select value={taskDraft.milestoneKey} onChange={event => setTaskDraft(current => ({ ...current, milestoneKey: event.target.value, featureKey: '' }))}><option value="">Select milestone</option>{form.milestones.map(milestone => <option key={milestone.key} value={milestone.key}>{milestone.name}</option>)}</select></Field>
            <Field label="Add features *"><select value={taskDraft.featureKey} onChange={event => setTaskDraft(current => ({ ...current, featureKey: event.target.value }))}><option value="">Select feature</option>{form.milestones.find(item => item.key === taskDraft.milestoneKey)?.features.map(feature => <option key={feature.key} value={feature.key}>{feature.name || 'Unnamed feature'}</option>)}</select></Field>
          </div>
        </section>
        <section className={styling("project-card task-form-card")}><div className={styling("project-card-heading")}><h2>Assign &amp; review</h2></div><div className={styling("project-grid two")}><Field label="Reviewer"><SelectUser users={selectedUsers} value={taskDraft.reviewer} onChange={value => setTaskDraft(current => ({ ...current, reviewer: value }))} optional /></Field><Field label="Assigned to *"><SelectUser users={selectedUsers} value={taskDraft.assignee} onChange={value => setTaskDraft(current => ({ ...current, assignee: value }))} /></Field></div></section>
        <div className={styling("project-form-actions left")}><button type="button" className={styling("project-primary")} onClick={saveTaskDraft}><span className={styling("material-symbols-outlined")}>add</span>{editingTaskKey ? 'Update task' : 'Create task'}</button>{editingTaskKey && <button type="button" className={styling("project-secondary")} onClick={resetTaskDraft}>Cancel edit</button>}</div>
      </div>
      <div className={styling("task-side-column")}><section className={styling("project-card task-added-card")}><div className={styling("task-added-heading")}><h2>Task added</h2><span>{form.tasks.length}</span></div>
        {!form.tasks.length ? <div className={styling("project-empty-state")}><strong>No tasks added yet</strong><p>Complete the task form to add it to the project.</p></div> : <div className={styling("task-added-list")}>{form.tasks.map(task => <article key={task.key}><div className={styling("project-row-heading")}><h3>{task.name}</h3><div><button type="button" onClick={() => editTask(task)}>Edit</button><button type="button" onClick={() => removeTask(task.key)}>Remove</button></div></div><dl><dt>Description</dt><dd>{task.description || '—'}</dd><dt>Sprint</dt><dd>{form.sprints.find(sprint => sprint.key === task.sprintKey)?.name || 'Not assigned'}</dd><dt>Reviewer</dt><dd>{userName(options.users.find(item => String(item.id) === String(task.reviewer)) || {}) || 'Not assigned'}</dd><dt>Assignees</dt><dd>{userName(options.users.find(item => String(item.id) === String(task.assignee)) || {}) || 'Not assigned'}</dd><dt>Depends on</dt><dd>{form.dependencies.filter(dependency => dependency.taskKey === task.key).map(dependency => form.tasks.find(item => item.key === dependency.dependsOnKey)?.name).filter(Boolean).join(', ') || 'None'}</dd></dl></article>)}</div>}
      </section></div></div>
    </div>}

    <footer className={styling("project-editor-actions")}><div>{step === 0 ? <Link to="/projects" className={styling("project-secondary")}>Cancel</Link> : <button type="button" className={styling("project-secondary")} onClick={() => setStep(value => value - 1)}>Back</button>}</div>
      <div>{!projectId && <button type="button" className={styling("project-secondary")} onClick={saveDraft}>Save &amp; Continue later</button>}
        {step < lastStep ? <button type="button" className={styling("project-primary")} onClick={goNext}>Next <span className={styling("material-symbols-outlined")}>arrow_forward</span></button> :
          <button type="button" className={styling("project-primary")} onClick={save} disabled={saving}>{saving ? 'Saving…' : projectId ? 'Update Project' : 'Create Project'}</button>}
      </div></footer>
    </div>
  </div>
}
