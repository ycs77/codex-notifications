#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const REG_PATH = path.join(ROOT, 'notifications.json')
const TPL_DIR = path.join(ROOT, 'templates')
const PLUGINS_DIR = path.join(ROOT, 'plugins')
const MARKETPLACE_PATH = path.join(ROOT, '.agents', 'plugins', 'marketplace.json')
const ROOT_README = path.join(ROOT, 'README.md')

const DESCRIPTION = '在 Codex 要求權限或停止時，自動播放提示音通知用戶'

const PLATFORM_META = {
  Windows: {
    code: 'win',
    osName: 'Windows',
    playCmd: (file) => `powershell.exe -NoProfile -Command "[System.Media.SoundPlayer]::new((Resolve-Path -LiteralPath (Join-Path $env:PLUGIN_ROOT 'audios/${file}')).ProviderPath).PlaySync()"`,
  },
  macOS: {
    code: 'mac',
    osName: 'macOS',
    playCmd: (file) => `afplay "\${PLUGIN_ROOT}/audios/${file}"`,
  },
  Linux: {
    code: 'linux',
    osName: 'Linux',
    playCmd: (file) => `aplay "\${PLUGIN_ROOT}/audios/${file}"`,
  },
  WSL: {
    code: 'wsl',
    osName: 'WSL',
    playCmd: (file) => `paplay "\${PLUGIN_ROOT}/audios/${file}"`,
  },
}

const args = process.argv.slice(2)
const NO_PRUNE = args.includes('--no-prune')

function render(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''))
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n')
}

function buildHooks(meta) {
  const mkHook = (file, statusMessage) => ({
    hooks: [
      {
        type: 'command',
        statusMessage,
        command: meta.playCmd(file),
        timeout: 5,
      },
    ],
  })

  return {
    hooks: {
      PermissionRequest: [
        mkHook('notification.wav', 'Playing permission request notification sound'),
      ],
      Stop: [mkHook('stop.wav', 'Playing task completion notification sound')],
    },
  }
}

function updateReadmePlugins(file, tableText) {
  let txt = fs.readFileSync(file, 'utf8')
  const markerRe = /(<!-- plugins:start -->)[\s\S]*?(<!-- plugins:end -->)/
  if (!markerRe.test(txt)) {
    throw new Error(`README.md 缺少 <!-- plugins:start --> / <!-- plugins:end --> 標記，請先手動補上`)
  }
  fs.writeFileSync(file, txt.replace(markerRe, `$1\n${tableText}\n$2`))
}

