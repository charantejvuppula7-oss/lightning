import logStyles from './logStyles.js'
export default function LogDetailRow({ label, value }) {
 return <div style={logStyles.detailRow}><span style={logStyles.detailLabel}>{label}</span><span style={logStyles.detailValue}>{String(value)}</span></div>
}
