import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface CardItem {
  hanzi: string;
  pinyin: string;
  malay: string;
  english: string;
  isFlipped: boolean;
  memorized: boolean;
}

interface CardGroup {
  name: string;
  icon: string;
  cards: CardItem[];
  total: number;
  memorizedCount: number;
  open: boolean;
}

const STORAGE_KEY = 'chinese-card-memorized';

@Component({
  selector: 'app-chinese-card',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './chinese-card.component.html',
  styleUrls: ['./chinese-card.component.css']
})
export class ChineseCardComponent implements OnInit {
  csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKWtbMLJSVbWpND4vwURlMwlMzRkznLtQigaoYN1_D9uHMUj-Jtk9_JYFZrhzmDaXMnxhCOKp6-S7C/pub?gid=847252225&single=true&output=csv';

  cardList: CardItem[] = [];
  searchTerm = '';
  loading = true;
  error = false;

  filterMode: 'all' | 'belum' | 'hafal' = 'all';
  groupsOfCards: CardGroup[] = [];
  memorizedKeys: Set<string> = new Set();

  private openState = new Map<string, boolean>();

  // Susunan penting: item lebih spesifik mula-mula, 'Lain-lain' mesti paling akhir
  private readonly groupDefs: Array<{ name: string; icon: string; keys: string[] }> = [
    {
      name: 'Rutin Harian & Rumah',
      icon: '🌅',
      keys: [
        'tidur', 'bangun', '睡', '起', 'sarapan', '早餐', 'makan', '餐', 'makan malam',
        'berehat', '休', 'gigi', '牙', 'baju', '衣', 'rambut', '发', 'cermin', '镜',
        'loceng', 'alarm', '闹钟', 'lampu', '关灯', '开灯', 'sampah', '垃圾', 'kerja rumah',
        '家务', 'pinggan', '碗', 'tandas', '厕所', 'televisyen', '电视', 'muzik', '音乐',
        'internet', '上网', 'solek', '化妆', 'kuku', '指甲', 'kulit', '护肤', 'telefon',
        '手机', '充电', 'charging', 'imbas', '扫码', 'bath', 'shower', 'watch',
        'play', 'makeup', 'mirror', 'wake up', 'chores', 'sweep', 'mop', 'laundry',
        'fold', 'walk the dog', 'feed', 'go out', 'water the',
        '出门', '花', '鞋', '喂', '宠', '遛', '叠', '熨', '扫', '拖',
        '空调', '社交媒体', '新闻', '视频', '看医生', '量体温', '吃药',
        '喝水', '喝', '茶', '饭', '泡', '敷', '面膜', '锁', '钥匙',
        '周末', '赖', '哈欠', '伸', '聚会', '照', '香水', '刮', '煮',
        '擦', '整理', '散步', 'tea', 'drink', '回家'
      ]
    },
    {
      name: 'Perjalanan & Pengangkutan',
      icon: '🚗',
      keys: [
        '过马路', '走', '公车', '车', 'bas', '巴士', '地铁', 'memandu',
        '开车', '到达', '加油', '停车', 'lampu isyarat', '红绿灯', '电梯',
        '地图', 'peta', 'tunggu', '等', 'cross', 'drive', 'ride',
        '排队', 'beratur', 'queue', '问路', 'tanya jalan', 'directions',
        'perjalanan'
      ]
    },
    {
      name: 'Kerja & Sekolah',
      icon: '💼',
      keys: [
        'kerja', '工作', '上班', '下班', 'sekolah', '上学', '学', 'kelas', '课',
        'mesyuarat', '开会', 'e-mel', '邮件', '作业', 'tulis', '写', 'baca', '读',
        'print', '印', 'dokumen', '文件', '放学', 'attend', 'class', 'meeting',
        'reply', 'computer', '电脑'
      ]
    },
    {
      name: 'Belanja & Kewangan',
      icon: '🛒',
      keys: [
        'beli', '买', 'belanja', 'shop', '购物', '超市', 'duit', '钱',
        'bayar', '付', 'tunai', '现金', '刷卡', 'simpan duit', '存',
        '提款', 'courier', '快递', '包裹', 'baki', '找零', 'cash', 'card',
        '记账', 'account'
      ]
    },
    {
      name: 'Sukan & Rekreasi',
      icon: '🏃',
      keys: [
        'senaman', '运动', 'exercise', 'berlari', 'run', 'gim', '健身',
        'yoga', '瑜伽', 'berenang', '游泳', 'bola', '篮球', '足球',
        'basketball', 'football', 'swim', 'gym'
      ]
    },
    {
      name: 'Nilai Sosial & Kebajikan',
      icon: '🤝',
      keys: [
        'amal', '善', '捐', 'donation', 'derma', 'sukarelawan', '志愿', '义',
        'komuniti', '社区', 'kebajikan', 'warga emas', '老人', '孤儿', 'yatim',
        '残', 'alam sekitar', '环保', '自然', '保护', '资源', 'sumber',
        '生态', '节能', '低碳', 'charity', 'donate', 'volunteer',
        'community', 'environment', 'welfare', '植树', '献血', '公益',
        '公众', 'humanitarian', '人道', '节约',
        '爱', '恩', '慈善', '关怀', '全球变暖', 'climate',
        '气候', '碳', '空气', '能源', '文明', '文化', '传承',
        'heritage', 'civiliz', 'non-profit', 'pertubuhan', 'yayasan',
        'foundat', '善举', '责无', '共同体', '携手', '以人为本',
        'sustainab', 'biodiversity', 'wildlife', 'animal',
        '公民', '贡献', '绿', '公平', '良知', '和谐', '团结',
        '互助', '救灾', '重建', '教育', '浪', '太阳能', '风能',
        '森林', '保障', '劳工', '消费', '回馈',
        '弱势', '群体', '援助', '奉献'
      ]
    },
    {
      name: 'Kepimpinan & Strategi',
      icon: '👑',
      keys: [
        'kepimpinan', '领导', 'visi', 'wawasan', '愿景', '远见', 'misi', '使命',
        'strategi', '战略', 'keputusan', '决策', 'pengaruh',
        '影响', 'pasukan', '团队', 'teamwork', '协作', '合作', 'komunikasi',
        '沟通', '授权', 'maklum balas', '反馈', 'mentor', '导师', 'bimbingan',
        '指导', 'leadership', 'leader', 'vision', 'mission', 'strategy',
        'empower', 'decide', '协商', '信任', '尊重', 'respect', 'trust',
        'krisis', '危机', '解决',
        '韧性', '适应', '灵活', '同理', '倾听', '包容', '多样', 'adaptab',
        'flexib', 'inclusiv', 'diversity', 'empath', 'resilie',
        '审时', '高瞻', '深谋', '运筹', '帷幄', '知人', '集思', '群策',
        '同舟', '风雨', '身先', 'benchmark', 'core', '组织',
        'organiz', 'struktur', 'structure', '绩效', 'quality',
        '问责', 'transparen', 'accountab', 'anti-corrup', '反腐',
        'compliant', 'delegat', '授',
        '激励', '创新', '前瞻', '赞赏', '扬', '批评', '妥协',
        '共识', '大局', '居安', '克己', '开拓', '进取', '未雨',
        'inno', 'creativ', 'praise', 'criticism', 'sharp', '智慧',
        '唯贤', '尽瘁', '主人翁', '用人'
      ]
    },
    {
      name: 'Disiplin & Nilai Diri',
      icon: '🧭',
      keys: [
        'disiplin', '纪律', '律', 'peraturan', '规则', '守时', 'tanggungjawab',
        '责任', '担当', 'moral', '德', 'etika', '诚信', 'jujur', 'integriti',
        'tabiat', '习惯', 'ketat', '严', 'prinsip', '原则', 'sikap', '态度',
        'hukuman', '惩罚', '奖励', 'taat', '服从', '监督',
        'menegur', '纠正', '反省', 'teladan', '榜样', 'discipline',
        'punctual', 'responsib', 'rule', 'habit', 'standard', '准时',
        '秩序', 'teratur', 'orderly', '约束', 'constraint', 'mengikat',
        'norm', '规范', 'regulat', '廉洁', '贪', 'corrupt', 'conduct',
        'kewajipan', 'obligation', 'bertaubat', 'repent', 'muhasabah',
        'self-reflect', 'awareness', 'kesedaran', '觉悟',
        '时间表', '控制', '限期', '计划', '表现', '限制',
        '安静', '整洁', '卫生', '听从', '迟到', '早退', '旷工',
        '要求', '考核', '自我管理', 'self-manag', 'schedule'
      ]
    },
    {
      name: 'Kejayaan & Motivasi',
      icon: '🏆',
      keys: [
        'kejayaan', 'success', '成功', 'menang', '胜', 'berjaya', '成就',
        'achiev', 'berani', '勇敢', 'courage', 'tekad', '决心',
        '突破', 'breakthrough', '超越', '越', 'kemajuan', '进步',
        'usaha', '努', 'berjuang', '奋斗', '力', 'tabah', '坚持', '恒',
        'cemerlang', '卓越', '卓', 'ganjaran', '回报', 'pengalaman',
        '经验', '成长', '鼓励', 'strive', 'improve', 'grow',
        // Peribahasa & idiom motivasi
        '水滴石穿', '滴水', '绳锯', '铁杵', '天道酬勤', '迎难', '攻坚',
        '砥砺', '乘风破浪', '迎风破浪', '披荆斩棘', '卧薪尝胆', '破釜沉舟',
        '背水一战', '厚积薄发', '厚德载物', '金石为开', '精诚所至',
        '学无止境', '循序渐进', '自强不息', '行胜于言', '功到自然成',
        '瓜熟蒂落', '水到渠成', '谋事在人', '稳扎稳打', '名', '锦',
        '归', '榜', '功', '树',
        '行动', '信心', '财', '激情', '点燃', '完美', '辉', '煌',
        '梦想', '目标', 'gemilang', 'glory', 'surpass',
        'effectiveness', 'efficiency', 'productivit',
        '挑战', '自信', '拼搏', '创造', '奇迹', '专注', '积极',
        '乐观', '把握', '机遇', '登峰', '扭转', '一往',
        '脚踏实地', '勇往', '直面', 'fight',
        '心想事成', '拥抱变化', '掌控人生', '坚定不移', '日积月累',
        '考验', '教训', '成熟', '收获', '荣誉', '伙伴', '支持',
        '独占鳌头', '磨', '脱颖而出', '日新月异', '蒸蒸日上',
        '执行', '改变', '总结', '达成', '步步为营', '变革',
        '汗', 'uplift', 'gain', 'honor', 'mature'
      ]
    },
    {
      name: 'Kegagalan & Kesusahan',
      icon: '🌧️',
      keys: [
        'kegagalan', '失败', '失', '败', 'kekecewaan', '挫', 'jatuh',
        '跌', 'kesilapan', '错', '打击', 'putus asa', '绝望', '绝',
        'tawar hati', '灰心', '悔', '痛', 'susah', '难', 'halangan',
        '阻', '困境', '困', '迷', 'lemah', '软', 'mengalah', '放弃',
        '逃', '退', 'rasa bersalah', '疚', 'failure', 'gagal', '错误',
        '疲', '暗', '歧', '误算', '盲', '崩', '低谷', '下坡', '阴影',
        '惨', '溃', '废', '黑暗', 'tekanan', 'keletihan', 'exhaust',
        'tired', 'misery',
        '遗憾', '自责', '破灭', '倒闭', '亏损', '落选', '分手',
        '离婚', '背叛', '误解', '淘汰', '悲伤', '叹气', '无能',
        '无奈', '心碎', '焦虑', '停滞', '疏忽', '楚歌', '竹篮',
        '南辕北辙', '碰壁', '破产', '落', '夭折', '泪', '黯',
        'regret', 'betrayal', 'divorce', 'bankrupt', 'anxiety',
        'negligence'
      ]
    },
    {
      name: 'Impian & Masa Depan',
      icon: '🌠',
      keys: [
        'impian', '梦', 'harapan', ' hope', 'mengejar', '追', 'masa depan',
        '未来', 'cita', '志', 'keinginan', '愿', 'langit', '星',
        'sayap', '翅', 'terbang', 'fly', ' journey', '旅', '远方',
        '命运', 'bloom', '仰望',
        '蜕变', 'transform', 'reshape', 'faz', 'fase', 'stage',
        'bermula', '确立', 'establish', '方向', '辽阔',
        '黎明', '日出', '光芒', '星辰', '大海', '想象',
        '目的', '远大', '清晰', '具体', '长远', '短期', '规划',
        '寻找', '成真', '初心', '热血', '选择', '探索', '冒险',
        '微笑', '拥抱', '分享', '祝福', '陪伴', '触手', '畏惧',
        '生生不息', '韶华', '绽放', '盛开', '永恒', 'seek'
      ]
    },
    {
      name: 'Lain-lain',
      icon: '📚',
      keys: []
    }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.memorizedKeys = this.readMemorized();
    this.loadCardData();
  }

