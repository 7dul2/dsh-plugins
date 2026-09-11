window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-client-ui-favicon',
  factory: require => {
    const React = require('react')
    const h = React.createElement
    const NS = 'settings.favicon'
    const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    const dictionaries = {
      zh: {
        title: '浏览器标签图标',
        description: '选择本机图片作为浏览器标签图标；图片会保存到 Harness 用户设置。',
        choose: '选择图片',
        save: '保存',
        reset: '恢复默认',
        saving: '保存中…',
        saved: '保存成功',
        resetSaved: '已恢复默认图标',
        invalidType: '请选择 PNG、JPEG、WebP 或 GIF 图片',
        tooLarge: '图片过大，请选择较小的图片',
        failed: '保存失败，请重试',
        loading: '正在读取设置…',
        unavailable: '当前连接无法修改此设置',
      },
      en: {
        title: 'Browser tab icon',
        description: 'Choose a local image for the browser tab icon. The image is saved in Harness user settings.',
        choose: 'Choose image',
        save: 'Save',
        reset: 'Restore default',
        saving: 'Saving…',
        saved: 'Saved successfully',
        resetSaved: 'Default icon restored',
        invalidType: 'Choose a PNG, JPEG, WebP, or GIF image',
        tooLarge: 'The image is too large. Choose a smaller image.',
        failed: 'Could not save. Please try again.',
        loading: 'Loading settings…',
        unavailable: 'This connection cannot edit this setting',
      },
    }

    /** Convert a persisted image into a browser data URL. */
    function dataUrl(mimeType, imageData) {
      return imageData === '' ? '' : `data:${mimeType};base64,${imageData}`
    }

    /** Update the existing favicon link without waiting for a page reload. */
    function setBrowserIcon(href) {
      if (typeof document === 'undefined' || href === '') return
      const links = [...document.querySelectorAll('link[rel~="icon"]')]
      const link = links.find(candidate => (candidate.getAttribute('href') ?? '').includes('/favicon.svg')) ?? links[0]
      if (link) {
        link.href = href
        return
      }
      const created = document.createElement('link')
      created.rel = 'icon'
      created.href = href
      document.head.append(created)
    }

    /** Ask the browser to reload the server-provided fallback icon. */
    function reloadDefaultIcon() {
      if (typeof document === 'undefined') return
      const links = [...document.querySelectorAll('link[rel~="icon"]')]
      const link = links.find(candidate => (candidate.getAttribute('href') ?? '').includes('/favicon.svg')) ?? links[0]
      if (link) link.href = `/favicon.svg?d=${String(Date.now())}`
    }

    /** Read one selected image as the settings' base64 fields. */
    function readImage(file) {
      return new Promise((resolve, reject) => {
        if (!IMAGE_MIME_TYPES.includes(file.type)) {
          reject(new Error('invalid-type'))
          return
        }
        const reader = new FileReader()
        reader.onload = () => {
          const value = String(reader.result ?? '')
          const comma = value.indexOf(',')
          if (!value.startsWith('data:') || comma < 0) {
            reject(new Error('invalid-data'))
            return
          }
          resolve({ mimeType: file.type, imageData: value.slice(comma + 1) })
        }
        reader.onerror = () => reject(new Error('read-failed'))
        reader.readAsDataURL(file)
      })
    }

    /** Render the General settings row for selecting and saving a local icon. */
    function Row({ scope, t }) {
      const snapshot = React.useSyncExternalStore(cb => scope.subscribe(cb), () => scope.getSnapshot())
      const [draft, setDraft] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const stored = snapshot.value?.imageData === undefined
        ? null
        : { imageData: snapshot.value.imageData, mimeType: snapshot.value.mimeType }
      const preview = draft ?? (stored?.imageData === '' ? null : stored)
      const statusText = snapshot.status === 'loading' ? t('loading') : snapshot.status === 'unavailable' ? t('unavailable') : t('description')
      const disabled = busy || !snapshot.writable || snapshot.status !== 'ready'
      const choose = async event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file === undefined) return
        setError('')
        setNotice('')
        try {
          setDraft(await readImage(file))
        } catch (reason) {
          setError(reason instanceof Error && reason.message === 'invalid-type' ? t('invalidType') : t('failed'))
        }
      }
      const save = async event => {
        event.preventDefault()
        if (draft === null || disabled) return
        setBusy(true)
        setError('')
        setNotice('')
        try {
          await scope.mutate([
            { op: 'set', path: ['imageData'], value: draft.imageData },
            { op: 'set', path: ['mimeType'], value: draft.mimeType },
          ])
          setBrowserIcon(dataUrl(draft.mimeType, draft.imageData))
          setDraft(null)
          setNotice(t('saved'))
        } catch {
          setError(t('failed'))
        } finally {
          setBusy(false)
        }
      }
      const reset = async event => {
        event.preventDefault()
        if (disabled || stored === null) return
        setBusy(true)
        setError('')
        setNotice('')
        try {
          await scope.mutate([
            { op: 'unset', path: ['imageData'] },
            { op: 'unset', path: ['mimeType'] },
          ])
          setDraft(null)
          reloadDefaultIcon()
          setNotice(t('resetSaved'))
        } catch {
          setError(t('failed'))
        } finally {
          setBusy(false)
        }
      }
      const control = { background: 'var(--dsw-alias-bg-module-platform)', color: 'inherit', border: 'none', borderRadius: 18, padding: '8px 14px', font: 'inherit' }
      const chooseStyle = { ...control, display: 'inline-flex', alignItems: 'center', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1 }
      return h('form', { onSubmit: save, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', borderBottom: '0.5px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-primary)' } },
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 14, lineHeight: '22px' } }, t('title')),
          h('div', { style: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' } }, statusText),
          preview && h('img', { src: dataUrl(preview.mimeType, preview.imageData), alt: '', width: 32, height: 32, style: { display: 'block', objectFit: 'contain', marginTop: 8, borderRadius: 6 } }),
          error && h('div', { role: 'alert', style: { fontSize: 12 } }, error),
          notice && h('div', { role: 'status', 'aria-live': 'polite', style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, notice)),
        h('label', { style: chooseStyle }, t('choose'), h('input', { type: 'file', accept: IMAGE_MIME_TYPES.join(','), disabled, onChange: choose, style: { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' } })),
        h('button', { type: 'submit', disabled: disabled || draft === null, style: control }, busy ? t('saving') : t('save')),
        h('button', { type: 'button', disabled: disabled || stored === null, onClick: reset, style: control }, t('reset')))
    }

    return {
      inject: ['slots', 'locale', 'settingsScope'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries))
        const scope = ctx.settingsScope.bind({ namespace: 'custom-favicon-settings' })
        ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'custom-favicon', order: 105, locale: NS, inject: () => ({ scope }) }, Row))
      },
    }
  },
})
