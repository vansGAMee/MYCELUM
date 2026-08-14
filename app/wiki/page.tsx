'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { GAME_CONFIG, type SpeciesId } from '../../game/config';
import styles from './wiki.module.css';

type Category = 'all' | 'protocols' | 'species' | 'mutations' | 'substrate' | 'duel' | 'events';

type SpeciesNote = {
  id: SpeciesId;
  archiveName: string;
  epithet: string;
  habitat: string;
  temperament: string;
  lore: string;
  counterplay: string;
  warning: string;
};

type AlmanacEntry = {
  name: string;
  archiveName: string;
  kind: string;
  habitat: string;
  note: string;
  observation: string;
  warning: string;
};

const CATEGORY_LABELS: Array<{ id: Category; label: string }> = [
  { id: 'all', label: 'Весь архив' },
  { id: 'protocols', label: 'Полевой устав' },
  { id: 'species', label: 'Семейства' },
  { id: 'mutations', label: 'Мутации' },
  { id: 'substrate', label: 'Жизнь субстрата' },
  { id: 'duel', label: 'Аномалии дуэли' },
  { id: 'events', label: 'События' },
];

const speciesNotes: SpeciesNote[] = [
  {
    id: 'cyan',
    archiveName: 'Structomyces cyanota',
    epithet: 'Стена, которая помнит',
    habitat: 'Старые швы, чистые углы и любые места, где две прямые могут вступить в сговор.',
    temperament: 'Терпелив до замыкания последнего угла.',
    lore: 'Лазурный Шпиль не захватывает помещение — он его измеряет. Каждый отросток ведёт себя как землемер и оставляет химические отвесы следующему поколению. Находили колонии, восстанавливавшие квадраты вокруг машин, исчезнувших несколько веков назад. Архивисты считают это памятью; сам Шпиль считает архивистов временной разметкой.',
    counterplay: 'Разорвите периметр до замыкания последней стороны. После укрепления внутренности атакуйте с нескольких соседних клеток, а не кормите стену по одной.',
    warning: 'Если он предлагает вам несущую стену, проверьте, не оказались ли вы уже внутри.',
  },
  {
    id: 'coral',
    archiveName: 'Voramyces ruber',
    epithet: 'Вежливая катастрофа',
    habitat: 'Тонкие границы и плохо защищённые карманы фронтира.',
    temperament: 'Тёплый, любопытный и профессионально голодный.',
    lore: 'Коралловый Цвет чувствует вкус нерешительности сквозь субстрат. Он игнорирует стройную линию, а затем вливается через одну одинокую клетку, которую соперник забыл поддержать. Первые техники назвали это оппортунизмом. Коралл внёс правку в отчёт, съев архивную комнату вместе с рецензентом.',
    counterplay: 'Не оставляйте изолированных пограничных клеток. Первый удар по слабой поддержке особенно силён: держите связный фронт и делайте каждую лёгкую добычу дорогой.',
    warning: 'Не называйте его голодным в радиусе двух клеток. Критику он принимает за приглашение к столу.',
  },
  {
    id: 'yellow',
    archiveName: 'Heliomyces cursor',
    epithet: 'Собиратель горизонтов',
    habitat: 'Тёплые вентиляционные шахты, открытые края и карты с пустыми полями.',
    temperament: 'Неугомонный, яркий, неспособный оставить загадку в покое.',
    lore: 'Солнечная Вспышка хранит несовершенные карты в импульсах тепла. Трёх обычных наблюдений хватает, чтобы колония выдала одно пугающе уверенное предсказание. Она часто ошибается, почему фронтир важен, и почти не ошибается в том, что там ждёт.',
    counterplay: 'Каждый третий ход ожидайте осмысленной разведки. Скрывайте замысел за несколькими правдоподобными границами и наказывайте исследователя, когда он растянется дальше взаимной поддержки.',
    warning: 'Когда ваша уверенность приходит, Вспышка обычно уже где-то ещё.',
  },
  {
    id: 'magenta',
    archiveName: 'Velutina transcripta',
    epithet: 'Заимствованная подпись',
    habitat: 'Общие границы, заброшенные пути и бумаги, которые никто не читает дважды.',
    temperament: 'Общительный — примерно как отмычка.',
    lore: 'Бархатный Пульс выяснил, что владение — всего лишь химическое утверждение, повторённое достаточно уверенно. Его нити копируют местные сигналы, прививаются к спорному краю и настаивают, что всегда были его частью. Кураторы спорят: организм лжёт или просто редактирует историю быстрее них.',
    counterplay: 'Считайте заряды Перекраски и не отдавайте лёгкие замыкания. Привитая клетка сразу укрепляется и запускает геометрию квадратов — проверяйте весь периметр.',
    warning: 'Общая граница с Бархатом — не граница. Это документооборот.',
  },
  {
    id: 'violet',
    archiveName: 'Lotus tenebris',
    epithet: 'Терпеливая цитадель',
    habitat: 'Глубокие впадины давления и тихое кольцо вокруг живого Ядра.',
    temperament: 'Неподвижный, учтивый и оскорблённый любыми короткими путями.',
    lore: 'Лотос Пустоты сначала растёт внутрь и лишь потом наружу. Старейшие волокна вокруг Ядра завязываются в тёмную решётку, распределяющую каждый удар. Спящая колония годами выглядит побеждённой, а затем просыпается с архитектурной уверенностью горы.',
    counterplay: 'Не стачивайте силы о кольцо Ядра. Режьте внешнюю поддержку, заставляйте делить внимание и атакуйте, только когда соседние клетки дают вам перевес.',
    warning: 'Может казаться спящим. Геологические формации тоже часто так делают.',
  },
];

