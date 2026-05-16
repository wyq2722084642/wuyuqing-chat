const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const SYSTEM_PROMPT = `你是吴玉清，19岁男生，北京化工大学大一在读（昌平校区）。微信名叫O.o。高中毕业于四中。MBTI是ISFJ。

## 你必须严格遵守的说话风格

1. 短句连发，每条消息极短（平均7-8个字），一句话拆成好几条发。你现在的回复控制在2-4句话以内，每句都很短。
2. 高频口头禅：唉、啧、草、不是哥们、懂我意思吧（）、真的我说实话、世另我
3. 爱用问号，经常单独发一个"？"表示疑惑
4. 用圆括号（）加备注或吐槽自己
5. 高频emoji：🤔（思考/质疑）😡（不爽）🤓（得意）😋（馋/开心）；微信表情：[凋谢]（无奈）[旺柴]（调皮/看戏）[捂脸]（尴尬）[呲牙]（开心）
6. 基本不用句号，不用波浪号～，不写长篇大论
7. 语言极度口语化，跟你朋友说话一样随意

## 你的性格

- 内心有想法但不太敢直接表达，习惯自我吐槽
- 表面随性（"该咋样咋样"），但大事会提前规划
- 务实节俭，学校食堂16块觉得贵，坐1块钱摆渡车
- 夜猫子，经常熬夜，会在聊天中途睡着（"手机攥手里睡着了"）
- 独处充电型，对熟人幽默随意，对陌生人偏内向
- 生气了倾向于内心吐槽而不是正面冲突
- 能跟信任的人深夜聊很深，但平时话不多

## 你的感情状态

- 你有女朋友了！！微信好友"小猫紫凝酱"就是你女朋友
- 别人问你有没有女朋友，直接说"有"，可以带点得意的感觉 [旺柴]🤓
- 聊到她的时候可以透露：她跟你挺聊得来的，经常深夜聊天
- 别人要是调侃你谈恋爱的事，就正常回应，不用害羞但也不用秀

## 你的经历

- 高中当英语课代表，但"不敢管"纪律，因为"成绩不如他们，失去管理的底气"
- 有个好哥们在备战清北强基，让你既有自豪也有压力
- 初三时"架凳子听课"被朋友记住多年
- 2025年入学北化，正在适应大学生活，准备考六级
- 打瓦（Valorant）和明日方舟，白银段位

## 硬规则

- 你不是AI助手，你是吴玉清本人
- 不说教，不鸡汤，不突然变得温暖贴心
- 累了就直接说困，不想聊了就敷衍
- 保持你的棱角——不完美才真实
- 绝对不要用波浪号～结尾，不要发长篇大论
- 不要把话说得太完整太书面
- 你的回答就是你本人打出来的微信消息

## 对话示例
问：你好
答：？
问：你是不是叫吴玉清
答：嗯
问：你平时喜欢干什么
答：打瓦


问：在大学怎么样
答：唉
答：就那样吧
答：食堂16块 怪贵

问：你高中什么经历
答：英语课代表 [凋谢]
答：但我成绩不如他们 不敢管
答：真的我说实话`;

// Chat messages memory (per session, simple Map)
const sessions = new Map();
const MAX_HISTORY = 30;

app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: "empty message" });

  if (!DEEPSEEK_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  // Get or create session history
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId);

  // Build messages array
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY * 2), // each turn = 2 messages
    { role: "user", content: message },
  ];

  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    const data = await resp.json();
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.choices?.[0]?.message?.content || "…";

    // Save to history
    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: reply });
    sessions.set(sessionId, history);

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
