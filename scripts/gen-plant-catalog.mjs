/**
 * Writes src/data/plantCatalog.json — run: node scripts/gen-plant-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const out = path.join(root, 'src/data/plantCatalog.json');

const da = 'dynamic_accumulator';
const pa = 'pollinator_attractor';
const pr = 'pest_repellent';
const gc = 'ground_cover';
const ws = 'wildfire_suppressor';
const mu = 'mulcher';
const ed = 'edible';
const me = 'medicinal';

const os = 'overstory';
const us = 'understory';
const sh = 'shrub';
const gcL = 'ground_cover';
const he = 'herb';
const ro = 'root';
const vi = 'vine';

const cv = (id, name, extra = {}) => ({ id, name, ...extra });

const species = [
  {
    id: 'unknown',
    name: 'Plant',
    defaultEmoji: '🌱',
    functions: [],
    layers: [],
    cultivars: [],
  },
  {
    id: 'nashi_pear',
    name: 'Nashi pear',
    defaultEmoji: '🍐',
    functions: [ed, pa],
    layers: [us],
    cultivars: [
      cv('nijisseiki', 'Nijisseiki (20th Century)'),
      cv('hosui', 'Hosui'),
      cv('shinseiki', 'Shinseiki'),
      cv('chojuro', 'Chojuro'),
    ],
  },
  {
    id: 'nanking_cherry',
    name: 'Nanking cherry',
    defaultEmoji: '🍒',
    functions: [ed, pa, pr],
    layers: [sh],
    cultivars: [cv('oriental', 'Oriental'), cv('princess', 'Princess'), cv('white_nanking', 'White Nanking')],
  },
  {
    id: 'apple',
    name: 'Apple',
    defaultEmoji: '🍎',
    functions: [ed, pa],
    layers: [us],
    cultivars: [
      cv('granny_smith', 'Granny Smith'),
      cv('honeycrisp', 'Honeycrisp'),
      cv('fuji', 'Fuji'),
      cv('liberty', 'Liberty'),
      cv('cox_orange_pippin', "Cox's Orange Pippin"),
    ],
  },
  {
    id: 'pear',
    name: 'Pear',
    defaultEmoji: '🍐',
    functions: [ed, pa],
    layers: [us],
    cultivars: [
      cv('bartlett', 'Bartlett'),
      cv('bosc', 'Bosc'),
      cv('anjou', 'Anjou'),
      cv('seckel', 'Seckel'),
    ],
  },
  {
    id: 'nasturtium',
    name: 'Nasturtium',
    defaultEmoji: '🌼',
    functions: [ed, pr, pa],
    layers: [gcL, he],
    cultivars: [cv('alaska', 'Alaska'), cv('empress_of_india', 'Empress of India'), cv('jewel_mix', 'Jewel Mix')],
  },
  {
    id: 'haskap',
    name: 'Haskap',
    defaultEmoji: '🫐',
    functions: [ed, pa],
    layers: [sh],
    cultivars: [cv('borealis', 'Borealis'), cv('tundra', 'Tundra'), cv('berry_blue', 'Berry Blue'), cv('indigo_gem', 'Indigo Gem')],
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    defaultEmoji: '🍓',
    functions: [ed, pa, gc],
    layers: [gcL],
    cultivars: [
      cv('alpine_mignonette', 'Alpine Mignonette'),
      cv('seascape', 'Seascape'),
      cv('chandler', 'Chandler'),
      cv('honeoye', 'Honeoye'),
    ],
  },
  {
    id: 'basil',
    name: 'Basil',
    defaultEmoji: '🌿',
    functions: [ed, me, pr, pa],
    layers: [he],
    cultivars: [
      cv('genovese', 'Genovese'),
      cv('thai', 'Thai'),
      cv('purple_ruffles', 'Purple Ruffles'),
      cv('lemon', 'Lemon'),
    ],
  },
  {
    id: 'daisy',
    name: 'Daisy',
    defaultEmoji: '🌼',
    functions: [pa, me],
    layers: [he, gcL],
    cultivars: [cv('shasta', 'Shasta'), cv('oxeye', 'Oxeye'), cv('english', 'English')],
  },
  {
    id: 'jostaberry',
    name: 'Jostaberry',
    defaultEmoji: '🫐',
    functions: [ed, pa],
    layers: [sh],
    cultivars: [
      cv('ymerina', 'Ymerina'),
      cv('standard', 'Standard'),
      cv('orus_8', 'Orus 8'),
    ],
  },
  {
    id: 'banana',
    name: 'Banana',
    defaultEmoji: '🍌',
    functions: [ed, pa],
    layers: [us],
    cultivars: [cv('cavendish', 'Cavendish'), cv('dwarf_cavendish', 'Dwarf Cavendish')],
  },
  {
    id: 'gooseberry',
    name: 'Gooseberry',
    defaultEmoji: '🫛',
    functions: [ed, pa],
    layers: [sh],
    cultivars: [cv('invicta', 'Invicta'), cv('hinnonmaki_red', 'Hinnonmäki Red'), cv('pixwell', 'Pixwell')],
  },
  {
    id: 'comfrey',
    name: 'Comfrey',
    defaultEmoji: '🪻',
    functions: [da, mu, me, pa],
    layers: [he, ro],
    cultivars: [
      cv('bocking_14', 'Bocking 14'),
      cv('bocking_4', 'Bocking 4'),
      cv('common', 'Common (wild type)'),
    ],
  },
  {
    id: 'calendula',
    name: 'Calendula',
    defaultEmoji: '🌼',
    functions: [ed, me, pa, pr],
    layers: [he],
    cultivars: [cv('radio_extra', 'Radio Extra'), cv('indian_prince', 'Indian Prince'), cv('zeolights', 'Zeolights')],
  },
  {
    id: 'dill',
    name: 'Dill',
    defaultEmoji: '🌿',
    functions: [ed, pa, pr],
    layers: [he],
    cultivars: [cv('bouquet', 'Bouquet'), cv('fernleaf', 'Fernleaf'), cv('mammoth', 'Mammoth')],
  },
  {
    id: 'che',
    name: 'Che (mandarin melon berry)',
    defaultEmoji: '🫐',
    functions: [ed, me, pa],
    layers: [sh, us],
    cultivars: [cv('seedless', 'Seedless'), cv('norris', 'Norris #1')],
  },
  {
    id: 'black_currant',
    name: 'Black currant',
    defaultEmoji: '🫐',
    functions: [ed, pa, me],
    layers: [sh],
    cultivars: [cv('titania', 'Titania'), cv('consort', 'Consort'), cv('ben_lomond', 'Ben Lomond')],
  },
  {
    id: 'white_currant',
    name: 'White currant',
    defaultEmoji: '🫐',
    functions: [ed, pa],
    layers: [sh],
    cultivars: [cv('white_grape', 'White Grape'), cv('blanka', 'Blanka')],
  },
  {
    id: 'red_currant',
    name: 'Red currant',
    defaultEmoji: '🫐',
    functions: [ed, pa],
    layers: [sh],
    cultivars: [cv('jonkheer_van_tets', 'Jonkheer van Tets'), cv('roda', 'Röda'), cv('red_lake', 'Red Lake')],
  },
  {
    id: 'peach',
    name: 'Peach',
    defaultEmoji: '🍑',
    functions: [ed, pa],
    layers: [us],
    cultivars: [cv('elberta', 'Elberta'), cv('redhaven', 'Redhaven'), cv('contender', 'Contender')],
  },
  {
    id: 'nectarine',
    name: 'Nectarine',
    defaultEmoji: '🍑',
    functions: [ed, pa],
    layers: [us],
    cultivars: [cv('fantasia', 'Fantasia'), cv('hard_red', 'Hard Red'), cv('snow_queen', 'Snow Queen')],
  },
  {
    id: 'apricot',
    name: 'Apricot',
    defaultEmoji: '🍑',
    functions: [ed, pa],
    layers: [us],
    cultivars: [cv('moorpark', 'Moorpark'), cv('tilton', 'Tilton'), cv('goldcot', 'Goldcot')],
  },
  {
    id: 'plum',
    name: 'Plum',
    defaultEmoji: '🟣',
    functions: [ed, pa],
    layers: [us],
    cultivars: [cv('stanley', 'Stanley'), cv('shiro', 'Shiro'), cv('damson', 'Damson'), cv('greengage', 'Greengage')],
  },
  {
    id: 'sweet_cherry',
    name: 'Sweet cherry',
    defaultEmoji: '🍒',
    functions: [ed, pa],
    layers: [os],
    cultivars: [cv('bing', 'Bing'), cv('rainier', 'Rainier'), cv('stella', 'Stella'), cv('lapins', 'Lapins')],
  },
  {
    id: 'sour_cherry',
    name: 'Sour cherry',
    defaultEmoji: '🍒',
    functions: [ed, pa],
    layers: [us],
    cultivars: [cv('montmorency', 'Montmorency'), cv('north_star', 'North Star'), cv('morello', 'Morello')],
  },
  {
    id: 'hazelnut',
    name: 'Hazelnut',
    defaultEmoji: '🌰',
    functions: [ed, pa, ws],
    layers: [sh, us],
    cultivars: [cv('barcelona', 'Barcelona'), cv('jefferson', 'Jefferson'), cv('theta', 'Theta')],
  },
  {
    id: 'walnut',
    name: 'Walnut',
    defaultEmoji: '🌰',
    functions: [ed, da, mu],
    layers: [os],
    cultivars: [cv('chandler', 'Chandler'), cv('carpathian', 'Carpathian'), cv('heartnut', 'Heartnut')],
  },
  {
    id: 'blueberry',
    name: 'Blueberry',
    defaultEmoji: '🫐',
    functions: [ed, pa],
    layers: [sh],
    cultivars: [cv('bluecrop', 'Bluecrop'), cv('northland', 'Northland'), cv('pink_lemonade', 'Pink Lemonade')],
  },
  {
    id: 'raspberry',
    name: 'Raspberry',
    defaultEmoji: '🫐',
    functions: [ed, pa],
    layers: [sh],
    cultivars: [cv('heritage', 'Heritage'), cv('fall_gold', 'Fall Gold'), cv('tulameen', 'Tulameen')],
  },
  {
    id: 'blackberry',
    name: 'Blackberry',
    defaultEmoji: '🫐',
    functions: [ed, pa],
    layers: [sh, vi],
    cultivars: [cv('triple_crown', 'Triple Crown'), cv('chester', 'Chester'), cv('navaho', 'Navaho')],
  },
  {
    id: 'tayberry',
    name: 'Tayberry',
    defaultEmoji: '🫐',
    functions: [ed, pa],
    layers: [sh, vi],
    cultivars: [cv('buckingham', 'Buckingham'), cv('medana', 'Medana')],
  },
  {
    id: 'lemon',
    name: 'Lemon',
    defaultEmoji: '🍋',
    functions: [ed, pr, pa],
    layers: [us],
    cultivars: [cv('meyer', 'Meyer'), cv('eureka', 'Eureka'), cv('ponderosa', 'Ponderosa')],
  },
  {
    id: 'orange',
    name: 'Orange',
    defaultEmoji: '🍊',
    functions: [ed, pa],
    layers: [us],
    cultivars: [cv('valencia', 'Valencia'), cv('navel', 'Navel'), cv('blood_orange', 'Blood orange')],
  },
  {
    id: 'hardy_orange',
    name: 'Hardy orange (trifoliate)',
    defaultEmoji: '🍋',
    functions: [ed, pr, pa],
    layers: [sh, us],
    cultivars: [cv('flying_dragon', 'Flying Dragon'), cv('standard', 'Poncirus standard')],
  },
  {
    id: 'goji',
    name: 'Goji berry',
    defaultEmoji: '🫐',
    functions: [ed, me, pa],
    layers: [sh],
    cultivars: [cv('crimson_star', 'Crimson Star'), cv('sweet_lifeberry', 'Sweet Lifeberry'), cv('phoenix', 'Phoenix')],
  },
  {
    id: 'cornelian_cherry',
    name: 'Cornelian cherry',
    defaultEmoji: '🍒',
    functions: [ed, pa],
    layers: [sh, us],
    cultivars: [cv('jolico', 'Jolico'), cv('yellow', 'Yellow'), cv('podolski', 'Podolski')],
  },
  {
    id: 'chinese_chestnut',
    name: 'Chinese chestnut',
    defaultEmoji: '🌰',
    functions: [ed, pa, mu],
    layers: [os],
    cultivars: [cv('qing', 'Qing'), cv('peiling', 'Peiling'), cv('sleeping_giant', 'Sleeping Giant')],
  },
  {
    id: 'yellowhorn',
    name: 'Yellowhorn (shan li hong)',
    defaultEmoji: '🌼',
    functions: [ed, pa, me],
    layers: [sh, us],
    cultivars: [cv('sinensis', 'Sinensis'), cv('golden_horn', 'Golden Horn')],
  },
  {
    id: 'rosemary',
    name: 'Rosemary',
    defaultEmoji: '🌿',
    functions: [ed, me, pr, pa],
    layers: [sh, he],
    cultivars: [cv('arp', 'Arp'), cv('tuscan_blue', 'Tuscan Blue'), cv('prostratus', 'Prostratus')],
  },
  {
    id: 'birch',
    name: 'Birch',
    defaultEmoji: '🌳',
    functions: [da, mu, pa],
    layers: [os],
    cultivars: [cv('river', 'River birch'), cv('paper', 'Paper birch'), cv('sweet', 'Sweet birch')],
  },
  {
    id: 'hibiscus',
    name: 'Hibiscus',
    defaultEmoji: '🌺',
    functions: [pa, me, ed],
    layers: [sh, he],
    cultivars: [cv('cranberry', 'Rose mallow Cranberry'), cv('lord_baltimore', 'Lord Baltimore'), cv('moscheutos', 'H. moscheutos mix')],
  },
  {
    id: 'lilac',
    name: 'Lilac',
    defaultEmoji: '🪻',
    functions: [pa, pr],
    layers: [sh, us],
    cultivars: [cv('common_purple', 'Common purple'), cv('miss_kim', 'Miss Kim'), cv('president_grevy', 'President Grevy')],
  },
];

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ species }, null, 2), 'utf8');
console.log('Wrote', out);
