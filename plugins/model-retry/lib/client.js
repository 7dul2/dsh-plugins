window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-client-ui-model-retry',
  factory: require => {
    const React = require('react')
    const h = React.createElement
    const NS = 'settings.modelRetry'
    const dictionaries = {
      zh: { title: '模型重试次数', description: '请求失败后最多重试的次数；0 为不重试，修改后从下一步请求生效。', save: '保存', saving: '保存中…', saved: '保存成功', invalid: '请输入大于或等于 0 的整数', failed: '保存失败，请重试', loading: '正在读取设置…', unavailable: '当前连接无法修改此设置' },
      en: { title: 'Model retry limit', description: 'Retries after a failed request. 0 disables retries. Changes apply to the next request step.', save: 'Save', saving: 'Saving…', saved: 'Saved successfully', invalid: 'Enter a non-negative integer', failed: 'Could not save. Please try again.', loading: 'Loading settings…', unavailable: 'This connection cannot edit this setting' },
    }
    function Row({ scope, t }) {
      const snapshot = React.useSyncExternalStore(cb => scope.subscribe(cb), () => scope.getSnapshot())
      const [draft, setDraft] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const shown = draft === null ? String(snapshot.value?.maxRetries ?? '') : draft
      const save = async event => {
        event.preventDefault()
        const value = Number(shown)
        if (!/^\d+$/.test(shown) || !Number.isSafeInteger(value)) { setError(t('invalid')); setNotice(''); return }
        setBusy(true)
        setError('')
        setNotice('')
        try { await scope.set('maxRetries', value); setDraft(null); setNotice(t('saved')) }
        catch { setError(t('failed')); setNotice('') }
        finally { setBusy(false) }
      }
      const disabled = busy || !snapshot.writable || snapshot.status !== 'ready'
      const control = { background: 'var(--dsw-alias-bg-module-platform)', color: 'inherit', border: 'none', borderRadius: 18, padding: '8px 14px', font: 'inherit' }
      return h('form', { onSubmit: save, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', borderBottom: '0.5px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-primary)' } },
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 14, lineHeight: '22px' } }, t('title')),
          h('div', { style: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' } }, snapshot.status === 'loading' ? t('loading') : snapshot.status === 'unavailable' ? t('unavailable') : t('description')),
          error && h('div', { role: 'alert', style: { fontSize: 12 } }, error),
          notice && h('div', { role: 'status', 'aria-live': 'polite', style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, notice)),
        h('input', { type: 'number', min: 0, max: Number.MAX_SAFE_INTEGER, step: 1, 'aria-label': t('title'), value: shown, disabled, onChange: event => { setDraft(event.target.value); setError(''); setNotice('') }, style: { ...control, width: 88, textAlign: 'center' } }),
        h('button', { type: 'submit', disabled: disabled || draft === null, style: control }, busy ? t('saving') : t('save')))
    }
    return {
      inject: ['slots', 'locale', 'settingsScope'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries))
        const scope = ctx.settingsScope.bind({ namespace: 'model-retry-settings' })
        ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'model-retry', order: 100, locale: NS, inject: () => ({ scope }) }, Row))
      },
    }
  },
})
