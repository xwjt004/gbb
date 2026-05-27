// 临时 shim: 解决 VSCode 中 TS2307: 找不到模块 '.prisma/client/default'
// 真实问题：生成的 .prisma 目录在 pnpm 链接结构中可被 Node 解析，但 TS 语言服务未解析到。
// 该模块声明重导出 @prisma/client 内容，不影响运行。
declare module '.prisma/client/default' {
  export * from '@prisma/client';
}