  loadCardData(): void {
    this.loading = true;
    this.error = false;
    this.http.get(this.csvUrl, { responseType: 'text' }).subscribe({
      next: (data) => {
        this.cardList = this.parseCSV(data);
        this.loading = false;
        this.refreshGroups();
      },
      error: (err) => {
        console.error('Ralat memuatkan data CSV:', err);
        this.loading = false;
        this.error = true;
      }
    });
  }

  parseCSV(csvText: string): CardItem[] {
    const lines = csvText.split(/\r?\n/);
    const result: CardItem[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      if (row.length >= 3 && row[0] && row[1]) {
        const hanzi = row[0].trim();
        if (seen.has(hanzi)) { continue; } // Buang kad bertindih
        seen.add(hanzi);
        result.push({
          hanzi,
          pinyin: row[1].trim(),
          malay: row[2].trim(),
          english: (row[3] || '').trim(),
          isFlipped: false,
          memorized: this.memorizedKeys.has(hanzi)
        });
      }
    }
    return result;
  }

  parseCSVRow(row: string): string[] {
    const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    return (row || '').split(re).map(val => val.replace(/^"|"$/g, '').trim());
  }

  /* ---------- Penapis & Kumpulan ---------- */

  filterCards(): void {
    this.refreshGroups();
  }