function main() {
  const reg = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'))
  const marketplaceTpl = fs.readFileSync(path.join(TPL_DIR, 'marketplace.json.tmpl'), 'utf8')
  const pluginJsonTpl = fs.readFileSync(path.join(TPL_DIR, 'plugin.json.tmpl'), 'utf8')
  const readmeTpl = fs.readFileSync(path.join(TPL_DIR, 'README.md.tmpl'), 'utf8')

  const defaultAuthor = reg.owner
  const version = reg.version || '1.0.0'
  const wslPrereq = (reg.wsl && reg.wsl.prerequisites) || ''

  // 預檢：owner 信息完整
  if (!defaultAuthor || !defaultAuthor.name || !defaultAuthor.email) {
    throw new Error('notifications.json 缺少 owner.name 或 owner.email')
  }

  // 預檢：音檔存在 + 平台合法
  const errors = []
  for (const p of reg.plugins) {
    if (!p.id || !p.name || !Array.isArray(p.platforms)) {
      errors.push(`plugin entry 格式錯誤：${JSON.stringify(p)}`)
      continue
    }
    for (const f of ['notification.wav', 'stop.wav']) {
      const src = path.join(TPL_DIR, 'audios', p.id, f)
      if (!fs.existsSync(src)) errors.push(`缺少音檔：templates/audios/${p.id}/${f}`)
    }
    for (const plat of p.platforms) {
      if (!PLATFORM_META[plat]) errors.push(`未知平台 "${plat}" (id=${p.id})`)
    }
  }
  if (errors.length) {
    console.error('預檢失敗：')
    for (const e of errors) console.error('  - ' + e)
    process.exit(1)
  }

  // 計算預期目錄
  const expected = new Set()
  for (const p of reg.plugins) {
    for (const plat of p.platforms) {
      expected.add(`${p.id}-${PLATFORM_META[plat].code}`)
    }
  }

  // 清理過期：只刪形似 {id}-{code} 的子資料夾
  const validCodes = Object.values(PLATFORM_META).map((m) => m.code)
  const codePattern = new RegExp(`-(${validCodes.join('|')})$`)
  if (!NO_PRUNE && fs.existsSync(PLUGINS_DIR)) {
    for (const entry of fs.readdirSync(PLUGINS_DIR)) {
      const full = path.join(PLUGINS_DIR, entry)
      if (!fs.statSync(full).isDirectory()) continue
      if (!codePattern.test(entry)) continue
      if (expected.has(entry)) continue
      fs.rmSync(full, { recursive: true, force: true })
      console.log(`❎ 清理：plugins/${entry}`)
    }
  }

  // 逐個生檔
  const marketplaceEntries = []
  for (const p of reg.plugins) {
    const author = p.author || defaultAuthor
    for (const plat of p.platforms) {
      const meta = PLATFORM_META[plat]
      const dirName = `${p.id}-${meta.code}`
      const dir = path.join(PLUGINS_DIR, dirName)

      // 重建目錄（冪等）
      fs.rmSync(dir, { recursive: true, force: true })
      fs.mkdirSync(path.join(dir, '.codex-plugin'), { recursive: true })
      fs.mkdirSync(path.join(dir, 'hooks'), { recursive: true })
      fs.mkdirSync(path.join(dir, 'audios'), { recursive: true })

      // 變數表
      const pluginVars = {
        id: p.id,
        platformCode: meta.code,
        version,
        osName: meta.osName,
        name: p.name,
        description: DESCRIPTION,
        authorName: author.name,
        authorEmail: author.email,
      }

      // plugin.json
      const pluginJsonStr = render(pluginJsonTpl, pluginVars)
      writeJson(path.join(dir, '.codex-plugin', 'plugin.json'), JSON.parse(pluginJsonStr))

      // hooks.json
      writeJson(path.join(dir, 'hooks', 'hooks.json'), buildHooks(meta))

      // audios
      for (const f of ['notification.wav', 'stop.wav']) {
        fs.copyFileSync(path.join(TPL_DIR, 'audios', p.id, f), path.join(dir, 'audios', f))
      }

      // README.md
      const prerequisitesBlock =
        plat === 'WSL' && wslPrereq ? `## 前置需求\n\n${wslPrereq.trim()}\n\n` : ''
      const readme = render(readmeTpl, { ...pluginVars, prerequisitesBlock })
      fs.writeFileSync(path.join(dir, 'README.md'), readme)

      marketplaceEntries.push({
        name: `notification-${dirName}`,
        source: {
          source: 'local',
          path: `./plugins/${dirName}`,
        },
        policy: {
          installation: 'AVAILABLE',
          authentication: 'ON_INSTALL',
        },
        category: 'Productivity',
      })
      console.log(`✅ plugins/${dirName}`)
    }
  }

  // 重生 marketplace.json
  const marketplaceRendered = JSON.parse(marketplaceTpl)
  writeJson(MARKETPLACE_PATH, { ...marketplaceRendered, plugins: marketplaceEntries })
  console.log('✅ .agents/plugins/marketplace.json')

  // 更新 root README.md
  const rows = reg.plugins
    .map((p) => {
      const cells = p.platforms
        .map((plat) => {
          const meta = PLATFORM_META[plat]
          return `[${meta.osName}](./plugins/${p.id}-${meta.code})`
        })
        .join(' \\| ')
      return `| ${p.name} | ${cells} |`
    })
    .join('\n')
  const tableText = `| Name | Sources |\n|------|---------|\n${rows}`
  updateReadmePlugins(ROOT_README, tableText)
  console.log('✅ README.md')

  console.log(`\n🎉 完成：${marketplaceEntries.length} 個插件建立完畢`)
}

main()
