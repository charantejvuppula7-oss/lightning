

/* styling */
const tailwindStyling = {
  "chat-heading": [
    "[&_h1]:[margin:0]",
    "[&_h1]:[font-size:28px]",
    "[&_h1]:[line-height:1.25]",
    "[&_h1]:[letter-spacing:-.4px]",
    "[&_h1]:[color:#172033]",
    "[&_p]:[margin:4px_0_0]",
    "[&_p]:[font-size:14px]",
    "[&_p]:[color:#737986]",
    "[padding-bottom:16px]",
    "[border-bottom:1px_solid_#d4d6df]",
    "[&_h1]:[font-size:22px]"
  ],
  "tabs": [
    "[display:flex]",
    "[gap:0]",
    "[border-bottom:1px_solid_#aaaeb8]",
    "[margin-top:27px]",
    "[&_button]:[min-width:155px]",
    "[&_button]:[height:45px]",
    "[&_button]:[padding:0_18px]",
    "[&_button]:[border:0]",
    "[&_button]:[border-bottom:2px_solid_transparent]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#737986]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:14px]",
    "[&_button]:[cursor:pointer]",
    "[&_button.selected]:[border-bottom-color:#1760d0]",
    "[&_button.selected]:[color:#1760d0]"
  ],
  "chat-layout": [
    "[height:calc(100vh_-_50px)]",
    "[display:grid]",
    "[grid-template-columns:minmax(0,1.35fr)_minmax(300px,1fr)]",
    "max-[600px]:[height:calc(100dvh_-_108px)]",
    "max-[600px]:[grid-template-columns:1fr]"
  ],
  "chat-thread": [
    "[min-height:0]",
    "[display:flex]",
    "[flex-direction:column]",
    "[padding:28px_30px_22px]"
  ],
  "chat-messages": [
    "[flex:1]"
  ],
  "message-composer": [
    "[border:1px_solid_#d4d2e1]",
    "[border-radius:12px]",
    "[background:white]",
    "[padding:12px_14px_10px]",
    "[&_textarea]:[width:100%]",
    "[&_textarea]:[height:42px]",
    "[&_textarea]:[resize:vertical]",
    "[&_textarea]:[border:0]",
    "[&_textarea]:[outline:0]",
    "[&_textarea]:[font:inherit]",
    "[&_textarea]:[font-size:14px]"
  ],
  "composer-actions": [
    "[display:flex]",
    "[gap:10px]",
    "[align-items:center]",
    "[&_button]:[border:0]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#6d7280]",
    "[&_button]:[font-size:18px]",
    "[&_button]:[cursor:pointer]",
    "[&_.send-button]:[margin-left:auto]",
    "[&_.send-button]:[width:36px]",
    "[&_.send-button]:[height:36px]",
    "[&_.send-button]:[border-radius:50%]",
    "[&_.send-button]:[background:#3826d8]",
    "[&_.send-button]:[color:white]"
  ],
  "chat-details": [
    "[border-left:1px_solid_#c9cbd2]",
    "[padding:0_22px]",
    "max-[600px]:[display:none]"
  ],
  "detail-tabs": [
    "[height:80px]",
    "[display:flex]",
    "[justify-content:space-around]",
    "[align-items:center]",
    "[border-bottom:1px_solid_#d4d6df]",
    "[&_button]:[height:100%]",
    "[&_button]:[border:0]",
    "[&_button]:[border-bottom:2px_solid_transparent]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#707583]",
    "[&_button]:[font:inherit]",
    "[&_button]:[padding:0_12px]",
    "[&_button.selected]:[color:#1760d0]",
    "[&_button.selected]:[border-bottom-color:#1760d0]"
  ],
  "detail-content": [
    "[padding-top:20px]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}

export default function ChatPage() {
  return <section className={styling("chat-layout")}><div className={styling("chat-thread")}><header className={styling("chat-heading")}><h1>Project</h1><p>Company-wide updates and discussions</p></header><div className={styling("chat-messages")} /><form className={styling("message-composer")} onSubmit={(event) => event.preventDefault()}><textarea aria-label="Message" placeholder="Type a message..." /><div className={styling("composer-actions")}><button type="button" aria-label="Add attachment">＋</button><button type="button" aria-label="Add reaction">☺</button><button type="button" aria-label="Mention">@</button><button className={styling("send-button")} aria-label="Send">➤</button></div></form></div><aside className={styling("chat-details")}><div className={styling("detail-tabs")}><button>Thread</button><button className={styling("selected")}>Files</button><button>Details</button><button aria-label="Close">×</button></div><div className={styling("detail-content")} /></aside></section>
}