  setFilterMode(mode: 'all' | 'belum' | 'hafal'): void {
    this.filterMode = mode;
    this.refreshGroups();
  }

  toggleGroup(group: CardGroup): void {
    group.open = !group.open;
    this.openState.set(group.name, group.open);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.refreshGroups();
  }

  private getMatchingCards(): CardItem[] {
    const term = this.searchTerm.toLowerCase().trim();
    return this.cardList.filter(card => {
      if (this.filterMode === 'hafal' && !card.memorized) { return false; }
      if (this.filterMode === 'belum' && card.memorized) { return false; }
      if (!term) { return true; }
      return card.hanzi.toLowerCase().includes(term) ||
        card.pinyin.toLowerCase().includes(term) ||
        card.malay.toLowerCase().includes(term) ||
        card.english.toLowerCase().includes(term);
    });
  }

  private refreshGroups(): void {
    const matching = this.getMatchingCards();
    this.groupsOfCards = this.buildGroups(matching);
    // Semasa mencari, kembangkan kumpulan yang mempunyai padanan
    if (this.searchTerm.toLowerCase().trim()) {
      for (const group of this.groupsOfCards) {
        if (group.total > 0) {
          group.open = true;
          this.openState.set(group.name, true);
        }
      }
    }
  }

  private buildGroups(list: CardItem[]): CardGroup[] {
    const byName = new Map<string, CardGroup>();
    for (const def of this.groupDefs) {
      byName.set(def.name, {
        name: def.name,
        icon: def.icon,
        cards: [],
        total: 0,
        memorizedCount: 0,
        open: this.openState.get(def.name) ?? false
      });
    }
    for (const card of list) {
      const group = byName.get(this.classify(card)) as CardGroup;
      group.cards.push(card);
      group.total++;
      if (card.memorized) { group.memorizedCount++; }
    }
    return Array.from(byName.values()).filter(g => g.total > 0);
  }