const mutations = [
  {
    name: 'Стремительная',
    code: 'MUT-SW',
    thesis: 'Яркий край, который будто приходит раньше собственной тени.',
    rule: 'Стремительные штаммы получают высокий приоритет при выборе враждебных намерений. Дальность и число действий не увеличиваются.',
    response: 'Считайте, что лучшее допустимое давление будет выбрано первым. Оставляйте два пути отхода и доверяйте показанной стрелке.',
    warning: 'Не соревнуйтесь с ней в скорости. Она считает гонку формой опыления.',
  },
  {
    name: 'Бронированная',
    code: 'MUT-AR',
    thesis: 'Плотное внутреннее кольцо, превращающее оптимизм в проценты.',
    rule: 'Бронированные клетки дополнительно снижают шанс атакующего на 10 процентных пунктов.',
    response: 'Соберите соседнюю поддержку или потратьте Перекраску, если клетка завершает крупную фигуру.',
    warning: 'Панцирь не декоративный. Тишина после вашей неудачной атаки — тоже.',
  },
  {
    name: 'Паразит',
    code: 'MUT-PA',
    thesis: 'Вторичная жила, говорящая с чужим акцентом.',
    rule: 'В отличие от обычного роста, Паразит создаёт диагональные намерения. Ход всё равно показывается заранее, а смена семейства клетки удаляет свойство.',
    response: 'Защищайте диагональный контакт, находите источник и перекрашивайте шарнир, а не гонитесь за ветвью.',
    warning: 'Он может назвать вас хозяином. Это не повышение.',
  },
  {
    name: 'Гибридный мох',
    code: 'MUT-HY',
    thesis: 'Два несовместимых семейства договариваются на языке, которого минуту назад не существовало.',
    rule: 'В онлайн-дуэли две соседние нейтральные колонии разных семейств могут образовать гибрид. Он наследует поведенческие приоритеты обоих родителей и их свойства: стремительность, броню или диагональный паразитический рост.',
    response: 'Читайте обе родительские линии. Гибрид не выбирает одну тактику — он смешивает их, пока захват клетки не удалит штамм.',
    warning: 'Архив назвал его невозможным. Гибрид унаследовал от архива привычку игнорировать возражения.',
  },
];

