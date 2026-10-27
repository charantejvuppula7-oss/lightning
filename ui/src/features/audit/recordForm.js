import { roleSlug } from '../../shared/utils/roles.js'

export function prepareRecordForm(record, columns) {
  const form = {}
  for (const column of columns) {
    let value = record[column.name]
    if (column.type === 'ForeignKey') value = value?.id ?? record[column.name + '_id'] ?? value
    if (column.type === 'JSONField' && value != null) value = JSON.stringify(value, null, 2)
    if (column.type === 'DateTimeField' && value) {
      const date = new Date(value)
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
      value = date.toISOString().slice(0, 16)
    }
    form[column.name] = value
  }
  if ('role_link' in record) form.role = roleSlug(record.role_link?.display ?? record.role_link)
  if ('department_link' in record) form.department = record.department_link?.display ?? record.department_link ?? ''
  return form
}

export function serializeRecordForm(form, columns) {
  const payload = { ...form }
  for (const field of ['id', 'Id', 'created_at', 'updated_at', '_many_to_many']) delete payload[field]
  if (!payload.password) delete payload.password
  for (const column of columns) {
    if (!(column.name in payload)) continue
    const value = payload[column.name]
    if (column.type === 'JSONField' && typeof value === 'string') {
      try { payload[column.name] = JSON.parse(value) }
      catch { throw new Error(`${column.verbose_name || column.name} must contain valid JSON.`) }
    }
    if (column.type === 'DateTimeField' && value) payload[column.name] = new Date(value).toISOString()
  }
  return payload
}
