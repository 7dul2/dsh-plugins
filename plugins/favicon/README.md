# @deepseek-ai/dsh-client-ui-favicon

这个插件在「设置 → 通用设置」增加浏览器标签图标设置。点击“选择图片”后可从本机选择 PNG、JPEG、WebP 或 GIF，保存后当前标签页立即更新，刷新页面后仍会从 Harness 用户设置读取。点击“恢复默认”会回到配置的 fallback 图片。

图片会以 base64 保存到设置文件，默认上限为 512 KiB；插件拒绝不支持的图片类型和超出上限的内容。若没有自定义图片，Host 会读取 `fallbackPath` 指向的 PNG 文件。

## 安装

```sh
node scripts/install.mjs favicon
```

安装器会把插件挂载为 `custom-favicon`，并会自动把旧的 `./favicon-plugin.mjs` 挂载迁移到这个包，保留原有注释。其他同 id 或同包名的冲突会停止安装，避免同一路由重复注册。默认 fallback 为 `~/.dsh/profiles/web/favicon.png`，也可以在 `cordis.patch.yml` 的 `config` 中覆盖：

```yaml
- insert:
    - id: custom-favicon
      name: '@deepseek-ai/dsh-client-ui-favicon'
      config:
        fallbackPath: '~/.dsh/profiles/web/favicon.png'
```

刷新 Web 页面即可看到通用设置行；未开启 live reload 的 profile 需要重启 Harness。

## 验证

运行 `node --test plugins/favicon/tests/*.spec.js`。公共仓库根目录的 `npm test` 验证安装器，`npm run scan` 检查凭证模式和个人路径。
