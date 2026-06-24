/**
 * 简易 XML 解析器
 * 专为微信消息 XML 设计，不做通用 XML 解析
 */

/**
 * 解析微信 XML 消息为 JS 对象
 * 先去除 CDATA 标记，再提取标签内容
 */
export function parseXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  // 先去除所有 CDATA 标记
  const cleaned = xml.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
  // 去掉 <xml> 根标签，只匹配其子元素
  const inner = cleaned.replace(/<\/?xml>\s*/g, '').trim();
  // 匹配 <tag>任意内容</tag>
  const regex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(inner)) !== null) {
    result[match[1]] = match[2].trim();
  }
  return result;
}

/**
 * 构建文本回复 XML
 */
export function buildTextReply(
  toUser: string,
  fromUser: string,
  content: string,
): string {
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
}

/**
 * 构建图文回复 XML
 */
export function buildNewsReply(
  toUser: string,
  fromUser: string,
  articles: Array<{ title: string; description: string; picUrl: string; url: string }>,
): string {
  const items = articles
    .map(
      (a) => `<item>
<Title><![CDATA[${a.title}]]></Title>
<Description><![CDATA[${a.description}]]></Description>
<PicUrl><![CDATA[${a.picUrl}]]></PicUrl>
<Url><![CDATA[${a.url}]]></Url>
</item>`,
    )
    .join('');

  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[news]]></MsgType>
<ArticleCount>${articles.length}</ArticleCount>
<Articles>${items}</Articles>
</xml>`;
}

/**
 * 空回复（success），用于不需要回复的场景
 */
export function buildEmptyReply(): string {
  return 'success';
}
