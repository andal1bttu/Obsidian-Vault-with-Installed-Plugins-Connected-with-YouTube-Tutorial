import { App, Modal } from "obsidian";

// Curated emoji catalog, grouped roughly the way Iconize organizes icons.
// Each entry: [emoji, searchable name].
export const EMOJI_CATALOG: [string, string][] = [
  // Knowledge and writing
  ["📝", "memo note writing"], ["📄", "page document"], ["📃", "page curl"], ["📑", "bookmark tabs"],
  ["📚", "books library"], ["📖", "open book reading"], ["📕", "red book"], ["📗", "green book"],
  ["📘", "blue book"], ["📙", "orange book"], ["📓", "notebook"], ["📔", "notebook decorative"],
  ["📒", "ledger"], ["🗒️", "spiral notepad"], ["✏️", "pencil"], ["🖊️", "pen"], ["🖋️", "fountain pen"],
  ["✒️", "black nib"], ["🖍️", "crayon"], ["📌", "pushpin pin"], ["📍", "round pushpin location"],
  ["📎", "paperclip"], ["🔖", "bookmark"], ["🏷️", "label tag"], ["🗂️", "card index dividers"],
  ["📁", "folder"], ["📂", "open folder"], ["🗃️", "card file box"], ["🗄️", "file cabinet"],
  // Ideas and thinking
  ["💡", "idea light bulb"], ["🧠", "brain thinking"], ["💭", "thought balloon"], ["🗯️", "anger bubble"],
  ["💬", "speech bubble comment"], ["🔍", "magnifying glass search"], ["🔎", "search right"],
  ["🎯", "target goal dart"], ["🧩", "puzzle piece"], ["⚙️", "gear settings"], ["🔧", "wrench tool"],
  ["🔨", "hammer build"], ["🛠️", "hammer wrench tools"], ["⚡", "lightning fast energy"],
  ["🔥", "fire hot trending"], ["✨", "sparkles new"], ["⭐", "star favorite"], ["🌟", "glowing star"],
  ["❓", "question mark"], ["❗", "exclamation important"], ["⚠️", "warning caution"],
  ["✅", "check done complete"], ["❌", "cross wrong"], ["🚫", "prohibited no"],
  // Tech and science
  ["💻", "laptop computer code"], ["🖥️", "desktop computer"], ["⌨️", "keyboard"], ["🖱️", "mouse"],
  ["📱", "phone mobile"], ["🤖", "robot ai bot"], ["👾", "alien monster game"], ["🎮", "game controller"],
  ["🕹️", "joystick"], ["📡", "satellite antenna signal"], ["🛰️", "satellite space"],
  ["🔬", "microscope science"], ["🔭", "telescope astronomy"], ["🧪", "test tube experiment"],
  ["🧬", "dna genetics"], ["⚗️", "alembic chemistry"], ["🧮", "abacus calculation"],
  ["💾", "floppy disk save"], ["💿", "cd disk"], ["🗜️", "clamp compress"], ["🔋", "battery power"],
  ["🔌", "plug electric"], ["📊", "bar chart analytics data"], ["📈", "chart up growth"],
  ["📉", "chart down decline"], ["🧭", "compass navigation"], ["🗺️", "map world"],
  ["🌐", "globe web internet"], ["🌍", "earth africa europe"], ["🌎", "earth americas"],
  ["🌏", "earth asia"], ["🛜", "wifi wireless"], ["📶", "signal bars"],
  // Media and creative
  ["🎥", "movie camera video"], ["🎬", "clapper board film"], ["📹", "video camera"],
  ["📷", "camera photo"], ["📸", "camera flash"], ["🎞️", "film frames"], ["📺", "television"],
  ["🎙️", "studio microphone podcast"], ["🎤", "microphone"], ["🎧", "headphones audio"],
  ["🔊", "speaker loud volume"], ["🎵", "musical note"], ["🎶", "musical notes"],
  ["🎨", "artist palette design"], ["🖌️", "paintbrush"], ["🖼️", "framed picture image"],
  ["✂️", "scissors cut"], ["📐", "triangular ruler"], ["📏", "straight ruler"],
  ["🖇️", "linked paperclips"], ["🎭", "performing arts theater"], ["🎪", "circus tent"],
  // Nature and landscape
  ["🌱", "seedling plant sprout"], ["🌿", "herb leaves"], ["🍀", "four leaf clover"],
  ["🌳", "deciduous tree"], ["🌲", "evergreen tree"], ["🌴", "palm tree"], ["🌵", "cactus"],
  ["🌾", "sheaf of rice grain"], ["🍁", "maple leaf"], ["🍂", "fallen leaves"], ["🌸", "cherry blossom"],
  ["🌼", "blossom flower"], ["🌻", "sunflower"], ["🌹", "rose"], ["🪴", "potted plant"],
  ["⛰️", "mountain"], ["🏔️", "snow mountain"], ["🌋", "volcano"], ["🏞️", "national park landscape"],
  ["🏜️", "desert"], ["🏖️", "beach"], ["🏝️", "island"], ["🌊", "wave water ocean"],
  ["💧", "droplet water"], ["🌧️", "rain cloud"], ["⛅", "sun behind cloud"], ["☀️", "sun sunny"],
  ["🌤️", "sun small cloud"], ["🌙", "crescent moon night"], ["🌈", "rainbow"], ["❄️", "snowflake"],
  ["🌪️", "tornado"], ["🌡️", "thermometer temperature"],
  // Buildings and places
  ["🏠", "house home"], ["🏡", "house garden"], ["🏢", "office building"], ["🏛️", "classical building museum"],
  ["🏗️", "building construction crane"], ["🏰", "castle"], ["🗼", "tower"], ["🌆", "cityscape dusk"],
  ["🌇", "sunset city"], ["🏙️", "cityscape skyline"], ["🛖", "hut"], ["⛺", "tent camping"],
  ["🏟️", "stadium"], ["🕌", "mosque"], ["⛪", "church"], ["🏫", "school"], ["🏥", "hospital"],
  ["🏭", "factory industry"], ["🚏", "bus stop"], ["🛣️", "motorway road"], ["🌉", "bridge night"],
  // Transport
  ["🚗", "car automobile"], ["🚌", "bus"], ["🚲", "bicycle bike"], ["🛴", "kick scooter"],
  ["🚂", "locomotive train"], ["🚇", "metro subway"], ["✈️", "airplane flight"], ["🚀", "rocket launch"],
  ["🛸", "flying saucer ufo"], ["🚁", "helicopter"], ["⛵", "sailboat"], ["🚢", "ship"],
  ["🛶", "canoe"], ["🚧", "construction barrier"],
  // People and activity
  ["👤", "person silhouette"], ["👥", "people silhouettes"], ["🧑‍🏫", "teacher instructor"],
  ["🧑‍💻", "technologist developer"], ["🧑‍🎓", "student graduate"], ["🧑‍🔬", "scientist"],
  ["🧑‍🎨", "artist"], ["👷", "construction worker"], ["🕵️", "detective sleuth"],
  ["💪", "flexed biceps strength"], ["👍", "thumbs up like"], ["👎", "thumbs down"],
  ["👏", "clapping hands applause"], ["🙌", "raising hands celebration"], ["🤝", "handshake deal"],
  ["👋", "waving hand hello"], ["✍️", "writing hand"], ["🫵", "pointing at viewer"],
  ["🏃", "runner running"], ["🚶", "walking"], ["🧘", "lotus meditation"], ["🏋️", "weight lifting"],
  // Time and planning
  ["📅", "calendar date"], ["📆", "tear off calendar"], ["🗓️", "spiral calendar"],
  ["⏰", "alarm clock"], ["⏱️", "stopwatch"], ["⏳", "hourglass time"], ["🕐", "clock one"],
  ["📋", "clipboard checklist"], ["🗳️", "ballot box"], ["📤", "outbox sent"], ["📥", "inbox received"],
  ["📦", "package box"], ["📬", "mailbox mail"], ["✉️", "envelope email"], ["📮", "postbox"],
  // Symbols and shapes
  ["❤️", "red heart love"], ["🧡", "orange heart"], ["💛", "yellow heart"], ["💚", "green heart"],
  ["💙", "blue heart"], ["💜", "purple heart"], ["🖤", "black heart"], ["🤍", "white heart"],
  ["🔴", "red circle"], ["🟠", "orange circle"], ["🟡", "yellow circle"], ["🟢", "green circle"],
  ["🔵", "blue circle"], ["🟣", "purple circle"], ["⚫", "black circle"], ["⚪", "white circle"],
  ["🟥", "red square"], ["🟧", "orange square"], ["🟨", "yellow square"], ["🟩", "green square"],
  ["🟦", "blue square"], ["🟪", "purple square"], ["⬛", "black square"], ["⬜", "white square"],
  ["🔺", "red triangle up"], ["🔻", "red triangle down"], ["🔶", "orange diamond"],
  ["🔷", "blue diamond"], ["💠", "diamond with dot"], ["🔗", "link chain"], ["♾️", "infinity"],
  ["➕", "plus add"], ["➖", "minus subtract"], ["✳️", "eight spoked asterisk"],
  ["🔱", "trident"], ["⚜️", "fleur de lis"], ["🔰", "beginner shield"],
  // Awards and value
  ["🏆", "trophy winner"], ["🥇", "gold medal first"], ["🥈", "silver medal second"],
  ["🥉", "bronze medal third"], ["🎖️", "military medal"], ["💎", "gem diamond"],
  ["💰", "money bag"], ["💵", "dollar bill"], ["🪙", "coin"], ["🎁", "gift present"],
  ["🎉", "party popper celebration"], ["🎊", "confetti ball"], ["🎈", "balloon"],
  // Animals
  ["🐝", "bee"], ["🦋", "butterfly"], ["🐛", "bug caterpillar"], ["🐜", "ant"], ["🕷️", "spider"],
  ["🐢", "turtle"], ["🐍", "snake"], ["🦎", "lizard"], ["🐸", "frog"], ["🐦", "bird"],
  ["🦅", "eagle"], ["🦉", "owl wisdom"], ["🐧", "penguin"], ["🐺", "wolf"], ["🦊", "fox"],
  ["🐱", "cat"], ["🐶", "dog"], ["🐭", "mouse animal"], ["🐹", "hamster"], ["🐰", "rabbit"],
  ["🐻", "bear"], ["🐼", "panda"], ["🐨", "koala"], ["🦁", "lion"], ["🐯", "tiger"],
  ["🐘", "elephant"], ["🦒", "giraffe"], ["🐋", "whale"], ["🐬", "dolphin"], ["🐙", "octopus"],
  ["🦈", "shark"], ["🐟", "fish"], ["🦀", "crab"], ["🐴", "horse"], ["🦄", "unicorn"],
  // Food
  ["☕", "coffee hot beverage"], ["🍵", "tea"], ["🥤", "cup straw"], ["🍎", "apple red"],
  ["🍊", "orange tangerine"], ["🍋", "lemon"], ["🍇", "grapes"], ["🍓", "strawberry"],
  ["🥑", "avocado"], ["🥕", "carrot"], ["🌽", "corn"], ["🍞", "bread"], ["🧀", "cheese"],
  ["🍕", "pizza"], ["🍔", "hamburger"], ["🌮", "taco"], ["🍜", "noodles ramen"],
  ["🍰", "cake dessert"], ["🍪", "cookie"], ["🍫", "chocolate"],
];

