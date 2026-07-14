export const C = {
  black: '#090909',
  paper: '#F6F1E8',
  white: '#FFFDF7',
  yellow: '#FFC62F',
  red: '#E53720',
  blue: '#173FE9',
  mint: '#42DDA9',
  gray: '#6E6A63',
  line: '#D1CBC1',
} as const

export type Tone = 'yellow' | 'red' | 'blue' | 'mint'
export const tone = (name: Tone) => C[name]
export const shadow = {
  shadowColor: C.black,
  shadowOffset: { width: 5, height: 5 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 5,
} as const
