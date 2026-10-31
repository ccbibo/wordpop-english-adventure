// Each family joins a picture cue, an English expression, and a Traditional Chinese meaning.
// Emoji are illustrative cues, especially for abstract words; they are not assessment evidence.
export const themes = [
  {name:'動物園',english:'Animal Friends',emoji:'🦁',words:[
    {en:'cat',zh:'貓',emoji:'🐱'},{en:'dog',zh:'狗',emoji:'🐶'},
    {en:'lion',zh:'獅子',emoji:'🦁'},{en:'monkey',zh:'猴子',emoji:'🐵'},
    {en:'elephant',zh:'大象',emoji:'🐘'},{en:'rabbit',zh:'兔子',emoji:'🐰'}]},
  {name:'水果',english:'Fruit Garden',emoji:'🍓',words:[
    {en:'apple',zh:'蘋果',emoji:'🍎'},{en:'banana',zh:'香蕉',emoji:'🍌'},
    {en:'grape',zh:'葡萄',emoji:'🍇'},{en:'orange',zh:'柳橙',emoji:'🍊'},
    {en:'strawberry',zh:'草莓',emoji:'🍓'},{en:'watermelon',zh:'西瓜',emoji:'🍉'}]},
  {name:'顏色',english:'Rainbow Studio',emoji:'🌈',words:[
    {en:'red',zh:'紅色',emoji:'🔴'},{en:'blue',zh:'藍色',emoji:'🔵'},
    {en:'yellow',zh:'黃色',emoji:'🟡'},{en:'green',zh:'綠色',emoji:'🟢'},
    {en:'purple',zh:'紫色',emoji:'🟣'},{en:'orange',zh:'橘色',emoji:'🟠'}]},
  {name:'數字',english:'Number Party',emoji:'🔢',words:[
    {en:'one',zh:'一',emoji:'1️⃣'},{en:'two',zh:'二',emoji:'2️⃣'},
    {en:'three',zh:'三',emoji:'3️⃣'},{en:'four',zh:'四',emoji:'4️⃣'},
    {en:'five',zh:'五',emoji:'5️⃣'},{en:'six',zh:'六',emoji:'6️⃣'}]},
  {name:'交通工具',english:'On the Move',emoji:'🚂',words:[
    {en:'car',zh:'汽車',emoji:'🚗'},{en:'bus',zh:'公車',emoji:'🚌'},
    {en:'train',zh:'火車',emoji:'🚂'},{en:'bicycle',zh:'腳踏車',emoji:'🚲'},
    {en:'airplane',zh:'飛機',emoji:'✈️'},{en:'boat',zh:'小船',emoji:'⛵'}]},
  {name:'學校',english:'School Days',emoji:'🏫',words:[
    {en:'book',zh:'書',emoji:'📖'},{en:'pencil',zh:'鉛筆',emoji:'✏️'},
    {en:'schoolbag',zh:'書包',emoji:'🎒'},{en:'ruler',zh:'尺',emoji:'📏'},
    {en:'scissors',zh:'剪刀',emoji:'✂️'},{en:'school',zh:'學校',emoji:'🏫'}]},
  {name:'家庭與住屋',english:'Homes and Houses',emoji:'🏡',words:[
    {en:'house',zh:'房屋',emoji:'🏠'},{en:'apartment',zh:'公寓',emoji:'🏢'},
    {en:'castle',zh:'城堡',emoji:'🏰'},{en:'cottage',zh:'鄉間小屋',emoji:'🏡'},
    {en:'cabin',zh:'木屋',emoji:'🛖'},{en:'tent',zh:'帳篷',emoji:'⛺'}]},
  {name:'蔬菜',english:'Veggie Patch',emoji:'🥕',words:[
    {en:'carrot',zh:'紅蘿蔔',emoji:'🥕'},{en:'corn',zh:'玉米',emoji:'🌽'},
    {en:'broccoli',zh:'青花菜',emoji:'🥦'},{en:'potato',zh:'馬鈴薯',emoji:'🥔'},
    {en:'cucumber',zh:'小黃瓜',emoji:'🥒'},{en:'eggplant',zh:'茄子',emoji:'🍆'}]},
  {name:'服裝',english:'Dress Up',emoji:'👕',words:[
    {en:'shirt',zh:'襯衫',emoji:'👔'},{en:'dress',zh:'洋裝',emoji:'👗'},
    {en:'jeans',zh:'牛仔褲',emoji:'👖'},{en:'coat',zh:'外套',emoji:'🧥'},
    {en:'hat',zh:'帽子',emoji:'🧢'},{en:'socks',zh:'襪子',emoji:'🧦'}]},
  {name:'夜市',english:'Night Market',emoji:'🏮',words:[
    {en:'dumpling',zh:'餃子',emoji:'🥟'},{en:'noodles',zh:'麵條',emoji:'🍜'},
    {en:'bubble tea',zh:'珍珠奶茶',emoji:'🧋'},{en:'ice cream',zh:'冰淇淋',emoji:'🍦'},
    {en:'popcorn',zh:'爆米花',emoji:'🍿'},{en:'sweet potato',zh:'地瓜',emoji:'🍠'}]},
  {name:'天氣',english:'Weather Wonders',emoji:'🌤️',words:[
    {en:'sunny',zh:'晴朗的',emoji:'☀️'},{en:'rainy',zh:'下雨的',emoji:'🌧️'},
    {en:'cloudy',zh:'多雲的',emoji:'☁️'},{en:'windy',zh:'有風的',emoji:'🌬️'},
    {en:'snowy',zh:'下雪的',emoji:'🌨️'},{en:'stormy',zh:'有暴風雨的',emoji:'⛈️'}]},
  {name:'海洋生物',english:'Ocean Adventure',emoji:'🐳',words:[
    {en:'fish',zh:'魚',emoji:'🐟'},{en:'whale',zh:'鯨魚',emoji:'🐳'},
    {en:'dolphin',zh:'海豚',emoji:'🐬'},{en:'octopus',zh:'章魚',emoji:'🐙'},
    {en:'crab',zh:'螃蟹',emoji:'🦀'},{en:'shark',zh:'鯊魚',emoji:'🦈'}]},
  {name:'運動',english:'Sports Club',emoji:'⚽',words:[
    {en:'soccer',zh:'足球',emoji:'⚽'},{en:'basketball',zh:'籃球',emoji:'🏀'},
    {en:'baseball',zh:'棒球',emoji:'⚾'},{en:'tennis',zh:'網球',emoji:'🎾'},
    {en:'badminton',zh:'羽毛球',emoji:'🏸'},{en:'swimming',zh:'游泳',emoji:'🏊'}]},
  {name:'餐廳',english:'At the Restaurant',emoji:'🍽️',words:[
    {en:'rice',zh:'米飯',emoji:'🍚'},{en:'bread',zh:'麵包',emoji:'🍞'},
    {en:'salad',zh:'沙拉',emoji:'🥗'},{en:'pizza',zh:'披薩',emoji:'🍕'},
    {en:'hamburger',zh:'漢堡',emoji:'🍔'},{en:'milk',zh:'牛奶',emoji:'🥛'}]},
  {name:'公園',english:'A Day in the Park',emoji:'🌳',words:[
    {en:'tree',zh:'樹',emoji:'🌳'},{en:'flower',zh:'花',emoji:'🌼'},
    {en:'butterfly',zh:'蝴蝶',emoji:'🦋'},{en:'bird',zh:'鳥',emoji:'🐦'},
    {en:'leaf',zh:'葉子',emoji:'🍃'},{en:'fountain',zh:'噴水池',emoji:'⛲'}]},
  {name:'情緒',english:'Feelings & Friends',emoji:'😊',words:[
    {en:'happy',zh:'開心的',emoji:'😊'},{en:'sad',zh:'難過的',emoji:'😢'},
    {en:'angry',zh:'生氣的',emoji:'😠'},{en:'scared',zh:'害怕的',emoji:'😨'},
    {en:'surprised',zh:'驚訝的',emoji:'😲'},{en:'tired',zh:'疲累的',emoji:'😴'}]},
  {name:'職業',english:'Dream Jobs',emoji:'🧑‍🚀',words:[
    {en:'teacher',zh:'老師',emoji:'🧑‍🏫'},{en:'doctor',zh:'醫師',emoji:'🧑‍⚕️'},
    {en:'firefighter',zh:'消防員',emoji:'🧑‍🚒'},{en:'chef',zh:'主廚',emoji:'🧑‍🍳'},
    {en:'astronaut',zh:'太空人',emoji:'🧑‍🚀'},{en:'farmer',zh:'農夫',emoji:'🧑‍🌾'}]},
  {name:'方位介詞',english:'Where Is It?',emoji:'🧭',words:[
    {en:'in',zh:'在裡面',emoji:'📦'},{en:'on',zh:'在上面',emoji:'🔝'},
    {en:'under',zh:'在下面',emoji:'⬇️'},{en:'behind',zh:'在後面',emoji:'🔙'},
    {en:'next to',zh:'在旁邊',emoji:'↔️'},{en:'between',zh:'在兩者之間',emoji:'↔️'}]},
  {name:'動作動詞',english:'Ready, Set, Go!',emoji:'🏃',words:[
    {en:'run',zh:'跑',emoji:'🏃'},{en:'walk',zh:'走',emoji:'🚶'},
    {en:'dance',zh:'跳舞',emoji:'💃'},{en:'sing',zh:'唱歌',emoji:'🎤'},
    {en:'eat',zh:'吃',emoji:'🍽️'},{en:'sleep',zh:'睡覺',emoji:'🛌'}]},
  {name:'休閒嗜好',english:'My Favorite Things',emoji:'🎨',words:[
    {en:'reading',zh:'閱讀',emoji:'📚'},{en:'painting',zh:'繪畫',emoji:'🎨'},
    {en:'camping',zh:'露營',emoji:'🏕️'},{en:'fishing',zh:'釣魚',emoji:'🎣'},
    {en:'gardening',zh:'園藝',emoji:'🪴'},{en:'swimming',zh:'游泳',emoji:'🏊'}]}
];

export default themes;