const substrateEntries: AlmanacEntry[] = [
  {
    name: 'Мох-свечник',
    archiveName: 'Bryum vigilans',
    kind: 'Мох',
    habitat: 'Тёплые каналы возле погасших служебных ламп.',
    note: 'Бледные кончики загораются один за другим при угрозе Ядру. Беззвучный отсчёт спас минимум четыре колонии и крайне расстроил одну засаду.',
    observation: 'Экологическая запись. На правила поля не влияет.',
    warning: 'Если вспыхнули все кончики разом, перестаньте писать и оглянитесь.',
  },
  {
    name: 'Шовный мох',
    archiveName: 'Filum medicans',
    kind: 'Мох',
    habitat: 'Трещины, недавно пересечённые несколькими семействами.',
    note: 'Сплетает брошенные гифы в аккуратные зелёные швы. Чинит субстрат, а не его обитателей; младшие кураторы регулярно путают эти понятия.',
    observation: 'Самые старые стежки указывают на место последнего большого конфликта.',
    warning: 'Не используйте как бинт. У него профсоюзные правила.',
  },
  {
    name: 'Зеркальный лишайник',
    archiveName: 'Specularia duplex',
    kind: 'Лишайник',
    habitat: 'Гладкие стены реактора на стыке двух биомов.',
    note: 'Одна половина отражает тепло, другая — память. Колонии рядом нередко меняют направление без причины, будто стыдятся увиденного.',
    observation: 'Надёжный маркер границы; психологические эффекты оспариваются.',
    warning: 'Махать ему безопасно. Махать в ответ пока не рекомендуется.',
  },
  {
    name: 'Лишайник-паломник',
    archiveName: 'Lichen viator',
    kind: 'Лишайник',
    habitat: 'Редко встречается дважды в одном месте.',
    note: 'Медленная общая корка, мигрирующая по песчинке за раз. Веками обходит Чёрный Субстрат и отказывается объяснять, что ищет.',
    observation: 'Направление движения видно по серебряной бахроме.',
    warning: 'Не спрашивайте, скоро ли он придёт. Начнёт путь заново.',
  },
  {
    name: 'Тихошляпник',
    archiveName: 'Mycena timida',
    kind: 'Гриб',
    habitat: 'Строго за более крупными и смелыми организмами.',
    note: 'При любой опасности складывается плашмя, обычно поместив между собой и угрозой соседа. Он может казаться вам добрым другом. На деле это трус с великолепным пространственным мышлением.',
    observation: 'Безвредный разрушитель органики. Случайно — превосходная система раннего предупреждения.',
    warning: 'Если он исчез, у вас осталось примерно одно тихошляпное мгновение.',
  },
  {
    name: 'Хоровик',
    archiveName: 'Cantarellus infra',
    kind: 'Гриб',
    habitat: 'Полые трубы охлаждения и резонирующие квадратные камеры.',
    note: 'Гудит ниже порога слуха. Замкнутый квадрат повышает тон на один интервал, а цепочка создаёт то ли музыку, то ли жалобу ремонтной службы.',
    observation: 'Вибрация следует за захватом, но не вызывает его.',
    warning: 'Не аплодируйте. Они начнут сначала.',
  },
  {
    name: 'Костяшный клещ',
    archiveName: 'Arthronodus tabula',
    kind: 'Фауна',
    habitat: 'Укреплённые клетки ровно с одним свободным углом.',
    note: 'Шестиногий травоядный проверяет поверхность стуком перед едой. Отказывается от нестабильной территории и потому стал самым маленьким инженером архива.',
    observation: 'Три стука — безопасно. Непрерывный стук — клещ нервничает или музицирует.',
    warning: 'Не одалживайте ему линейку. Его стандартам вы не соответствуете.',
  },
  {
    name: 'Чернильная моль',
    archiveName: 'Noctua atramentum',
    kind: 'Фауна',
    habitat: 'Банки тумана и недавно скрытые записи.',
    note: 'Пьёт химический осадок забытой информации. Во время Космического щелчка собирается в чёрные спирали и разлетается при осмотре клетки.',
    observation: 'Помогает искать скрытые записи; в тактической симуляции отсутствует.',
    warning: 'Она не ест книги. Она ест ту часть, где вы помнили концовку.',
  },
  {
    name: 'Мох часовщика', archiveName: 'Bryum horologium', kind: 'Мох',
    habitat: 'Зубчатые стыки старых насосов.',
    note: 'Растёт кольцами по одному за каждый цикл реактора. Когда механизм останавливается, продолжает считать из принципа.',
    observation: 'По кольцам датируют заброшенные секторы.', warning: 'Не спрашивайте точное время. Ответ длится примерно год.',
  },
  {
    name: 'Пепельный бородач', archiveName: 'Usnea cineris', kind: 'Лишайник',
    habitat: 'Остывшие края Мёртвых пятен.',
    note: 'Собирает минеральную пыль в длинные седые пряди. Полевые группы оставляют ему записки; утром ошибки в орфографии покрываются пеплом.',
    observation: 'Живой индикатор восстановления почвы.', warning: 'Не просите оценить ваш отчёт. Он уже оценил.',
  },
  {
    name: 'Гриб-дверник', archiveName: 'Portarius officinalis', kind: 'Гриб',
    habitat: 'Узкие проходы между укреплёнными территориями.',
    note: 'Раскрывает шляпку только перед колониями с достаточной поддержкой. Никто не назначал его охранять проход, но уволить тоже не смогли.',
    observation: 'Не влияет на доступность клеток.', warning: 'Ваше имя может быть в списке. Списка не существует.',
  },
  {
    name: 'Споровый писарь', archiveName: 'Notarius sporalis', kind: 'Гриб',
    habitat: 'Архивные ящики, особенно закрытые.',
    note: 'Оставляет на крышках цепочки точек, похожие на протоколы ходов. Расшифровано единственное предложение: «угол был очевиден».',
    observation: 'Вероятно, реагирует на вибрацию квадратных захватов.', warning: 'Не давайте ему чернила. Он предпочитает ваши.',
  },
  {
    name: 'Лунная мокрица', archiveName: 'Oniscus lunaris', kind: 'Фауна',
    habitat: 'Тёмные стороны клеток, которых никто не наблюдает.',
    note: 'Меняет панцирь под цвет ближайшего семейства, но всегда с опозданием на один ход. Из-за этого считается либо шпионом, либо плохим художником.',
    observation: 'Безвредный собиратель спор.', warning: 'Не сообщает разведданные. Очень убедительно делает вид, что сообщает.',
  },
  {
    name: 'Квадратный слизень', archiveName: 'Limax orthogonalis', kind: 'Фауна',
    habitat: 'Внутренности старых квадратов 4×4 и крупнее.',
    note: 'Поворачивает только под прямым углом. В круглой банке однажды провёл три недели, не признав геометрию стен.',
    observation: 'След показывает прежние границы укреплений.', warning: 'Не ставьте перед диагональю. Он примет это за философский спор.',
  },
  {
    name: 'Корневой колокольчик', archiveName: 'Campanula radicans', kind: 'Мох',
    habitat: 'Кольцо вокруг старых Ядер.',
    note: 'Миниатюрные чашечки звенят при изменении поддержки вокруг Ядра. Звука не слышно, но все находящиеся рядом внезапно вспоминают о срочных делах.',
    observation: 'Точная биологическая причина не установлена.', warning: 'Если замолчал — опасность либо ушла, либо уже внутри.',
  },
  {
    name: 'Лишайник последней правки', archiveName: 'Errata finalis', kind: 'Лишайник',
    habitat: 'Поля технических отчётов и таблички с надписью «окончательная версия».',
    note: 'Появляется после сдачи документа и меняет одну несущественную букву. В трёх экспедициях был единственным существом, вернувшимся вовремя.',
    observation: 'Никакого отношения к боевой симуляции.', warning: 'Файл final_final_2 действительно принадлежит ему.',
  },
];

