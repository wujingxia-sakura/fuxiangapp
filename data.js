/* 浮想 · 数据层
 * 天气 = 语义层；场景 = 视觉层。
 * 新增场景只需要在这里加一条配置，渲染器会自动套用配方。
 */
window.FUXIANG_DATA = (function () {
  'use strict';

  const FAMILIES = [
    { id: 'clear', name: '晴', color: '#f2c07a', icon: '☀' },
    { id: 'cloud', name: '云', color: '#9aa7b8', icon: '☁' },
    { id: 'rain', name: '雨', color: '#6b8cae', icon: '☂' },
    { id: 'snow', name: '雪', color: '#c9d6e3', icon: '❄' },
    { id: 'fog', name: '雾 / 尘', color: '#b0a89a', icon: '≋' },
    { id: 'wind', name: '风', color: '#8fb3a8', icon: '⌇' },
    { id: 'thunder', name: '雷', color: '#b79ad6', icon: '⚡' },
    { id: 'ice', name: '冰 / 霜', color: '#a8c8d8', icon: '✳' }
  ];

  const WEATHERS = [
    { name: '晴', family: 'clear', color: '#f2c07a', scenes: ['花园', '海边灯塔黄昏', '山顶云海日出', '风吹麦浪的傍晚'] },
    { name: '多云', family: 'cloud', color: '#b7c3d0', scenes: ['芦苇荡晚风', '清晨空无一人的车站', '黄昏天台的风'] },
    { name: '阴', family: 'cloud', color: '#8c99a8', scenes: ['古镇石桥烟雨', '老书店午后光尘', '雾中远山与钟声'] },
    { name: '小雨', family: 'rain', color: '#8fa9c4', scenes: ['雨夜路灯', '玻璃雨痕与街灯', '起雾的窗', '雨后青石巷'] },
    { name: '中雨', family: 'rain', color: '#6f8fb0', scenes: ['雨夜路灯', '古镇石桥烟雨', '玻璃雨痕与街灯'] },
    { name: '大雨', family: 'rain', color: '#557a9e', scenes: ['雨夜路灯', '玻璃雨痕与街灯'] },
    { name: '暴雨', family: 'rain', color: '#3e5f80', scenes: ['雨夜路灯', '玻璃雨痕与街灯'] },
    { name: '阵雨', family: 'rain', color: '#7f9fbe', scenes: ['雨后天台彩虹', '雨后青石巷', '雨夜路灯'] },
    { name: '雷阵雨', family: 'rain', color: '#6b6f9e', scenes: ['雨夜路灯', '玻璃雨痕与街灯'] },
    { name: '冻雨', family: 'rain', color: '#9fb8c9', scenes: ['雪中路灯', '玻璃雨痕与街灯'] },
    { name: '小雪', family: 'snow', color: '#d6e0ea', scenes: ['雪夜木屋窗灯', '雪中路灯', '窗边一杯热茶与雪'] },
    { name: '中雪', family: 'snow', color: '#c9d6e3', scenes: ['雪夜木屋窗灯', '雪中路灯'] },
    { name: '大雪', family: 'snow', color: '#b9c9d8', scenes: ['雪夜木屋窗灯', '雪中路灯'] },
    { name: '暴雪', family: 'snow', color: '#a9bccd', scenes: ['雪夜木屋窗灯'] },
    { name: '雨夹雪', family: 'snow', color: '#b8c8d5', scenes: ['雪中路灯', '玻璃雨痕与街灯'] },
    { name: '冰雹', family: 'ice', color: '#a8c8d8', scenes: ['雪中路灯', '玻璃雨痕与街灯'] },
    { name: '露', family: 'ice', color: '#b7d0c8', scenes: ['花园', '晨雾森林', '月下荷塘'] },
    { name: '霜', family: 'ice', color: '#c2d4da', scenes: ['晨雾森林', '雪中路灯', '花园'] },
    { name: '雾凇', family: 'ice', color: '#cfe0e6', scenes: ['晨雾森林', '雪中路灯'] },
    { name: '雨凇', family: 'ice', color: '#c8dce4', scenes: ['雪中路灯', '玻璃雨痕与街灯'] },
    { name: '雾', family: 'fog', color: '#b0a89a', scenes: ['晨雾森林', '起雾的窗', '雾中远山与钟声', '古镇石桥烟雨'] },
    { name: '霾', family: 'fog', color: '#a89f90', scenes: ['雾中远山与钟声', '清晨空无一人的车站'] },
    { name: '浮尘', family: 'fog', color: '#b9a88e', scenes: ['雾中远山与钟声', '黄昏天台的风'] },
    { name: '扬沙', family: 'fog', color: '#b7a27f', scenes: ['黄昏天台的风', '雾中远山与钟声'] },
    { name: '沙尘暴', family: 'fog', color: '#a68f6e', scenes: ['黄昏天台的风'] },
    { name: '大风', family: 'wind', color: '#8fb3a8', scenes: ['芦苇荡晚风', '风吹麦浪的傍晚', '黄昏天台的风'] },
    { name: '龙卷风', family: 'wind', color: '#7f9e96', scenes: ['星空下的草原', '黄昏天台的风'] },
    { name: '寒潮', family: 'wind', color: '#9fb8c9', scenes: ['雪中路灯', '雪夜木屋窗灯'] },
    { name: '雷暴', family: 'thunder', color: '#b79ad6', scenes: ['雨夜路灯', '玻璃雨痕与街灯'] },
    { name: '闪电', family: 'thunder', color: '#cbb8e8', scenes: ['雨夜路灯', '黄昏天台的风'] }
  ];

  const SCENES = [
    { name: '花园', group: '春', recipe: 'petals', palette: ['#12251b', '#284a33', '#5f7d54'], accent: '#f6d7a7', line: '风把花瓣吹进你的句子。' },
    { name: '夜萤火', group: '夏', recipe: 'fireflies', palette: ['#07130f', '#0d2a22', '#1d4a35'], accent: '#d8f39a', line: '光落在草叶上，也落在你刚写的那句里。' },
    { name: '起雾的窗', group: '雨', recipe: 'window', palette: ['#18212a', '#2b3a45', '#4b5d66'], accent: '#cfd8d4', line: '雾把窗外擦成了一张没写完的纸。' },
    { name: '雨夜路灯', group: '夜', recipe: 'rain', palette: ['#080e18', '#101b2b', '#1b2a41'], accent: '#f2c07a', line: '灯把雨照成了一条一条的线。' },
    { name: '晨雾森林', group: '春', recipe: 'fog', palette: ['#101a17', '#23332c', '#43564b'], accent: '#d9e3d4', line: '树在雾里，只露出一点点轮廓。' },
    { name: '月下荷塘', group: '夏', recipe: 'stars', palette: ['#08151a', '#102a30', '#1d4046'], accent: '#e8f0d8', line: '月亮落在水里，荷塘就有了第二个天空。' },
    { name: '雪夜木屋窗灯', group: '冬', recipe: 'snow', palette: ['#080d18', '#101a2b', '#1c2a41'], accent: '#f4c97a', line: '雪把世界按了静音，只有窗里还亮着。' },
    { name: '秋日银杏大道', group: '秋', recipe: 'leaves', palette: ['#1d1508', '#3a2a12', '#6b4d1e'], accent: '#f2c96b', line: '银杏把整条路，铺成了旧信纸的颜色。' },
    { name: '海边灯塔黄昏', group: '山海', recipe: 'sea', palette: ['#241226', '#5a2f3a', '#a05a4a'], accent: '#ffcf9a', line: '灯塔亮起来的时候，海就有了方向。' },
    { name: '樱花纷落小径', group: '春', recipe: 'petals', palette: ['#241318', '#45222c', '#7a4050'], accent: '#f6c9d4', line: '樱花落得很慢，像一句话想了很久才说出口。' },
    { name: '星空下的草原', group: '山海', recipe: 'stars', palette: ['#05070f', '#0b1226', '#162344'], accent: '#cfd8f6', line: '星星低得像是伸手就能碰到。' },
    { name: '古镇石桥烟雨', group: '雨', recipe: 'bridge', palette: ['#101714', '#1e2a24', '#35443b'], accent: '#c9d6c8', line: '桥下的水，把整条街的灯都揉皱了。' },
    { name: '冬日温泉雾气', group: '冬', recipe: 'steam', palette: ['#1a1412', '#2e2420', '#4a3a32'], accent: '#f2d6b8', line: '雾气升起来，冷和暖只隔着一层水。' },
    { name: '风铃与夏日走廊', group: '夏', recipe: 'rays', palette: ['#0f1a1a', '#1e3330', '#35544a'], accent: '#d8e8c8', line: '风一过，走廊就把夏天摇响了。' },
    { name: '老书店午后光尘', group: '秋', recipe: 'dust', palette: ['#1a1208', '#2e2112', '#4a351c'], accent: '#f2d6a0', line: '光从旧书的缝里落下来，灰尘也有了重量。' },
    { name: '山顶云海日出', group: '山海', recipe: 'sea', palette: ['#1a1020', '#472334', '#8a4a3a'], accent: '#f6c07a', line: '云海翻过去，太阳才慢慢露出来。' },
    { name: '芦苇荡晚风', group: '秋', recipe: 'reeds', palette: ['#141a0f', '#2a3318', '#4a5526'], accent: '#e8d6a0', line: '芦苇低下头，风就有了形状。' },
    { name: '深夜便利店暖光', group: '城市', recipe: 'shop', palette: ['#070a10', '#0f1420', '#1a2233'], accent: '#f2d68a', line: '整条街都睡了，只有这里还醒着。' },
    { name: '列车窗外流动灯火', group: '城市', recipe: 'train', palette: ['#05080f', '#0b1220', '#141f33'], accent: '#f2c07a', line: '窗外的灯，一盏一盏地往后退。' },
    { name: '雨后天台彩虹', group: '雨', recipe: 'rainbow', palette: ['#1a1a24', '#2e2f3f', '#4a4a5e'], accent: '#f2c9d6', line: '雨停了，天空把没说完的话，弯成了一道虹。' },
    { name: '溪边萤火虫', group: '夏', recipe: 'fireflies', palette: ['#07130f', '#0d241c', '#1a3a2a'], accent: '#d8f39a', line: '溪水把萤火，带到了更远的地方。' },
    { name: '梧桐叶落长街', group: '秋', recipe: 'leaves', palette: ['#171008', '#2e2012', '#4a351c'], accent: '#e8b86b', line: '梧桐叶落下来，长街就有了秋天。' },
    { name: '玻璃雨痕与街灯', group: '雨', recipe: 'window', palette: ['#0b1018', '#1a2230', '#2e3a4a'], accent: '#f2c07a', line: '雨在玻璃上写字，街灯在旁边读。' },
    { name: '湖面倒映烟花', group: '夜', recipe: 'fireworks', palette: ['#05070f', '#0b1226', '#162344'], accent: '#f6c9d6', line: '烟花开在水里，比开在天上更安静。' },
    { name: '林间丁达尔光', group: '春', recipe: 'rays', palette: ['#0d1a12', '#1e3322', '#36543a'], accent: '#e8f0c8', line: '光从树缝里落下来，像有人在远处点了一盏灯。' },
    { name: '旧唱片店黄昏', group: '城市', recipe: 'dust', palette: ['#1a0f08', '#2e1a12', '#4a2a1c'], accent: '#f2b88a', line: '唱针落下去，黄昏就有了声音。' },
    { name: '海边烟花与浪', group: '山海', recipe: 'fireworks', palette: ['#05070f', '#0b1226', '#162344'], accent: '#f6c9d6', line: '烟花落进海里，浪把它接住了。' },
    { name: '雪中路灯', group: '冬', recipe: 'snow', palette: ['#080d18', '#101a2b', '#1c2a41'], accent: '#f2c07a', line: '雪落在灯下，像一场很慢的告别。' },
    { name: '黄昏天台的风', group: '城市', recipe: 'roof', palette: ['#1a1020', '#3a1f2c', '#6b3a3a'], accent: '#f6b27a', line: '风从天台吹过去，带走了白天最后一点声音。' },
    { name: '夏夜屋顶星空', group: '夜', recipe: 'roof', palette: ['#05070f', '#0b1226', '#162344'], accent: '#cfd8f6', line: '屋顶上离星星近一点，离人群远一点。' },
    { name: '雨后青石巷', group: '雨', recipe: 'bridge', palette: ['#101714', '#1e2a24', '#35443b'], accent: '#c9d6c8', line: '青石巷把雨收起来，慢慢还给了夜。' },
    { name: '窗边一杯热茶与雪', group: '冬', recipe: 'snow', palette: ['#0d1018', '#1a202e', '#2a3446'], accent: '#f2c07a', line: '茶还热着，雪已经落满了窗。' },
    { name: '清晨空无一人的车站', group: '城市', recipe: 'station', palette: ['#10141a', '#1e2630', '#35404a'], accent: '#d8e0e8', line: '第一班车还没来，世界先安静了一会儿。' },
    { name: '月光下的白色花丛', group: '夜', recipe: 'moonflowers', palette: ['#080d18', '#101a2b', '#1c2a41'], accent: '#e8eef6', line: '月光把白花照得更白，像一小片没有说出口的梦。' },
    { name: '风吹麦浪的傍晚', group: '秋', recipe: 'wheat', palette: ['#1a1408', '#33260f', '#5a421c'], accent: '#f2d68a', line: '麦浪一层一层地过去，风就有了年轮。' },
    { name: '雾中远山与钟声', group: '山海', recipe: 'fog', palette: ['#14171a', '#242a2e', '#3a4248'], accent: '#d8e0e0', line: '山在雾里，钟声在更远的地方。' }
  ];

  const GROUPS = ['全部', '春', '夏', '秋', '冬', '雨', '夜', '山海', '城市'];

  /* 场景的空间配方：远景 / 中景 / 近景 / 光源 / 光束。
   * 这样 36 个场景共用一套舞台，但每个场景有自己的“地方感”。
   */
  const SCENE_PROPS = {
    '花园': { far: 'hedge', mid: 'garden-arch', near: 'flowerbed', orb: 'sun', beam: 'sunbeam' },
    '夜萤火': { far: 'hedge', mid: 'lone-tree', near: 'grass', orb: 'moon', beam: 'moon-glow' },
    '起雾的窗': { far: 'city', mid: 'window-frame', near: 'window-sill', orb: 'lamp', beam: 'none' },
    '雨夜路灯': { far: 'city', mid: 'streetlamp', near: 'wet-road', orb: 'lamp', beam: 'lamp-cone' },
    '晨雾森林': { far: 'mountains', mid: 'forest', near: 'fern', orb: 'mist-sun', beam: 'fog-beam' },
    '月下荷塘': { far: 'hills', mid: 'lotus', near: 'puddle', orb: 'moon', beam: 'moon-glow' },
    '雪夜木屋窗灯': { far: 'pines', mid: 'cabin', near: 'snowbank', orb: 'window', beam: 'window-spill' },
    '秋日银杏大道': { far: 'hills', mid: 'ginkgo', near: 'path', orb: 'sun', beam: 'sunbeam' },
    '海边灯塔黄昏': { far: 'sea', mid: 'lighthouse', near: 'cliff', orb: 'sunset', beam: 'beam' },
    '樱花纷落小径': { far: 'hedge', mid: 'cherry', near: 'path', orb: 'sun', beam: 'sunbeam' },
    '星空下的草原': { far: 'hills', mid: 'lone-tree', near: 'grass', orb: 'moon', beam: 'moon-glow' },
    '古镇石桥烟雨': { far: 'old-town', mid: 'bridge', near: 'willow', orb: 'lamp', beam: 'lantern-glow' },
    '冬日温泉雾气': { far: 'rocks', mid: 'pool', near: 'stones', orb: 'none', beam: 'none' },
    '风铃与夏日走廊': { far: 'hedge', mid: 'corridor', near: 'railing', orb: 'sun', beam: 'sunbeam' },
    '老书店午后光尘': { far: 'bookshelf', mid: 'table', near: 'window-sill', orb: 'window', beam: 'dust-beam' },
    '山顶云海日出': { far: 'sea', mid: 'mountains', near: 'cliff', orb: 'sun', beam: 'sunbeam' },
    '芦苇荡晚风': { far: 'hills', mid: 'reeds', near: 'puddle', orb: 'sunset', beam: 'none' },
    '深夜便利店暖光': { far: 'city', mid: 'storefront', near: 'street', orb: 'shop', beam: 'shop-spill' },
    '列车窗外流动灯火': { far: 'city-glow', mid: 'train-window', near: 'curtain', orb: 'none', beam: 'train-glow' },
    '雨后天台彩虹': { far: 'city', mid: 'rainbow', near: 'railing', orb: 'sun', beam: 'rainbow-glow' },
    '溪边萤火虫': { far: 'forest', mid: 'lone-tree', near: 'puddle', orb: 'moon', beam: 'moon-glow' },
    '梧桐叶落长街': { far: 'old-town', mid: 'ginkgo', near: 'street', orb: 'sun', beam: 'sunbeam' },
    '玻璃雨痕与街灯': { far: 'city', mid: 'window-frame', near: 'window-sill', orb: 'lamp', beam: 'none' },
    '湖面倒映烟花': { far: 'city', mid: 'sea', near: 'railing', orb: 'none', beam: 'none' },
    '林间丁达尔光': { far: 'forest', mid: 'forest', near: 'fern', orb: 'sun', beam: 'sunbeam' },
    '旧唱片店黄昏': { far: 'bookshelf', mid: 'table', near: 'window-sill', orb: 'window', beam: 'dust-beam' },
    '海边烟花与浪': { far: 'sea', mid: 'sea', near: 'cliff', orb: 'none', beam: 'none' },
    '雪中路灯': { far: 'pines', mid: 'streetlamp', near: 'snowbank', orb: 'lamp', beam: 'lamp-cone' },
    '黄昏天台的风': { far: 'city-glow', mid: 'rooftop', near: 'railing', orb: 'sunset', beam: 'sunbeam' },
    '夏夜屋顶星空': { far: 'city-glow', mid: 'rooftop', near: 'railing', orb: 'moon', beam: 'moon-glow' },
    '雨后青石巷': { far: 'old-town', mid: 'bridge', near: 'willow', orb: 'lamp', beam: 'lantern-glow' },
    '窗边一杯热茶与雪': { far: 'pines', mid: 'window-frame', near: 'window-sill', orb: 'window', beam: 'window-spill' },
    '清晨空无一人的车站': { far: 'city-glow', mid: 'platform', near: 'tracks', orb: 'dawn', beam: 'none' },
    '月光下的白色花丛': { far: 'hedge', mid: 'flowers', near: 'grass', orb: 'moon', beam: 'moon-glow' },
    '风吹麦浪的傍晚': { far: 'hills', mid: 'wheat', near: 'path', orb: 'sunset', beam: 'sunbeam' },
    '雾中远山与钟声': { far: 'mountains', mid: 'pagoda', near: 'fern', orb: 'mist-sun', beam: 'fog-beam' }
  };

  SCENES.forEach(function (s) {
    const p = SCENE_PROPS[s.name];
    if (p) Object.assign(s, p);
  });

  /* 插图顺序与用户提供的《插图.docx》一致：01.webp … 36.webp。
   * 图片已裁掉底部水印区域，并转成 WebP；缩略图在 thumbs/ 下。
   */
  SCENES.forEach(function (s, i) {
    const n = (i + 1 < 10 ? '0' : '') + (i + 1);
    if (!s.image) s.image = 'images/scenes/' + n + '.webp';
    if (!s.thumb) s.thumb = 'images/scenes/thumbs/' + n + '.webp';
  });

  const weatherMap = Object.create(null);
  WEATHERS.forEach(function (w) { weatherMap[w.name] = w; });
  const sceneMap = Object.create(null);
  SCENES.forEach(function (s) { sceneMap[s.name] = s; });
  const familyMap = Object.create(null);
  FAMILIES.forEach(function (f) { familyMap[f.id] = f; });

  return {
    families: FAMILIES,
    weathers: WEATHERS,
    scenes: SCENES,
    groups: GROUPS,
    weatherMap: weatherMap,
    sceneMap: sceneMap,
    familyMap: familyMap
  };
})();
