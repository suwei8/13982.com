import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFrontmatter, parseFrontmatter } from '../_lib/github.js';

test('round-trip: 标题含英文双引号 + 描述含换行 + 含逗号的 tag', () => {
  const data = {
    title: '他说："今天天气真好"',
    description: '第一行\n第二行含 "双引号" 和 , 逗号\n第三行',
    thumbnail: '/images/cases/foo.jpg',
    tags: ['web, design', 'e-commerce', 'tag"with"quotes'],
    date: new Date('2025-06-15T00:00:00Z'),
  };
  const body = '这里是正文\n第二段。';

  const md = buildFrontmatter(data, body);
  const { data: parsed, content } = parseFrontmatter(md);

  assert.equal(content, body, '正文应原样保留');
  assert.equal(parsed.title, data.title, '标题含双引号应 round-trip 正确');
  assert.equal(parsed.description, data.description, '描述含换行和引号应 round-trip 正确');
  assert.deepEqual(parsed.tags, data.tags, '含逗号和引号的 tags 应 round-trip 正确');
  assert.equal(parsed.date, '2025-06-15', 'date 应序列化为 YYYY-MM-DD');
  assert.equal(parsed.thumbnail, '/images/cases/foo.jpg');
});

test('round-trip: 反斜杠与制表符', () => {
  const data = {
    title: 'path: C:\\Users\\test',
    description: 'tab\there 和 \\ 反斜杠',
    tags: [],
    date: new Date('2025-01-01T00:00:00Z'),
  };
  const body = '正文';
  const md = buildFrontmatter(data, body);
  const { data: parsed, content } = parseFrontmatter(md);

  assert.equal(content, body);
  assert.equal(parsed.title, data.title);
  assert.equal(parsed.description, data.description);
  assert.deepEqual(parsed.tags, []);
});

test('round-trip: services 数字 order 与中文标题', () => {
  const data = {
    title: '服务A',
    description: '描述',
    icon: 'icon-name',
    order: 5,
  };
  const body = 'body';
  const md = buildFrontmatter(data, body);
  const { data: parsed, content } = parseFrontmatter(md);

  assert.equal(content, body);
  assert.equal(parsed.title, '服务A');
  assert.equal(parsed.order, 5, 'order 应当还原为 number');
  assert.equal(typeof parsed.order, 'number');
});

test('round-trip: 含嵌套引号的描述', () => {
  const data = {
    title: '含 \" 反斜杠引号',
    description: '他说：\'单引号没事\' 然后 "双引号"',
    tags: ['单, 双, 都有', 'normal'],
    date: new Date('2025-12-31T00:00:00Z'),
  };
  const body = '';
  const md = buildFrontmatter(data, body);
  const { data: parsed, content } = parseFrontmatter(md);

  assert.equal(content, '');
  assert.equal(parsed.title, data.title);
  assert.equal(parsed.description, data.description);
  assert.deepEqual(parsed.tags, data.tags);
});

test('buildFrontmatter: 生成的 YAML 包含必要的转义', () => {
  const data = {
    title: '含"引号',
    description: '换行\n测试',
    tags: ['含,逗号'],
    date: new Date('2025-06-15T00:00:00Z'),
  };
  const md = buildFrontmatter(data, '');
  // 关键证据：引号被转义、换行被转义为字面 \n
  assert.match(md, /title: "含\\"引号"/);
  assert.match(md, /description: "换行\\n测试"/);
  assert.match(md, /tags: \["含,逗号"\]/);
});

test('parseFrontmatter: 容错——无 frontmatter 时返回原内容', () => {
  const md = '没有任何 frontmatter 的纯文本';
  const { data, content } = parseFrontmatter(md);
  assert.deepEqual(data, {});
  assert.equal(content, md);
});

test('parseFrontmatter: 旧格式（无转义）也能读', () => {
  // 兼容手工编辑的文件
  const md = `---
title: "民之源"
description: "云南民之源实业集团有限公司"
thumbnail: "/images/cases/202501/x.png"
tags: ["网站建设"]
date: 2025-01-15
---

正文内容`;
  const { data, content } = parseFrontmatter(md);
  assert.equal(data.title, '民之源');
  assert.equal(data.description, '云南民之源实业集团有限公司');
  assert.deepEqual(data.tags, ['网站建设']);
  assert.equal(data.date, '2025-01-15');
  assert.equal(content.trim(), '正文内容');
});