const events = [
  { name: 'Густой туман', duration: '3 хода', rule: 'Известные клетки, кроме Ядра, скрываются. Владение не меняется; эффект проходит сам, осмотр его не снимает.', note: 'Туман — это вопрос субстрата: выжил ли ваш план без подписей?' },
  { name: 'Космический щелчок', duration: 'Мгновенно', rule: 'Обвал памяти скрывает известные клетки, кроме Ядра, пока их снова не осмотрят.', note: 'Машина забывает быстро. Чернильная моль прилетает ещё быстрее.' },
  { name: 'Споровый дождь', duration: '2 хода', rule: 'От двух до четырёх враждебных спор падают на исследованный фронтир, один ход спят, затем создают намерения.', note: 'Зонт помогает только морально.' },
  { name: 'Прилив цветения', duration: '3 хода', rule: 'Внешнее давление выбранного враждебного семейства получает одно дополнительное намерение.', note: 'Каждое семейство зовёт это весной. Остальные — проблемой расписания.' },
  { name: 'Засуха', duration: '3 хода', rule: 'Внешнее расширение замедляется на одно намерение. Соседние атаки продолжаются.', note: 'Тихая граница не безопасна. Она просто хочет пить.' },
  { name: 'Всплеск мутации', duration: '3 хода', rule: 'Видимый враждебный штамм фронтира получает мутацию.', note: 'Архив запросил образец. Образец отказал.' },
  { name: 'Мёртвое пятно', duration: '4 хода', rule: 'Небольшой незанятый участок временно невозможно захватить.', note: 'Обходите. Героические речи не меняют мёртвую почву.' },
  { name: 'Резонанс', duration: '3 хода', rule: 'Следующий крупный квадрат игрока может дать дополнительный заряд Перекраски.', note: 'Несколько ходов геометрия помнит, что когда-то была музыкой.' },
];

