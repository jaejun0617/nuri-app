// Opaque chip surfaces keep text contrast independent of the seasonal glass.
const replyTones = {
  light: {
    waiting: { background: '#FFF0D6', foreground: '#684514', border: '#DDC9A4' },
    answered: { background: '#E4F2E9', foreground: '#28543D', border: '#B9D6C4' },
  },
  dark: {
    waiting: { background: '#493A27', foreground: '#FFE3AE', border: '#756248' },
    answered: { background: '#283E34', foreground: '#C6EDD5', border: '#4B6758' },
  },
} as const;

export function inquiryReplyTone(label: string, dark: boolean) {
  const palette = dark ? replyTones.dark : replyTones.light;
  if (label === '답변 대기') return palette.waiting;
  if (label === '답변 완료') return palette.answered;
  return undefined;
}
