export const STAGES = [
  "title", "avatar", "copyCity", "meetCarlo", "carloDay", "copyFactory", "originalNote",
  "notificationRun", "quietChurch", "goodPoints", "lookUp", "sevenDoors", "firstQuestion", "prayer", "ending"
];

export const DISCOVERIES = [
  { id: "ball", label: "축구공", symbol: "⚽", x: 520, y: 682, note: "친구들과 뛰어놀던 카를로" },
  { id: "bag", label: "학교 가방", symbol: "🎒", x: 1040, y: 560, note: "학교에 다니던 평범한 학생" },
  { id: "game", label: "게임기", symbol: "🎮", x: 1540, y: 682, note: "게임도 즐겼던 카를로" },
  { id: "computer", label: "컴퓨터", symbol: "💻", x: 2180, y: 500, note: "인터넷과 컴퓨터를 잘 사용한 카를로" },
  { id: "rosary", label: "묵주", symbol: "📿", x: 2800, y: 682, note: "일상에서 기도한 카를로" },
  { id: "church", label: "성당", symbol: "⛪", x: 3410, y: 620, note: "예수님을 만나러 자주 간 카를로" }
];

export const INTEREST_OPTIONS = [
  { label: "🎮 게임", value: "게임" }, { label: "🎵 음악", value: "음악" },
  { label: "⚽ 운동", value: "운동" }, { label: "🎨 그림", value: "그림" },
  { label: "📚 책", value: "책" }, { label: "💻 컴퓨터", value: "컴퓨터" },
  { label: "💬 사람 만나기", value: "사람 만나기" }, { label: "🌿 자연", value: "자연" }
];

export const GOOD_NPCS = [
  {
    id: "quiet", x: 700, name: "조용한 친구", color: 0x6aa9ff,
    line: "말은 많지 않지만, 친구가 아프면 숙제를 사진으로 보내줘.",
    options: ["배려가 깊어요", "믿음직해요", "친절해요"]
  },
  {
    id: "funny", x: 1550, name: "장난꾸러기 친구", color: 0xff9b72,
    line: "친구들이 긴장할 때 웃게 해 주려고 장난을 친대.",
    options: ["분위기를 밝게 해요", "용기가 있어요", "친구를 살펴봐요"]
  },
  {
    id: "alone", x: 2400, name: "혼자 있는 친구", color: 0x9f8cff,
    line: "혼자 있는 시간에 그림을 그려. 다른 사람 마음을 그림으로 표현해.",
    options: ["생각이 깊어요", "표현을 잘해요", "마음이 섬세해요"]
  }
];

export const DOORS = [
  ["첫째 날", "조종실", "내 삶의 중심은 무엇일까?"],
  ["둘째 날", "천국으로 가는 길", "예수님은 정말 나의 친구일까?"],
  ["셋째 날", "원본", "나는 누구의 복사본으로 살고 있을까?"],
  ["넷째 날", "위를 바라봐", "걱정 때문에 아래만 보고 있지는 않을까?"],
  ["다섯째 날", "재능 작업실", "나에게 주신 재능은 무엇일까?"],
  ["여섯째 날", "사랑의 다리", "나는 누구를 사랑하며 살아가고 있을까?"],
  ["일곱째 날", "나의 인생 계획", "나는 어떤 사람이 되고 싶을까?"]
];