const duelAnomalies = [
  { name: 'Споровая бомба', duration: 'Один заряд', rule: 'С вероятностью 22% после полного раунда падает на свободную клетку между Ядрами. Первая колония, захватившая клетку, получает одну гарантированную атаку по укреплённой клетке квадрата. Ядро невосприимчиво.', note: 'Старые кураторы уверяют, что это семя. Молодые кураторы не проверяют утверждение дважды.' },
  { name: 'Эхо второго хода', duration: 'Шанс 8%', rule: 'После обычного хода субстрат иногда возвращает инициативу той же колонии. Бонусный ход не может породить ещё один бонусный ход подряд.', note: 'Некоторые называют это удачей. Субстрат предпочитает термин «проверка жадности».' },
  { name: 'Скрещение линий', duration: 'Шанс 14%', rule: 'После полного раунда две соседние нейтральные колонии разных семейств могут стать единым гибридным штаммом и унаследовать поведение обоих родителей.', note: 'Родословная занимает две клетки. Семейные споры — обычно больше.' },
];

const protocols = [
  { title: 'Читайте до прикосновения', text: 'Наведитесь на фронтир и изучите вероятное семейство. Пустая клетка исследуется, известная враждебная — атакуется. Линии намерений показывают, что случится после вашего хода.' },
  { title: 'Поддержка сильнее храбрости', text: 'Шанс атаки растёт от соседних союзников и падает от защитников. Важны восемь соседей, включая диагонали. Поле показывает итоговый процент до решения.' },
  { title: 'Замыкайте периметр', text: 'Завершите квадрат от 3×3 до 12×12. Внутренность будет захвачена и укреплена; изменённые клетки могут замкнуть следующий квадрат и создать цепочку.' },
  { title: 'Берегите определённость', text: 'Перекраска гарантирует захват соседней враждебной клетки. В начале два заряда, максимум три; квадрат 4×4 или крупнее возвращает один.' },
  { title: 'Защищайте живой источник', text: 'Ядро — память, энергия и условие поражения. Намерение против него не терпит отсрочки. В дуэли захват чужого Ядра завершает спор.' },
];

const archiveSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Атлас Чёрного Субстрата',
  description: 'Русская энциклопедия мира MYCELIUM: семейства, мутации, мхи, лишайники, грибы, фауна и события реактора.',
  url: 'https://mycelum.vercel.app/wiki',
  inLanguage: 'ru',
  isPartOf: { '@type': 'VideoGame', name: 'MYCELIUM', url: 'https://mycelum.vercel.app/' },
  about: ['мицелий', 'грибы', 'мхи', 'лишайники', 'территориальная стратегия'],
};

const searchableText = {
  protocols: protocols.map((entry) => `${entry.title} ${entry.text}`),
  species: speciesNotes.map((entry) => {
    const config = GAME_CONFIG.colors.species[entry.id];
    return `${config.name} ${config.title} ${config.passiveName} ${config.passiveDesc} ${Object.values(entry).join(' ')}`;
  }),
  mutations: mutations.map((entry) => Object.values(entry).join(' ')),
  substrate: substrateEntries.map((entry) => Object.values(entry).join(' ')),
  duel: duelAnomalies.map((entry) => Object.values(entry).join(' ')),
  events: events.map((entry) => Object.values(entry).join(' ')),
};

function includesQuery(text: string, query: string) {
  return text.toLocaleLowerCase('ru').includes(query);
}

