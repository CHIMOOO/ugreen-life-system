/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // 首页粘土风（无活动时的兜底页）
        clay: { canvas: '#F4F1FA', fg: '#332F3A', muted: '#635F69', accent: '#7C3AED', accentAlt: '#DB2777', sky: '#0EA5E9', success: '#10B981', warning: '#F59E0B', card: '#EFEBF5' },
        // style1 极繁主义
        max: { bg: '#0D0D1A', fg: '#FFFFFF', muted: '#2D1B4E', accent: '#FF3AF2', secondary: '#00F5D4', tertiary: '#FFE600', quaternary: '#FF6B35', quinary: '#7B2FFF' },
        // style2 手绘随笔
        sketch: { paper: '#fdfbf7', ink: '#2d2d2d', muted: '#e5e0d8', red: '#ff4d4d', blue: '#2d5da1', postit: '#fff9c4' },
        // style3 包豪斯
        bau: { bg: '#F0F0F0', ink: '#121212', red: '#D02020', blue: '#1040C0', yellow: '#F0C020', muted: '#E0E0E0' },
        // style4 终端 Terminal
        term: { bg: '#080C08', panel: '#0E150E', fg: '#9EFFA8', green: '#33FF66', dim: '#1FA34A', amber: '#FFB000', red: '#FF5F56', line: '#1c3a22' },
        // style5 Material Design
        md: { bg: '#F3EDF7', surface: '#FFFBFE', surfaceVar: '#E7E0EC', primary: '#6750A4', onPrimary: '#FFFFFF', secondary: '#625B71', tertiary: '#7D5260', error: '#B3261E', outline: '#79747E', onSurface: '#1C1B1F' },
        // style6 学院风 Academia
        aca: { paper: '#F3E9D2', panel: '#EADDBF', ink: '#2A2118', brown: '#5B4636', burgundy: '#7B2D26', forest: '#33402F', gold: '#B08D57' },
        // style7 赛博朋克 Cyberpunk
        cyber: { bg: '#070014', panel: '#0E0524', pink: '#FF2A6D', cyan: '#05D9E8', yellow: '#F9F002', purple: '#9D00FF', green: '#00FF9F', fg: '#E6E1FF' },
        // style8 趣味几何 Playful Geometric
        geo: { bg: '#FFFCF5', ink: '#2D2A32', coral: '#FF6B6B', teal: '#2FB5AC', yellow: '#FFC93C', blue: '#5B8DEF', purple: '#9B5DE5' },
        // style9 植物 Botanical
        bot: { bg: '#F2F6EC', ink: '#2E3D2C', leaf: '#3E6B47', sage: '#8FA98A', terracotta: '#C97B5A', bloom: '#D98DA3', cream: '#EFE9D6' },
        // style10 蒸汽波 Vaporwave
        vapor: { bg: '#1A0033', panel: '#2A0A4A', pink: '#FF71CE', cyan: '#01CDFE', purple: '#B967FF', green: '#05FFA1', yellow: '#FFFB96', fg: '#FFE3FF' },
        // style11 新拟态 Neumorphism
        neu: { bg: '#E0E5EC', fg: '#52606D', muted: '#8A97A6', accent: '#5B7CFA', light: '#FFFFFF', dark: '#A3B1C6' },
        // style12 复古 Retro
        retro: { bg: '#F3E2C0', panel: '#EAD2A0', ink: '#3A2A1A', orange: '#CB6843', mustard: '#E3A857', avocado: '#6B8E23', teal: '#2A7E78', brown: '#5A3E2B' },
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        dm: ['"DM Sans"', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        unbounded: ['Unbounded', 'sans-serif'],
        kalam: ['Kalam', 'cursive'],
        patrick: ['"Patrick Hand"', 'cursive'],
        bungee: ['Bungee', 'cursive'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        roboto: ['Roboto', 'system-ui', 'sans-serif'],
        playfair: ['"Playfair Display"', 'serif'],
        garamond: ['"EB Garamond"', 'serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        fredoka: ['Fredoka', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        righteous: ['Righteous', 'cursive'],
        monoton: ['Monoton', 'cursive'],
      },
    },
  },
  plugins: [],
};
