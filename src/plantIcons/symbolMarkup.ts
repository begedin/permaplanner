import type { PlantIconId } from './iconIds';

/** Inner SVG for each plant-icon symbol (viewBox 0 0 48 48). */
export const PLANT_ICON_SYMBOL_INNER: Record<PlantIconId, string> = {
  seedling: `
    <path d="M24 38 Q23 32 24 26 Q25 20 24 14" />
    <path d="M24 22 Q14 18 12 10 Q18 16 24 22" />
    <path d="M24 26 Q34 22 36 14 Q30 20 24 26" />
  `,
  'leaf-herb': `
    <path fill="#a8b88a" d="M13 34 C5 22 15 8 36 7 C40 25 30 39 13 34 Z" />
    <path d="M9 41 Q19 25 32 12" />
    <path d="M17 30 L14 21 M23 23 L22 15 M23 23 L32 24 M17 30 L27 31" />
  `,
  apple: `
    <path fill="#cf6559" d="M24 15 C17 9 8 13 8 23 C8 32 14 40 20 40 Q24 38 28 40 C34 40 40 32 40 23 C40 13 31 9 24 15 Z" />
    <path d="M24 15 Q23 10 25 7" />
    <path fill="#94aa70" d="M25 11 Q28 5 35 7 Q33 13 25 11 Z" />
    <path stroke="#efaaa0" stroke-width="3" d="M14 20 Q11 25 15 30" />
  `,
  pear: `
    <path fill="#c9b87a" d="M24 10 Q28 8 28 14 Q30 22 28 30 Q26 38 22 38 Q16 36 16 28 Q14 18 20 12 Q22 10 24 10" />
    <path d="M24 10 Q24 6 25 4" />
  `,
  peach: `
    <path fill="#e8a88a" d="M18 16 Q28 12 34 20 Q38 30 30 36 Q20 40 14 30 Q12 22 18 16" />
    <path d="M20 18 Q26 24 32 28" />
    <path d="M26 12 Q26 8 28 6" />
  `,
  cherry: `
    <path d="M24 8 Q22 14 20 18" />
    <path fill="#8b2942" d="M16 22 Q12 26 14 32 Q18 36 22 32 Q24 26 20 20 Q16 18 16 22" />
    <path fill="#8b2942" d="M28 20 Q32 18 34 24 Q34 32 28 34 Q22 32 24 24 Q26 20 28 20" />
  `,
  strawberry: `
    <path fill="#cf5958" d="M24 15 C15 10 7 15 9 24 C11 32 19 39 24 41 C29 39 37 32 39 24 C41 15 33 10 24 15 Z" />
    <path fill="#8fa968" d="M24 15 L17 10 L18 16 L11 18 L20 21 L24 17 L28 21 L37 18 L30 16 L31 10 Z" />
    <path d="M24 15 Q22 10 25 7" />
    <path stroke="#f4d59b" stroke-width="2.5" d="M16 24 L17 26 M24 24 L24 26 M32 24 L31 26 M20 31 L21 33 M28 31 L27 33" />
  `,
  blueberry: `
    <path fill="#687eb4" d="M24 10 C34 9 40 16 39 26 C39 36 32 40 24 40 C14 40 8 33 9 24 C9 15 15 10 24 10 Z" />
    <path fill="#3f507d" d="M24 14 L27 18 L32 17 L29 22 L30 26 L24 24 L19 26 L20 21 L17 17 L22 18 Z" />
    <path stroke="#a9bce0" stroke-width="3" d="M14 26 Q14 32 19 34" />
  `,
  blackberry: `
    <path d="M24 13 Q23 9 26 7" />
    <path fill="#8fa968" d="M24 14 L16 10 L18 17 L30 17 L33 10 Z" />
    <g stroke="#352b3d" stroke-width="1.5">
      <circle cx="19" cy="18" r="5.5" fill="#66546f" />
      <circle cx="29" cy="18" r="5.5" fill="#54445f" />
      <circle cx="14" cy="26" r="5.5" fill="#66546f" />
      <circle cx="24" cy="26" r="6" fill="#51405e" />
      <circle cx="34" cy="26" r="5.5" fill="#43364f" />
      <circle cx="18" cy="34" r="5.5" fill="#51405e" />
      <circle cx="29" cy="34" r="5.5" fill="#43364f" />
      <circle cx="24" cy="36" r="4.5" fill="#3c3049" />
    </g>
  `,
  mulberry: `
    <path stroke="#6c7950" d="M25 15 Q28 10 32 7" />
    <g stroke="#432a3c" stroke-width="1.5">
      <circle cx="23" cy="16" r="4.5" fill="#87516c" />
      <circle cx="29" cy="19" r="4.5" fill="#693c59" />
      <circle cx="19" cy="22" r="4.5" fill="#87516c" />
      <circle cx="25" cy="25" r="5" fill="#693c59" />
      <circle cx="16" cy="28" r="4.5" fill="#77425f" />
      <circle cx="22" cy="31" r="5" fill="#59334f" />
      <circle cx="15" cy="34" r="4.5" fill="#693c59" />
      <circle cx="19" cy="37" r="4" fill="#4f2e48" />
    </g>
  `,
  haskap: `
    <path fill="#687eac" d="M23 8 C30 6 34 11 34 18 C34 24 31 27 30 33 C29 38 26 41 22 40 C17 39 14 34 14 28 C14 22 13 17 15 13 C17 9 20 8 23 8 Z" />
    <path stroke="#a5b7d5" stroke-width="2.5" d="M20 13 Q16 18 18 25" />
    <path stroke="#465779" stroke-width="1.5" d="M21 36 Q23 38 25 36" />
  `,
  raspberry: `
    <path fill="#8fa968" d="M24 16 L15 9 L18 16 L11 18 L24 21 L37 18 L30 16 L33 9 Z" />
    <g stroke="#773943" stroke-width="1.5">
      <circle cx="16" cy="22" r="6" fill="#df7880" />
      <circle cx="25" cy="21" r="6" fill="#d76573" />
      <circle cx="33" cy="23" r="5.5" fill="#c95265" />
      <circle cx="18" cy="30" r="5.5" fill="#d76573" />
      <circle cx="28" cy="30" r="5.5" fill="#c95265" />
      <circle cx="24" cy="36" r="5" fill="#b9455d" />
    </g>
  `,
  goji: `
    <path stroke="#6f7950" d="M24 8 Q20 12 19 17 M24 8 Q29 13 30 20" />
    <path fill="#df6948" d="M19 15 C26 15 25 25 21 32 Q18 37 14 40 C10 35 10 29 12 23 Q14 16 19 15 Z" />
    <path fill="#c94e3d" d="M30 18 C36 16 39 23 38 29 Q37 36 32 40 C28 36 26 31 26 26 Q26 20 30 18 Z" />
    <path stroke="#f3ac76" stroke-width="2.5" d="M17 21 Q14 26 15 31 M31 23 L31 29" />
  `,
  'red-currant': `
    <path stroke="#738254" d="M25 8 Q28 22 23 39 M26 16 L16 18 M26 23 L34 25 M25 30 L16 32" />
    <g fill="#c95159">
      <circle cx="16" cy="19" r="6" />
      <circle cx="34" cy="25" r="6" />
      <circle cx="16" cy="32" r="6" />
      <circle cx="25" cy="37" r="4.5" />
    </g>
    <path stroke="#ed9b98" stroke-width="2.5" d="M14 17 L14 19 M32 23 L32 25 M14 30 L14 32" />
  `,
  'black-currant': `
    <path stroke="#738254" d="M25 8 Q28 22 23 39 M26 16 L16 18 M26 23 L34 25 M25 30 L16 32" />
    <g fill="#4e405d">
      <circle cx="16" cy="19" r="6" />
      <circle cx="34" cy="25" r="6" />
      <circle cx="16" cy="32" r="6" />
      <circle cx="25" cy="37" r="4.5" />
    </g>
    <path stroke="#9b89a8" stroke-width="2.5" d="M14 17 L14 19 M32 23 L32 25 M14 30 L14 32" />
  `,
  'white-currant': `
    <path stroke="#738254" d="M25 8 Q28 22 23 39 M26 16 L16 18 M26 23 L34 25 M25 30 L16 32" />
    <g fill="#e6d7a8">
      <circle cx="16" cy="19" r="6" />
      <circle cx="34" cy="25" r="6" />
      <circle cx="16" cy="32" r="6" />
      <circle cx="25" cy="37" r="4.5" />
    </g>
    <path stroke="#fff3d3" stroke-width="2.5" d="M14 17 L14 19 M32 23 L32 25 M14 30 L14 32" />
  `,
  elderflower: `
    <path stroke="#738254" d="M24 40 L24 26 M24 33 L11 22 M24 33 L37 22 M24 30 L17 15 M24 30 L31 15" />
    <g fill="#f4eaca" stroke="#93866b" stroke-width="1.2">
      <circle cx="12" cy="21" r="4.5" />
      <circle cx="18" cy="24" r="4.5" />
      <circle cx="25" cy="23" r="4.5" />
      <circle cx="33" cy="24" r="4.5" />
      <circle cx="37" cy="19" r="4" />
      <circle cx="11" cy="14" r="4" />
      <circle cx="17" cy="14" r="4.5" />
      <circle cx="24" cy="12" r="4.5" />
      <circle cx="31" cy="14" r="4.5" />
    </g>
    <path stroke="#c5a459" stroke-width="2" d="M12 21 h0 M18 24 h0 M25 23 h0 M33 24 h0 M37 19 h0 M11 14 h0 M17 14 h0 M24 12 h0 M31 14 h0" />
  `,
  lemon: `
    <path fill="#e8d86a" d="M14 24 Q12 16 18 12 Q28 8 36 16 Q40 26 34 34 Q24 40 14 32 Q10 28 14 24" />
    <path d="M18 14 Q24 18 30 16" />
  `,
  orange: `
    <circle cx="24" cy="26" r="14" fill="#e8a55c" />
    <path d="M24 12 L24 40 M12 26 L36 26 M16 16 L32 36 M32 16 L16 36" />
    <path d="M24 12 Q26 8 28 10" />
  `,
  banana: `
    <path fill="#e8d070" d="M12 32 Q8 20 14 10 Q22 6 30 12 Q38 18 36 28 Q32 36 22 38 Q14 38 12 32" />
    <path d="M14 12 Q18 8 22 10" />
  `,
  chestnut: `
    <path fill="#8b6914" d="M24 10 Q34 12 36 22 Q34 34 24 36 Q14 34 12 22 Q14 12 24 10" />
    <path d="M18 14 Q24 18 30 14 M16 22 Q24 26 32 22 M18 30 Q24 32 30 30" />
  `,
  flower: `
    <circle cx="24" cy="24" r="4" fill="#e8c86a" />
    <ellipse cx="24" cy="14" rx="5" ry="8" fill="#e8b8c8" />
    <ellipse cx="32" cy="20" rx="5" ry="8" transform="rotate(72 32 20)" fill="#e8b8c8" />
    <ellipse cx="32" cy="30" rx="5" ry="8" transform="rotate(144 32 30)" fill="#e8b8c8" />
    <ellipse cx="24" cy="36" rx="5" ry="8" transform="rotate(216 24 36)" fill="#e8b8c8" />
    <ellipse cx="16" cy="30" rx="5" ry="8" transform="rotate(288 16 30)" fill="#e8b8c8" />
    <path d="M24 36 Q24 42 24 44" />
  `,
  'flower-blossom': `
    <circle cx="24" cy="22" r="3" fill="#f0c8d0" />
    <circle cx="24" cy="12" r="6" fill="#f8d8e0" />
    <circle cx="32" cy="18" r="6" fill="#f8d8e0" />
    <circle cx="30" cy="28" r="6" fill="#f8d8e0" />
    <circle cx="18" cy="28" r="6" fill="#f8d8e0" />
    <circle cx="16" cy="18" r="6" fill="#f8d8e0" />
    <path d="M24 30 Q23 38 24 42" />
  `,
  'flower-tropical': `
    <circle cx="24" cy="24" r="5" fill="#c04060" />
    <path fill="#e06080" d="M24 10 Q30 14 28 20 Q24 16 20 20 Q18 14 24 10" />
    <path fill="#e06080" d="M34 16 Q38 22 34 26 Q28 24 26 30 Q30 34 34 16" />
    <path fill="#e06080" d="M38 28 Q34 34 28 32 Q26 26 20 28 Q18 34 38 28" />
    <path fill="#e06080" d="M28 38 Q22 40 20 34 Q22 28 16 26 Q10 28 28 38" />
    <path fill="#e06080" d="M14 32 Q10 26 14 22 Q20 24 22 18 Q16 14 14 32" />
  `,
  'flower-spike': `
    <path fill="#5a8860" d="M24 35 Q8 33 6 40 Q9 46 22 44 Q24 40 24 35" />
    <path fill="#5a8860" d="M24 35 Q40 33 42 40 Q39 46 26 44 Q24 40 24 35" />
    <path d="M24 40 Q23 28 24 11" />
    <path fill="#9488b0" d="M24 11 Q17 13 15 20 Q14 27 20 29 Q24 28 28 29 Q34 27 33 20 Q31 13 24 11" />
    <path fill="#a898c8" d="M13 19 Q9 21 8 27 Q10 32 15 30 Q18 26 13 19" />
    <path fill="#a898c8" d="M35 20 Q39 22 40 28 Q38 33 33 31 Q30 27 35 20" />
    <path fill="#b0a0d0" d="M16 26 Q12 28 11 33 Q14 37 19 35 Q22 31 16 26" />
    <path fill="#b0a0d0" d="M32 27 Q36 29 37 34 Q34 38 29 36 Q26 32 32 27" />
    <path d="M14 40 Q20 37 24 38 M34 40 Q28 37 24 38" />
  `,
  'flower-rose': `
    <path fill="#c05070" d="M24 28 Q16 28 14 22 Q14 16 20 14 Q24 12 28 14 Q34 16 34 22 Q32 28 24 28" />
    <path fill="#d07090" d="M24 26 Q18 24 18 20 Q20 16 24 16 Q28 16 30 20 Q30 24 24 26" />
    <path fill="#e090a8" d="M24 24 Q22 22 24 20 Q26 22 24 24" />
    <path d="M24 28 Q24 36 24 42" />
  `,
  'flower-rosette': `
    <circle cx="24" cy="22" r="4" fill="#d4a040" />
    <path fill="#e8c060" d="M24 10 Q28 14 26 18 Q24 14 22 18 Q20 14 24 10" />
    <path fill="#e8c060" d="M34 14 Q36 18 32 20 Q30 16 28 20 Q32 14 34 14" />
    <path fill="#e8c060" d="M38 24 Q34 28 30 26 Q32 22 28 24 Q36 22 38 24" />
    <path fill="#e8c060" d="M34 34 Q30 36 28 32 Q30 28 26 30 Q32 34 34 34" />
    <path fill="#e8c060" d="M24 38 Q20 34 22 30 Q24 34 26 30 Q28 34 24 38" />
    <path fill="#e8c060" d="M14 34 Q16 30 20 32 Q18 28 14 26 Q12 32 14 34" />
    <path fill="#e8c060" d="M10 24 Q14 20 18 22 Q14 26 10 24" />
    <path fill="#e8c060" d="M14 14 Q18 16 16 20 Q20 18 22 14 Q16 12 14 14" />
  `,
  tree: `
    <path d="M22 38 L22 28 L26 28 L26 38" />
    <path fill="#6a9a5a" d="M24 8 Q36 10 38 20 Q40 28 32 30 Q28 32 24 28 Q16 32 10 26 Q8 16 16 10 Q20 8 24 8" />
  `,
  evergreen: `
    <path d="M24 40 L24 34" />
    <path fill="#5a8a6a" d="M12 34 L36 34 L24 22 Z" />
    <path fill="#6a9a7a" d="M14 28 L34 28 L24 16 Z" />
    <path fill="#7aaa8a" d="M16 22 L32 22 L24 10 Z" />
  `,
  pea: `
    <path fill="#8ab86a" d="M14 20 Q12 28 16 34 Q22 38 28 34 Q34 28 32 20 Q30 14 22 12 Q16 12 14 20" />
    <circle cx="20" cy="24" r="3" fill="#6a9a4a" />
    <circle cx="26" cy="26" r="3" fill="#6a9a4a" />
    <circle cx="22" cy="30" r="3" fill="#6a9a4a" />
    <path d="M28 14 Q32 10 34 8" />
  `,
  lettuce: `
    <path fill="#8aba7a" d="M24 38 Q14 34 12 24 Q14 14 24 10 Q34 14 36 24 Q34 34 24 38" />
    <path d="M24 14 Q20 22 24 30 Q28 22 24 14" />
    <path d="M18 18 Q24 20 30 18" />
  `,
  garlic: `
    <path fill="#e8e0d0" d="M20 16 Q24 10 28 16 Q32 22 30 30 Q26 36 22 36 Q16 34 16 26 Q14 20 20 16" />
    <path d="M18 14 Q16 10 14 8 M22 12 Q22 8 20 6 M28 14 Q30 10 32 8" />
  `,
  onion: `
    <path fill="#d8c8a8" d="M24 12 Q32 14 34 24 Q32 36 24 38 Q16 36 14 24 Q16 14 24 12" />
    <path d="M20 12 Q24 8 28 12" />
  `,
  grain: `
    <path d="M24 40 Q24 20 24 8" />
    <ellipse cx="20" cy="12" rx="4" ry="8" fill="#d8c878" />
    <ellipse cx="28" cy="14" rx="4" ry="8" fill="#d8c878" />
    <ellipse cx="18" cy="20" rx="4" ry="8" fill="#c8b868" />
    <ellipse cx="30" cy="22" rx="4" ry="8" fill="#c8b868" />
    <ellipse cx="22" cy="28" rx="4" ry="8" fill="#d8c878" />
    <ellipse cx="28" cy="30" rx="4" ry="8" fill="#d8c878" />
  `,
  potted: `
    <path fill="#a08060" d="M14 32 L34 32 L32 40 L16 40 Z" />
    <path d="M18 32 Q20 24 24 18 Q28 24 30 32" />
    <path fill="#6a9a5a" d="M24 10 Q30 12 28 18 Q24 16 20 18 Q18 12 24 10" />
  `,
  grape: `
    <path d="M24 8 Q28 6 30 10" />
    <circle cx="18" cy="20" r="5" fill="#6a4a8a" />
    <circle cx="26" cy="18" r="5" fill="#7a5a9a" />
    <circle cx="30" cy="26" r="5" fill="#6a4a8a" />
    <circle cx="22" cy="26" r="5" fill="#8a6aaa" />
    <circle cx="16" cy="28" r="5" fill="#7a5a9a" />
    <circle cx="24" cy="32" r="5" fill="#6a4a8a" />
  `,
  kiwi: `
    <ellipse cx="24" cy="26" rx="14" ry="16" fill="#9a8a4a" />
    <circle cx="20" cy="24" r="1.5" fill="#3d2f24" />
    <circle cx="26" cy="22" r="1.5" fill="#3d2f24" />
    <circle cx="24" cy="28" r="1.5" fill="#3d2f24" />
    <circle cx="18" cy="30" r="1.5" fill="#3d2f24" />
    <circle cx="30" cy="28" r="1.5" fill="#3d2f24" />
  `,
  sunflower: `
    <circle cx="24" cy="24" r="6" fill="#6a4a20" />
    <ellipse cx="24" cy="10" rx="3" ry="8" fill="#e8c040" />
    <ellipse cx="34" cy="16" rx="3" ry="8" transform="rotate(45 34 16)" fill="#e8c040" />
    <ellipse cx="38" cy="26" rx="3" ry="8" transform="rotate(90 38 26)" fill="#e8c040" />
    <ellipse cx="34" cy="34" rx="3" ry="8" transform="rotate(135 34 34)" fill="#e8c040" />
    <ellipse cx="24" cy="38" rx="3" ry="8" fill="#e8c040" />
    <ellipse cx="14" cy="34" rx="3" ry="8" transform="rotate(225 14 34)" fill="#e8c040" />
    <ellipse cx="10" cy="26" rx="3" ry="8" transform="rotate(270 10 26)" fill="#e8c040" />
    <ellipse cx="14" cy="16" rx="3" ry="8" transform="rotate(315 14 16)" fill="#e8c040" />
    <path d="M24 38 Q24 42 24 44" />
  `,
  maple: `
    <path fill="#c86a40" d="M24 8 L28 18 L38 16 L30 24 L36 34 L24 28 L12 34 L18 24 L10 16 L20 18 Z" />
    <path d="M24 28 L24 42" />
  `,
  plum: `
    <circle cx="24" cy="26" r="12" fill="#7b5a9c" />
    <path d="M24 14 Q24 10 26 8 Q28 6 30 8" />
  `,
  apricot: `
    <circle cx="24" cy="26" r="12" fill="#e8a55c" />
    <path d="M24 14 Q25 10 27 8" />
  `,
  bouquet: `
    <path d="M18 42 Q20 32 22 24 M24 42 Q24 30 24 20 M30 42 Q28 32 26 24" />
    <circle cx="18" cy="18" r="5" fill="#e8a8b8" />
    <circle cx="26" cy="14" r="5" fill="#e8c8a8" />
    <circle cx="32" cy="20" r="5" fill="#c8a8e8" />
  `,
};
