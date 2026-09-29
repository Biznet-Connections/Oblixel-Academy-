// ==================== ENROLL MODAL LOGIC ====================
(function () {

  function requireLogin() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      const modal = document.getElementById('enrollModal');
      if (modal) {
        modal.innerHTML = `
          <div class="enroll-modal-header">
            <div>
              <p class="text-xs text-purple-400 font-bold uppercase tracking-widest mb-1">Login Required</p>
              <h2 class="text-xl font-black leading-tight">Please log in first</h2>
            </div>
            <button class="enroll-modal-close" onclick="closeEnrollModal()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <p class="text-sm text-gray-300 my-4">You need an account to enroll in a course. It only takes 30 seconds.</p>
          <button class="enroll-cta" onclick="closeEnrollModal(); if(typeof window.openLoginModal === 'function'){window.openLoginModal();} else { location.reload(); }">
            <i class="fa-solid fa-right-to-bracket mr-2"></i> Log In / Sign Up
          </button>
          <button class="enroll-cta" style="margin-top:0.5rem;background:rgba(255,255,255,0.06);box-shadow:none;" onclick="closeEnrollModal()">
            Cancel
          </button>
        `;
      }
      return false;
    }
    return true;
  }
  let currentCourse = null;
  let currentPlan = 'exam_only';
  let currentPrice = 0;
  let currentOriginalPrice = 0;

  window.openEnrollModal = function (course) {
    // course: { courseId, name, examPrice, pathPrice, icon, ... }
    currentCourse = course;
    currentPlan = 'exam_only';

    document.getElementById('enrollCourseName').textContent = course.name || 'Course';
    document.getElementById('enrollExamPrice').textContent = '$' + Number(course.examPrice || 0).toFixed(0);
    document.getElementById('enrollPathPrice').textContent = '$' + Number(course.pathPrice || course.examPrice || 0).toFixed(0);

    // reset selection
    document.querySelectorAll('.enroll-plan-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.plan === 'exam_only');
    });

    // reset tabs to linkwa
    switchEnrollTab('linkwa');

    // reset messages
    resetVoucherMsg();
    const lm = document.getElementById('enrollLinkwaMsg');
    lm.classList.remove('show');
    lm.textContent = '';

    updatePayButton();
    document.getElementById('enrollModalBackdrop').classList.add('active');
  };

  window.closeEnrollModal = function () {
    document.getElementById('enrollModalBackdrop').classList.remove('active');
  };

  window.selectPlan = function (plan) {
    currentPlan = plan;
    document.querySelectorAll('.enroll-plan-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.plan === plan);
    });
    updatePayButton();
  };

  window.switchEnrollTab = function (tab) {
    document.querySelectorAll('.enroll-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.querySelectorAll('.enroll-pane').forEach(el => {
      el.classList.toggle('active', el.id === 'pane-' + tab);
    });
  };

  function updatePayButton() {
    if (!currentCourse) return;
    const price = currentPlan === 'exam_only'
      ? Number(currentCourse.examPrice || 0)
      : Number(currentCourse.pathPrice || currentCourse.examPrice || 0);
    currentPrice = price;
    currentOriginalPrice = price;
    document.getElementById('enrollPayAmount').textContent = '$' + price.toFixed(2);
  }

  // ---------- Linkwa flow ----------
  window.startLinkwaPayment = async function () {
    if (!requireLogin()) return;
    if (!currentCourse) return;

    const btn = document.getElementById('enrollPayBtn');
    const msg = document.getElementById('enrollLinkwaMsg');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Creating payment...';
    msg.classList.remove('show');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          courseId: currentCourse.courseId,
          type: currentPlan
        })
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        // already enrolled?
        if (data.alreadyEnrolled) {
          msg.className = 'enroll-msg show info';
          msg.textContent = '✅ You are already enrolled in this course.';
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Already Enrolled';
          return;
        }
        throw new Error(data.error || 'Failed to initiate payment');
      }

      // Show redirect overlay and open Linkwa
      document.getElementById('linkwaRedirectOverlay').classList.add('active');

      // Save reference so we can check status later if needed
      sessionStorage.setItem('linkwa_last_ref', data.sessionId);
      sessionStorage.setItem('linkwa_last_course', currentCourse.courseId);

      // Open Linkwa checkout in new tab
      setTimeout(() => {
        window.open(data.checkoutUrl, '_blank', 'noopener');
        // Close modal after redirect
        closeEnrollModal();
        setTimeout(() => {
          document.getElementById('linkwaRedirectOverlay').classList.remove('active');
        }, 1500);
      }, 500);

    } catch (err) {
      console.error('[Enroll] Linkwa error:', err);
      msg.className = 'enroll-msg show error';
      msg.textContent = '❌ ' + (err.message || 'Something went wrong. Try again.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock mr-2"></i> Pay <span id="enrollPayAmount">$' + currentPrice.toFixed(2) + '</span> → Linkwa';
    }
  };

  // ---------- Voucher flow ----------
  window.resetVoucherMsg = function () {
    const vm = document.getElementById('enrollVoucherMsg');
    vm.classList.remove('show');
    vm.textContent = '';
  };

  window.applyVoucher = async function () {
    if (!requireLogin()) return;
    if (!currentCourse) return;
    const code = document.getElementById('enrollVoucherInput').value.trim().toUpperCase();
    const msg = document.getElementById('enrollVoucherMsg');
    const btn = document.getElementById('enrollVoucherBtn');

    if (!code) {
      msg.className = 'enroll-msg show error';
      msg.textContent = 'Please enter a voucher code.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Validating...';

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          courseId: currentCourse.courseId,
          type: currentPlan,
          voucherCode: code
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Voucher failed');

      msg.className = 'enroll-msg show success';
      msg.innerHTML = '🎉 ' + (data.message || 'Enrolled successfully!') +
        '<br><span class="text-xs">Redirecting to your dashboard...</span>';

      btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Enrolled!';

      setTimeout(() => {
        closeEnrollModal();
        location.reload();
      }, 1800);

    } catch (err) {
      msg.className = 'enroll-msg show error';
      msg.textContent = '❌ ' + (err.message || 'Invalid voucher');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-ticket mr-2"></i> Apply Voucher';
    }
  };

  // Close on backdrop click
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'enrollModalBackdrop') {
      closeEnrollModal();
    }
  });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEnrollModal();
  });
})();
