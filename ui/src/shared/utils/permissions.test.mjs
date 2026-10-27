import assert from 'node:assert/strict'
import test from 'node:test'
import { hasPermission, permissionSchema } from './permissions.js'
import { sidebarItems } from '../../layouts/sidebarNavigation.js'

test('the permission matrix contains exactly ten modules and six view-only widgets', () => {
  assert.deepEqual(Object.keys(permissionSchema), ['Tasks', 'Features', 'Milestones', 'Reports', 'Projects',
    'Documents', 'Dependencies', 'User Management', 'Roles & permissions', 'Department Managment',
    'TeamWorLoad', 'ProjectJourney', 'ProjectPerformanceGraph', 'MilestoneMap', 'TeamStatus', 'recentActvities'])
  for (const widget of Object.keys(permissionSchema).slice(10)) assert.deepEqual(permissionSchema[widget], ['View'])
})

test('listed modules require explicit boolean grants and unlisted features ignore stale restrictions', () => {
  for (const module of Object.keys(permissionSchema)) {
    assert.equal(hasPermission({}, module), false)
    assert.equal(hasPermission({ [module]: { View: false } }, module), false)
    assert.equal(hasPermission({ [module]: { View: true } }, module), true)
    assert.equal(hasPermission({ [module]: { View: 'true' } }, module), false)
  }
  for (const module of ['Chat', 'Approvals', 'Calendar', 'Dashboard', 'Audit Logs', 'Database Explorer', 'API Logs'])
    for (const action of ['View', 'Create', 'Edit', 'Delete'])
      assert.equal(hasPermission({ [module]: { [action]: false } }, module, action), true)
  assert.equal(hasPermission({ TeamStatus: { Edit: true } }, 'TeamStatus', 'Edit'), false)
  assert.equal(hasPermission({ TeamWorLoad: { View: true } }, 'TeamWorkload', 'view'), true)
})

test('all non-admin menus enforce listed modules while exposing unlisted pages', () => {
  for (const role of ['pm', 'user']) {
    const denied = sidebarItems(role, {})
    for (const suffix of ['/tasks', '/dependencies', '/documents', '/workload', '/roles-permissions'])
      assert.ok(!denied.some(item => item.path.endsWith(suffix)), `${role}: ${suffix}`)
    for (const suffix of ['/chat', '/approvals', '/calendar', '/audit-logs', '/api-logs', '/database'])
      assert.ok(denied.some(item => item.path.endsWith(suffix)), `${role}: ${suffix}`)
    const allowed = sidebarItems(role, { Tasks: { View: true }, Dependencies: { View: true }, Documents: { View: true } })
    for (const suffix of ['/tasks', '/dependencies', '/documents']) assert.ok(allowed.some(item => item.path.endsWith(suffix)))
  }
})
