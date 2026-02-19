(function () {
  const ensureDialogRoot = () => {
    let modal = document.getElementById('appDialogModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'appDialogModal';
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 520px;">
        <div class="modal-header">
          <h3 id="appDialogTitle">Notice</h3>
          <button aria-label="Close dialog" class="modal-close" id="appDialogCloseBtn">&times;</button>
        </div>
        <div class="modal-body">
          <p id="appDialogMessage" style="white-space: pre-wrap;"></p>
          <input id="appDialogInput" class="input" style="display:none; width:100%; margin-top:8px;" />
        </div>
        <div class="modal-footer" style="display:flex; gap:8px; justify-content:flex-end;">
          <button id="appDialogCancelBtn" class="btn btn-secondary" style="display:none;">Cancel</button>
          <button id="appDialogOkBtn" class="btn">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  };

  const openDialog = ({ title, message, mode, defaultValue }) => {
    const modal = ensureDialogRoot();
    const titleEl = modal.querySelector('#appDialogTitle');
    const messageEl = modal.querySelector('#appDialogMessage');
    const inputEl = modal.querySelector('#appDialogInput');
    const okBtn = modal.querySelector('#appDialogOkBtn');
    const cancelBtn = modal.querySelector('#appDialogCancelBtn');
    const closeBtn = modal.querySelector('#appDialogCloseBtn');

    titleEl.textContent = title || 'Notice';
    messageEl.textContent = message || '';
    cancelBtn.style.display = mode === 'alert' ? 'none' : '';
    inputEl.style.display = mode === 'prompt' ? '' : 'none';
    inputEl.value = mode === 'prompt' ? (defaultValue || '') : '';

    modal.style.display = 'flex';

    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        modal.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKeyDown);
        resolve(value);
      };

      const onOk = () => {
        if (mode === 'confirm') finish(true);
        else if (mode === 'prompt') finish(inputEl.value);
        else finish(undefined);
      };
      const onCancel = () => {
        if (mode === 'confirm') finish(false);
        else if (mode === 'prompt') finish(null);
        else finish(undefined);
      };
      const onBackdrop = (e) => {
        if (e.target === modal) onCancel();
      };
      const onKeyDown = (e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && mode !== 'alert') onOk();
      };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      closeBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKeyDown);

      if (mode === 'prompt') inputEl.focus();
      else okBtn.focus();
    });
  };

  window.showAppAlert = (message, title = 'Notice') => openDialog({ title, message, mode: 'alert' });
  window.showAppConfirm = (message, title = 'Confirm') => openDialog({ title, message, mode: 'confirm' });
  window.showAppPrompt = (message, defaultValue = '', title = 'Input Required') => openDialog({
    title,
    message,
    mode: 'prompt',
    defaultValue,
  });
}());
