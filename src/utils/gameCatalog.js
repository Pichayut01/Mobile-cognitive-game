export const GAME_CATALOG = [
  {
    id: 'visual-search',
    titleTh: 'ค้นหาเป้าหมาย',
    skill: 'ฝึกการสังเกต',
    theme: 'marine',
  },
  {
    id: 'number-ordering',
    titleTh: 'เรียงตัวเลข',
    skill: 'ฝึกความไว',
    theme: 'sage',
  },
  {
    id: 'back-trace',
    titleTh: 'จำเส้นทาง',
    skill: 'ฝึกความจำระยะสั้น',
    theme: 'clay',
  },
  {
    id: 'switch-rules',
    titleTh: 'สลับกฎ',
    skill: 'ฝึกการยับยั้งและปรับตัว',
    theme: 'slate',
  },
  {
    id: 'memory-matrix',
    titleTh: 'จำตำแหน่งไฟ',
    skill: 'ฝึกความจำมิติสัมพันธ์',
    theme: 'teal',
  },
];

export const GAME_META_MAP = Object.fromEntries(
  GAME_CATALOG.map((game) => [game.id, game]),
);
