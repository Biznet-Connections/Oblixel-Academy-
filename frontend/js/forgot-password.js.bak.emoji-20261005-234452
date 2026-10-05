// ==================== FORGOT PASSWORD MODAL ====================
(function () {
  let fpEmail = '';
  let fpResetToken = '';

  window.openForgotPassword = function () {
    fpEmail = '';
    fpResetToken = '';

    // Reset to step 1
    switchFpStep(1);
    resetFpMessages();

    document.getElementById('fpEmailInput').value = '';
    document.getElementById('fpCodeInput').value = '';
    document.getElementById('fpPasswordInput').value = '';

    document.getElementById('fpBackdrop').classList.add('active');
  };

  window.closeForgotPassword = function () {
    document.getElementById('fpBackdrop').classList.remove('active');
  };

  function switchFpStep(step) {
    document.querySelectorAll('.fp-step').forEach(el => {
      el.classList.toggle('active', el.id === 'fp-step-' + step);
    });
    document.querySelectorAll('.fp-step-dot').forEach((el, i) => {
      el.classList.toggle('active', i === step - 1);
      el.classList.toggle('done', i < step - 1);
    });
  }

  function resetFpMessages() {
    ['fpMsg1','fpMsg2','fpMsg3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('show'); el.textContent = ''; }
    });
  }

  function showFpMsg(id, type, text) {
    const el = document.getElementById(id);
    el.className = 'fp-msg show ' + type;
    el.innerHTML = text;
  }

  // ---------- STEP 1: Send code ----------
  window.fpSendCode = async function () {
    const email = document.getElementById('fpEmailInput').value.trim().toLowerCase();
    if (!email) {
      showFpMsg('fpMsg1', 'error', 'Please enter your email address.');
      return;
    }

    const btn = document.getElementById('fpSendBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sending...';

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to send code');

      fpEmail = email;
      showFpMsg('fpMsg1', 'success', '📧 Code sent! Check your inbox (and spam).');

      setTimeout(() => {
        switchFpStep(2);
        resetFpMessages();
        document.getElementById('fpCodeInput').value = '';
        document.getElementById('fpCodeInput').focus();
      }, 1000);

    } catch (err) {
      showFpMsg('fpMsg1', 'error', '❌ ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Send Reset Code';
    }
  };

  // ---------- STEP 2: Verify code ----------
  window.fpVerifyCode = async function () {
    const code = document.getElementById('fpCodeInput').value.trim();
    if (!code || code.length !== 6) {
      showFpMsg('fpMsg2', 'error', 'Please enter the 6-digit code.');
      return;
    }

    const btn = document.getElementById('fpVerifyBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Verifying...';

    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, code })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Invalid code');

      fpResetToken = data.resetToken;
      showFpMsg('fpMsg2', 'success', '✅ Code verified!');

      setTimeout(() => {
        switchFpStep(3);
        resetFpMessages();
        document.getElementById('fpPasswordInput').value = '';
        document.getElementById('fpPasswordInput').focus();
      }, 800);

    } catch (err) {
      showFpMsg('fpMsg2', 'error', '❌ ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Verify Code';
    }
  };

  // ---------- STEP 3: Reset password ----------
  window.fpResetPassword = async function () {
    const newPassword = document.getElementById('fpPasswordInput').value;
    if (!newPassword || newPassword.length < 5) {
      showFpMsg('fpMsg3', 'error', 'Password must be at least 5 characters.');
      return;
    }

    const btn = document.getElementById('fpResetBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Resetting...';

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: fpResetToken, newPassword })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Reset failed');

      showFpMsg('fpMsg3', 'success', '🎉 Password updated successfully!');

      setTimeout(() => {
        closeForgotPassword();
        if (typeof showToast === 'function') showToast('Password reset! Please log in.', 'success');
      }, 1500);

    } catch (err) {
      showFpMsg('fpMsg3', 'error', '❌ ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-key mr-2"></i> Reset Password';
    }
  };

  // ---------- Back navigation ----------
  window.fpBackToStep = function (step) {
    resetFpMessages();
    switchFpStep(step);
  };

  // Close on backdrop click
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'fpBackdrop') closeForgotPassword();
  });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeForgotPassword();
  });

  // Enter key handling
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('fpBackdrop')?.classList.contains('active')) return;
    if (e.key !== 'Enter') return;

    if (document.getElementById('fp-step-1').classList.contains('active')) fpSendCode();
    else if (document.getElementById('fp-step-2').classList.contains('active')) fpVerifyCode();
    else if (document.getElementById('fp-step-3').classList.contains('active')) fpResetPassword();
  });
})();