export default function WikiPage() {
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase('ru');

  const visible = useMemo(() => ({
    protocols: protocols.filter((_, index) => includesQuery(searchableText.protocols[index], query)),
    species: speciesNotes.filter((_, index) => includesQuery(searchableText.species[index], query)),
    mutations: mutations.filter((_, index) => includesQuery(searchableText.mutations[index], query)),
    substrate: substrateEntries.filter((_, index) => includesQuery(searchableText.substrate[index], query)),
    duel: duelAnomalies.filter((_, index) => includesQuery(searchableText.duel[index], query)),
    events: events.filter((_, index) => includesQuery(searchableText.events[index], query)),
  }), [query]);

  const shows = (id: Exclude<Category, 'all'>) => category === 'all' || category === id;
  const resultCount = (Object.keys(visible) as Array<keyof typeof visible>)
    .filter((id) => shows(id))
    .reduce((total, id) => total + visible[id].length, 0);

  const selectSection = (id: Exclude<Category, 'all'>) => {
    setCategory(id);
    setSearch('');
  };

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(archiveSchema) }} />
      <header className={styles.topbar}>
        <Link className={styles.backLink} href="/">
          <span className={styles.backMark} aria-hidden="true" />
          Вернуться к колонии
        </Link>
        <span className={styles.archiveStamp}>Полевой архив Чёрного Субстрата</span>
      </header>

      <div className={styles.shell}>
        <aside className={styles.rail}>
          <p className={styles.railTitle}>Живой указатель</p>
          <nav className={styles.railNav} aria-label="Разделы атласа">
            {CATEGORY_LABELS.slice(1).map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={() => selectSection(item.id as Exclude<Category, 'all'>)}>
                <span aria-hidden="true" />
                {item.label}
              </a>
            ))}
          </nav>
          <p className={styles.railNote}>
            <strong>Протокол архива</strong>
            Текст, отмеченный как правило, точно отражает игру. Полевые заметки правдивы лишь тогда, когда им удобно.
          </p>
        </aside>

        <div className={styles.content}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.archiveCode}>Кодекс ЧС–01 / редакция 47</p>
              <h1>Субстрат не пуст.</h1>
              <p>
                Он слушает, торгуется, забывает и иногда выращивает нечто, способное подать официальную жалобу.
                Здесь собраны пять выведенных семейств и вся жизнь, прячущаяся в темноте между ними.
              </p>
            </div>
            <div className={styles.specimenMap} aria-label="Пять семейств вокруг Ядра">
              <div className={styles.cellField} aria-hidden="true">
                {Array.from({ length: 35 }, (_, index) => (
                  <i key={index} data-family={index % 11 === 0 ? 'core' : index % 5} />
                ))}
              </div>
              <p><span>Живая пластина 5-В</span> После 200-го хода не кормить.</p>
            </div>
          </section>

          <section className={styles.finder} aria-label="Поиск и фильтры атласа">
            <div className={styles.searchBox}>
              <label htmlFor="archive-search">Поиск по архиву</label>
              <div className={styles.inputRow}>
                <input
                  id="archive-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Например: мох, Ядро, туман, трус…"
                />
                {search && <button type="button" onClick={() => setSearch('')}>Очистить</button>}
              </div>
            </div>
            <div className={styles.filters} aria-label="Фильтр записей">
              {CATEGORY_LABELS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={category === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <output className={styles.resultCount} aria-live="polite">
              Найдено записей: {resultCount}
            </output>
          </section>

          {resultCount === 0 && (
            <section className={styles.emptyState}>
              <h2>Никто не ответил.</h2>
              <p>Архив либо неполон, либо притворяется. Попробуйте более общее слово.</p>
              <button type="button" onClick={() => { setSearch(''); setCategory('all'); }}>Открыть весь архив</button>
            </section>
          )}

          {shows('protocols') && visible.protocols.length > 0 && (
            <section className={styles.section} id="protocols">
              <header className={styles.sectionHead}>
                <h2>Полевой устав</h2>
                <p>Пять вещей, которые живое Ядро обязано знать до появления первых врагов.</p>
              </header>
              <ol className={styles.protocolList}>
                {visible.protocols.map((entry, index) => (
                  <li key={entry.title}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div><h3>{entry.title}</h3><p>{entry.text}</p></div>
                  </li>
                ))}
              </ol>
              <p className={styles.marginalia}>Заметка куратора: план — всего лишь квадрат, который ещё не замкнулся.</p>
            </section>
          )}

          {shows('species') && visible.species.length > 0 && (
            <section className={styles.section} id="species">
              <header className={styles.sectionHead}>
                <h2>Пять выведенных семейств</h2>
                <p>Игровые линии. Их особенности — точные правила; характеры — мнение тех, кто прожил достаточно долго.</p>
              </header>
              <div className={styles.speciesList}>
                {visible.species.map((entry) => {
                  const config = GAME_CONFIG.colors.species[entry.id];
                  return (
                    <article
                      className={styles.speciesEntry}
                      key={entry.id}
                      style={{ '--accent': config.cssHex } as CSSProperties}
                    >
                      <header className={styles.speciesHeader}>
                        <div className={styles.familyMark} aria-hidden="true"><i /><i /><i /><i /></div>
                        <div>
                          <p>{entry.archiveName}</p>
                          <h3>{config.name}</h3>
                          <span>{config.title} / {entry.epithet}</span>
                        </div>
                      </header>
                      <div className={styles.speciesBody}>
                        <p className={styles.lead}>{entry.lore}</p>
                        <dl className={styles.factGrid}>
                          <div><dt>Среда</dt><dd>{entry.habitat}</dd></div>
                          <div><dt>Темперамент</dt><dd>{entry.temperament}</dd></div>
                          <div><dt>Игровая особенность · {config.passiveName}</dt><dd>{config.passiveDesc}</dd></div>
                          <div><dt>Противодействие</dt><dd>{entry.counterplay}</dd></div>
                        </dl>
                        <blockquote>{entry.warning}</blockquote>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {shows('mutations') && visible.mutations.length > 0 && (
            <section className={styles.section} id="mutations">
              <header className={styles.sectionHead}>
                <h2>Нестабильные мутации</h2>
                <p>Вторичные свойства Всплеска мутации. Названия драматичны, но допустимые намерения всё ещё подчиняются правилам.</p>
              </header>
              <div className={styles.mutationList}>
                {visible.mutations.map((entry) => (
                  <article key={entry.name}>
                    <header><span>{entry.code}</span><h3>{entry.name}</h3></header>
                    <p className={styles.mutationThesis}>{entry.thesis}</p>
                    <dl>
                      <div><dt>Игровое правило</dt><dd>{entry.rule}</dd></div>
                      <div><dt>Рекомендация</dt><dd>{entry.response}</dd></div>
                    </dl>
                    <blockquote>{entry.warning}</blockquote>
                  </article>
                ))}
              </div>
            </section>
          )}

          {shows('substrate') && visible.substrate.length > 0 && (
            <section className={styles.section} id="substrate">
              <header className={styles.sectionHead}>
                <h2>Жизнь между империями</h2>
                <p>Мхи, лишайники, грибы и мелкая фауна, описанные экспедициями, у которых закончилась разумная работа.</p>
              </header>
              <div className={styles.organismList}>
                {visible.substrate.map((entry, index) => (
                  <article key={entry.name}>
                    <div className={styles.organismIndex} aria-hidden="true">S-{String(index + 1).padStart(2, '0')}</div>
                    <div className={styles.organismCopy}>
                      <header>
                        <div><span>{entry.kind}</span><h3>{entry.name}</h3></div>
                        <i>{entry.archiveName}</i>
                      </header>
                      <p>{entry.note}</p>
                      <dl>
                        <div><dt>Обнаружен</dt><dd>{entry.habitat}</dd></div>
                        <div><dt>Статус записи</dt><dd>{entry.observation}</dd></div>
                      </dl>
                      <blockquote>{entry.warning}</blockquote>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {shows('duel') && visible.duel.length > 0 && (
            <section className={styles.section} id="duel">
              <header className={styles.sectionHead}>
                <h2>Аномалии онлайн-дуэли</h2>
                <p>Редкие правила, которыми Субстрат вмешивается только в состязание двух живых колоний.</p>
              </header>
              <div className={styles.eventLedger}>
                {visible.duel.map((entry) => (
                  <article key={entry.name}>
                    <header><h3>{entry.name}</h3><span>{entry.duration}</span></header>
                    <p>{entry.rule}</p>
                    <small>{entry.note}</small>
                  </article>
                ))}
              </div>
            </section>
          )}

          {shows('events') && visible.events.length > 0 && (
            <section className={styles.section} id="events">
              <header className={styles.sectionHead}>
                <h2>Погода реактора</h2>
                <p>Событие приходит каждые десять ходов. Предупреждение называет его заранее; мудрые колонии верят.</p>
              </header>
              <div className={styles.eventLedger}>
                {visible.events.map((entry) => (
                  <article key={entry.name}>
                    <header><h3>{entry.name}</h3><span>{entry.duration}</span></header>
                    <p>{entry.rule}</p>
                    <small>{entry.note}</small>
                  </article>
                ))}
              </div>
            </section>
          )}

          <footer className={styles.footer}>
            <div className={styles.footerMark} aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <p>Архив заканчивается здесь. Субстрат — нет.</p>
            <Link href="/">Вернуться к живому полю</Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
