/* ==========================================================================
   Request form handling.

   The site ships as static files, so the form posts to an endpoint that is
   deployed alongside it (/api/leads by default). This script handles the
   client side: validation, pending state, success and failure.

   It is deliberately small. If the endpoint is not live, the form says so
   rather than pretending a submission worked. A form that silently swallows
   a lead is worse than a form that admits it is not connected yet.
   ========================================================================== */

(function () {
  'use strict';

  var form = document.getElementById('request-form');
  if (!form) return;

  var status = document.getElementById('rf-status');
  var button = form.querySelector('button[type="submit"]');
  var endpoint = form.getAttribute('data-endpoint');
  var state = form.getAttribute('data-status');

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.className = 'rform__status' + (kind ? ' rform__status--' + kind : '');
  }

  function setPending(on) {
    if (!button) return;
    button.disabled = on;
    button.textContent = on ? 'Sending' : 'Send request';
  }

  if (state !== 'active') {
    setStatus('This request form is not connected yet, so nothing is being sent. Please check back shortly.', 'err');
    return;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = typeof value === 'string' ? value.trim() : value;
    });

    /* Honeypot. A field a person cannot see and never fills in. If it comes
       back filled, it was a bot. Respond as if it worked so the bot learns
       nothing, and drop the request. */
    if (data.website) {
      setStatus('Thanks, your request has been sent.', 'ok');
      form.reset();
      return;
    }
    delete data.website;

    setPending(true);
    setStatus('Sending your request');

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Request failed with status ' + response.status);
        setStatus('Thanks, your request has been sent. A company that covers your area will be in touch.', 'ok');
        form.reset();
      })
      .catch(function () {
        setStatus('We could not send that just now. Please try again in a moment.', 'err');
      })
      .then(function () {
        setPending(false);
      });
  });
})();
