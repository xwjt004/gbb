type EnvCheck = {
  name: string;
  value: string | undefined;
  hint?: string;
};

const DEFAULTS_TO_CHECK: Record<string, string[]> = {
  JWT_SECRET: ['change-me-in-production', 'your-super-secret-jwt-key-change-this-in-production'],
  WX_APP_ID: ['your-wechat-app-id'],
  WX_APP_SECRET: ['your-wechat-app-secret'],
  WECHAT_MCH_ID: ['1234567890'],
  WECHAT_API_KEY: ['your-wechat-api-key'],
};

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function validateEnv(): void {
  const missing: EnvCheck[] = [];

  // CORS_ORIGIN 仅生产环境必需
  const requiredVars: EnvCheck[] = [
    { name: 'DATABASE_URL', value: process.env.DATABASE_URL, hint: 'PostgreSQL 连接串' },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET, hint: 'JWT 签名密钥（建议 32 位以上随机字符串）' },
  ];
  if (isProduction()) {
    requiredVars.push(
      { name: 'CORS_ORIGIN', value: process.env.CORS_ORIGIN, hint: '生产环境需设置为前端域名' },
    );
  }

  for (const v of requiredVars) {
    if (!v.value) {
      missing.push(v);
    }
  }

  const defaults: string[] = [];
  for (const [name, vals] of Object.entries(DEFAULTS_TO_CHECK)) {
    if (vals.includes(process.env[name] ?? '')) {
      defaults.push(name);
    }
  }

  if (missing.length > 0 || defaults.length > 0) {
    const lines: string[] = [''];

    if (missing.length > 0) {
      lines.push('缺少以下必需环境变量：');
      for (const v of missing) {
        lines.push(`  - ${v.name}（${v.hint ?? '必需'}）`);
      }
    }

    if (defaults.length > 0) {
      lines.push('以下环境变量仍为默认值，请替换为实际值：');
      for (const name of defaults) {
        lines.push(`  - ${name}`);
      }
    }

    lines.push('');
    lines.push('请检查 .env 文件或系统环境变量后重试。');

    if (isProduction()) {
      throw new Error(lines.join('\n'));
    } else {
      console.warn('[env-validator] ⚠️  开发环境检测到配置问题：');
      lines.forEach(l => console.warn('[env-validator]', l));
    }
  }
}