  private classify(card: CardItem): string {
    const text = `${card.hanzi} ${card.malay} ${card.english}`.toLowerCase();
    for (const def of this.groupDefs) {
      for (const key of def.keys) {
        if (text.includes(key)) { return def.name; }
      }
    }
    return 'Lain-lain';
  }

  /* ---------- Kad & Hafalan ---------- */

  flipCard(card: CardItem): void {
    card.isFlipped = !card.isFlipped;
  }

  toggleMemorized(ev: Event, card: CardItem): void {
    ev.stopPropagation();
    card.memorized = !card.memorized;
    if (card.memorized) {
      this.memorizedKeys.add(card.hanzi);
    } else {
      this.memorizedKeys.delete(card.hanzi);
    }
    this.persistMemorized();
    this.refreshGroups();
  }

  get totalShown(): number {
    return this.groupsOfCards.reduce((n, g) => n + g.total, 0);
  }

  get memorizedCount(): number {
    return this.cardList.filter(c => c.memorized).length;
  }

  get memorizedPercent(): number {
    if (this.cardList.length === 0) { return 0; }
    return Math.round((this.memorizedCount / this.cardList.length) * 100);
  }

  /* ---------- Penyimpanan Lokal (localStorage) ---------- */

  private storageAvailable(): boolean {
    try {
      return typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private readMemorized(): Set<string> {
    try {
      if (!this.storageAvailable()) { return new Set<string>(); }
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      return new Set<string>(Array.isArray(list) ? list : []);
    } catch {
      return new Set<string>();
    }
  }

  private persistMemorized(): void {
    try {
      if (!this.storageAvailable()) { return; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.memorizedKeys)));
    } catch {
      // Abaikan jika browser halang simpanan
    }
  }
}