export interface EmojiChoice {
  emoji: string | null; // null = clear icon
  applyToConnected: boolean;
}

export class EmojiPickerModal extends Modal {
  private onPick: (choice: EmojiChoice) => void;
  private nodeName: string;
  private applyToConnected = false;

  constructor(app: App, nodeName: string, onPick: (choice: EmojiChoice) => void) {
    super(app);
    this.nodeName = nodeName;
    this.onPick = onPick;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: `Icon for ${this.nodeName}` });

    const scopeRow = contentEl.createDiv();
    scopeRow.style.display = "flex";
    scopeRow.style.gap = "8px";
    scopeRow.style.alignItems = "center";
    scopeRow.style.margin = "4px 0 8px";
    const scope = scopeRow.createEl("input", { type: "checkbox" });
    scope.id = "bg-emoji-scope";
    const scopeLabel = scopeRow.createEl("label", { text: "Also apply to directly connected notes" });
    scopeLabel.htmlFor = scope.id;
    scope.onchange = () => {
      this.applyToConnected = scope.checked;
    };

    const search = contentEl.createEl("input", { type: "text" });
    search.placeholder = "Search emojis, or paste any emoji and press Enter";
    search.style.width = "100%";
    search.style.marginBottom = "8px";

    const grid = contentEl.createDiv();
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(10, 1fr)";
    grid.style.gap = "2px";
    grid.style.maxHeight = "320px";
    grid.style.overflowY = "auto";

    const render = (filter: string) => {
      grid.empty();
      const f = filter.toLowerCase().trim();
      for (const [emoji, name] of EMOJI_CATALOG) {
        if (f && !name.includes(f) && !emoji.includes(f)) continue;
        const b = grid.createEl("button", { text: emoji });
        b.title = name;
        b.style.fontSize = "18px";
        b.style.padding = "4px 2px";
        b.style.background = "transparent";
        b.style.border = "none";
        b.style.cursor = "pointer";
        b.onclick = () => {
          this.close();
          this.onPick({ emoji, applyToConnected: this.applyToConnected });
        };
      }
    };
    render("");
    search.oninput = () => render(search.value);
    search.onkeydown = (ev) => {
      if (ev.key === "Enter" && search.value.trim() && !/[a-z0-9]/i.test(search.value.trim())) {
        this.close();
        this.onPick({ emoji: search.value.trim(), applyToConnected: this.applyToConnected });
      }
    };

    const clearBtn = contentEl.createEl("button", { text: "Clear icon" });
    clearBtn.style.marginTop = "8px";
    clearBtn.onclick = () => {
      this.close();
      this.onPick({ emoji: null, applyToConnected: this.applyToConnected });
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}
