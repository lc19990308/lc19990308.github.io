// A tiny independent entry keeps the loading screen usable before the 3D modules arrive.
(() => {
  const dialog = document.querySelector('#site-loader')
  if (!dialog || (location.hash && location.hash !== '#top')) return
  let fallbackTimer
  function dismiss() {
    clearTimeout(fallbackTimer)
    document.documentElement.removeAttribute('data-loading')
    if (dialog.open) dialog.close()
  }
  dialog.querySelector('#loader-skip').addEventListener('click', dismiss)
  dialog.querySelector('.loader-brand').addEventListener('click', dismiss)
  dialog.addEventListener('close', dismiss)
  dialog.addEventListener('cancel', dismiss)
  window.addEventListener('station:loading-finished', dismiss)
  // No script or scene failure may keep the main document behind the loading screen.
  fallbackTimer = setTimeout(dismiss, 20000)
  try {
    document.documentElement.dataset.loading = 'active'
    dialog.showModal()
  } catch {
    dismiss()
  }
})()
